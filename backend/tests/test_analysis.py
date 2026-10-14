from fastapi.testclient import TestClient
from app.main import app
from app.models.report import CategoryScores
from app.services.scoring_service import ScoringService

client = TestClient(app)


def test_scoring_service_calculations():
    # Test weights: Cleanliness 20%, Staff 20%, Medicine 15%, Doctor 25%, Overall 20%
    # 85*0.2 + 78*0.2 + 76*0.15 + 88*0.25 + 82*0.20
    # = 17.0 + 15.6 + 11.4 + 22.0 + 16.4 = 82.4 -> 82
    categories = CategoryScores(
        cleanliness_facilities=85,
        staff_behaviour=78,
        medicine_timeliness=76,
        doctor_treatment=88,
        overall_service=82,
    )
    score = ScoringService.calculate_overall_score(categories)
    assert score == 82

    status, desc = ScoringService.get_score_status(score)
    assert status == "Good"
    assert "High patient satisfaction" in desc

    # Test Excellent
    high_categories = CategoryScores(
        cleanliness_facilities=95,
        staff_behaviour=92,
        medicine_timeliness=90,
        doctor_treatment=98,
        overall_service=94,
    )
    high_score = ScoringService.calculate_overall_score(high_categories)
    assert high_score >= 90
    high_status, _ = ScoringService.get_score_status(high_score)
    assert high_status == "Excellent"


def test_feedback_analysis_and_report_flow():
    # 1. Start session
    start_res = client.post("/api/feedback/start", json={"language": "English"})
    feedback_id = start_res.json()["data"]["feedback_id"]

    # 2. Submit answers
    answers_payload = {
        "answers": [
            {
                "question_id": 1,
                "transcript": "Hospital cleanliness was generally good, but 2nd floor washroom was dirty.",
            },
            {
                "question_id": 2,
                "transcript": "Nurses were polite, though morning medicine arrived with slight delay.",
            },
            {
                "question_id": 3,
                "transcript": "Dr. Sharma was exceptional and took time to explain the procedure.",
            },
            {
                "question_id": 4,
                "transcript": "Sister Priya in ward 4 was wonderful. Please install digital queue displays.",
            },
        ]
    }
    client.post(f"/api/feedback/{feedback_id}/answers", json=answers_payload)

    # 3. Trigger analysis
    analyze_res = client.post(f"/api/feedback/{feedback_id}/analyze")
    assert analyze_res.status_code == 200
    report_data = analyze_res.json()["data"]

    assert report_data["feedback_id"] == feedback_id
    assert "overall_score" in report_data
    assert report_data["overall_score"] > 0
    assert report_data["status"] in ["Excellent", "Good", "Needs Improvement", "Poor"]
    assert "cleanliness_facilities" in report_data["category_scores"]
    assert "doctor_treatment" in report_data["category_scores"]
    assert len(report_data["positive_feedback"]) > 0
    assert len(report_data["summary"]) > 0

    # 4. Duplicate call returns existing report without error
    duplicate_res = client.post(f"/api/feedback/{feedback_id}/analyze")
    assert duplicate_res.status_code == 200
    assert duplicate_res.json()["data"]["feedback_id"] == feedback_id

    # 5. Fetch report via GET /api/reports/{feedback_id}
    get_report_res = client.get(f"/api/reports/{feedback_id}")
    assert get_report_res.status_code == 200
    assert get_report_res.json()["data"]["feedback_id"] == feedback_id
