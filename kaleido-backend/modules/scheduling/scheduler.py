import uuid
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError, ValidationError
from modules.content.models import Post

logger = structlog.get_logger()

# Optimal posting times per platform (UTC hours)
OPTIMAL_TIMES = {
    "twitter": [9, 12, 15, 18],
    "instagram": [8, 11, 14, 17, 20],
    "linkedin": [8, 10, 12, 17],
    "facebook": [9, 13, 16, 19],
    "tiktok": [10, 14, 19, 21],
    "youtube": [12, 15, 18],
}


class Scheduler:
    @staticmethod
    async def schedule_post(
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        scheduled_at: datetime,
    ) -> Post:
        """Schedule a post for a specific time."""
        result = await db.execute(
            select(Post).where(
                Post.id == post_id,
                Post.user_id == user_id,
                Post.deleted_at.is_(None),
            )
        )
        post = result.scalar_one_or_none()
        if not post:
            raise NotFoundError("Post not found")

        # Ensure timezone-aware comparison
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        if scheduled_at < datetime.now(timezone.utc):
            raise ValidationError("Cannot schedule post in the past")

        post.status = "scheduled"
        post.scheduled_at = scheduled_at
        await db.commit()
        await db.refresh(post)

        logger.info("post_scheduled", post_id=str(post_id), scheduled_at=str(scheduled_at))
        return post

    @staticmethod
    async def unschedule_post(
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> Post:
        """Move a scheduled post back to draft."""
        result = await db.execute(
            select(Post).where(
                Post.id == post_id,
                Post.user_id == user_id,
                Post.deleted_at.is_(None),
            )
        )
        post = result.scalar_one_or_none()
        if not post:
            raise NotFoundError("Post not found")

        post.status = "draft"
        post.scheduled_at = None
        await db.commit()
        await db.refresh(post)

        logger.info("post_unscheduled", post_id=str(post_id))
        return post

    @staticmethod
    async def get_due_posts(db: AsyncSession) -> list[Post]:
        """Get all posts that are due for publishing."""
        now = datetime.now(timezone.utc)
        result = await db.execute(
            select(Post).where(
                Post.status == "scheduled",
                Post.scheduled_at <= now,
                Post.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    @staticmethod
    async def suggest_optimal_time(
        platform: str,
        user_timezone: str = "UTC",
        start_date: datetime | None = None,
    ) -> datetime:
        """Suggest the next optimal posting time for a platform."""
        now = datetime.now(timezone.utc)
        if start_date and start_date > now:
            now = start_date

        optimal_hours = OPTIMAL_TIMES.get(platform, [9, 12, 15, 18])

        # Find next available optimal hour
        for day_offset in range(7):
            target_date = now + timedelta(days=day_offset)
            for hour in optimal_hours:
                candidate = target_date.replace(
                    hour=hour, minute=0, second=0, microsecond=0
                )
                if candidate > now:
                    return candidate

        # Fallback: tomorrow at 9 AM UTC
        return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)

    @staticmethod
    async def get_calendar_data(
        db: AsyncSession,
        user_id: uuid.UUID,
        start_date: datetime,
        end_date: datetime,
        brand_id: uuid.UUID | None = None,
    ) -> list[Post]:
        """Get posts for a calendar date range."""
        query = select(Post).where(
            Post.user_id == user_id,
            Post.deleted_at.is_(None),
            Post.status.in_(
                [
                    "scheduled",
                    "published",
                    "publishing",
                    "partially_published",
                    "needs_manual_share",
                    "failed",
                ]
            ),
        )

        # Filter by scheduled_at or published_at within range
        from sqlalchemy import or_
        query = query.where(
            or_(
                Post.scheduled_at.between(start_date, end_date),
                Post.published_at.between(start_date, end_date),
            )
        )

        if brand_id:
            query = query.where(Post.brand_id == brand_id)

        query = query.order_by(Post.scheduled_at.asc().nullsfirst())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def auto_queue_post(
        db: AsyncSession,
        post_id: uuid.UUID,
        user_id: uuid.UUID,
        platform: str = "instagram",
    ) -> Post:
        """Auto-schedule a post at the next optimal time slot."""
        optimal_time = await Scheduler.suggest_optimal_time(platform)
        return await Scheduler.schedule_post(db, post_id, user_id, optimal_time)
