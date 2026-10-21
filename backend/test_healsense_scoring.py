"""Unit tests for HealSense text scoring and evidence-based survey scores."""
import unittest

from app.services.nlp_service import score_text, analyze_feedback
from app.services.scoring_service import _score_from_patient_evidence


class TestHealSenseScoring(unittest.TestCase):
    def test_positive_feedback_scores_above_neutral(self):
        result = score_text("The hospital was excellent, clean, and the staff were very helpful.")
        self.assertGreater(result["score"], 5.5)
        self.assertEqual(result["sentiment"], "POSITIVE")
        self.assertTrue(result["positive_evidence"])

    def test_negative_feedback_scores_below_neutral(self):
        result = score_text("The hospital was dirty and the staff were rude.")
        self.assertLess(result["score"], 5.5)
        self.assertEqual(result["sentiment"], "NEGATIVE")
        self.assertTrue(result["negative_evidence"])

    def test_mixed_feedback_detects_both_polarities(self):
        result = score_text("The staff were helpful, but the room was dirty.")
        self.assertTrue(result["positive_evidence"])
        self.assertTrue(result["negative_evidence"])
        self.assertNotEqual(result["sentiment"], "POSITIVE")

    def test_empty_text_returns_neutral_placeholder(self):
        result = score_text("")
        self.assertEqual(result["score"], 5.0)
        self.assertEqual(result["sentiment"], "NEUTRAL")

    def test_explicit_rating_is_respected(self):
        result = score_text("I rate the hospital 8 out of 10.")
        self.assertEqual(result["score"], 8.0)

    def test_survey_scores_change_with_actual_feedback(self):
        positive_answers = [
            {"answer": "The hospital was very clean and hygienic."},
            {"answer": "The staff were polite and helpful; medicines were given on time."},
            {"answer": "The doctors were excellent and I am satisfied with the treatment."},
            {"answer": "I appreciate the caring staff."},
        ]
        negative_answers = [
            {"answer": "The hospital was very dirty and unclean."},
            {"answer": "The staff were rude and medicines were delayed."},
            {"answer": "The treatment was poor and I am dissatisfied."},
            {"answer": "I have complaints about the service."},
        ]

        positive_report = _score_from_patient_evidence(positive_answers)
        negative_report = _score_from_patient_evidence(negative_answers)

        self.assertGreater(
            positive_report["overall_score"], negative_report["overall_score"]
        )

    def test_unmentioned_aspects_are_not_in_overall_average(self):
        answers = [{"answer": "The hospital was clean."}]
        report = _score_from_patient_evidence(answers)

        self.assertIn("cleanliness", report["scored_aspects"])
        self.assertNotIn("staff_behavior", report["scored_aspects"])
        self.assertNotIn("medicine_timeliness", report["scored_aspects"])
        self.assertNotIn("doctor_treatment", report["scored_aspects"])
        self.assertEqual(report["aspects"]["staff_behavior"]["score"], 5.0)

    def test_analyze_feedback_returns_expected_fields(self):
        result = analyze_feedback("The room was dirty. The nurse was helpful.")
        self.assertIn("flagged_topics", result)
        self.assertIn("sentence_analysis", result)
        self.assertGreaterEqual(len(result["sentence_analysis"]), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
