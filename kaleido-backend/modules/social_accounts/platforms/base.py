from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class OAuthTokens:
    access_token: str
    refresh_token: str | None = None
    expires_in: int | None = None
    scopes: list[str] | None = None


@dataclass
class PlatformProfile:
    platform_user_id: str
    username: str | None = None
    display_name: str | None = None
    avatar_url: str | None = None
    metadata: dict | None = None


class BasePlatform(ABC):
    """Abstract base class for social media platform integrations."""

    platform_name: str = ""

    @abstractmethod
    def get_auth_url(self, redirect_uri: str, state: str) -> str:
        """Generate the OAuth authorization URL."""
        ...

    @abstractmethod
    async def exchange_code(self, code: str, redirect_uri: str) -> OAuthTokens:
        """Exchange authorization code for access tokens."""
        ...

    @abstractmethod
    async def refresh_access_token(self, refresh_token: str) -> OAuthTokens:
        """Refresh the access token using a refresh token."""
        ...

    @abstractmethod
    async def get_profile(self, access_token: str) -> PlatformProfile:
        """Get the user's profile information from the platform."""
        ...

    @abstractmethod
    async def publish_post(self, access_token: str, content: dict) -> dict:
        """Publish a post to the platform. Returns platform-specific post data."""
        ...
