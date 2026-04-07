import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.newsletter.schemas import (
    GenerateNewsletterRequest,
    NewsletterCreate,
    NewsletterResponse,
    NewsletterUpdate,
    SubscriberCreate,
    SubscriberResponse,
)
from modules.newsletter.service import NewsletterService

router = APIRouter(prefix="/newsletters", tags=["Newsletters"])


@router.get("")
async def list_newsletters(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    newsletters, total = await NewsletterService.list_newsletters(db, user.id, status=status, limit=per_page, offset=offset)
    return {
        "success": True,
        "data": [NewsletterResponse.model_validate(n).model_dump() for n in newsletters],
        "meta": {"page": page, "per_page": per_page, "total": total},
    }


@router.post("")
async def create_newsletter(
    data: NewsletterCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nl = await NewsletterService.create_newsletter(db, user.id, data)
    return {"success": True, "data": NewsletterResponse.model_validate(nl).model_dump()}


@router.post("/generate")
async def generate_newsletter(
    data: GenerateNewsletterRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nl = await NewsletterService.generate_newsletter(
        db, user.id, topic=data.topic, brand_id=data.brand_id, tone=data.tone
    )
    return {"success": True, "data": NewsletterResponse.model_validate(nl).model_dump()}


# --- Subscribers (before /{nl_id} to avoid route conflicts) ---
@router.get("/subscribers")
async def list_subscribers(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=200),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    subs, total = await NewsletterService.list_subscribers(db, user.id, limit=per_page, offset=offset)
    return {
        "success": True,
        "data": [SubscriberResponse.model_validate(s).model_dump() for s in subs],
        "meta": {"page": page, "per_page": per_page, "total": total},
    }


@router.post("/subscribers")
async def add_subscriber(
    data: SubscriberCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await NewsletterService.add_subscriber(db, user.id, data)
    return {"success": True, "data": SubscriberResponse.model_validate(sub).model_dump()}


@router.delete("/subscribers/{sub_id}")
async def unsubscribe(
    sub_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sub = await NewsletterService.unsubscribe(db, sub_id, user.id)
    return {"success": True, "data": SubscriberResponse.model_validate(sub).model_dump()}


# --- Newsletter by ID ---
@router.get("/{nl_id}")
async def get_newsletter(
    nl_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nl = await NewsletterService.get_newsletter(db, nl_id, user.id)
    return {"success": True, "data": NewsletterResponse.model_validate(nl).model_dump()}


@router.patch("/{nl_id}")
async def update_newsletter(
    nl_id: uuid.UUID,
    data: NewsletterUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nl = await NewsletterService.update_newsletter(db, nl_id, user.id, data)
    return {"success": True, "data": NewsletterResponse.model_validate(nl).model_dump()}


@router.delete("/{nl_id}")
async def delete_newsletter(
    nl_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await NewsletterService.delete_newsletter(db, nl_id, user.id)
    return {"success": True, "data": {"message": "Newsletter deleted"}}


@router.post("/{nl_id}/send")
async def send_newsletter(
    nl_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    nl = await NewsletterService.send_newsletter(db, nl_id, user.id)
    return {"success": True, "data": NewsletterResponse.model_validate(nl).model_dump()}
