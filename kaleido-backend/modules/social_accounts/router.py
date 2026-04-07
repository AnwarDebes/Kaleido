import secrets
import uuid

import structlog
from fastapi import APIRouter, Depends, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.redis import redis_client
from config.settings import settings
from core.exceptions import ValidationError
from core.security import get_current_user
from modules.auth.models import User
from modules.social_accounts.schemas import SocialAccountResponse
from modules.social_accounts.service import SocialAccountService

logger = structlog.get_logger()

router = APIRouter(prefix="/social-accounts", tags=["Social Accounts"])


def _get_platform_client(platform: str):
    """Get the platform OAuth client. Returns None if not configured."""
    import os

    if platform in ("facebook", "instagram"):
        app_id = os.environ.get("META_APP_ID")
        app_secret = os.environ.get("META_APP_SECRET")
        if app_id and app_secret:
            from modules.social_accounts.platforms.facebook import FacebookPlatform
            return FacebookPlatform(app_id, app_secret)
    elif platform == "linkedin":
        client_id = os.environ.get("LINKEDIN_CLIENT_ID")
        client_secret = os.environ.get("LINKEDIN_CLIENT_SECRET")
        if client_id and client_secret:
            from modules.social_accounts.platforms.linkedin import LinkedInPlatform
            return LinkedInPlatform(client_id, client_secret)
    elif platform == "twitter":
        client_id = os.environ.get("TWITTER_CLIENT_ID")
        client_secret = os.environ.get("TWITTER_CLIENT_SECRET")
        if client_id and client_secret:
            from modules.social_accounts.platforms.twitter import TwitterPlatform
            return TwitterPlatform(client_id, client_secret)
    elif platform == "tiktok":
        client_key = os.environ.get("TIKTOK_CLIENT_KEY")
        client_secret = os.environ.get("TIKTOK_CLIENT_SECRET")
        if client_key and client_secret:
            from modules.social_accounts.platforms.tiktok import TikTokPlatform
            return TikTokPlatform(client_key, client_secret)
    elif platform == "youtube":
        client_id = os.environ.get("GOOGLE_CLIENT_ID")
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
        if client_id and client_secret:
            from modules.social_accounts.platforms.youtube import YouTubePlatform
            return YouTubePlatform(client_id, client_secret)
    elif platform == "pinterest":
        app_id = os.environ.get("PINTEREST_APP_ID")
        app_secret = os.environ.get("PINTEREST_APP_SECRET")
        if app_id and app_secret:
            from modules.social_accounts.platforms.pinterest import PinterestPlatform
            return PinterestPlatform(app_id, app_secret)
    elif platform == "reddit":
        client_id = os.environ.get("REDDIT_CLIENT_ID")
        client_secret = os.environ.get("REDDIT_CLIENT_SECRET")
        if client_id and client_secret:
            from modules.social_accounts.platforms.reddit import RedditPlatform
            return RedditPlatform(client_id, client_secret)
    elif platform == "bluesky":
        from modules.social_accounts.platforms.bluesky import BlueskyPlatform
        return BlueskyPlatform()
    elif platform == "google_business":
        client_id = os.environ.get("GOOGLE_CLIENT_ID")
        client_secret = os.environ.get("GOOGLE_CLIENT_SECRET")
        if client_id and client_secret:
            from modules.social_accounts.platforms.google_business import GoogleBusinessPlatform
            return GoogleBusinessPlatform(client_id, client_secret)
    elif platform == "telegram":
        from modules.social_accounts.platforms.telegram import TelegramPlatform
        return TelegramPlatform()
    elif platform == "snapchat":
        client_id = os.environ.get("SNAPCHAT_CLIENT_ID")
        client_secret = os.environ.get("SNAPCHAT_CLIENT_SECRET")
        if client_id and client_secret:
            from modules.social_accounts.platforms.snapchat import SnapchatPlatform
            return SnapchatPlatform(client_id, client_secret)
    elif platform == "whatsapp":
        app_id = os.environ.get("META_APP_ID")
        app_secret = os.environ.get("META_APP_SECRET")
        if app_id and app_secret:
            from modules.social_accounts.platforms.whatsapp import WhatsAppBusinessPlatform
            return WhatsAppBusinessPlatform(app_id, app_secret)

    return None


