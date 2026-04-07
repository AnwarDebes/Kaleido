import base64
import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()

USER_AGENT = "Kaleido/0.1.0"


class RedditPlatform(BasePlatform):
    platform_name = "reddit"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        params = {
            "client_id": self.client_id,
            "response_type": "code",
            "state": state,
            "redirect_uri": redirect_uri,
            "duration": "permanent",
            "scope": "identity submit read",
        }
        return f"https://www.reddit.com/api/v1/authorize?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        auth = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.reddit.com/api/v1/access_token",
                data={
                    "grant_type": "authorization_code",
                    "code": code,
                    "redirect_uri": redirect_uri,
                },
                headers={
                    "Authorization": f"Basic {auth}",
                    "User-Agent": USER_AGENT,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["access_token"],
                refresh_token=data.get("refresh_token"),
                expires_in=data.get("expires_in"),
                scopes=data.get("scope", "").split(" "),
            )

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        auth = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://www.reddit.com/api/v1/access_token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
                headers={
                    "Authorization": f"Basic {auth}",
                    "User-Agent": USER_AGENT,
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
                "https://oauth.reddit.com/api/v1/me",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": USER_AGENT,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return PlatformProfile(
                platform_user_id=data["id"],
                username=data["name"],
                display_name=data.get("subreddit", {}).get("title", data["name"]),
                avatar_url=data.get("icon_img", "").split("?")[0] or None,
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Submit a post to a subreddit."""
        async with httpx.AsyncClient() as client:
            payload = {
                "sr": content.get("subreddit", ""),
                "kind": content.get("kind", "self"),  # self, link, image
                "title": content.get("title", content.get("text", "")[:300]),
                "resubmit": True,
                "api_type": "json",
            }
            if payload["kind"] == "self":
                payload["text"] = content.get("text", "")
            elif payload["kind"] == "link":
                payload["url"] = content.get("link_url", "")

            resp = await client.post(
                "https://oauth.reddit.com/api/submit",
                data=payload,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "User-Agent": USER_AGENT,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            things = data.get("json", {}).get("data", {})
            return {
                "platform_post_id": things.get("id", ""),
                "platform_post_url": things.get("url", ""),
            }
