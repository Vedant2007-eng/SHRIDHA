from fastapi import APIRouter, HTTPException, status
from app.models.report import HospitalReport, ApiResponse
from app.services.analysis_service import AnalysisService
from app.services.feedback_service import FeedbackService
from app.utils.validators import is_valid_feedback_id

router = APIRouter(tags=["Analysis & Reports"])


@router.post("/api/feedback/{feedback_id}/analyze", response_model=ApiResponse[HospitalReport])
def analyze_feedback(feedback_id: str):
    """
    Perform Groq AI analysis on patient feedback:
    1. Fetches all 4 answers.
    2. Sends structured prompt to Groq model.
    3. Validates category scores and computes weighted overall rating.
    4. Saves and returns the complete report.
    If already analyzed, returns the existing report.
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

    if not session.answers or len(session.answers) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INCOMPLETE_ANSWERS",
                "message": f"Cannot analyze session '{feedback_id}'. All 4 answers must be submitted first.",
            },
        )

    try:
        report = AnalysisService.analyze_feedback(feedback_id)
        return ApiResponse(success=True, data=report)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "ANALYSIS_FAILED", "message": f"Analysis failed: {str(e)}"},
        )


@router.get("/api/reports/{feedback_id}", response_model=ApiResponse[HospitalReport])
def get_report(feedback_id: str):
    """
    Retrieve structured report for a feedback session.
    Used by the /report page to render the interactive dashboard and PDF download.
    """
    if not is_valid_feedback_id(feedback_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FEEDBACK_ID", "message": f"Invalid feedback ID format: '{feedback_id}'."},
        )

    report = FeedbackService.get_report(feedback_id)
    if not report:
        # Check if session exists and is ready for auto-analysis
        session = FeedbackService.get_session(feedback_id)
        if session and session.answers and len(session.answers) == 4:
            report = AnalysisService.analyze_feedback(feedback_id)
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"code": "REPORT_NOT_FOUND", "message": f"Report for feedback ID '{feedback_id}' not found."},
            )

    return ApiResponse(success=True, data=report)
