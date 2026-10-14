from typing import Dict, Tuple
from app.config import settings
from app.models.report import CategoryScores


class ScoringService:
    @staticmethod
    def get_weights() -> Dict[str, float]:
        """Return the category weight mapping."""
        return {
            "cleanliness_facilities": settings.WEIGHT_CLEANLINESS,
            "staff_behaviour": settings.WEIGHT_STAFF_BEHAVIOUR,
            "medicine_timeliness": settings.WEIGHT_MEDICINE_TIMELINESS,
            "doctor_treatment": settings.WEIGHT_DOCTOR_TREATMENT,
            "overall_service": settings.WEIGHT_OVERALL_SERVICE,
        }

    @classmethod
    def calculate_overall_score(cls, category_scores: CategoryScores) -> int:
        """
        Calculate weighted average overall score.
        Cleanliness: 20%, Staff: 20%, Medicine: 15%, Doctor: 25%, Overall Service: 20%
        """
        weights = cls.get_weights()
        weighted_sum = (
            category_scores.cleanliness_facilities * weights["cleanliness_facilities"]
            + category_scores.staff_behaviour * weights["staff_behaviour"]
            + category_scores.medicine_timeliness * weights["medicine_timeliness"]
            + category_scores.doctor_treatment * weights["doctor_treatment"]
            + category_scores.overall_service * weights["overall_service"]
        )
        # Clamp between 0 and 100
        score = int(round(weighted_sum))
        return max(0, min(100, score))

    @staticmethod
    def get_score_status(score: int) -> Tuple[str, str]:
        """
        Map score to status label and descriptive text:
        90–100: "Excellent"
        75–89: "Good"
        60–74: "Needs Improvement"
        Below 60: "Poor"
        """
        if score >= 90:
            return "Excellent", "Exceptional patient experience across all hospital departments."
        elif score >= 75:
            return "Good", "High patient satisfaction with minor areas for quality enhancement."
        elif score >= 60:
            return "Needs Improvement", "Several key service and operational bottlenecks were noted."
        else:
            return "Poor", "Critical concerns identified requiring immediate administrative attention."
