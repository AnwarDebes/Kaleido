import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class NewsletterCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=500)
    brand_id: uuid.UUID | None = None
    preview_text: str | None = None
    content_markdown: str | None = None
    from_name: str | None = None
    from_email: str | None = None
    reply_to: str | None = None


class NewsletterUpdate(BaseModel):
    subject: str | None = None
    preview_text: str | None = None
    content_markdown: str | None = None
    content_html: str | None = None
    from_name: str | None = None
    from_email: str | None = None
    reply_to: str | None = None
    status: str | None = None


class NewsletterResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID | None
    subject: str
    preview_text: str | None
    content_markdown: str | None
    content_html: str | None
    from_name: str | None
    from_email: str | None
    reply_to: str | None
    status: str
    sent_at: datetime | None
    recipients_count: int
    opens_count: int
    clicks_count: int
    ai_generated: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateNewsletterRequest(BaseModel):
    topic: str = Field(min_length=1)
    brand_id: uuid.UUID | None = None
    tone: str = "professional"
    include_recent_posts: bool = True


class SubscriberCreate(BaseModel):
    email: str = Field(min_length=1)
    name: str | None = None
    tags: list[str] = Field(default_factory=list)


class SubscriberResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str | None
    status: str
    tags: list[str] | None
    subscribed_at: datetime

    model_config = {"from_attributes": True}
