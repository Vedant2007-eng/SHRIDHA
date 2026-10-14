from fastapi import APIRouter
from app.config import settings
from app.models.report import ApiResponse

router = APIRouter(prefix="/api/health", tags=["Health"])


@router.get("", response_model=ApiResponse[dict])
def health_check():
    """Service health check endpoint."""
    return ApiResponse(
        success=True,
        data={
            "status": "ok",
            "service": settings.APP_NAME,
            "version": settings.APP_VERSION,
        },
    )
