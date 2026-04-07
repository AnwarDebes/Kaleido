import asyncio

import structlog

from tasks.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="tasks.publishing_tasks.check_scheduled_posts", queue="publishing")
def check_scheduled_posts():
    """Check for posts that are due to be published."""
    asyncio.run(_check_scheduled())


async def _check_scheduled():
    from config.database import async_session
    from modules.scheduling.scheduler import Scheduler

    async with async_session() as db:
        posts = await Scheduler.get_due_posts(db)
        for post in posts:
            logger.info("publishing_scheduled_post", post_id=str(post.id))
            publish_post_task.delay(str(post.id))


@celery_app.task(
    name="tasks.publishing_tasks.publish_post_task",
    queue="publishing",
    bind=True,
    max_retries=3,
    default_retry_delay=60,
)
def publish_post_task(self, post_id: str):
    """Publish a post to all connected platforms."""
    asyncio.run(_publish_post(post_id))


async def _publish_post(post_id: str):
    import uuid
    from config.database import async_session
    from modules.scheduling.publisher import Publisher

    async with async_session() as db:
        try:
            post = await Publisher.publish_post(db, uuid.UUID(post_id))
            logger.info("post_published", post_id=post_id, status=post.status)
        except Exception as e:
            logger.error("post_publish_failed", post_id=post_id, error=str(e))
            raise
