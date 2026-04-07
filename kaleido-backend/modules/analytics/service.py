import uuid
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from modules.analytics.models import AnalyticsSnapshot, PostAnalytics
from modules.content.models import Post, PostPublication

logger = structlog.get_logger()


class AnalyticsService:
    @staticmethod
    async def get_overview(
        db: AsyncSession,
        user_id: uuid.UUID,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
        platform: str | None = None,
    ) -> dict:
        """Get aggregated overview metrics."""
        if not end_date:
            end_date = datetime.now(timezone.utc)
        if not start_date:
            start_date = end_date - timedelta(days=30)

        # Get latest snapshot per account
        snapshot_query = select(AnalyticsSnapshot).where(
            AnalyticsSnapshot.user_id == user_id,
            AnalyticsSnapshot.collected_at.between(start_date, end_date),
        )
        if platform:
            snapshot_query = snapshot_query.where(AnalyticsSnapshot.platform == platform)

        snapshot_query = snapshot_query.order_by(AnalyticsSnapshot.collected_at.desc())
        result = await db.execute(snapshot_query)
        snapshots = result.scalars().all()

        # Aggregate
        total_followers = 0
        total_reach = 0
        total_engagement = 0
        platform_breakdown = {}

        seen_accounts = set()
        for snap in snapshots:
            key = str(snap.social_account_id)
            if key not in seen_accounts:
                seen_accounts.add(key)
                total_followers += snap.followers_count
                total_reach += snap.total_reach
                total_engagement += snap.total_engagement

                if snap.platform not in platform_breakdown:
                    platform_breakdown[snap.platform] = {
                        "followers": 0, "reach": 0, "engagement": 0
                    }
                platform_breakdown[snap.platform]["followers"] += snap.followers_count
                platform_breakdown[snap.platform]["reach"] += snap.total_reach
                platform_breakdown[snap.platform]["engagement"] += snap.total_engagement

        # Count published posts
        pub_count = await db.execute(
            select(func.count(Post.id)).where(
                Post.user_id == user_id,
                Post.status == "published",
                Post.published_at.between(start_date, end_date),
                Post.deleted_at.is_(None),
            )
        )
        total_published = pub_count.scalar() or 0

        avg_rate = 0.0
        if seen_accounts:
            rates = [s.engagement_rate for s in snapshots if str(s.social_account_id) in seen_accounts and s.engagement_rate]
            if rates:
                avg_rate = sum(rates) / len(rates)

        return {
            "total_followers": total_followers,
            "total_reach": total_reach,
            "total_engagement": total_engagement,
            "total_posts_published": total_published,
            "avg_engagement_rate": round(avg_rate, 4),
            "platform_breakdown": platform_breakdown,
        }

    @staticmethod
    async def get_post_analytics(
        db: AsyncSession,
        user_id: uuid.UUID,
        post_id: uuid.UUID | None = None,
        platform: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[PostAnalytics], int]:
        """Get per-post analytics."""
        query = select(PostAnalytics).where(PostAnalytics.user_id == user_id)
        count_query = select(func.count(PostAnalytics.id)).where(PostAnalytics.user_id == user_id)

        if post_id:
            query = query.where(PostAnalytics.post_id == post_id)
            count_query = count_query.where(PostAnalytics.post_id == post_id)
        if platform:
            query = query.where(PostAnalytics.platform == platform)
            count_query = count_query.where(PostAnalytics.platform == platform)

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(PostAnalytics.collected_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all()), total

    @staticmethod
    async def get_growth_data(
        db: AsyncSession,
        user_id: uuid.UUID,
        days: int = 30,
        platform: str | None = None,
    ) -> list[dict]:
        """Get follower/engagement growth over time."""
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=days)

        query = select(AnalyticsSnapshot).where(
            AnalyticsSnapshot.user_id == user_id,
            AnalyticsSnapshot.collected_at.between(start, end),
        )
        if platform:
            query = query.where(AnalyticsSnapshot.platform == platform)

        query = query.order_by(AnalyticsSnapshot.collected_at.asc())
        result = await db.execute(query)
        snapshots = result.scalars().all()

        growth_data = []
        for snap in snapshots:
            growth_data.append({
                "date": snap.collected_at.strftime("%Y-%m-%d"),
                "followers": snap.followers_count,
                "reach": snap.total_reach,
                "engagement": snap.total_engagement,
                "platform": snap.platform,
            })

        return growth_data

    @staticmethod
    async def get_best_posting_times(
        db: AsyncSession,
        user_id: uuid.UUID,
        platform: str | None = None,
    ) -> list[dict]:
        """Analyze post performance to find best posting times."""
        # Get published posts with analytics
        query = (
            select(Post.published_at, PostAnalytics.engagement_rate, PostAnalytics.platform)
            .join(PostAnalytics, PostAnalytics.post_id == Post.id)
            .where(
                Post.user_id == user_id,
                Post.status == "published",
                Post.published_at.is_not(None),
                Post.deleted_at.is_(None),
            )
        )
        if platform:
            query = query.where(PostAnalytics.platform == platform)

        result = await db.execute(query)
        rows = result.all()

        # Group by day_of_week + hour
        time_slots = {}
        for published_at, engagement_rate, plat in rows:
            if not published_at:
                continue
            day = published_at.strftime("%A")
            hour = published_at.hour
            key = f"{day}_{hour}_{plat}"
            if key not in time_slots:
                time_slots[key] = {"day": day, "hour": hour, "platform": plat, "rates": []}
            time_slots[key]["rates"].append(engagement_rate or 0)

        # Calculate averages and sort
        best_times = []
        for slot in time_slots.values():
            avg = sum(slot["rates"]) / len(slot["rates"]) if slot["rates"] else 0
            best_times.append({
                "day_of_week": slot["day"],
                "hour": slot["hour"],
                "avg_engagement": round(avg, 4),
                "platform": slot["platform"],
            })

        best_times.sort(key=lambda x: x["avg_engagement"], reverse=True)

        # If no data, return defaults
        if not best_times:
            defaults = [
                {"day_of_week": "Tuesday", "hour": 10, "avg_engagement": 0.0, "platform": platform or "general"},
                {"day_of_week": "Wednesday", "hour": 14, "avg_engagement": 0.0, "platform": platform or "general"},
                {"day_of_week": "Thursday", "hour": 12, "avg_engagement": 0.0, "platform": platform or "general"},
                {"day_of_week": "Friday", "hour": 9, "avg_engagement": 0.0, "platform": platform or "general"},
            ]
            return defaults

        return best_times[:10]

    @staticmethod
    async def record_snapshot(
        db: AsyncSession,
        user_id: uuid.UUID,
        social_account_id: uuid.UUID,
        platform: str,
        metrics: dict,
    ) -> AnalyticsSnapshot:
        """Record an analytics snapshot."""
        snapshot = AnalyticsSnapshot(
            user_id=user_id,
            social_account_id=social_account_id,
            platform=platform,
            followers_count=metrics.get("followers_count", 0),
            following_count=metrics.get("following_count", 0),
            posts_count=metrics.get("posts_count", 0),
            total_reach=metrics.get("total_reach", 0),
            total_impressions=metrics.get("total_impressions", 0),
            total_engagement=metrics.get("total_engagement", 0),
            engagement_rate=metrics.get("engagement_rate", 0.0),
            extra_metrics=metrics.get("extra", {}),
        )
        db.add(snapshot)
        await db.commit()
        await db.refresh(snapshot)
        return snapshot

    @staticmethod
    async def record_post_analytics(
        db: AsyncSession,
        user_id: uuid.UUID,
        post_id: uuid.UUID,
        platform: str,
        metrics: dict,
        publication_id: uuid.UUID | None = None,
    ) -> PostAnalytics:
        """Record post-level analytics."""
        pa = PostAnalytics(
            user_id=user_id,
            post_id=post_id,
            publication_id=publication_id,
            platform=platform,
            likes=metrics.get("likes", 0),
            comments=metrics.get("comments", 0),
            shares=metrics.get("shares", 0),
            saves=metrics.get("saves", 0),
            reach=metrics.get("reach", 0),
            impressions=metrics.get("impressions", 0),
            clicks=metrics.get("clicks", 0),
            engagement_rate=metrics.get("engagement_rate", 0.0),
            extra_metrics=metrics.get("extra", {}),
        )
        db.add(pa)
        await db.commit()
        await db.refresh(pa)
        return pa
