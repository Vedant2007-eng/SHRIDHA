from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_start_feedback():
    response = client.post("/api/feedback/start", json={"language": "English"})
    assert response.status_code == 201
    json_data = response.json()
    assert json_data["success"] is True
    assert "feedback_id" in json_data["data"]
    assert json_data["data"]["feedback_id"].startswith("CV")
    assert json_data["data"]["language"] == "English"


def test_get_questions():
    response = client.get("/api/feedback/questions")
    assert response.status_code == 200
    json_data = response.json()
    assert json_data["success"] is True
    questions = json_data["data"]["questions"]
    assert len(questions) == 4
    assert questions[0]["id"] == 1
    assert questions[0]["category"] == "cleanliness_facilities"
    assert questions[1]["id"] == 2
    assert questions[2]["id"] == 3
    assert questions[3]["id"] == 4


def test_submit_answers_and_get_session():
    # 1. Start session
    start_res = client.post("/api/feedback/start", json={"language": "Hindi"})
    feedback_id = start_res.json()["data"]["feedback_id"]

    # 2. Submit all 4 answers
    submission_payload = {
        "answers": [
            {
                "question_id": 1,
                "transcript": "अस्पताल काफी साफ सुथरा था और वार्ड अच्छे थे।",
            },
            {
                "question_id": 2,
                "transcript": "स्टाफ का व्यवहार बहुत अच्छा था और समय पर दवाइयाँ मिलीं।",
            },
            {
                "question_id": 3,
                "transcript": "डॉक्टर ने बहुत अच्छे से समझाया और इलाज से मैं संतुष्ट हूँ।",
            },
            {
                "question_id": 4,
                "transcript": "नर्सिंग स्टाफ का काम सराहनीय था। टोकन सिस्टम होना चाहिए।",
            },
        ]
    }
    ans_res = client.post(f"/api/feedback/{feedback_id}/answers", json=submission_payload)
    assert ans_res.status_code == 200
    assert ans_res.json()["success"] is True

    # 3. Retrieve session
    get_res = client.get(f"/api/feedback/{feedback_id}")
    assert get_res.status_code == 200
    session_data = get_res.json()["data"]
    assert session_data["feedback_id"] == feedback_id
    assert session_data["language"] == "Hindi"
    assert len(session_data["answers"]) == 4
    assert session_data["status"] == "completed"


def test_submit_invalid_answers():
    start_res = client.post("/api/feedback/start", json={"language": "English"})
    feedback_id = start_res.json()["data"]["feedback_id"]

    # Only 2 answers provided instead of required 4
    incomplete_payload = {
        "answers": [
            {"question_id": 1, "transcript": "Clean"},
            {"question_id": 2, "transcript": "Good staff"},
        ]
    }
    res = client.post(f"/api/feedback/{feedback_id}/answers", json=incomplete_payload)
    assert res.status_code == 422


def test_nonexistent_feedback_id():
    res = client.get("/api/feedback/CV2610059999")
    assert res.status_code == 404
    assert res.json()["success"] is False
    assert res.json()["error"]["code"] == "FEEDBACK_NOT_FOUND"
