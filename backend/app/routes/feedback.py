from typing import Dict, List, Optional
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.models.feedback import (
    AnswersSubmission,
    FeedbackSession,
    QuestionItem,
    StartFeedbackRequest,
)
from app.models.report import ApiErrorDetail, ApiResponse
from app.prompts.feedback_analysis import CENTRAL_QUESTIONS
from app.services.analysis_service import AnalysisService
from app.services.feedback_service import FeedbackService
from app.utils.validators import is_valid_feedback_id

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])


@router.post("/transcribe", response_model=ApiResponse[Dict[str, str]])
async def transcribe_audio(
    file: UploadFile = File(...),
    language: Optional[str] = Form("English"),
):
    """
    Transcribe audio blob recorded from patient's browser.
    Uses Groq Whisper model with high accuracy across English, Hindi, Marathi, etc.
    """
    try:
        content = await file.read()
        transcript = AnalysisService.transcribe_audio(
            file_bytes=content,
            filename=file.filename or "audio.webm",
            language=language,
        )
        return ApiResponse(success=True, data={"transcript": transcript})
    except Exception as e:
        return ApiResponse(
            success=False,
            error=ApiErrorDetail(code="TRANSCRIPTION_ERROR", message=str(e)),
        )



@router.post("/start", response_model=ApiResponse[Dict[str, str]], status_code=status.HTTP_201_CREATED)
def start_feedback(request: StartFeedbackRequest):
    """
    Start a new anonymous feedback session.
    Generates a unique feedback_id (e.g. CV2610051234).
    """
    session = FeedbackService.create_session(language=request.language)
    return ApiResponse(
        success=True,
        data={
            "feedback_id": session.feedback_id,
            "language": session.language,
        },
    )


@router.get("/questions", response_model=ApiResponse[Dict[str, List[QuestionItem]]])
def get_questions():
    """
    Retrieve the 4 standard central questions.
    Frontend can consume this dynamic list instead of hardcoding.
    """
    questions = [
        QuestionItem(
            id=q["id"],
            text=q["text"],
            category=q["category"],
            categories=q.get("categories"),
        )
        for q in CENTRAL_QUESTIONS
    ]
    return ApiResponse(
        success=True,
        data={"questions": questions},
    )


@router.post("/{feedback_id}/answers", response_model=ApiResponse[Dict[str, str]])
def save_answers(feedback_id: str, submission: AnswersSubmission):
    """
    Submit all four answers for Question 1 to Question 4.
    Validates that session exists and that exactly 4 valid question transcripts are provided.
    """
    if not is_valid_feedback_id(feedback_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FEEDBACK_ID", "message": f"Invalid feedback ID format: '{feedback_id}'."},
        )

    session = FeedbackService.get_session(feedback_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FEEDBACK_NOT_FOUND", "message": f"Feedback session '{feedback_id}' was not found."},
        )

    updated_session = FeedbackService.save_answers(feedback_id, submission.answers)
    if not updated_session:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "SAVE_FAILED", "message": "Failed to record patient answers."},
        )

    return ApiResponse(
        success=True,
        data={
            "feedback_id": feedback_id,
            "message": "All 4 answers saved successfully.",
            "status": updated_session.status,
        },
    )


@router.get("/{feedback_id}", response_model=ApiResponse[FeedbackSession])
def get_feedback_session(feedback_id: str):
    """
    Get existing feedback session details without exposing internal database IDs.
    """
    if not is_valid_feedback_id(feedback_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FEEDBACK_ID", "message": f"Invalid feedback ID format: '{feedback_id}'."},
        )

    session = FeedbackService.get_session(feedback_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "FEEDBACK_NOT_FOUND", "message": f"Feedback session '{feedback_id}' was not found."},
        )

    return ApiResponse(success=True, data=session)
