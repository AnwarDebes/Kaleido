import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    brand_id: uuid.UUID | None = None
    title: str = "New Conversation"
    context_type: str = "general"
    context_id: uuid.UUID | None = None


class ConversationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    brand_id: uuid.UUID | None
    title: str
    context_type: str
    context_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=5000)


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: str
    content: str
    extra_data: dict | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatWithPostRequest(BaseModel):
    post_id: uuid.UUID
    question: str = Field(min_length=1, max_length=2000)
