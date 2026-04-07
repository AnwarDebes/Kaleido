import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class IntegrationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    provider: str
    status: str
    config: dict | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RSSFeedCreate(BaseModel):
    url: str = Field(min_length=1)
    brand_id: uuid.UUID | None = None
    auto_post: bool = False
    auto_post_platforms: list[str] = Field(default_factory=list)
    auto_post_tone: str = "professional"
    check_interval_minutes: int = Field(default=60, ge=15, le=1440)


class RSSFeedUpdate(BaseModel):
    auto_post: bool | None = None
    auto_post_platforms: list[str] | None = None
    auto_post_tone: str | None = None
    check_interval_minutes: int | None = None
    status: str | None = None


class RSSFeedResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID | None
    url: str
    title: str | None
    description: str | None
    auto_post: bool
    auto_post_platforms: list[str] | None
    auto_post_tone: str
    last_checked_at: datetime | None
    check_interval_minutes: int
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RSSEntryResponse(BaseModel):
    title: str
    link: str
    summary: str | None = None
    published: str | None = None
