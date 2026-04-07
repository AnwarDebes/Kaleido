import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.integrations.schemas import (
    IntegrationResponse,
    RSSEntryResponse,
    RSSFeedCreate,
    RSSFeedResponse,
    RSSFeedUpdate,
)
from modules.integrations.service import IntegrationService, RSSService

router = APIRouter(prefix="/integrations", tags=["Integrations"])


@router.get("")
async def list_integrations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    integrations = await IntegrationService.list_integrations(db, user.id)
    return {
        "success": True,
        "data": [IntegrationResponse.model_validate(i).model_dump() for i in integrations],
    }


@router.delete("/{integration_id}")
async def disconnect_integration(
    integration_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await IntegrationService.disconnect_integration(db, integration_id, user.id)
    return {"success": True, "data": {"message": "Integration disconnected"}}


# --- RSS Feeds ---
@router.get("/rss")
async def list_rss_feeds(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    feeds = await RSSService.list_feeds(db, user.id)
    return {
        "success": True,
        "data": [RSSFeedResponse.model_validate(f).model_dump() for f in feeds],
    }


@router.post("/rss")
async def add_rss_feed(
    data: RSSFeedCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    feed = await RSSService.add_feed(db, user.id, data)
    return {"success": True, "data": RSSFeedResponse.model_validate(feed).model_dump()}


@router.get("/rss/{feed_id}")
async def get_rss_feed(
    feed_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    feed = await RSSService.get_feed(db, feed_id, user.id)
    return {"success": True, "data": RSSFeedResponse.model_validate(feed).model_dump()}


@router.patch("/rss/{feed_id}")
async def update_rss_feed(
    feed_id: uuid.UUID,
    data: RSSFeedUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    feed = await RSSService.update_feed(db, feed_id, user.id, data)
    return {"success": True, "data": RSSFeedResponse.model_validate(feed).model_dump()}


@router.delete("/rss/{feed_id}")
async def delete_rss_feed(
    feed_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await RSSService.delete_feed(db, feed_id, user.id)
    return {"success": True, "data": {"message": "RSS feed deleted"}}


@router.get("/rss/{feed_id}/entries")
async def get_rss_entries(
    feed_id: uuid.UUID,
    limit: int = Query(default=10, ge=1, le=50),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    entries = await RSSService.fetch_entries(db, feed_id, user.id, limit=limit)
    return {
        "success": True,
        "data": [RSSEntryResponse(**e).model_dump() for e in entries],
    }
