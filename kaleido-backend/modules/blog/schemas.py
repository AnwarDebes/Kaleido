import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class BlogPostCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    brand_id: uuid.UUID | None = None
    excerpt: str | None = None
    content_markdown: str | None = None
    cover_image_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    category: str | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: list[str] = Field(default_factory=list)
    status: str = "draft"


class BlogPostUpdate(BaseModel):
    title: str | None = None
    excerpt: str | None = None
    content_markdown: str | None = None
    cover_image_url: str | None = None
    tags: list[str] | None = None
    category: str | None = None
    seo_title: str | None = None
    seo_description: str | None = None
    seo_keywords: list[str] | None = None
    status: str | None = None


class BlogPostResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID | None
    title: str
    slug: str
    excerpt: str | None
    content_markdown: str | None
    content_html: str | None
    cover_image_url: str | None
    tags: list[str] | None
    category: str | None
    seo_title: str | None
    seo_description: str | None
    seo_keywords: list[str] | None
    word_count: int
    reading_time_minutes: int
    status: str
    published_at: datetime | None
    ai_generated: bool
    ai_prompt: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GenerateBlogRequest(BaseModel):
    topic: str = Field(min_length=1)
    brand_id: uuid.UUID | None = None
    tone: str = "professional"
    target_word_count: int = Field(default=1500, ge=300, le=5000)
    language: str = "en"
    keywords: list[str] = Field(default_factory=list)
