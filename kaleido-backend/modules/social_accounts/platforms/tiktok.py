import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()


class TikTokPlatform(BasePlatform):
    platform_name = "tiktok"

    def __init__(self, client_key: str, client_secret: str):
        self.client_key = client_key
        self.client_secret = client_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_key": self.client_key,
            "response_type": "code",
            "scope": "user.info.basic,video.publish,video.upload",
            "redirect_uri": redirect_uri,
            "state": state,
        }
        return f"https://www.tiktok.com/v2/auth/authorize/?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://open.tiktokapis.com/v2/oauth/token/",
                data={
                    "client_key": self.client_key,
                    "client_secret": self.client_secret,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": redirect_uri,
                },
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
                "https://open.tiktokapis.com/v2/oauth/token/",
                data={
                    "client_key": self.client_key,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
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
                "https://open.tiktokapis.com/v2/user/info/",
                params={"fields": "open_id,union_id,display_name,avatar_url"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()["data"]["user"]
            return PlatformProfile(
                platform_user_id=data["open_id"],
                display_name=data.get("display_name"),
                avatar_url=data.get("avatar_url"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Initiate a TikTok video upload via Content Posting API."""
        async with httpx.AsyncClient() as client:
            # Step 1: Initialize upload
            resp = await client.post(
                "https://open.tiktokapis.com/v2/post/publish/inbox/video/init/",
                json={
                    "post_info": {
                        "title": content.get("text", ""),
                        "privacy_level": content.get("privacy", "SELF_ONLY"),
                    },
                    "source_info": {
                        "source": "PULL_FROM_URL",
                        "video_url": content.get("video_url", ""),
                    },
                },
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            return {
                "platform_post_id": data.get("publish_id", ""),
                "platform_post_url": "",
            }
