import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()


class SnapchatPlatform(BasePlatform):
    """Snapchat Marketing API for business accounts."""

    platform_name = "snapchat"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": "snapchat-marketing-api",
            "state": state,
        }
        return f"https://accounts.snapchat.com/login/oauth2/authorize?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://accounts.snapchat.com/login/oauth2/access_token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
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
                "https://accounts.snapchat.com/login/oauth2/access_token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                },
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
                "https://adsapi.snapchat.com/v1/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()["me"]
            return PlatformProfile(
                platform_user_id=data["id"],
                display_name=data.get("display_name", ""),
                username=data.get("email"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Create a Snap via the Marketing API (organic content via Snap Kit)."""
        # Snapchat organic posting requires Snap Kit deep linking
        # For business, we use the Marketing API for ads/stories
        ad_account_id = content.get("ad_account_id", "")
        if not ad_account_id:
            raise ValueError("ad_account_id required for Snapchat publishing")

        async with httpx.AsyncClient() as client:
            payload = {
                "creatives": [
                    {
                        "ad_account_id": ad_account_id,
                        "name": content.get("title", "Kaleido Post"),
                        "type": "SNAP_AD",
                        "headline": content.get("text", "")[:34],
                        "top_snap_media_id": content.get("media_id", ""),
                    }
                ]
            }
            resp = await client.post(
                f"https://adsapi.snapchat.com/v1/adaccounts/{ad_account_id}/creatives",
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            creative = data.get("creatives", [{}])[0].get("creative", {})
            return {
                "platform_post_id": creative.get("id", ""),
                "platform_post_url": "",
            }
