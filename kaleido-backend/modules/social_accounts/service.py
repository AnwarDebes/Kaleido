import uuid
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from config.redis import redis_client
from core.exceptions import NotFoundError, ValidationError
from modules.social_accounts.models import SocialAccount
from utils.encryption import decrypt_token, encrypt_token

logger = structlog.get_logger()

SUPPORTED_PLATFORMS = [
    "facebook", "instagram", "linkedin", "twitter", "youtube",
    "tiktok", "threads", "pinterest", "reddit", "bluesky",
    "google_business", "telegram", "snapchat", "whatsapp",
]


class SocialAccountService:
    @staticmethod
    async def list_accounts(db: AsyncSession, user_id: uuid.UUID) -> list[SocialAccount]:
        result = await db.execute(
            select(SocialAccount).where(SocialAccount.user_id == user_id).order_by(SocialAccount.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def store_account(
        db: AsyncSession,
        user_id: uuid.UUID,
        platform: str,
        access_token: str,
        refresh_token: str | None,
        expires_in: int | None,
        profile: dict,
        brand_id: uuid.UUID | None = None,
        scopes: list[str] | None = None,
    ) -> SocialAccount:
        if platform not in SUPPORTED_PLATFORMS:
            raise ValidationError(f"Unsupported platform: {platform}")

        token_expires_at = None
        if expires_in:
            token_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

        account = SocialAccount(
            user_id=user_id,
            brand_id=brand_id,
            platform=platform,
            platform_user_id=profile.get("platform_user_id"),
            platform_username=profile.get("username"),
            platform_display_name=profile.get("display_name"),
            platform_avatar_url=profile.get("avatar_url"),
            access_token_encrypted=encrypt_token(access_token),
            refresh_token_encrypted=encrypt_token(refresh_token) if refresh_token else None,
            token_expires_at=token_expires_at,
            scopes=scopes,
            metadata_=profile.get("metadata") or {},
        )
        db.add(account)
        await db.commit()
        await db.refresh(account)
        logger.info("social_account_connected", platform=platform, user_id=str(user_id))
        return account

    @staticmethod
    async def disconnect_account(db: AsyncSession, account_id: uuid.UUID, user_id: uuid.UUID) -> None:
        result = await db.execute(
            select(SocialAccount).where(SocialAccount.id == account_id, SocialAccount.user_id == user_id)
        )
        account = result.scalar_one_or_none()
        if not account:
            raise NotFoundError("Social account", str(account_id))

        await db.execute(delete(SocialAccount).where(SocialAccount.id == account_id))
        await db.commit()
        logger.info("social_account_disconnected", platform=account.platform, account_id=str(account_id))

    @staticmethod
    async def get_decrypted_token(db: AsyncSession, account_id: uuid.UUID) -> str:
        result = await db.execute(select(SocialAccount).where(SocialAccount.id == account_id))
        account = result.scalar_one_or_none()
        if not account:
            raise NotFoundError("Social account", str(account_id))
        return decrypt_token(account.access_token_encrypted)
