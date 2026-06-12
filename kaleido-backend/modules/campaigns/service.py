import uuid
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.ollama_client import DEFAULT_MODEL, ollama_client
from core.exceptions import NotFoundError
from modules.campaigns.models import Campaign
from modules.campaigns.schemas import CampaignCreate, CampaignUpdate
from modules.content.models import Post

logger = structlog.get_logger()


class CampaignService:
    @staticmethod
    async def create_campaign(
        db: AsyncSession, user_id: uuid.UUID, data: CampaignCreate
    ) -> Campaign:
        campaign = Campaign(
            user_id=user_id,
            brand_id=data.brand_id,
            name=data.name,
            description=data.description,
            goal=data.goal,
            start_date=data.start_date,
            end_date=data.end_date,
            platforms=data.platforms,
            tags=data.tags,
        )
        db.add(campaign)
        await db.commit()
        await db.refresh(campaign)
        logger.info("campaign_created", campaign_id=str(campaign.id), name=campaign.name)
        return campaign

    @staticmethod
    async def list_campaigns(
        db: AsyncSession,
        user_id: uuid.UUID,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Campaign], int]:
        query = select(Campaign).where(
            Campaign.user_id == user_id, Campaign.deleted_at.is_(None)
        )
        count_query = select(func.count(Campaign.id)).where(
            Campaign.user_id == user_id, Campaign.deleted_at.is_(None)
        )

        if status:
            query = query.where(Campaign.status == status)
            count_query = count_query.where(Campaign.status == status)

        total = (await db.execute(count_query)).scalar() or 0
        result = await db.execute(
            query.order_by(Campaign.created_at.desc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), total

    @staticmethod
    async def get_campaign(
        db: AsyncSession, campaign_id: uuid.UUID, user_id: uuid.UUID
    ) -> Campaign:
        result = await db.execute(
            select(Campaign).where(
                Campaign.id == campaign_id,
                Campaign.user_id == user_id,
                Campaign.deleted_at.is_(None),
            )
        )
        campaign = result.scalar_one_or_none()
        if not campaign:
            raise NotFoundError("Campaign not found")
        return campaign

    @staticmethod
    async def update_campaign(
        db: AsyncSession, campaign_id: uuid.UUID, user_id: uuid.UUID, data: CampaignUpdate
    ) -> Campaign:
        campaign = await CampaignService.get_campaign(db, campaign_id, user_id)

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(campaign, key, value)

        await db.commit()
        await db.refresh(campaign)
        return campaign

    @staticmethod
    async def delete_campaign(
        db: AsyncSession, campaign_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        campaign = await CampaignService.get_campaign(db, campaign_id, user_id)
        campaign.deleted_at = datetime.now(timezone.utc)
        await db.commit()

    @staticmethod
    async def generate_content_plan(
        db: AsyncSession,
        campaign_id: uuid.UUID,
        user_id: uuid.UUID,
        topic: str,
        platforms: list[str],
        duration_days: int = 14,
        posts_per_week: int = 5,
        tone: str = "professional",
    ) -> Campaign:
        """Generate an AI content plan for the campaign."""
        campaign = await CampaignService.get_campaign(db, campaign_id, user_id)

        prompt = f"""Create a social media content plan for a campaign about "{topic}".

Requirements:
- Duration: {duration_days} days
- Posts per week: {posts_per_week}
- Platforms: {', '.join(platforms)}
- Tone: {tone}
- Campaign goal: {campaign.goal or 'brand awareness'}

Generate a JSON content plan with this structure:
{{
  "weeks": [
    {{
      "week_number": 1,
      "theme": "Week theme",
      "posts": [
        {{
          "day": 1,
          "platform": "platform_name",
          "content_type": "post|story|reel|carousel",
          "topic": "Post topic",
          "caption_idea": "Brief caption idea",
          "hashtags": ["tag1", "tag2"],
          "best_time": "10:00"
        }}
      ]
    }}
  ],
  "total_posts": 10,
  "key_messages": ["message1", "message2"],
  "content_themes": ["theme1", "theme2"]
}}

Return ONLY valid JSON."""

        try:
            result = await ollama_client.generate_structured(
                prompt=prompt,
                schema={"type": "object"},
                model=DEFAULT_MODEL,
            )
            content_plan = result if isinstance(result, dict) else {"raw_plan": str(result)}
        except Exception as e:
            logger.warning("ai_plan_generation_failed", error=str(e))
            # Generate a basic plan as fallback
            content_plan = CampaignService._generate_fallback_plan(
                topic, platforms, duration_days, posts_per_week, tone
            )

        campaign.content_plan = content_plan
        campaign.ai_generated = True
        await db.commit()
        await db.refresh(campaign)

        logger.info("campaign_plan_generated", campaign_id=str(campaign_id))
        return campaign

    @staticmethod
    def _generate_fallback_plan(
        topic: str,
        platforms: list[str],
        duration_days: int,
        posts_per_week: int,
        tone: str,
    ) -> dict:
        """Generate a basic content plan without AI."""
        weeks = []
        num_weeks = max(1, duration_days // 7)
        content_types = ["post", "story", "carousel", "reel"]
        themes = [
            f"Introduction to {topic}",
            f"Deep dive into {topic}",
            f"Tips & tricks for {topic}",
            f"Success stories with {topic}",
        ]

        for w in range(num_weeks):
            posts = []
            for p in range(posts_per_week):
                day = (p * 7 // posts_per_week) + 1
                platform = platforms[p % len(platforms)]
                posts.append({
                    "day": day,
                    "platform": platform,
                    "content_type": content_types[p % len(content_types)],
                    "topic": f"{themes[w % len(themes)]} - Part {p + 1}",
                    "caption_idea": f"Share insights about {topic} for {platform}",
                    "hashtags": [topic.replace(" ", "").lower(), platform, tone],
                    "best_time": ["09:00", "12:00", "15:00", "18:00"][p % 4],
                })
            weeks.append({
                "week_number": w + 1,
                "theme": themes[w % len(themes)],
                "posts": posts,
            })

        return {
            "weeks": weeks,
            "total_posts": num_weeks * posts_per_week,
            "key_messages": [
                f"Discover the power of {topic}",
                f"Transform your strategy with {topic}",
                f"Join the {topic} movement",
            ],
            "content_themes": themes[:num_weeks],
        }

    @staticmethod
    async def get_campaign_analytics(
        db: AsyncSession, campaign_id: uuid.UUID, user_id: uuid.UUID
    ) -> dict:
        """Get aggregated analytics for a campaign's posts."""
        campaign = await CampaignService.get_campaign(db, campaign_id, user_id)

        # Count posts linked to this campaign
        post_count = await db.execute(
            select(func.count(Post.id)).where(
                Post.campaign_id == campaign_id,
                Post.user_id == user_id,
                Post.deleted_at.is_(None),
            )
        )
        total_posts = post_count.scalar() or 0

        published_count = await db.execute(
            select(func.count(Post.id)).where(
                Post.campaign_id == campaign_id,
                Post.user_id == user_id,
                Post.status == "published",
                Post.deleted_at.is_(None),
            )
        )
        published = published_count.scalar() or 0

        scheduled_count = await db.execute(
            select(func.count(Post.id)).where(
                Post.campaign_id == campaign_id,
                Post.user_id == user_id,
                Post.status == "scheduled",
                Post.deleted_at.is_(None),
            )
        )
        scheduled = scheduled_count.scalar() or 0

        return {
            "campaign_id": str(campaign_id),
            "total_posts": total_posts,
            "published_posts": published,
            "scheduled_posts": scheduled,
            "draft_posts": total_posts - published - scheduled,
            "completion_rate": round(published / total_posts * 100, 1) if total_posts > 0 else 0,
        }
