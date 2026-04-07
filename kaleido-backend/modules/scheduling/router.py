import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.content.schemas import PostResponse
from modules.scheduling.publisher import Publisher
from modules.scheduling.scheduler import Scheduler
from modules.scheduling.schemas import (
    AutoQueueRequest,
    PublicationStatusResponse,
    SchedulePostRequest,
    SuggestTimeResponse,
)

router = APIRouter(prefix="/schedule", tags=["Scheduling"])


@router.post("/posts/{post_id}")
async def schedule_post(
    post_id: uuid.UUID,
    data: SchedulePostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await Scheduler.schedule_post(db, post_id, user.id, data.scheduled_at)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.delete("/posts/{post_id}")
async def unschedule_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await Scheduler.unschedule_post(db, post_id, user.id)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.post("/posts/{post_id}/auto-queue")
async def auto_queue_post(
    post_id: uuid.UUID,
    data: AutoQueueRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await Scheduler.auto_queue_post(db, post_id, user.id, data.platform)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.get("/suggest-time")
async def suggest_optimal_time(
    platform: str = "instagram",
    user: User = Depends(get_current_user),
):
    suggested = await Scheduler.suggest_optimal_time(platform)
    return {
        "success": True,
        "data": SuggestTimeResponse(platform=platform, suggested_time=suggested).model_dump(),
    }


@router.get("/calendar")
async def get_calendar(
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    brand_id: uuid.UUID | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    posts = await Scheduler.get_calendar_data(db, user.id, start_date, end_date, brand_id)
    return {
        "success": True,
        "data": [PostResponse.model_validate(p).model_dump() for p in posts],
    }


@router.post("/posts/{post_id}/publish")
async def publish_post_now(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await Publisher.publish_post(db, post_id)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.get("/posts/{post_id}/status")
async def get_publication_status(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    publications = await Publisher.get_publication_status(db, post_id)
    return {
        "success": True,
        "data": [PublicationStatusResponse.model_validate(p).model_dump() for p in publications],
    }


@router.post("/publications/{pub_id}/retry")
async def retry_publication(
    pub_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pub = await Publisher.retry_publication(db, pub_id, user.id)
    return {
        "success": True,
        "data": PublicationStatusResponse.model_validate(pub).model_dump(),
    }
