
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import DatabaseManager
from app.routes import analysis, feedback, health


# Configure logging
logging.basicConfig(
    level=logging.INFO if not settings.DEBUG else logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("carevoice")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown events."""
    logger.info("Initializing CareVoice Backend...")
    DatabaseManager.connect()

    try:
        yield
    finally:
        logger.info("Shutting down CareVoice Backend...")
        DatabaseManager.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "CareVoice — Hospital Voice Feedback System Backend API. "
        "Provides voice session persistence, Groq AI multimodal sentiment "
        "& category scoring, and structured clinical reporting."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# CORS configuration
# Preserve origins configured in app.config.py and explicitly allow
# the local Vite frontend used during development.
configured_origins = settings.get_cors_origins()

if isinstance(configured_origins, str):
    configured_origins = [
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    ]
else:
    configured_origins = list(configured_origins or [])

local_frontend_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

origins = list(
    dict.fromkeys(
        configured_origins + local_frontend_origins
    )
)

logger.info("Configured CORS origins: %s", origins)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handlers


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException,
):
    detail = exc.detail

    if isinstance(detail, dict):
        code = detail.get("code", "HTTP_ERROR")
        message = detail.get("message", "An error occurred.")
        details = detail.get("details")
    else:
        code = f"HTTP_{exc.status_code}"
        message = str(detail)
        details = None

    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details,
            },
        },
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
):
    errors = exc.errors()
    first_error = errors[0] if errors else {}
    message = first_error.get("msg", "Validation error")
    location = " -> ".join(
        str(item) for item in first_error.get("loc", [])
    )

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": (
                    f"{message} at {location}"
                    if location
                    else message
                ),
                "details": {"errors": errors},
            },
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request,
    exc: Exception,
):
    logger.error(
        "Unhandled server error: %s",
        exc,
        exc_info=True,
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": (
                    "An unexpected server error occurred. "
                    "Please try again later."
                ),
            },
        },
    )


# Include API routers
app.include_router(health.router)
app.include_router(feedback.router)
app.include_router(analysis.router)
