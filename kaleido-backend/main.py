from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from config.database import engine
from config.redis import redis_client
from config.settings import settings
from core.exceptions import KaleidoException
from core.middleware import RequestLoggingMiddleware
from modules.auth.router import router as auth_router
from modules.brands.router import router as brands_router
from modules.social_accounts.router import router as social_accounts_router
from modules.content.router import router as content_router
from modules.media.router import router as media_router
from modules.scheduling.router import router as scheduling_router
from modules.analytics.router import router as analytics_router
from modules.campaigns.router import router as campaigns_router
from modules.blog.router import router as blog_router
from modules.newsletter.router import router as newsletter_router
from modules.chat.router import router as chat_router
from modules.integrations.router import router as integrations_router
from modules.referral.router import router as referral_router

structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer() if settings.debug else structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        structlog.get_config()["wrapper_class"].log_level if not settings.debug else 0
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("kaleido_starting", version="0.1.0")
    yield
    await engine.dispose()
    await redis_client.close()
    logger.info("kaleido_shutdown")


app = FastAPI(
    title="Kaleido API",
    description="AI-powered social media automation platform",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "https://skill-bridge-theta-livid.vercel.app",
        "https://skill-bridge-git-main-anwardebes-projects.vercel.app",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"https://skill-bridge.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging
app.add_middleware(RequestLoggingMiddleware)


# Exception handler for KaleidoException
@app.exception_handler(KaleidoException)
async def kaleido_exception_handler(request, exc: KaleidoException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.detail,
                "details": exc.error_details,
            },
        },
    )


# --- Routers ---
app.include_router(auth_router, prefix="/v1")
app.include_router(brands_router, prefix="/v1")
app.include_router(social_accounts_router, prefix="/v1")
app.include_router(content_router, prefix="/v1")
app.include_router(media_router, prefix="/v1")
app.include_router(scheduling_router, prefix="/v1")
app.include_router(analytics_router, prefix="/v1")
app.include_router(campaigns_router, prefix="/v1")
app.include_router(blog_router, prefix="/v1")
app.include_router(newsletter_router, prefix="/v1")
app.include_router(chat_router, prefix="/v1")
app.include_router(integrations_router, prefix="/v1")
app.include_router(referral_router, prefix="/v1")


# --- Health Endpoints ---


@app.get("/health")
async def health_check():
    return {"success": True, "data": {"status": "healthy", "version": "0.1.0"}}


@app.get("/health/detailed")
async def health_detailed():
    checks = {}

    # Database check
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = {"status": "healthy"}
    except Exception as e:
        checks["database"] = {"status": "unhealthy", "error": str(e)}

    # Redis check
    try:
        await redis_client.ping()
        checks["redis"] = {"status": "healthy"}
    except Exception as e:
        checks["redis"] = {"status": "unhealthy", "error": str(e)}

    # Ollama check
    try:
        import httpx

        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.ollama_base_url}/api/tags")
            if resp.status_code == 200:
                checks["ollama"] = {"status": "healthy"}
            else:
                checks["ollama"] = {"status": "unhealthy", "error": f"HTTP {resp.status_code}"}
    except Exception as e:
        checks["ollama"] = {"status": "unavailable", "error": str(e)}

    overall = "healthy" if all(c["status"] == "healthy" for c in checks.values() if c.get("status") != "unavailable") else "degraded"

    return {
        "success": True,
        "data": {
            "status": overall,
            "version": "0.1.0",
            "checks": checks,
        },
    }
