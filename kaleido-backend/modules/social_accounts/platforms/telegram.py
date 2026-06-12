import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()


class TelegramPlatform(BasePlatform):
    """Telegram uses Bot API for channel/group posting. No OAuth flow; uses bot token + chat_id."""

    platform_name = "telegram"

    def __init__(self, **kwargs):
        pass

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        # Telegram bot setup is done via BotFather; frontend handles bot token input
        return f"{redirect_uri}?state={state}&platform=telegram"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        # For Telegram, "code" is "bot_token:chat_id"
        parts = code.split(":", 2)
        if len(parts) < 2:
            raise ValueError("Expected format: bot_token:chat_id (bot_token itself contains a colon)")

        # Bot token format: 123456:ABC-DEF, so we split on last ':'
        last_colon = code.rfind(":")
        bot_token = code[:last_colon]
        chat_id = code[last_colon + 1:]

        # Verify bot token by calling getMe
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://api.telegram.org/bot{bot_token}/getMe")
            resp.raise_for_status()
            data = resp.json()
            if not data.get("ok"):
                raise ValueError("Invalid bot token")

        # Store bot_token as access_token and chat_id as refresh_token (for storage convenience)
        return OAuthTokens(
            access_token=bot_token,
            refresh_token=chat_id,
        )

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        # Bot tokens don't expire
        raise NotImplementedError("Telegram bot tokens don't expire")

    async def get_profile(self, access_token: str) -> PlatformProfile:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"https://api.telegram.org/bot{access_token}/getMe")
            resp.raise_for_status()
            data = resp.json()["result"]
            return PlatformProfile(
                platform_user_id=str(data["id"]),
                username=data.get("username", ""),
                display_name=data.get("first_name", "Bot"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Send a message to a Telegram chat/channel."""
        chat_id = content.get("chat_id", "")
        if not chat_id:
            raise ValueError("chat_id is required")

        async with httpx.AsyncClient() as client:
            text = content.get("text", "")

            if content.get("image_url"):
                # Send photo with caption
                resp = await client.post(
                    f"https://api.telegram.org/bot{access_token}/sendPhoto",
                    json={
                        "chat_id": chat_id,
                        "photo": content["image_url"],
                        "caption": text[:1024],
                        "parse_mode": content.get("parse_mode", "HTML"),
                    },
                )
            else:
                # Send text message
                resp = await client.post(
                    f"https://api.telegram.org/bot{access_token}/sendMessage",
                    json={
                        "chat_id": chat_id,
                        "text": text,
                        "parse_mode": content.get("parse_mode", "HTML"),
                        "disable_web_page_preview": content.get("disable_preview", False),
                    },
                )

            resp.raise_for_status()
            data = resp.json()
            if not data.get("ok"):
                raise ValueError(data.get("description", "Telegram API error"))

            message = data["result"]
            return {
                "platform_post_id": str(message["message_id"]),
                "platform_post_url": "",
            }
