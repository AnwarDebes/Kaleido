import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from modules.auth.models import User
from modules.referral.models import Referral

REWARD_PER_REFERRAL = 10  # extra posts per successful referral

SHARE_TEMPLATES = {
    "twitter": "I've been using @KaleidoApp to create my social media content with AI. It's free for everyone. Here's my referral link: {link} #SocialMedia #AI",
    "linkedin": "I recently started using Kaleido to create social media content with AI. Generate posts, images and videos, plan your calendar, and share everything in one place. It's completely free.\n\nTry it: {link}",
    "instagram": "Creating social media content just got easier with AI. I use Kaleido to make posts, images and videos, and it's completely free.\n\nLink in bio!\n{link}\n\n#SocialMedia #AI #ContentCreation #Marketing #Kaleido",
    "facebook": "Just discovered Kaleido, a free AI studio for social media. It generates posts, images and videos that you can download and share anywhere.\n\nTry it with my referral link:\n{link}",
}


class ReferralService:
    @staticmethod
    async def get_or_create_referral_code(db: AsyncSession, user_id: uuid.UUID) -> str:
        result = await db.execute(select(User.referral_code).where(User.id == user_id))
        code = result.scalar_one_or_none()
        if code:
            return code

        # Generate a unique code
        while True:
            code = secrets.token_urlsafe(8)[:10].upper()
            existing = await db.execute(select(User.id).where(User.referral_code == code))
            if not existing.scalar_one_or_none():
                break

        await db.execute(update(User).where(User.id == user_id).values(referral_code=code))
        await db.commit()
        return code

    @staticmethod
    async def apply_referral(db: AsyncSession, referred_user_id: uuid.UUID, referral_code: str) -> bool:
        """Apply a referral code when a new user signs up."""
        result = await db.execute(select(User).where(User.referral_code == referral_code))
        referrer = result.scalar_one_or_none()
        if not referrer:
            return False

        if referrer.id == referred_user_id:
            return False

        # Check if already referred
        existing = await db.execute(
            select(Referral).where(Referral.referred_id == referred_user_id)
        )
        if existing.scalar_one_or_none():
            return False

        # Create referral record
        referral = Referral(
            referrer_id=referrer.id,
            referred_id=referred_user_id,
            status="pending",
        )
        db.add(referral)

        # Update referred user
        await db.execute(
            update(User).where(User.id == referred_user_id).values(referred_by=referrer.id)
        )
        await db.commit()
        return True

    @staticmethod
    async def complete_referral(db: AsyncSession, referred_user_id: uuid.UUID) -> None:
        """Mark referral as completed (e.g., after user verifies email or makes first post)."""
        result = await db.execute(
            select(Referral).where(
                Referral.referred_id == referred_user_id,
                Referral.status == "pending",
            )
        )
        referral = result.scalar_one_or_none()
        if not referral:
            return

        referral.status = "completed"
        referral.completed_at = datetime.now(timezone.utc)
        referral.reward_type = "extra_posts"
        referral.reward_amount = REWARD_PER_REFERRAL
        await db.commit()

    @staticmethod
    async def get_dashboard(db: AsyncSession, user_id: uuid.UUID) -> dict:
        code = await ReferralService.get_or_create_referral_code(db, user_id)
        referral_link = f"{settings.frontend_url}/register?ref={code}"

        # Get all referrals for this user
        result = await db.execute(
            select(Referral)
            .where(Referral.referrer_id == user_id)
            .order_by(Referral.created_at.desc())
        )
        referrals = list(result.scalars().all())

        total = len(referrals)
        completed = sum(1 for r in referrals if r.status in ("completed", "rewarded"))
        pending = sum(1 for r in referrals if r.status == "pending")
        total_rewards = sum(r.reward_amount for r in referrals if r.status in ("completed", "rewarded"))

        return {
            "referral_code": code,
            "referral_link": referral_link,
            "total_referrals": total,
            "completed_referrals": completed,
            "pending_referrals": pending,
            "total_rewards_earned": total_rewards,
            "referrals": referrals,
        }

    @staticmethod
    async def generate_share_post(
        db: AsyncSession, user_id: uuid.UUID, platform: str
    ) -> dict:
        code = await ReferralService.get_or_create_referral_code(db, user_id)
        referral_link = f"{settings.frontend_url}/register?ref={code}"

        template = SHARE_TEMPLATES.get(platform, SHARE_TEMPLATES["twitter"])
        content = template.format(link=referral_link)

        return {
            "platform": platform,
            "content": content,
            "referral_link": referral_link,
        }
