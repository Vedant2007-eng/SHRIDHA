from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class StartFeedbackRequest(BaseModel):
    language: str = Field(
        default="English",
        description="Selected language (e.g. English, Hindi, Marathi)",
        min_length=2,
        max_length=50,
    )


class AnswerInput(BaseModel):
    question_id: int = Field(..., ge=1, le=4, description="Question ID (1 to 4)")
    transcript: str = Field(..., min_length=1, max_length=5000, description="Patient voice response transcript")
    question: Optional[str] = Field(None, description="Optional text of the question")
    timestamp: Optional[str] = Field(None, description="ISO timestamp of when the answer was recorded")

    @field_validator("transcript")
    @classmethod
    def validate_transcript(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Transcript cannot be empty or whitespace only.")
        return cleaned


class AnswersSubmission(BaseModel):
    answers: List[AnswerInput] = Field(
        ...,
        min_length=4,
        max_length=4,
        description="All four answers for Question 1 to Question 4",
    )

    @field_validator("answers")
    @classmethod
    def validate_all_questions_present(cls, answers: List[AnswerInput]) -> List[AnswerInput]:
        ids = {a.question_id for a in answers}
        expected = {1, 2, 3, 4}
        if ids != expected:
            raise ValueError(f"Submission must contain answers for questions 1, 2, 3, and 4. Found question IDs: {sorted(list(ids))}")
        return answers


class QuestionItem(BaseModel):
    id: int
    text: str
    category: str
    categories: Optional[List[str]] = None


class FeedbackSession(BaseModel):
    feedback_id: str = Field(..., description="Unique feedback identifier (e.g. CV2610051234)")
    language: str = Field(default="English", description="Language used during the feedback session")
    answers: List[AnswerInput] = Field(default_factory=list, description="List of recorded answers")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 creation timestamp",
    )
    status: str = Field(
        default="created",
        description="Session status: created | in_progress | completed | analyzed | failed",
    )
