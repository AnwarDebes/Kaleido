import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BrandCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    website_url: str | None = None
    industry: str | None = None
    target_audience: str | None = None
    description: str | None = None
    logo_url: str | None = None
    color_primary: str | None = None
    color_secondary: str | None = None
    color_accent: str | None = None
    brand_voice: dict = Field(default_factory=dict)
    content_pillars: list = Field(default_factory=list)
    competitors: list = Field(default_factory=list)
    dos_and_donts: dict = Field(default_factory=dict)
    is_default: bool = False


class BrandUpdate(BaseModel):
    name: str | None = None
    website_url: str | None = None
    industry: str | None = None
    target_audience: str | None = None
    description: str | None = None
    logo_url: str | None = None
    color_primary: str | None = None
    color_secondary: str | None = None
    color_accent: str | None = None
    brand_voice: dict | None = None
    content_pillars: list | None = None
    competitors: list | None = None
    dos_and_donts: dict | None = None
    is_default: bool | None = None


class BrandResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    website_url: str | None
    industry: str | None
    target_audience: str | None
    description: str | None
    logo_url: str | None
    color_primary: str | None
    color_secondary: str | None
    color_accent: str | None
    brand_voice: dict
    content_pillars: list
    competitors: list
    dos_and_donts: dict
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
