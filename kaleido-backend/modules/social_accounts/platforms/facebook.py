import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()

GRAPH_API_URL = "https://graph.facebook.com/v19.0"


class FacebookPlatform(BasePlatform):
    platform_name = "facebook"

    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri,
            "state": state,
            "scope": "pages_show_list,pages_read_engagement,pages_manage_posts,pages_read_user_content,instagram_basic,instagram_content_publish",
            "response_type": "code",
        }
        return f"https://www.facebook.com/v19.0/dialog/oauth?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_API_URL}/oauth/access_token",
                params={
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "redirect_uri": redirect_uri,
                    "code": code,
                },
            )
            resp.raise_for_status()
            data = resp.json()

            # Exchange for long-lived token
            long_resp = await client.get(
                f"{GRAPH_API_URL}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": data["access_token"],
                },
            )
            long_resp.raise_for_status()
            long_data = long_resp.json()

            return OAuthTokens(
                access_token=long_data["access_token"],
                expires_in=long_data.get("expires_in"),
            )

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        # Facebook long-lived tokens don't use refresh tokens in the same way
        # They need to be re-exchanged before expiry
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_API_URL}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": self.app_id,
                    "client_secret": self.app_secret,
                    "fb_exchange_token": refresh_token,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["access_token"],
                expires_in=data.get("expires_in"),
            )

    async def get_profile(self, access_token: str) -> PlatformProfile:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"{GRAPH_API_URL}/me",
                params={
                    "fields": "id,name,picture.type(large)",
                    "access_token": access_token,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return PlatformProfile(
                platform_user_id=data["id"],
                display_name=data.get("name"),
                avatar_url=data.get("picture", {}).get("data", {}).get("url"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        page_id = content.get("page_id")
        async with httpx.AsyncClient() as client:
            payload = {
                "message": content.get("text", ""),
                "access_token": access_token,
            }
            if content.get("link_url"):
                payload["link"] = content["link_url"]

            resp = await client.post(f"{GRAPH_API_URL}/{page_id}/feed", data=payload)
            resp.raise_for_status()
            data = resp.json()
            return {
                "platform_post_id": data.get("id"),
                "platform_post_url": f"https://facebook.com/{data.get('id')}",
            }
