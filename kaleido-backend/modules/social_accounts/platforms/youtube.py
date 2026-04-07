import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class YouTubePlatform(BasePlatform):
    platform_name = "youtube"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
            "access_type": "offline",
            "state": state,
            "prompt": "consent",
        }
        return f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                expires_in=data.get("expires_in"),
            )

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
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
                "https://www.googleapis.com/youtube/v3/channels",
                params={"part": "snippet", "mine": "true"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            items = resp.json().get("items", [])
            if not items:
                raise ValueError("No YouTube channel found")
            channel = items[0]
            snippet = channel["snippet"]
            return PlatformProfile(
                platform_user_id=channel["id"],
                username=snippet.get("customUrl", ""),
                display_name=snippet.get("title", ""),
                avatar_url=snippet.get("thumbnails", {}).get("default", {}).get("url"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Upload a video to YouTube using resumable upload."""
        async with httpx.AsyncClient() as client:
            # Step 1: Initialize resumable upload
            metadata = {
                "snippet": {
                    "title": content.get("title", content.get("text", "")[:100]),
                    "description": content.get("text", ""),
                    "tags": content.get("hashtags", []),
                    "categoryId": content.get("category_id", "22"),
                },
                "status": {
                    "privacyStatus": content.get("privacy", "private"),
                    "selfDeclaredMadeForKids": False,
                },
            }
            resp = await client.post(
                "https://www.googleapis.com/upload/youtube/v3/videos",
                params={"uploadType": "resumable", "part": "snippet,status"},
                json=metadata,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            upload_url = resp.headers.get("location", "")

            return {
                "platform_post_id": "",
                "platform_post_url": "",
                "upload_url": upload_url,
            }
