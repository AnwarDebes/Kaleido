import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()


class PinterestPlatform(BasePlatform):
    platform_name = "pinterest"

    def __init__(self, app_id: str, app_secret: str):
        self.app_id = app_id
        self.app_secret = app_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self.app_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "boards:read,pins:read,pins:write,user_accounts:read",
            "state": state,
        }
        return f"https://www.pinterest.com/oauth/?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.pinterest.com/v5/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                auth=(self.app_id, self.app_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                expires_in=data.get("expires_in"),
                scopes=data.get("scope", "").split(","),
            )

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.pinterest.com/v5/oauth/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                auth=(self.app_id, self.app_secret),
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                expires_in=data.get("expires_in"),
            )

    async def get_profile(self, access_token: str) -> PlatformProfile:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.pinterest.com/v5/user_account",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return PlatformProfile(
                platform_user_id=data.get("username", ""),
                username=data.get("username"),
                display_name=data.get("business_name") or data.get("username"),
                avatar_url=data.get("profile_image"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Create a pin on Pinterest."""
        async with httpx.AsyncClient() as client:
            payload = {
                "title": content.get("title", ""),
                "description": content.get("text", ""),
                "board_id": content.get("board_id", ""),
                "media_source": {
                    "source_type": "image_url",
                    "url": content.get("image_url", ""),
                },
            }
            if content.get("link_url"):
                payload["link"] = content["link_url"]

            resp = await client.post(
                "https://api.pinterest.com/v5/pins",
                json=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "platform_post_id": data.get("id", ""),
                "platform_post_url": f"https://www.pinterest.com/pin/{data.get('id', '')}",
            }
