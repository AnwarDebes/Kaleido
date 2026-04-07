import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class CampaignCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    goal: str | None = None
    brand_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    platforms: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class CampaignUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    goal: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    status: str | None = None
    platforms: list[str] | None = None
    tags: list[str] | None = None


class CampaignResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID | None
    name: str
    description: str | None
    goal: str | None
    start_date: datetime | None
    end_date: datetime | None
    status: str
    platforms: list[str] | None
    tags: list[str] | None
    content_plan: dict | None
    ai_generated: bool
    metrics_cache: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateCampaignPlanRequest(BaseModel):
    topic: str = Field(min_length=1)
    platforms: list[str] = Field(default=["twitter", "instagram", "linkedin"])
    duration_days: int = Field(default=14, ge=1, le=90)
    posts_per_week: int = Field(default=5, ge=1, le=21)
    tone: str = "professional"