SUPPORTED_PLATFORMS = [
    {"id": "facebook", "name": "Facebook", "auth_type": "oauth"},
    {"id": "instagram", "name": "Instagram", "auth_type": "oauth"},
    {"id": "twitter", "name": "Twitter / X", "auth_type": "oauth"},
    {"id": "linkedin", "name": "LinkedIn", "auth_type": "oauth"},
    {"id": "tiktok", "name": "TikTok", "auth_type": "oauth"},
    {"id": "youtube", "name": "YouTube", "auth_type": "oauth"},
    {"id": "pinterest", "name": "Pinterest", "auth_type": "oauth"},
    {"id": "reddit", "name": "Reddit", "auth_type": "oauth"},
    {"id": "bluesky", "name": "Bluesky", "auth_type": "credentials"},
    {"id": "google_business", "name": "Google Business", "auth_type": "oauth"},
    {"id": "telegram", "name": "Telegram", "auth_type": "bot_token"},
    {"id": "snapchat", "name": "Snapchat", "auth_type": "oauth"},
    {"id": "whatsapp", "name": "WhatsApp Business", "auth_type": "oauth"},
]


@router.get("/platforms")
async def list_supported_platforms():
    return {"success": True, "data": SUPPORTED_PLATFORMS}


@router.get("")
async def list_social_accounts(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    accounts = await SocialAccountService.list_accounts(db, user.id)
    return {
        "success": True,
        "data": [SocialAccountResponse.model_validate(a).model_dump() for a in accounts],
    }


@router.get("/connect/{platform}")
async def connect_platform(
    platform: str,
    user: User = Depends(get_current_user),
):
    client = _get_platform_client(platform)
    if not client:
        raise ValidationError(
            f"Platform '{platform}' is not configured. Set the required API keys in environment variables."
        )

    state = secrets.token_urlsafe(32)
    await redis_client.setex(f"oauth_state:{state}", 600, f"{user.id}:{platform}")

    redirect_uri = f"{settings.frontend_url}/api/social-accounts/callback/{platform}"
    auth_url = client.get_auth_url(redirect_uri, state)

    return {
        "success": True,
        "data": {"auth_url": auth_url, "state": state},
    }


@router.get("/callback/{platform}")
async def oauth_callback(
    platform: str,
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    # Verify state
    stored = await redis_client.get(f"oauth_state:{state}")
    if not stored:
        raise ValidationError("Invalid or expired OAuth state")

    user_id_str, expected_platform = stored.split(":", 1)
    if expected_platform != platform:
        raise ValidationError("Platform mismatch in OAuth state")

    await redis_client.delete(f"oauth_state:{state}")
    user_id = uuid.UUID(user_id_str)

    client = _get_platform_client(platform)
    if not client:
        raise ValidationError(f"Platform '{platform}' is not configured")

    redirect_uri = f"{settings.frontend_url}/api/social-accounts/callback/{platform}"
    tokens = await client.exchange_code(code, redirect_uri)
    profile = await client.get_profile(tokens.access_token)

    account = await SocialAccountService.store_account(
        db=db,
        user_id=user_id,
        platform=platform,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_in=tokens.expires_in,
        profile={
            "platform_user_id": profile.platform_user_id,
            "username": profile.username,
            "display_name": profile.display_name,
            "avatar_url": profile.avatar_url,
            "metadata": profile.metadata,
        },
        scopes=tokens.scopes,
    )

    return {
        "success": True,
        "data": SocialAccountResponse.model_validate(account).model_dump(),
    }


@router.delete("/{account_id}")
async def disconnect_account(
    account_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await SocialAccountService.disconnect_account(db, account_id, user.id)
    return {
        "success": True,
        "data": {"message": "Account disconnected successfully"},
    }


@router.get("/{account_id}/status")
async def account_status(
    account_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import select
    from modules.social_accounts.models import SocialAccount

    result = await db.execute(
        select(SocialAccount).where(SocialAccount.id == account_id, SocialAccount.user_id == user.id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise ValidationError("Account not found")

    from datetime import datetime, timezone
    is_token_valid = True
    if account.token_expires_at and account.token_expires_at < datetime.now(timezone.utc):
        is_token_valid = False

    return {
        "success": True,
        "data": {
            "id": str(account.id),
            "platform": account.platform,
            "is_active": account.is_active,
            "is_token_valid": is_token_valid,
            "platform_username": account.platform_username,
            "last_synced_at": account.last_synced_at.isoformat() if account.last_synced_at else None,
        },
    }
