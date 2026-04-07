import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class SchedulePostRequest(BaseModel):
    scheduled_at: datetime


class AutoQueueRequest(BaseModel):
    platform: str = "instagram"


class SuggestTimeRequest(BaseModel):
    platform: str = "instagram"
    start_date: datetime | None = None


class SuggestTimeResponse(BaseModel):
    platform: str
    suggested_time: datetime


class CalendarQuery(BaseModel):
    start_date: datetime
    end_date: datetime
    brand_id: uuid.UUID | None = None


class PublicationStatusResponse(BaseModel):
    id: uuid.UUID
    post_id: uuid.UUID
    social_account_id: uuid.UUID
    platform: str
    platform_post_id: str | None
    platform_post_url: str | None
    status: str
    error_message: str | None
    retry_count: int
    content_sent: dict | None
    published_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}
