import structlog

from tasks.celery_app import celery_app

logger = structlog.get_logger()


@celery_app.task(name="tasks.analytics_tasks.collect_analytics", queue="analytics")
def collect_analytics():
    """Collect analytics from all connected social platforms."""
    logger.info("analytics_collection_started")
    # Will be implemented in Phase 8
    logger.info("analytics_collection_completed")
