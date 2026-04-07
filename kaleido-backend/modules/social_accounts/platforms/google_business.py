import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"


class GoogleBusinessPlatform(BasePlatform):
    platform_name = "google_business"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "https://www.googleapis.com/auth/business.manage",
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
                "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            accounts = resp.json().get("accounts", [])
            if not accounts:
                raise ValueError("No Google Business account found")
            account = accounts[0]
            return PlatformProfile(
                platform_user_id=account["name"],
                display_name=account.get("accountName", ""),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Create a Google Business Profile post."""
        location_name = content.get("location_name", "")
        if not location_name:
            raise ValueError("location_name is required for Google Business posts")

        async with httpx.AsyncClient() as client:
            payload = {
                "languageCode": content.get("language", "en"),
                "topicType": content.get("topic_type", "STANDARD"),
                "summary": content.get("text", ""),
            }

            if content.get("image_url"):
                payload["media"] = {
                    "sourceUrl": content["image_url"],
                    "mediaFormat": "PHOTO",
                }

            if content.get("cta_type") and content.get("cta_url"):
                payload["callToAction"] = {
                    "actionType": content["cta_type"],
                    "url": content["cta_url"],
                }

            resp = await client.post(
                f"https://mybusiness.googleapis.com/v4/{location_name}/localPosts",
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return {
                "platform_post_id": data.get("name", ""),
                "platform_post_url": data.get("searchUrl", ""),
            }
