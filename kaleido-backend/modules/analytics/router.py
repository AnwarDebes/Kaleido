import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.analytics.schemas import (
    BestTimeSlot,
    GrowthDataPoint,
    OverviewMetrics,
    PostMetrics,
)
from modules.analytics.service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_overview(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    platform: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await AnalyticsService.get_overview(
        db, user.id, start_date=start_date, end_date=end_date, platform=platform
    )
    return {
        "success": True,
        "data": OverviewMetrics(**data).model_dump(),
    }


@router.get("/posts")
async def get_post_analytics(
    post_id: uuid.UUID | None = None,
    platform: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    analytics, total = await AnalyticsService.get_post_analytics(
        db, user.id, post_id=post_id, platform=platform, limit=per_page, offset=offset
    )
    return {
        "success": True,
        "data": [PostMetrics.model_validate(a).model_dump() for a in analytics],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }


@router.get("/growth")
async def get_growth(
    days: int = Query(default=30, ge=1, le=365),
    platform: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await AnalyticsService.get_growth_data(db, user.id, days=days, platform=platform)
    return {
        "success": True,
        "data": [GrowthDataPoint(**d).model_dump() for d in data],
    }


@router.get("/best-times")
async def get_best_times(
    platform: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await AnalyticsService.get_best_posting_times(db, user.id, platform=platform)
    return {
        "success": True,
        "data": [BestTimeSlot(**d).model_dump() for d in data],
    }
