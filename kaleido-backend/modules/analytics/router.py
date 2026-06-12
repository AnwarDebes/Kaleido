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


@router.get("/activity")
async def get_activity(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Honest local activity stats: posting streak, counts, and totals of
    self-reported results. No platform data involved."""
    from datetime import datetime, timedelta, timezone

    from sqlalchemy import func, select

    from modules.content.models import ManualStat, Post

    # All distinct days (UTC) the user published something
    result = await db.execute(
        select(func.date(Post.published_at))
        .where(
            Post.user_id == user.id,
            Post.published_at.isnot(None),
            Post.deleted_at.is_(None),
        )
        .distinct()
    )
    days = {d for (d,) in result.all() if d is not None}

    today = datetime.now(timezone.utc).date()
    streak = 0
    cursor = today if today in days else today - timedelta(days=1)
    while cursor in days:
        streak += 1
        cursor -= timedelta(days=1)

    week_start = today - timedelta(days=today.weekday())
    result = await db.execute(
        select(func.count(Post.id)).where(
            Post.user_id == user.id,
            Post.published_at.isnot(None),
            Post.deleted_at.is_(None),
            func.date(Post.published_at) >= week_start,
        )
    )
    published_this_week = result.scalar() or 0

    result = await db.execute(
        select(func.count(Post.id)).where(
            Post.user_id == user.id,
            Post.status == "published",
            Post.deleted_at.is_(None),
        )
    )
    published_total = result.scalar() or 0

    result = await db.execute(
        select(
            func.coalesce(func.sum(ManualStat.views), 0),
            func.coalesce(func.sum(ManualStat.likes), 0),
            func.coalesce(func.sum(ManualStat.comments), 0),
            func.coalesce(func.sum(ManualStat.shares), 0),
            func.count(ManualStat.id),
        ).where(ManualStat.user_id == user.id)
    )
    views, likes, comments, shares, entries = result.one()

    return {
        "success": True,
        "data": {
            "streak_days": streak,
            "published_this_week": published_this_week,
            "published_total": published_total,
            "self_reported": {
                "entries": entries,
                "views": int(views),
                "likes": int(likes),
                "comments": int(comments),
                "shares": int(shares),
            },
        },
    }
