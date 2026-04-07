import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class PostCreate(BaseModel):
    brand_id: uuid.UUID | None = None
    content_text: str | None = None
    platform_contents: dict = Field(default_factory=dict)
    content_type: str = "post"
    hashtags: list[str] = Field(default_factory=list)
    link_url: str | None = None
    first_comment: str | None = None
    alt_text: str | None = None
    status: str = "draft"
    scheduled_at: datetime | None = None


class PostUpdate(BaseModel):
    content_text: str | None = None
    platform_contents: dict | None = None
    hashtags: list[str] | None = None
    link_url: str | None = None
    first_comment: str | None = None
    alt_text: str | None = None
    status: str | None = None
    scheduled_at: datetime | None = None


class PostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID | None
    campaign_id: uuid.UUID | None
    content_text: str | None
    platform_contents: dict
    content_type: str
    hashtags: list[str] | None
    link_url: str | None
    first_comment: str | None
    alt_text: str | None
    ai_generated: bool
    ai_prompt: str | None
    ai_model: str | None
    ai_variations: list
    status: str
    scheduled_at: datetime | None
    published_at: datetime | None
    approval_status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GeneratePostRequest(BaseModel):
    brand_id: uuid.UUID | None = None
    topic: str = Field(min_length=1)
    platforms: list[str] = Field(default=["twitter", "instagram", "linkedin"])
    tone: str = "professional"
    language: str = "en"


class EnhancePostRequest(BaseModel):
    instructions: str = "Make it more engaging"
    platform: str = "instagram"


class TranslatePostRequest(BaseModel):
    target_language: str = "no"


class GenerateCarouselRequest(BaseModel):
    topic: str = Field(min_length=1)
    num_slides: int = Field(default=5, ge=2, le=10)
    platform: str = "instagram"
    color_scheme: str = "dark"
    brand_name: str | None = None


class MediaFileResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    file_url: str | None
    file_type: str
    file_size: int | None
    width: int | None
    height: int | None
    ai_generated: bool
    folder: str
    tags: list[str] | None
    created_at: datetime

    model_config = {"from_attributes": True}
