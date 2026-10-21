
import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.database import DatabaseManager, in_memory_store
from app.models.feedback import AnswerInput, FeedbackSession
from app.models.report import HospitalReport
from app.utils.validators import generate_feedback_id

logger = logging.getLogger(__name__)


class FeedbackService:
    """Manage feedback sessions and reports with stale-report protection."""

    REQUIRED_QUESTION_IDS = {1, 2, 3, 4}

    @staticmethod
    def _get_collection(name: str):
        """Get a MongoDB collection safely."""
        try:
            return DatabaseManager.get_collection(name)
        except Exception:
            logger.exception(
                "Could not access MongoDB collection '%s'.", name
            )
            return None

    @staticmethod
    def _cache_session(session: FeedbackSession) -> None:
        """Keep a local copy of the current session."""
        in_memory_store.sessions[session.feedback_id] = (
            session.model_dump()
        )

    @staticmethod
    def _invalidate_memory_report(feedback_id: str) -> None:
        """Remove any cached report for this feedback session."""
        in_memory_store.reports.pop(feedback_id, None)

    @staticmethod
    def create_session(
        language: str = "English",
    ) -> FeedbackSession:
        """Create a new feedback session."""
        feedback_id = generate_feedback_id()

        session = FeedbackSession(
            feedback_id=feedback_id,
            language=language,
            answers=[],
            created_at=datetime.now(timezone.utc).isoformat(),
            status="created",
        )

        session_data = session.model_dump()
        collection = FeedbackService._get_collection(
            "feedback_sessions"
        )

        if collection is not None:
            try:
                collection.insert_one(session_data)
            except Exception:
                logger.exception(
                    "Could not save session %s in MongoDB.",
                    feedback_id,
                )
                # Continue in memory when MongoDB is unavailable.
        in_memory_store.sessions[feedback_id] = session_data

        return session

    @staticmethod
    def get_session(
        feedback_id: str,
    ) -> Optional[FeedbackSession]:
        """Get the latest session state for this application process."""

        # The local cache contains changes made in this process,
        # including changes made when MongoDB operations fail.
        cached = in_memory_store.sessions.get(feedback_id)

        if cached is not None:
            try:
                return FeedbackSession(**cached)
            except Exception:
                logger.exception(
                    "Invalid cached session for %s.",
                    feedback_id,
                )

        collection = FeedbackService._get_collection(
            "feedback_sessions"
        )

        if collection is not None:
            try:
                document = collection.find_one(
                    {"feedback_id": feedback_id},
                    {"_id": 0},
                )

                if document is not None:
                    in_memory_store.sessions[feedback_id] = document
                    return FeedbackSession(**document)

            except Exception:
                logger.exception(
                    "Could not retrieve session %s from MongoDB.",
                    feedback_id,
                )

        return None

    @staticmethod
    def save_answers(
        feedback_id: str,
        answers: List[AnswerInput],
    ) -> Optional[FeedbackSession]:
        """
        Save all four answers and invalidate any previous report.

        Returns None if validation fails or a required database
        operation fails. This prevents analysis from proceeding
        with incomplete or unsaved feedback.
        """
        session = FeedbackService.get_session(feedback_id)

        if session is None:
            logger.warning(
                "Cannot save answers: session %s was not found.",
                feedback_id,
            )
            return None

        # Validate the four required questions.
        if len(answers) != 4:
            logger.warning(
                "Session %s must contain exactly four answers.",
                feedback_id,
            )
            return None

        question_ids = [
            getattr(answer, "question_id", None)
            for answer in answers
        ]

        if (
            len(set(question_ids)) != 4
            or set(question_ids) != FeedbackService.REQUIRED_QUESTION_IDS
        ):
            logger.warning(
                "Session %s has missing or duplicate question IDs: %s",
                feedback_id,
                question_ids,
            )
            return None

        for answer in answers:
            transcript = getattr(answer, "transcript", "")

            if not isinstance(transcript, str) or not transcript.strip():
                logger.warning(
                    "Question %s has an empty transcript in session %s.",
                    getattr(answer, "question_id", "unknown"),
                    feedback_id,
                )
                return None

        answers_data = [
            answer.model_dump()
            for answer in answers
        ]

        session_data = session.model_dump()
        session_data["answers"] = answers_data
        session_data["status"] = "completed"

        # IMPORTANT: delete the old report before updating answers.
        # If deletion fails, do not continue with a potentially stale
        # report still available in the database.
        reports_collection = FeedbackService._get_collection("reports")

        if reports_collection is not None:
            try:
                reports_collection.delete_one(
                    {"feedback_id": feedback_id}
                )
            except Exception:
                logger.exception(
                    "Could not invalidate the old report for %s.",
                    feedback_id,
                )
                return None

        # The old report has now been invalidated.
        FeedbackService._invalidate_memory_report(feedback_id)

        # Persist the new answers in MongoDB when available.
        sessions_collection = FeedbackService._get_collection(
            "feedback_sessions"
        )

        if sessions_collection is not None:
            try:
                result = sessions_collection.update_one(
                    {"feedback_id": feedback_id},
                    {
                        "$set": {
                            "answers": answers_data,
                            "status": "completed",
                        }
                    },
                )

                # A session that previously existed only in memory
                # may not yet have a MongoDB document.
                if result.matched_count == 0:
                    sessions_collection.replace_one(
                        {"feedback_id": feedback_id},
                        session_data,
                        upsert=True,
                    )

            except Exception:
                logger.exception(
                    "Could not save answers for session %s.",
                    feedback_id,
                )
                return None

        # Update the in-memory session only after validation and
        # required persistence operations have succeeded.
        session.answers = answers
        session.status = "completed"

        in_memory_store.sessions[feedback_id] = session_data

        return session

    @staticmethod
    def update_session_status(
        feedback_id: str,
        status: str,
    ) -> None:
        """Update the session status in MongoDB and memory."""
        collection = FeedbackService._get_collection(
            "feedback_sessions"
        )

        if collection is not None:
            try:
                collection.update_one(
                    {"feedback_id": feedback_id},
                    {"$set": {"status": status}},
                )
            except Exception:
                logger.exception(
                    "Could not update status for session %s.",
                    feedback_id,
                )

        cached = in_memory_store.sessions.get(feedback_id)

        if cached is not None:
            cached["status"] = status

    @staticmethod
    def save_report(report: HospitalReport) -> HospitalReport:
        """Save a report and mark the session analyzed."""
        feedback_id = report.feedback_id

        session = FeedbackService.get_session(feedback_id)

        if session is None:
            raise ValueError(
                f"Cannot save report: session '{feedback_id}' was not found."
            )

        report_data = report.model_dump()
        collection = FeedbackService._get_collection("reports")
        database_save_succeeded = False

        if collection is not None:
            try:
                collection.update_one(
                    {"feedback_id": feedback_id},
                    {"$set": report_data},
                    upsert=True,
                )
                database_save_succeeded = True

            except Exception:
                logger.exception(
                    "Could not save report for session %s in MongoDB.",
                    feedback_id,
                )

        # Cache the latest report for this process. If MongoDB is
        # unavailable, this is a temporary in-memory report only.
        in_memory_store.reports[feedback_id] = report_data

        # Never mark a database session as analyzed if its new report
        # could not be persisted. This helps prevent an old report
        # from becoming visible again after a server restart.
        if database_save_succeeded or collection is None:
            FeedbackService.update_session_status(
                feedback_id,
                "analyzed",
            )
        else:
            cached = in_memory_store.sessions.get(feedback_id)

            if cached is not None:
                cached["status"] = "analyzed"

        return report

    @staticmethod
    def get_report(
        feedback_id: str,
    ) -> Optional[HospitalReport]:
        """
        Return a report only when the corresponding session has
        completed analysis. Reports for changed or processing sessions
        must not be reused.
        """
        session = FeedbackService.get_session(feedback_id)

        if session is None:
            return None

        if session.status != "analyzed":
            return None

        # Prefer the current process's latest report.
        cached_report = in_memory_store.reports.get(feedback_id)

        if cached_report is not None:
            try:
                return HospitalReport(**cached_report)
            except Exception:
                logger.exception(
                    "Invalid cached report for session %s.",
                    feedback_id,
                )

        collection = FeedbackService._get_collection("reports")

        if collection is not None:
            try:
                document = collection.find_one(
                    {"feedback_id": feedback_id},
                    {"_id": 0},
                )

                if document is not None:
                    report = HospitalReport(**document)
                    in_memory_store.reports[feedback_id] = (
                        report.model_dump()
                    )
                    return report

            except Exception:
                logger.exception(
                    "Could not retrieve report for session %s.",
                    feedback_id,
                )

        return None
