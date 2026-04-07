from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.referral.schemas import ReferralDashboard, ReferralSharePost, ReferralShareResponse
from modules.referral.service import ReferralService

router = APIRouter(prefix="/referrals", tags=["Referrals"])


@router.get("/dashboard")
async def get_referral_dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    data = await ReferralService.get_dashboard(db, user.id)
    return {
        "success": True,
        "data": ReferralDashboard(**{
            **data,
            "referrals": [
                {
                    "id": r.id,
                    "referrer_id": r.referrer_id,
                    "referred_id": r.referred_id,
                    "status": r.status,
                    "reward_type": r.reward_type,
                    "reward_amount": r.reward_amount,
                    "created_at": r.created_at,
                    "completed_at": r.completed_at,
                }
                for r in data["referrals"]
            ],
        }).model_dump(),
    }


@router.post("/share")
async def generate_share_post(
    data: ReferralSharePost,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await ReferralService.generate_share_post(db, user.id, data.platform)
    return {
        "success": True,
        "data": ReferralShareResponse(**result).model_dump(),
    }


@router.get("/code")
async def get_referral_code(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    code = await ReferralService.get_or_create_referral_code(db, user.id)
    return {
        "success": True,
        "data": {"referral_code": code},
    }
