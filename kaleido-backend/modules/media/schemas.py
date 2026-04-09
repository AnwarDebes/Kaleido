import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class MediaUploadResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    filename: str
    file_url: str | None
    file_type: str
    mime_type: str | None
    file_size: int | None
    width: int | None
    height: int | None
    duration_seconds: float | None = None
    thumbnail_url: str | None = None
    ai_generated: bool
    ai_prompt: str | None = None
    ai_model: str | None = None
    folder: str
    tags: list[str] | None
    source: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaUpdate(BaseModel):
    filename: str | None = None
    folder: str | None = None
    tags: list[str] | None = None
    alt_text: str | None = None


class GenerateImageRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    aspect_ratio: str = Field(default="1:1", pattern=r"^\d+:\d+$")
    style: str = "photorealistic"
    steps: int = Field(default=4, ge=1, le=50)
    seed: int | None = None
    folder: str = "/generated"
    tags: list[str] = Field(default_factory=list)


class GenerateVideoRequest(BaseModel):
    prompt: str = Field(min_length=1, max_length=2000)
    duration: int = Field(default=5, ge=2, le=300)
    width: int = Field(default=832, ge=256, le=1280)
    height: int = Field(default=480, ge=256, le=720)
    fps: int = Field(default=16, ge=8, le=30)
    folder: str = "/generated"
    tags: list[str] = Field(default_factory=list)


class FolderCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    parent: str = "/"


class FolderResponse(BaseModel):
    path: str
    name: str
    file_count: int = 0
