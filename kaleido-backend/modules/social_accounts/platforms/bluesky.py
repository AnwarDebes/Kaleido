import re
from datetime import datetime, timezone

import httpx
import structlog

from modules.social_accounts.platforms.base import BasePlatform, OAuthTokens, PlatformProfile

logger = structlog.get_logger()

BSKY_API = "https://bsky.social/xrpc"


class BlueskyPlatform(BasePlatform):
    """Bluesky uses ATP (AT Protocol) with app passwords instead of OAuth."""

    platform_name = "bluesky"

    def __init__(self, **kwargs):
        pass

    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        # Bluesky uses app passwords, not OAuth
        # Return a placeholder; frontend handles credential input
        return f"{redirect_uri}?state={state}&platform=bluesky"

    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        # For Bluesky, "code" is actually "handle:app_password"
        parts = code.split(":", 1)
        if len(parts) != 2:
            raise ValueError("Expected format: handle:app_password")

        handle, app_password = parts

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BSKY_API}/com.atproto.server.createSession",
                json={"identifier": handle, "password": app_password},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["accessJwt"],
                refresh_token=data["refreshJwt"],
            )

    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{BSKY_API}/com.atproto.server.refreshSession",
                headers={"Authorization": f"Bearer {refresh_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return OAuthTokens(
                access_token=data["accessJwt"],
                refresh_token=data["refreshJwt"],
            )

    async def get_profile(self, access_token: str) -> PlatformProfile:
        async with httpx.AsyncClient() as client:
            # Get session info first to get DID
            resp = await client.get(
                f"{BSKY_API}/com.atproto.server.getSession",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            session = resp.json()
            did = session["did"]
            handle = session["handle"]

            # Get full profile
            resp = await client.get(
                f"{BSKY_API}/app.bsky.actor.getProfile",
                params={"actor": did},
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            return PlatformProfile(
                platform_user_id=did,
                username=handle,
                display_name=data.get("displayName", handle),
                avatar_url=data.get("avatar"),
            )

    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Create a post on Bluesky."""
        text = content.get("text", "")

        # Parse facets (links, mentions, hashtags)
        facets = []
        # Detect URLs
        for match in re.finditer(r"https?://[^\s]+", text):
            facets.append({
                "index": {
                    "byteStart": len(text[:match.start()].encode("utf-8")),
                    "byteEnd": len(text[:match.end()].encode("utf-8")),
                },
                "features": [{"$type": "app.bsky.richtext.facet#link", "uri": match.group()}],
            })

        async with httpx.AsyncClient() as client:
            # Get session for DID
            resp = await client.get(
                f"{BSKY_API}/com.atproto.server.getSession",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            did = resp.json()["did"]

            record = {
                "$type": "app.bsky.feed.post",
                "text": text,
                "createdAt": datetime.now(timezone.utc).isoformat(),
            }
            if facets:
                record["facets"] = facets

            resp = await client.post(
                f"{BSKY_API}/com.atproto.repo.createRecord",
                json={
                    "repo": did,
                    "collection": "app.bsky.feed.post",
                    "record": record,
                },
                headers={"Authorization": f"Bearer {access_token}"},
            )
            resp.raise_for_status()
            data = resp.json()
            rkey = data["uri"].split("/")[-1]
            return {
                "platform_post_id": data["uri"],
                "platform_post_url": f"https://bsky.app/profile/{did}/post/{rkey}",
            }
