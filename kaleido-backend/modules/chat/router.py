import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.chat.schemas import (
    ChatMessageCreate,
    ChatMessageResponse,
    ChatWithPostRequest,
    ConversationCreate,
    ConversationResponse,
)
from modules.chat.service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat CMO"])


@router.get("/conversations")
async def list_conversations(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    convs, total = await ChatService.list_conversations(db, user.id, limit=per_page, offset=offset)
    return {
        "success": True,
        "data": [ConversationResponse.model_validate(c).model_dump() for c in convs],
        "meta": {"page": page, "per_page": per_page, "total": total},
    }


@router.post("/conversations")
async def create_conversation(
    data: ConversationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await ChatService.create_conversation(
        db, user.id,
        brand_id=data.brand_id,
        title=data.title,
        context_type=data.context_type,
        context_id=data.context_id,
    )
    return {"success": True, "data": ConversationResponse.model_validate(conv).model_dump()}


@router.post("/analyze-post")
async def chat_with_post(
    data: ChatWithPostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await ChatService.chat_with_post(db, user.id, data.post_id, data.question)
    return {"success": True, "data": result}


@router.get("/conversations/{conv_id}")
async def get_conversation(
    conv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await ChatService.get_conversation(db, conv_id, user.id)
    return {"success": True, "data": ConversationResponse.model_validate(conv).model_dump()}


@router.get("/conversations/{conv_id}/messages")
async def get_messages(
    conv_id: uuid.UUID,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ChatService.get_conversation(db, conv_id, user.id)
    offset = (page - 1) * per_page
    messages = await ChatService.get_messages(db, conv_id, limit=per_page, offset=offset)
    return {
        "success": True,
        "data": [ChatMessageResponse.model_validate(m).model_dump() for m in messages],
    }


@router.post("/conversations/{conv_id}/messages")
async def send_message(
    conv_id: uuid.UUID,
    data: ChatMessageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ai_msg = await ChatService.send_message(db, user.id, conv_id, data.content)
    return {"success": True, "data": ChatMessageResponse.model_validate(ai_msg).model_dump()}


@router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ChatService.delete_conversation(db, conv_id, user.id)
    return {"success": True, "data": {"message": "Conversation deleted"}}
