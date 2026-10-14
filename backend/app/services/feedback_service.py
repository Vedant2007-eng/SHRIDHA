import logging
from datetime import datetime, timezone
from typing import List, Optional
from app.database import DatabaseManager, in_memory_store
from app.models.feedback import AnswerInput, FeedbackSession
from app.models.report import HospitalReport
from app.utils.validators import generate_feedback_id

logger = logging.getLogger(__name__)


class FeedbackService:
    @staticmethod
    def create_session(language: str = "English") -> FeedbackSession:
        """Generate a new feedback session and store in MongoDB (or in-memory store)."""
        feedback_id = generate_feedback_id()
        session = FeedbackSession(
            feedback_id=feedback_id,
            language=language,
            answers=[],
            created_at=datetime.now(timezone.utc).isoformat(),
            status="created",
        )

        col = DatabaseManager.get_collection("feedback_sessions")
        if col is not None:
            try:
                col.insert_one(session.model_dump())
            except Exception as e:
                logger.error(f"Error inserting session into MongoDB: {e}")
                in_memory_store.sessions[feedback_id] = session.model_dump()
        else:
            in_memory_store.sessions[feedback_id] = session.model_dump()

        return session

    @staticmethod
    def get_session(feedback_id: str) -> Optional[FeedbackSession]:
        """Retrieve feedback session by feedback_id."""
        col = DatabaseManager.get_collection("feedback_sessions")
        doc = None
        if col is not None:
            try:
                doc = col.find_one({"feedback_id": feedback_id}, {"_id": 0})
            except Exception as e:
                logger.error(f"Error reading session from MongoDB: {e}")

        if doc is None:
            doc = in_memory_store.sessions.get(feedback_id)

        if doc:
            return FeedbackSession(**doc)
        return None

    @staticmethod
    def save_answers(feedback_id: str, answers: List[AnswerInput]) -> Optional[FeedbackSession]:
        """Save answers and update session status to 'completed'."""
        session = FeedbackService.get_session(feedback_id)
        if not session:
            return None

        answers_data = [a.model_dump() for a in answers]
        updated_status = "completed"

        col = DatabaseManager.get_collection("feedback_sessions")
        if col is not None:
            try:
                col.update_one(
                    {"feedback_id": feedback_id},
                    {
                        "$set": {
                            "answers": answers_data,
                            "status": updated_status,
                        }
                    },
                )
            except Exception as e:
                logger.error(f"Error updating session in MongoDB: {e}")

        # Sync in-memory store
        if feedback_id in in_memory_store.sessions:
            in_memory_store.sessions[feedback_id]["answers"] = answers_data
            in_memory_store.sessions[feedback_id]["status"] = updated_status
        else:
            in_memory_store.sessions[feedback_id] = {
                "feedback_id": feedback_id,
                "language": session.language,
                "answers": answers_data,
                "created_at": session.created_at,
                "status": updated_status,
            }

        session.answers = answers
        session.status = updated_status
        return session

    @staticmethod
    def update_session_status(feedback_id: str, status: str) -> None:
        """Update session status."""
        col = DatabaseManager.get_collection("feedback_sessions")
        if col is not None:
            try:
                col.update_one({"feedback_id": feedback_id}, {"$set": {"status": status}})
            except Exception as e:
                logger.error(f"Error updating session status in MongoDB: {e}")

        if feedback_id in in_memory_store.sessions:
            in_memory_store.sessions[feedback_id]["status"] = status

    @staticmethod
    def save_report(report: HospitalReport) -> HospitalReport:
        """Save analysis report to reports collection."""
        report_data = report.model_dump()
        col = DatabaseManager.get_collection("reports")
        if col is not None:
            try:
                col.update_one(
                    {"feedback_id": report.feedback_id},
                    {"$set": report_data},
                    upsert=True,
                )
            except Exception as e:
                logger.error(f"Error saving report in MongoDB: {e}")

        in_memory_store.reports[report.feedback_id] = report_data
        FeedbackService.update_session_status(report.feedback_id, "analyzed")
        return report

    @staticmethod
    def get_report(feedback_id: str) -> Optional[HospitalReport]:
        """Retrieve existing report by feedback_id."""
        col = DatabaseManager.get_collection("reports")
        doc = None
        if col is not None:
            try:
                doc = col.find_one({"feedback_id": feedback_id}, {"_id": 0})
            except Exception as e:
                logger.error(f"Error getting report from MongoDB: {e}")

        if doc is None:
            doc = in_memory_store.reports.get(feedback_id)

        if doc:
            return HospitalReport(**doc)
        return None
