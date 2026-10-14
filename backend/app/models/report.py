from datetime import datetime, timezone
from typing import Dict, Generic, List, Optional, TypeVar
from pydantic import BaseModel, Field

T = TypeVar("T")


class CategoryScores(BaseModel):
    cleanliness_facilities: int = Field(..., ge=0, le=100, description="Cleanliness & basic facilities score (0-100)")
    staff_behaviour: int = Field(..., ge=0, le=100, description="Staff behaviour score (0-100)")
    medicine_timeliness: int = Field(..., ge=0, le=100, description="Medicine doses timeliness score (0-100)")
    doctor_treatment: int = Field(..., ge=0, le=100, description="Doctor treatment and explanation score (0-100)")
    overall_service: int = Field(..., ge=0, le=100, description="Overall hospital service satisfaction score (0-100)")


class HospitalReport(BaseModel):
    feedback_id: str = Field(..., description="Unique feedback identifier")
    overall_score: int = Field(..., ge=0, le=100, description="Weighted average overall hospital score (0-100)")
    status: str = Field(..., description="Status label: Excellent | Good | Needs Improvement | Poor")
    category_scores: CategoryScores = Field(..., description="Scores broken down by key hospital categories")
    overall_sentiment: str = Field(default="neutral", description="Overall sentiment: positive | neutral | negative | mixed")
    positive_feedback: List[str] = Field(default_factory=list, description="List of positive observations")
    negative_feedback: List[str] = Field(default_factory=list, description="List of negative observations")
    key_issues: List[str] = Field(default_factory=list, description="Critical problems identified")
    improvement_areas: List[str] = Field(default_factory=list, description="Specific departments/processes needing improvement")
    patient_suggestions: List[str] = Field(default_factory=list, description="Constructive suggestions given by the patient")
    appreciated_staff: List[str] = Field(default_factory=list, description="Staff members or roles commended by the patient")
    dissatisfied_staff: List[str] = Field(default_factory=list, description="Staff members or roles receiving negative feedback")
    summary: str = Field(..., description="Executive summary of patient feedback")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 creation timestamp",
    )


class ApiErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error explanation")
    details: Optional[Dict] = Field(None, description="Additional context or validation details")


class ApiResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    error: Optional[ApiErrorDetail] = None
