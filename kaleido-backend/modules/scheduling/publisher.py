import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from modules.content.models import Post, PostPublication
from modules.social_accounts.models import SocialAccount
from utils.encryption import decrypt_token

logger = structlog.get_logger()

# Maximum retry attempts
MAX_RETRIES = 3


class Publisher:
    @staticmethod
    async def publish_post(db: AsyncSession, post_id: uuid.UUID) -> Post:
        """Publish a post to all target platforms."""
        result = await db.execute(
            select(Post).where(Post.id == post_id, Post.deleted_at.is_(None))
        )
        post = result.scalar_one_or_none()
        if not post:
            raise NotFoundError("Post not found")

        post.status = "publishing"
        await db.commit()

        platforms = list(post.platform_contents.keys()) if post.platform_contents else []
        if not platforms:
            # If no platform-specific content, use content_text for all
            platforms = ["default"]

        all_succeeded = True
        for platform in platforms:
            if platform == "default":
                continue

            try:
                pub = await Publisher._publish_to_platform(db, post, platform)
                if pub and pub.status == "failed":
                    all_succeeded = False
            except Exception as e:
                all_succeeded = False
                logger.error("platform_publish_failed", post_id=str(post_id), platform=platform, error=str(e))

        # Update post status
        if all_succeeded:
            post.status = "published"
            post.published_at = datetime.now(timezone.utc)
        else:
            post.status = "partially_published" if any(
                p == "published" for p in platforms
            ) else "failed"

        await db.commit()
        await db.refresh(post)

        logger.info("post_publish_completed", post_id=str(post_id), status=post.status)
        return post

    @staticmethod
    async def _publish_to_platform(
        db: AsyncSession,
        post: Post,
        platform: str,
    ) -> PostPublication | None:
        """Publish content to a specific platform."""
        # Find the social account for this platform
        result = await db.execute(
            select(SocialAccount).where(
                SocialAccount.user_id == post.user_id,
                SocialAccount.platform == platform,
                SocialAccount.status == "connected",
            )
        )
        account = result.scalar_one_or_none()

        if not account:
            logger.warning("no_connected_account", platform=platform, user_id=str(post.user_id))
            # Create a failed publication record
            pub = PostPublication(
                post_id=post.id,
                social_account_id=uuid.uuid4(),  # placeholder
                platform=platform,
                status="failed",
                error_message=f"No connected {platform} account",
            )
            db.add(pub)
            await db.commit()
            return pub

        # Get platform content
        content = post.platform_contents.get(platform, {})
        if not content and post.content_text:
            content = {"text": post.content_text}

        # Create publication record
        pub = PostPublication(
            post_id=post.id,
            social_account_id=account.id,
            platform=platform,
            status="publishing",
            content_sent=content,
        )
        db.add(pub)
        await db.commit()

        try:
            # Get the platform client
            platform_client = Publisher._get_platform_client(platform)
            if not platform_client:
                pub.status = "failed"
                pub.error_message = f"Platform {platform} publishing not yet supported"
                await db.commit()
                return pub

            # Decrypt token
            access_token = decrypt_token(account.access_token_encrypted)

            # Publish
            result = await platform_client.publish_post(access_token, content)

            pub.status = "published"
            pub.platform_post_id = result.get("platform_post_id")
            pub.platform_post_url = result.get("platform_post_url")
            pub.published_at = datetime.now(timezone.utc)

            logger.info(
                "platform_published",
                platform=platform,
                post_id=str(post.id),
                platform_post_id=pub.platform_post_id,
            )

        except Exception as e:
            pub.status = "failed"
            pub.error_message = str(e)
            pub.retry_count += 1
            logger.error(
                "platform_publish_error",
                platform=platform,
                post_id=str(post.id),
                error=str(e),
            )

        await db.commit()
        return pub

    @staticmethod
    def _get_platform_client(platform: str):
        """Get the platform client for publishing."""
        from config.settings import settings

        try:
            if platform == "facebook":
                from modules.social_accounts.platforms.facebook import FacebookPlatform
                return FacebookPlatform(
                    app_id=getattr(settings, "facebook_app_id", ""),
                    app_secret=getattr(settings, "facebook_app_secret", ""),
                )
            elif platform == "linkedin":
                from modules.social_accounts.platforms.linkedin import LinkedInPlatform
                return LinkedInPlatform(
                    client_id=getattr(settings, "linkedin_client_id", ""),
                    client_secret=getattr(settings, "linkedin_client_secret", ""),
                )
            elif platform == "twitter":
                from modules.social_accounts.platforms.twitter import TwitterPlatform
                return TwitterPlatform(
                    client_id=getattr(settings, "twitter_client_id", ""),
                    client_secret=getattr(settings, "twitter_client_secret", ""),
                )
            elif platform == "tiktok":
                from modules.social_accounts.platforms.tiktok import TikTokPlatform
                return TikTokPlatform(
                    client_key=getattr(settings, "tiktok_client_key", ""),
                    client_secret=getattr(settings, "tiktok_client_secret", ""),
                )
            elif platform == "youtube":
                from modules.social_accounts.platforms.youtube import YouTubePlatform
                return YouTubePlatform(
                    client_id=getattr(settings, "google_client_id", ""),
                    client_secret=getattr(settings, "google_client_secret", ""),
                )
            elif platform == "pinterest":
                from modules.social_accounts.platforms.pinterest import PinterestPlatform
                return PinterestPlatform(
                    app_id=getattr(settings, "pinterest_app_id", ""),
                    app_secret=getattr(settings, "pinterest_app_secret", ""),
                )
            elif platform == "reddit":
                from modules.social_accounts.platforms.reddit import RedditPlatform
                return RedditPlatform(
                    client_id=getattr(settings, "reddit_client_id", ""),
                    client_secret=getattr(settings, "reddit_client_secret", ""),
                )
            elif platform == "bluesky":
                from modules.social_accounts.platforms.bluesky import BlueskyPlatform
                return BlueskyPlatform()
            elif platform == "google_business":
                from modules.social_accounts.platforms.google_business import GoogleBusinessPlatform
                return GoogleBusinessPlatform(
                    client_id=getattr(settings, "google_client_id", ""),
                    client_secret=getattr(settings, "google_client_secret", ""),
                )
            elif platform == "telegram":
                from modules.social_accounts.platforms.telegram import TelegramPlatform
                return TelegramPlatform()
            elif platform == "snapchat":
                from modules.social_accounts.platforms.snapchat import SnapchatPlatform
                return SnapchatPlatform(
                    client_id=getattr(settings, "snapchat_client_id", ""),
                    client_secret=getattr(settings, "snapchat_client_secret", ""),
                )
            elif platform == "whatsapp":
                from modules.social_accounts.platforms.whatsapp import WhatsAppBusinessPlatform
                return WhatsAppBusinessPlatform(
                    app_id=getattr(settings, "facebook_app_id", ""),
                    app_secret=getattr(settings, "facebook_app_secret", ""),
                )
        except Exception as e:
            logger.warning("platform_client_init_failed", platform=platform, error=str(e))
        return None

    @staticmethod
    async def retry_publication(
        db: AsyncSession,
        publication_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> PostPublication:
        """Retry a failed publication."""
        result = await db.execute(
            select(PostPublication).where(PostPublication.id == publication_id)
        )
        pub = result.scalar_one_or_none()
        if not pub:
            raise NotFoundError("Publication not found")

        # Verify ownership
        post_result = await db.execute(
            select(Post).where(Post.id == pub.post_id, Post.user_id == user_id)
        )
        post = post_result.scalar_one_or_none()
        if not post:
            raise NotFoundError("Post not found")

        if pub.retry_count >= MAX_RETRIES:
            raise Exception(f"Maximum retries ({MAX_RETRIES}) exceeded")

        # Re-publish
        pub.status = "publishing"
        pub.retry_count += 1
        await db.commit()

        try:
            platform_client = Publisher._get_platform_client(pub.platform)
            if not platform_client:
                pub.status = "failed"
                pub.error_message = f"Platform {pub.platform} not supported"
                await db.commit()
                return pub

            account_result = await db.execute(
                select(SocialAccount).where(SocialAccount.id == pub.social_account_id)
            )
            account = account_result.scalar_one_or_none()
            if not account:
                pub.status = "failed"
                pub.error_message = "Social account not found"
                await db.commit()
                return pub

            access_token = decrypt_token(account.access_token_encrypted)
            result = await platform_client.publish_post(access_token, pub.content_sent or {})

            pub.status = "published"
            pub.platform_post_id = result.get("platform_post_id")
            pub.platform_post_url = result.get("platform_post_url")
            pub.published_at = datetime.now(timezone.utc)

        except Exception as e:
            pub.status = "failed"
            pub.error_message = str(e)

        await db.commit()
        await db.refresh(pub)
        return pub

    @staticmethod
    async def get_publication_status(
        db: AsyncSession,
        post_id: uuid.UUID,
    ) -> list[PostPublication]:
        """Get all publication records for a post."""
        result = await db.execute(
            select(PostPublication).where(PostPublication.post_id == post_id)
        )
        return list(result.scalars().all())
