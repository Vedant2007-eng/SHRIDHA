"""Evidence-based patient feedback analysis for CareVoice / HealSense.

Numeric scores are calculated deterministically from the submitted transcripts.
Groq is used for speech transcription, but model-generated category scores are
not trusted. These are language-based estimates, not patient-provided ratings.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from groq import Groq

from app.config import settings
from app.models.feedback import FeedbackSession
from app.models.report import CategoryScores, HospitalReport
from app.services.feedback_service import FeedbackService
from app.services.scoring_service import ScoringService

logger = logging.getLogger(__name__)


class AnalysisService:
    """Analyze patient answers without fabricating report content or scores."""

    # Phrase weights use a neutral baseline of 50/100. Longer phrases are
    # matched before shorter overlapping phrases, so "very rude" is not
    # penalized again as "rude".
    NEGATIVE_WEIGHTS = {
        "improve in each and every field": 30,
        "not very satisfied": 34,
        "not very clean": 30,
        "not very helpful": 28,
        "not timely": 25,
        "not satisfied": 32,
        "not acceptable": 28,
        "unacceptable": 28,
        "not hygienic": 28,
        "not on time": 25,
        "not clean": 28,
        "not good": 26,
        "unprofessional": 22,
        "inadequate": 20,
        "very rude": 28,
        "very dirty": 28,
        "very bad": 27,
        "poor service": 28,
        "needs more frequent sanitization": 18,
        "requires more frequent sanitization": 18,
        "poorly maintained": 20,
        "did not explain": 22,
        "didn't explain": 22,
        "unhygienic": 25,
        "dissatisfied": 28,
        "inconvenient": 18,
        "unhelpful": 22,
        "unclean": 24,
        "ignored": 20,
        "terrible": 32,
        "horrible": 32,
        "worst": 30,
        "rude": 22,
        "dirty": 22,
        "delayed": 14,
        "delay": 12,
        "late": 12,
        "poor": 16,
        "bad": 18,
        "खराब": 22,
        "घाण": 22,
        "उशीर": 16,
        "देरी": 16,
    }

    POSITIVE_WEIGHTS = {
        # Strong positive wording. "Very good" is deliberately included because
        # it appears in common patient responses and must not score as neutral.
        "exceptional": 30,
        "outstanding": 30,
        "excellent service": 30,
        "excellent": 30,
        "fantastic": 30,
        "awesome": 28,
        "wonderful": 28,
        "amazing": 28,
        "very good": 30,
        "really good": 26,
        "very satisfied": 30,
        "very clean": 24,
        "very helpful": 24,
        "very polite": 24,
        "very professional": 24,
        "clearly explained": 18,
        "properly explained": 18,
        "well maintained": 16,
        "well-maintained": 16,
        "good overall": 18,
        "good service": 18,
        "professional": 14,
        "respectful": 14,
        "appreciated": 12,
        "helpful": 12,
        "caring": 12,
        "polite": 12,
        "on time": 12,
        "satisfied": 15,
        "good": 12,
        "great": 24,
        "thorough": 12,
        "no complaints": 20,
        "thank you": 8,
    }

    POSITIVE_TERMS = tuple(POSITIVE_WEIGHTS.keys())
    NEGATIVE_TERMS = tuple(NEGATIVE_WEIGHTS.keys())

    QUESTION_SPLIT_RE = re.compile(
        r"(?<=[.!?])\s+|\s+(?:but|however|although|though)\s+",
        re.IGNORECASE,
    )

    STAFF_NAME_RE = re.compile(
        r"\b(Dr\.?|Doctor|Nurse|Sister|Wardboy|Ward\s+Boy)\s+"
        r"([A-Za-z][A-Za-z'-]*)\b",
        re.IGNORECASE,
    )

    @staticmethod
    def _create_groq_client() -> Optional[Groq]:
        """Create a Groq client when an API key is configured."""
        api_key = getattr(settings, "GROQ_API_KEY", None)
        if not api_key or not api_key.strip() or api_key == "your_groq_api_key_here":
            return None

        try:
            return Groq(api_key=api_key)
        except Exception:
            logger.exception("Failed to initialize Groq client")
            return None

    @classmethod
    def transcribe_audio(
        cls,
        file_bytes: bytes,
        filename: str = "audio.webm",
        language: Optional[str] = None,
    ) -> str:
        """Transcribe uploaded audio using Groq Whisper."""
        client = cls._create_groq_client()
        if not client or not file_bytes:
            return ""

        language_codes = {
            "english": "en",
            "hindi": "hi",
            "marathi": "mr",
            "tamil": "ta",
            "telugu": "te",
        }
        lang_code = "en"
        if language:
            lowered_language = language.lower()
            for language_name, code in language_codes.items():
                if language_name in lowered_language:
                    lang_code = code
                    break

        try:
            transcription = client.audio.transcriptions.create(
                file=(filename, file_bytes),
                model="whisper-large-v3-turbo",
                language=lang_code,
                response_format="json",
                temperature=0.0,
            )
            text = getattr(transcription, "text", "")
            return text.strip() if isinstance(text, str) else ""
        except Exception:
            logger.exception("Groq Whisper transcription failed")
            return ""

    @classmethod
    def analyze_feedback(cls, feedback_id: str) -> HospitalReport:
        """Analyze the current session and save a fresh evidence-based report.

        Do not return a previously saved report here. An explicit analysis request
        recalculates the result from the session currently stored by FeedbackService.
        """
        session = FeedbackService.get_session(feedback_id)
        if session is None:
            raise ValueError(f"Feedback session '{feedback_id}' not found.")

        answers_list = list(session.answers or [])
        answer_map = {
            answer.question_id: (answer.transcript or "").strip()
            for answer in answers_list
        }

        required_ids = {1, 2, 3, 4}
        if set(answer_map.keys()) != required_ids:
            raise ValueError(
                f"Feedback session '{feedback_id}' must contain questions 1, 2, 3, and 4 exactly once."
            )

        missing_ids = [qid for qid in sorted(required_ids) if not answer_map[qid]]
        if missing_ids:
            raise ValueError(
                "Missing answers for question(s): "
                + ", ".join(str(qid) for qid in missing_ids)
            )

        FeedbackService.update_session_status(feedback_id, "processing")

        q1 = answer_map[1]
        q2 = answer_map[2]
        q3 = answer_map[3]
        q4 = answer_map[4]

        # Question 2 covers two independent dimensions. Score them from the
        # relevant clauses rather than assigning the same score automatically.
        staff_text = cls._extract_answer_dimension(
            q2,
            (
                "staff", "nurse", "nursing", "sister", "wardboy", "ward boy",
                "behaviour", "behavior", "polite", "rude", "helpful", "caring",
                "professional", "respectful", "ignored",
            ),
        )
        medicine_text = cls._extract_answer_dimension(
            q2,
            (
                "medicine", "medicines", "dose", "doses", "tablet", "tablets",
                "injection", "injections", "timeliness", "timely", "delayed",
                "delay", "late", "schedule", "on time",
            ),
        )

        # Scores are all computed by one documented rubric, independent of Groq's
        # generated JSON. Q3 covers doctors and overall service in this questionnaire.
        score_values = {
            "cleanliness_facilities": cls._score_answer(q1),
            "staff_behaviour": cls._score_answer(staff_text),
            "medicine_timeliness": cls._score_answer(medicine_text),
            "doctor_treatment": cls._score_answer(q3),
            "overall_service": cls._score_answer(q3),
        }

        category_scores = CategoryScores(**score_values)
        overall_score = round(ScoringService.calculate_overall_score(category_scores))
        status, _ = ScoringService.get_score_status(overall_score)
        sentiment = cls._derive_sentiment(answer_map, score_values)

        positive_feedback, negative_feedback, key_issues, improvement_areas = (
            cls._derive_feedback_fields(answer_map, staff_text, medicine_text)
        )
        patient_suggestions = cls._suggestions_from_answer(q4)
        appreciated_staff, dissatisfied_staff = cls._extract_staff_from_answer(q4)

        # Include an explicit statement when the answers have no clear polarity.
        summary = cls._make_summary(
            overall_score,
            sentiment,
            positive_feedback,
            negative_feedback,
        )

        report = HospitalReport(
            feedback_id=feedback_id,
            overall_score=overall_score,
            status=status,
            category_scores=category_scores,
            overall_sentiment=sentiment,
            positive_feedback=positive_feedback,
            negative_feedback=negative_feedback,
            key_issues=key_issues,
            improvement_areas=improvement_areas,
            patient_suggestions=patient_suggestions,
            appreciated_staff=appreciated_staff,
            dissatisfied_staff=dissatisfied_staff,
            summary=summary,
            created_at=datetime.now(timezone.utc).isoformat(),
        )

        FeedbackService.save_report(report)
        return report

    @classmethod
    def _score_answer(cls, text: str) -> int:
        """Estimate a 0-100 sentiment score from one answer's wording.

        50 is neutral. Negative and positive phrases adjust that baseline.
        Overlapping phrase matches are counted only once, and results are clamped
        to 5-95. These are language-based estimates, not explicit patient ratings.
        """
        text = (text or "").strip().lower()
        if not text:
            return 50

        negative_total = cls._weighted_phrase_total(text, cls.NEGATIVE_WEIGHTS)

        # Mask negative expressions before looking for positive evidence so that
        # "not clean", "not good", and "not satisfied" are not counted as praise.
        positive_text = text
        for phrase in sorted(cls.NEGATIVE_WEIGHTS, key=len, reverse=True):
            positive_text = re.sub(
                rf"(?<!\w){re.escape(phrase)}(?!\w)",
                " ",
                positive_text,
                flags=re.IGNORECASE,
            )
        # Also mask a negator immediately before a positive phrase, including
        # variants such as "not very clean" that do not have a dedicated entry.
        for phrase in sorted(cls.POSITIVE_WEIGHTS, key=len, reverse=True):
            positive_text = re.sub(
                rf"\b(?:not|never|no|hardly)\s+{re.escape(phrase)}\b",
                " ",
                positive_text,
                flags=re.IGNORECASE,
            )
        positive_total = cls._weighted_phrase_total(
            positive_text, cls.POSITIVE_WEIGHTS
        )

        # Limit the total contribution so long answers do not dominate scores
        # simply because the patient repeated the same complaint many times.
        positive_total = min(45, positive_total)
        negative_total = min(50, negative_total)

        score = 50 + positive_total - negative_total
        return max(5, min(95, int(round(score))))

    @staticmethod
    def _weighted_phrase_total(text: str, weights: Dict[str, int]) -> int:
        """Add phrase weights without counting overlapping matches twice."""
        matches: List[Tuple[int, int, int]] = []

        for phrase, weight in sorted(
            weights.items(), key=lambda item: len(item[0]), reverse=True
        ):
            pattern = re.compile(
                rf"(?<!\w){re.escape(phrase)}(?!\w)", re.IGNORECASE
            )
            for match in pattern.finditer(text):
                matches.append((match.start(), match.end(), weight))

        matches.sort(key=lambda item: (item[0], -(item[1] - item[0])))
        accepted: List[Tuple[int, int, int]] = []

        for start, end, weight in matches:
            if any(start < used_end and end > used_start for used_start, used_end, _ in accepted):
                continue
            accepted.append((start, end, weight))

        return sum(weight for _, _, weight in accepted)

    @classmethod
    def _has_negative_signal(cls, text: str) -> bool:
        lowered = (text or "").lower()
        return any(
            re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lowered)
            for term in cls.NEGATIVE_TERMS
        )

    @classmethod
    def _has_positive_signal(cls, text: str) -> bool:
        """Return True only when positive words are not negated in context."""
        lowered = (text or "").lower()
        if not lowered.strip():
            return False

        # Mask full negative phrases first. This prevents the positive word
        # "good" in "not good" from turning a complaint into praise.
        for phrase in sorted(cls.NEGATIVE_WEIGHTS, key=len, reverse=True):
            lowered = re.sub(
                rf"(?<!\w){re.escape(phrase)}(?!\w)",
                " ",
                lowered,
                flags=re.IGNORECASE,
            )

        # Also mask negation followed by a positive phrase, allowing common
        # modifiers: "not very good", "wasn't really helpful", etc.
        negator = r"(?:not|never|no|hardly|isn't|wasn't|weren't|is not|was not|were not)"
        modifier = r"(?:(?:very|really|particularly|at all|that)\s+){0,2}"
        for phrase in sorted(cls.POSITIVE_WEIGHTS, key=len, reverse=True):
            lowered = re.sub(
                rf"\b{negator}\s+{modifier}{re.escape(phrase)}\b",
                " ",
                lowered,
                flags=re.IGNORECASE,
            )

        return any(
            re.search(rf"(?<!\w){re.escape(term)}(?!\w)", lowered)
            for term in cls.POSITIVE_TERMS
        )

    @classmethod
    def _extract_answer_dimension(
        cls,
        text: str,
        keywords: Tuple[str, ...],
    ) -> str:
        """Select clauses relevant to one of Question 2's service dimensions."""
        text = (text or "").strip()
        if not text:
            return ""

        clauses = re.split(
            r"(?<=[.!?])\s+|\s+(?:and|but|however|although|though)\s+",
            text,
            flags=re.IGNORECASE,
        )
        selected = [
            clause.strip()
            for clause in clauses
            if any(keyword in clause.lower() for keyword in keywords)
        ]

        # Only score evidence that can be attributed to this dimension.
        return " ".join(selected)

    @classmethod
    def _split_clauses(cls, text: str) -> List[str]:
        return [
            clause.strip(" \t\r\n,;:-")
            for clause in cls.QUESTION_SPLIT_RE.split(text or "")
            if clause.strip(" \t\r\n,;:-")
        ]

    @classmethod
    def _derive_feedback_fields(
        cls,
        answers: Dict[int, str],
        staff_text: str,
        medicine_text: str,
    ) -> Tuple[List[str], List[str], List[str], List[str]]:
        """Create report findings only from phrases present in patient answers."""
        positives: List[str] = []
        negatives: List[str] = []
        issues: List[str] = []
        improvements: List[str] = []

        checks = [
            ("Cleanliness and basic facilities", answers.get(1, ""),
             "Improve cleanliness, sanitation, and facility maintenance."),
            ("Staff behaviour", staff_text,
             "Review the reported staff interaction and improve communication where needed."),
            ("Medicine timeliness", medicine_text,
             "Review medicine delivery timing against the prescribed schedule."),
            ("Doctor treatment and overall service", answers.get(3, ""),
             "Review the patient's treatment and service concerns."),
            ("Staff experience and suggestions", answers.get(4, ""),
             "Review the staff feedback and suggestions explicitly provided by the patient."),
        ]

        for label, text, improvement in checks:
            for clause in cls._split_clauses(text):
                has_negative = cls._has_negative_signal(clause)
                has_positive = cls._has_positive_signal(clause)

                if has_positive:
                    positives.append(
                        f"Patient expressed positive feedback about {label.lower()}: {clause}."
                    )

                if has_negative:
                    negatives.append(
                        f"Patient reported a concern about {label.lower()}: {clause}."
                    )
                    issues.append(f"Reported concern: {label}.")
                    improvements.append(improvement)

        return (
            list(dict.fromkeys(positives)),
            list(dict.fromkeys(negatives)),
            list(dict.fromkeys(issues)),
            list(dict.fromkeys(improvements)),
        )

    @classmethod
    def _suggestions_from_answer(cls, text: str) -> List[str]:
        """Extract explicit suggestions without treating 'no suggestions' as one."""
        markers = (
            "suggest", "please", "should", "need to", "needs to", "have to",
            "improve", "add ", "provide ", "more ", "less ", "maintain",
            "would be better", "could be",
        )
        no_suggestion_patterns = (
            r"\bno\s+suggestions?\b",
            r"\bno\s+improvement\s+(?:is\s+)?needed\b",
            r"\bnothing\s+to\s+(?:suggest|improve)\b",
            r"\bno\s+changes?\s+(?:are\s+)?needed\b",
        )
        suggestions = []
        for clause in cls._split_clauses(text):
            lowered = clause.lower()
            if any(re.search(pattern, lowered) for pattern in no_suggestion_patterns):
                continue
            if any(marker in lowered for marker in markers):
                suggestions.append(clause)
        return list(dict.fromkeys(suggestions))

    @classmethod
    def _extract_staff_from_answer(
        cls,
        text: str,
    ) -> Tuple[List[str], List[str]]:
        """Extract named staff only when a name and related evidence coexist."""
        appreciated: List[str] = []
        dissatisfied: List[str] = []

        for clause in cls._split_clauses(text):
            names = []
            for match in cls.STAFF_NAME_RE.finditer(clause):
                role = re.sub(r"\.$", "", match.group(1)).title()
                name = match.group(2).title()
                names.append(f"{role} {name}")

            if not names:
                continue

            if cls._has_positive_signal(clause) or any(
                word in clause.lower()
                for word in ("appreciate", "appreciated", "thank", "excellent", "good")
            ):
                appreciated.extend(names)

            if cls._has_negative_signal(clause):
                dissatisfied.extend(names)

        return list(dict.fromkeys(appreciated)), list(dict.fromkeys(dissatisfied))

    @classmethod
    def _derive_sentiment(
        cls,
        answers: Dict[int, str],
        scores: Dict[str, int],
    ) -> str:
        """Derive an overall sentiment from the evidence-based category scores."""
        category_values = [
            scores.get("cleanliness_facilities", 50),
            scores.get("staff_behaviour", 50),
            scores.get("medicine_timeliness", 50),
            scores.get("doctor_treatment", 50),
            scores.get("overall_service", 50),
        ]
        average = sum(category_values) / len(category_values)
        positive_count = sum(
            cls._has_positive_signal(text) for text in answers.values()
        )
        negative_count = sum(
            cls._has_negative_signal(text) for text in answers.values()
        )

        if average <= 40:
            return "negative"
        if average >= 70 and negative_count == 0:
            return "positive"
        if positive_count and negative_count:
            return "mixed"
        if negative_count:
            return "negative"
        if positive_count:
            return "positive"
        return "neutral"

    @staticmethod
    def _make_summary(
        score: int,
        sentiment: str,
        positives: List[str],
        negatives: List[str],
    ) -> str:
        parts = [
            f"The patient feedback indicates a {sentiment} experience "
            f"(language-based estimated score: {score}/100)."
        ]
        if positives:
            parts.append(f"{len(positives)} positive evidence point(s) were found in the answers.")
        if negatives:
            parts.append(f"{len(negatives)} concern(s) were identified for review.")
        if not positives and not negatives:
            parts.append("The answers did not contain clear positive or negative wording.")
        parts.append(
            "This score is an estimate based on transcript wording, not a numeric rating explicitly provided by the patient."
        )
        return " ".join(parts)

    @classmethod
    def _safe_score(cls, value, default: int = 50) -> int:
        """Compatibility helper for callers that need to normalize a numeric score."""
        try:
            return max(0, min(100, int(round(float(value)))))
        except (TypeError, ValueError):
            return default

    @classmethod
    def _string_list(cls, value) -> List[str]:
        """Compatibility helper: normalize a value to non-empty strings."""
        if isinstance(value, str):
            value = [value]
        if not isinstance(value, list):
            return []
        return [item.strip() for item in value if isinstance(item, str) and item.strip()]

    @classmethod
    def _generate_fallback_analysis(
        cls,
        session: FeedbackSession,
    ) -> Dict:
        """Compatibility fallback using the same deterministic scoring rubric."""
        answers = {
            answer.question_id: (answer.transcript or "").strip()
            for answer in session.answers
        }
        q1 = answers.get(1, "")
        q2 = answers.get(2, "")
        q3 = answers.get(3, "")
        q4 = answers.get(4, "")

        staff_text = cls._extract_answer_dimension(
            q2,
            ("staff", "nurse", "nursing", "sister", "behaviour", "behavior", "polite", "rude", "helpful", "caring", "professional", "respectful"),
        )
        medicine_text = cls._extract_answer_dimension(
            q2,
            ("medicine", "medicines", "dose", "doses", "tablet", "injection", "timeliness", "timely", "delayed", "delay", "late", "schedule", "on time"),
        )

        scores = {
            "cleanliness_facilities": cls._score_answer(q1),
            "staff_behaviour": cls._score_answer(staff_text),
            "medicine_timeliness": cls._score_answer(medicine_text),
            "doctor_treatment": cls._score_answer(q3),
            "overall_service": cls._score_answer(q3),
        }
        category_scores = CategoryScores(**scores)
        overall_score = round(ScoringService.calculate_overall_score(category_scores))
        sentiment = cls._derive_sentiment(answers, scores)
        positives, negatives, issues, improvements = cls._derive_feedback_fields(
            answers, staff_text, medicine_text
        )
        appreciated, dissatisfied = cls._extract_staff_from_answer(q4)

        return {
            "overall_sentiment": sentiment,
            "overall_score": overall_score,
            "category_scores": scores,
            "positive_feedback": positives,
            "negative_feedback": negatives,
            "key_issues": issues,
            "improvement_areas": improvements,
            "patient_suggestions": cls._suggestions_from_answer(q4),
            "appreciated_staff": appreciated,
            "dissatisfied_staff": dissatisfied,
            "summary": cls._make_summary(overall_score, sentiment, positives, negatives),
        }
