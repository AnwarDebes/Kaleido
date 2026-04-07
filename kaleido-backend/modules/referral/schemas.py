import uuid
from datetime import datetime

from pydantic import BaseModel


class ReferralResponse(BaseModel):
    id: uuid.UUID
    referrer_id: uuid.UUID
    referred_id: uuid.UUID
    status: str
    reward_type: str | None
    reward_amount: int
    created_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class ReferralDashboard(BaseModel):
    referral_code: str
    referral_link: str
    total_referrals: int
    completed_referrals: int
    pending_referrals: int
    total_rewards_earned: int
    referrals: list[ReferralResponse]


class ReferralSharePost(BaseModel):
    platform: str = "twitter"


class ReferralShareResponse(BaseModel):
    platform: str
    content: str
    referral_link: str
