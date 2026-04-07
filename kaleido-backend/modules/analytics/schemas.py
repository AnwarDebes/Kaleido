import uuid
from datetime import datetime

from pydantic import BaseModel


class OverviewMetrics(BaseModel):
    total_followers: int = 0
    total_reach: int = 0
    total_engagement: int = 0
    total_posts_published: int = 0
    avg_engagement_rate: float = 0.0
    platform_breakdown: dict = {}


class PostMetrics(BaseModel):
    post_id: uuid.UUID
    platform: str
    likes: int = 0
    comments: int = 0
    shares: int = 0
    saves: int = 0
    reach: int = 0
    impressions: int = 0
    clicks: int = 0
    engagement_rate: float = 0.0
    collected_at: datetime

    model_config = {"from_attributes": True}


class GrowthDataPoint(BaseModel):
    date: str
    followers: int = 0
    reach: int = 0
    engagement: int = 0
    platform: str | None = None


class BestTimeSlot(BaseModel):
    day_of_week: str
    hour: int
    avg_engagement: float
    platform: str


class AnalyticsSnapshotResponse(BaseModel):
    id: uuid.UUID
    platform: str
    followers_count: int
    following_count: int
    posts_count: int
    total_reach: int
    total_impressions: int
    total_engagement: int
    engagement_rate: float
    collected_at: datetime

    model_config = {"from_attributes": True}
