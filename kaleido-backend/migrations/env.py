import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config

from config.settings import settings
from config.database import Base

# Import all models here so Alembic can detect them
from modules.auth.models import User, OAuthAccount  # noqa: F401
from modules.brands.models import Brand  # noqa: F401
from modules.social_accounts.models import SocialAccount  # noqa: F401
from modules.content.models import Post, PostPublication, MediaFile  # noqa: F401
from modules.analytics.models import AnalyticsSnapshot, PostAnalytics  # noqa: F401
from modules.campaigns.models import Campaign  # noqa: F401
from modules.blog.models import BlogPost  # noqa: F401
from modules.newsletter.models import Newsletter, Subscriber  # noqa: F401
from modules.chat.models import ChatConversation, ChatMessage  # noqa: F401
from modules.integrations.models import Integration, RSSFeed  # noqa: F401
from modules.referral.models import Referral  # noqa: F401

config = context.config
config.set_main_option("sqlalchemy.url", settings.database_url)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
