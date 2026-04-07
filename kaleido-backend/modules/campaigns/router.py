import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.campaigns.schemas import (
    CampaignCreate,
    CampaignResponse,
    CampaignUpdate,
    GenerateCampaignPlanRequest,
)
from modules.campaigns.service import CampaignService

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


@router.get("")
async def list_campaigns(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    campaigns, total = await CampaignService.list_campaigns(
        db, user.id, status=status, limit=per_page, offset=offset
    )
    return {
        "success": True,
        "data": [CampaignResponse.model_validate(c).model_dump() for c in campaigns],
        "meta": {"page": page, "per_page": per_page, "total": total},
    }


@router.post("")
async def create_campaign(
    data: CampaignCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.create_campaign(db, user.id, data)
    return {
        "success": True,
        "data": CampaignResponse.model_validate(campaign).model_dump(),
    }


@router.get("/{campaign_id}")
async def get_campaign(
    campaign_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.get_campaign(db, campaign_id, user.id)
    return {
        "success": True,
        "data": CampaignResponse.model_validate(campaign).model_dump(),
    }


@router.patch("/{campaign_id}")
async def update_campaign(
    campaign_id: uuid.UUID,
    data: CampaignUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.update_campaign(db, campaign_id, user.id, data)
    return {
        "success": True,
        "data": CampaignResponse.model_validate(campaign).model_dump(),
    }


@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await CampaignService.delete_campaign(db, campaign_id, user.id)
    return {"success": True, "data": {"message": "Campaign deleted"}}


@router.post("/{campaign_id}/generate-plan")
async def generate_campaign_plan(
    campaign_id: uuid.UUID,
    data: GenerateCampaignPlanRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    campaign = await CampaignService.generate_content_plan(
        db, campaign_id, user.id,
        topic=data.topic,
        platforms=data.platforms,
        duration_days=data.duration_days,
        posts_per_week=data.posts_per_week,
        tone=data.tone,
    )
    return {
        "success": True,
        "data": CampaignResponse.model_validate(campaign).model_dump(),
    }


@router.get("/{campaign_id}/analytics")
async def get_campaign_analytics(
    campaign_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    analytics = await CampaignService.get_campaign_analytics(db, campaign_id, user.id)
    return {"success": True, "data": analytics}
