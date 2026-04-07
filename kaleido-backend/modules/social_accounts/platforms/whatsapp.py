import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()

GRAPH_API = "https://graph.facebook.com/v19.0"


class WhatsAppBusinessPlatform(BasePlatform):
    """WhatsApp Business API via Meta's Cloud API (uses Facebook OAuth)."""

    platform_name = "whatsapp"

    def __init__(self, app_id: str = "", app_secret: str = ""):
        self.app_id = app_id
        self.app_secret = app_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        # WhatsApp Business uses Facebook Login flow with whatsapp_business_management scope
        from urllib.parse import urlencode
        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "whatsapp_business_management,whatsapp_business_messaging",
            "response_type": "code",
        }
        return f"https://www.facebook.com/v19.0/dialog/oauth?{urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_API}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["access_token"],
                expires_in=data.get("expires_in"),
            )

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        # WhatsApp system tokens don't need refresh
        raise NotImplementedError("WhatsApp system tokens are long-lived")

    async def get_profile(self, access_token: str) -> PlatformProfile:
        async with httpx.AsyncClient() as client:
            # Get WhatsApp Business Account info
            resp = await client.get(
                f"{GRAPH_API}/debug_token",
                params={
                    "input_token": access_token,
                    "access_token": access_token,
                },
            )
            resp.raise_for_status()
            token_data = resp.json().get("data", {})

            return PlatformProfile(
                platform_user_id=token_data.get("user_id", ""),
                display_name="WhatsApp Business",
                metadata={"app_id": token_data.get("app_id")},
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Send a message via WhatsApp Business API."""
        phone_number_id = content.get("phone_number_id", "")
        to = content.get("to", "")
        if not phone_number_id or not to:
            raise ValueError("phone_number_id and to are required")

        async with httpx.AsyncClient() as client:
            if content.get("template"):
                # Template message
                payload = {
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "template",
                    "template": {
                        "name": content["template"],
                        "language": {"code": content.get("language", "en_US")},
                    },
                }
            elif content.get("image_url"):
                # Image message
                payload = {
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "image",
                    "image": {
                        "link": content["image_url"],
                        "caption": content.get("text", ""),
                    },
                }
            else:
                # Text message
                payload = {
                    "messaging_product": "whatsapp",
                    "to": to,
                    "type": "text",
                    "text": {"body": content.get("text", "")},
                }

            resp = await client.post(
                f"{GRAPH_API}/{phone_number_id}/messages",
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            messages = data.get("messages", [{}])
            return {
                "platform_post_id": messages[0].get("id", "") if messages else "",
                "platform_post_url": "",
            }
