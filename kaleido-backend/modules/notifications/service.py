import uuid

import httpx
import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import ValidationError
from modules.notifications.models import ReminderSettings
from utils.encryption import decrypt_token, encrypt_token

logger = structlog.get_logger()

TELEGRAM_API = "https://api.telegram.org"

# Telegram messages cap at 4096 chars; leave room for our framing text.
MAX_BODY = 3500


class ReminderService:
    @staticmethod
    async def get_settings(db: AsyncSession, user_id: uuid.UUID) -> ReminderSettings | None:
        result = await db.execute(
            select(ReminderSettings).where(ReminderSettings.user_id == user_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def save_settings(
        db: AsyncSession,
        user_id: uuid.UUID,
        bot_token: str,
        chat_id: str,
        reminders_enabled: bool = True,
    ) -> ReminderSettings:
        """Validate the bot token and chat, then store them encrypted."""
        bot_token = bot_token.strip()
        chat_id = chat_id.strip()
        if not bot_token or not chat_id:
            raise ValidationError("Both the bot token and the chat id are required")

        # Verify the token is a working bot before saving anything.
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(f"{TELEGRAM_API}/bot{bot_token}/getMe")
            data = resp.json() if resp.status_code == 200 else {}
            if not data.get("ok"):
                raise ValidationError(
                    "Telegram rejected that bot token. Copy it again from @BotFather."
                )

            # Send a hello message so the user immediately sees it works and
            # we know the chat id is right (the bot must be allowed to write
            # there: start a chat with it, or add it to the group/channel).
            hello = (
                "Kaleido is connected to this chat. "
                "Posts you send to your phone will arrive here, ready to copy and paste."
            )
            resp = await client.post(
                f"{TELEGRAM_API}/bot{bot_token}/sendMessage",
                json={"chat_id": chat_id, "text": hello},
            )
            data = resp.json() if resp.status_code == 200 else {}
            if not data.get("ok"):
                raise ValidationError(
                    "The bot token works, but sending to that chat failed. "
                    "Open a chat with your bot and press Start, or check the chat id."
                )

        settings_row = await ReminderService.get_settings(db, user_id)
        if settings_row is None:
            settings_row = ReminderSettings(user_id=user_id)
            db.add(settings_row)
        settings_row.telegram_bot_token_encrypted = encrypt_token(bot_token)
        settings_row.telegram_chat_id = chat_id
        settings_row.reminders_enabled = reminders_enabled
        await db.commit()
        await db.refresh(settings_row)
        logger.info("reminder_settings_saved", user_id=str(user_id))
        return settings_row

    @staticmethod
    async def delete_settings(db: AsyncSession, user_id: uuid.UUID) -> None:
        settings_row = await ReminderService.get_settings(db, user_id)
        if settings_row is not None:
            await db.delete(settings_row)
            await db.commit()
        logger.info("reminder_settings_deleted", user_id=str(user_id))

    @staticmethod
    async def send_to_phone(db: AsyncSession, user_id: uuid.UUID, text: str) -> bool:
        """Send a message to the user's own Telegram chat. Returns False when
        the user has no working reminder setup; raises nothing in that case
        so callers can fall back gracefully."""
        settings_row = await ReminderService.get_settings(db, user_id)
        if (
            settings_row is None
            or not settings_row.telegram_bot_token_encrypted
            or not settings_row.telegram_chat_id
        ):
            return False

        bot_token = decrypt_token(settings_row.telegram_bot_token_encrypted)
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{TELEGRAM_API}/bot{bot_token}/sendMessage",
                    json={
                        "chat_id": settings_row.telegram_chat_id,
                        "text": text[:4096],
                        "disable_web_page_preview": True,
                    },
                )
                ok = resp.status_code == 200 and resp.json().get("ok", False)
                if not ok:
                    logger.warning(
                        "send_to_phone_failed",
                        user_id=str(user_id),
                        status=resp.status_code,
                    )
                return ok
        except Exception as e:
            logger.warning("send_to_phone_error", user_id=str(user_id), error=str(e))
            return False

    @staticmethod
    def format_post_message(
        heading: str,
        content_text: str | None,
        hashtags: list[str] | None,
        platforms: list[str],
        media_urls: list[str] | None = None,
    ) -> str:
        """Build the copy-paste friendly message body for a post."""
        parts = [heading, ""]
        body = (content_text or "").strip()
        if body:
            parts.append(body[:MAX_BODY])
        tags = " ".join(
            h if h.startswith("#") else f"#{h}" for h in (hashtags or []) if h
        )
        if tags:
            parts.extend(["", tags])
        if platforms:
            parts.extend(["", "For: " + ", ".join(platforms)])
        for url in media_urls or []:
            parts.extend(["", f"Media: {url}"])
        return "\n".join(parts)

    @staticmethod
    async def send_files_to_phone(
        db: AsyncSession, user_id: uuid.UUID, file_paths: list[str]
    ) -> int:
        """Send up to 5 media files to the user's Telegram chat as documents
        (documents keep original quality, important for re-uploading to other
        platforms). Returns how many were delivered."""
        settings_row = await ReminderService.get_settings(db, user_id)
        if (
            settings_row is None
            or not settings_row.telegram_bot_token_encrypted
            or not settings_row.telegram_chat_id
        ):
            return 0

        import os

        bot_token = decrypt_token(settings_row.telegram_bot_token_encrypted)
        sent = 0
        for path in file_paths[:5]:
            if not path or not os.path.isfile(path):
                continue
            try:
                async with httpx.AsyncClient(timeout=120) as client:
                    with open(path, "rb") as fh:
                        resp = await client.post(
                            f"{TELEGRAM_API}/bot{bot_token}/sendDocument",
                            data={"chat_id": settings_row.telegram_chat_id},
                            files={"document": (os.path.basename(path), fh)},
                        )
                    if resp.status_code == 200 and resp.json().get("ok", False):
                        sent += 1
                    else:
                        logger.warning(
                            "send_file_to_phone_failed",
                            user_id=str(user_id),
                            status=resp.status_code,
                        )
            except Exception as e:
                logger.warning(
                    "send_file_to_phone_error", user_id=str(user_id), error=str(e)
                )
        return sent
