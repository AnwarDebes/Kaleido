import uuid
from datetime import datetime

from pydantic import BaseModel


class SocialAccountResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID | None
    platform: str
    platform_user_id: str | None
    platform_username: str | None
    platform_display_name: str | None
    platform_avatar_url: str | None
    is_active: bool
    last_synced_at: datetime | None
    token_expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ConnectAccountRequest(BaseModel):
    brand_id: uuid.UUID | None = None
