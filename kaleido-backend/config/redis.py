import redis.asyncio as aioredis

from config.settings import settings

redis_client = aioredis.from_url(
    settings.redis_url,
    decode_responses=True,
    max_connections=20,
)


async def get_redis() -> aioredis.Redis:
    return redis_client
