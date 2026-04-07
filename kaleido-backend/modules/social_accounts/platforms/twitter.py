import base64
import hashlib
import secrets
import urllib.parse

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()


class TwitterPlatform(BasePlatform):
    platform_name = "twitter"

    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        # PKCE challenge
        code_verifier = secrets.token_urlsafe(64)
        code_challenge = base64.urlsafe_b64encode(
            hashlib.sha256(code_verifier.encode()).digest()
        ).decode().rstrip("=")

        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": "tweet.read tweet.write users.read offline.access",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
        }
        # Store code_verifier in state for later use (in practice, store in Redis)
        return f"https://twitter.com/i/oauth2/authorize?{urllib.parse.urlencode(params)}"

    async def exchange_code(self, code: str, redirect_uri: str, code_verifier: str = "") -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.twitter.com/2/oauth2/token",
                data={
                    "code": code,
                    "grant_type": "authorization_code",
                    "client_id": self.client_id,
                    "redirect_uri": redirect_uri,
                    "code_verifier": code_verifier,
                },
                auth=(self.client_id, self.client_secret),
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
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.twitter.com/2/oauth2/token",
                data={
                    "refresh_token": refresh_token,
                    "grant_type": "refresh_token",
                    "client_id": self.client_id,
                },
                auth=(self.client_id, self.client_secret),
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
                "https://api.twitter.com/2/users/me",
                params={"user.fields": "id,name,username,profile_image_url"},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            return PlatformProfile(
                platform_user_id=data["id"],
                username=data.get("username"),
                display_name=data.get("name"),
                avatar_url=data.get("profile_image_url"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        async with httpx.AsyncClient() as client:
            payload = {"text": content.get("text", "")}
            resp = await client.post(
                "https://api.twitter.com/2/tweets",
                json=payload,
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()["data"]
            return {
                "platform_post_id": data["id"],
                "platform_post_url": f"https://twitter.com/i/web/status/{data['id']}",
            }
