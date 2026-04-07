from celery import Celery
from celery.schedules import crontab

from config.settings import settings

celery_app = Celery(
    "kaleido",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_default_queue="default",
    task_queues={
        "default": {"exchange": "default", "routing_key": "default"},
        "content": {"exchange": "content", "routing_key": "content"},
        "media": {"exchange": "media", "routing_key": "media"},
        "publishing": {"exchange": "publishing", "routing_key": "publishing"},
        "analytics": {"exchange": "analytics", "routing_key": "analytics"},
    },
    beat_schedule={
        "check-scheduled-posts": {
            "task": "tasks.publishing_tasks.check_scheduled_posts",
            "schedule": 60.0,  # Every minute
        },
        "refresh-social-tokens": {
            "task": "tasks.scheduled_tasks.refresh_expiring_tokens",
            "schedule": crontab(minute=0),  # Every hour
        },
        "collect-analytics": {
            "task": "tasks.analytics_tasks.collect_analytics",
            "schedule": crontab(minute=0, hour="*/6"),  # Every 6 hours
        },
    },
)

celery_app.autodiscover_tasks(["tasks"])
