import asyncio
import uuid

import structlog

from tasks.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="tasks.content_tasks.generate_post_task", queue="content")
def generate_post_task(user_id: str, topic: str, platforms: list, tone: str, language: str, brand_id: str | None):
    """Async content generation via Celery."""
    asyncio.run(_generate_post(user_id, topic, platforms, tone, language, brand_id))


async def _generate_post(user_id: str, topic: str, platforms: list, tone: str, language: str, brand_id: str | None):
    from config.database import async_session
    from modules.content.generator import ContentGenerator

    async with async_session() as db:
        post = await ContentGenerator.generate_posts(
            db=db,
            user_id=uuid.UUID(user_id),
            topic=topic,
            platforms=platforms,
            tone=tone,
            language=language,
            brand_id=uuid.UUID(brand_id) if brand_id else None,
        )
        logger.info("celery_post_generated", post_id=str(post.id))
        return str(post.id)
