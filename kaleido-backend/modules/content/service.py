import uuid

import structlog
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError
from modules.content.models import Post
from modules.content.schemas import PostCreate, PostUpdate

logger = structlog.get_logger()


class PostService:
    @staticmethod
    async def list_posts(
        db: AsyncSession,
        user_id: uuid.UUID,
        status: str | None = None,
        brand_id: uuid.UUID | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[Post], int]:
        query = select(Post).where(Post.user_id == user_id, Post.deleted_at.is_(None))

        if status:
            query = query.where(Post.status == status)
        if brand_id:
            query = query.where(Post.brand_id == brand_id)

        # Count total
        from sqlalchemy import func
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0

        # Paginate
        query = query.order_by(Post.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        posts = list(result.scalars().all())

        return posts, total

    @staticmethod
    async def get_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> Post:
        result = await db.execute(
            select(Post).where(Post.id == post_id, Post.user_id == user_id, Post.deleted_at.is_(None))
        )
        post = result.scalar_one_or_none()
        if not post:
            raise NotFoundError("Post", str(post_id))
        return post

    @staticmethod
    async def create_post(db: AsyncSession, user_id: uuid.UUID, data: PostCreate) -> Post:
        post = Post(user_id=user_id, **data.model_dump())
        db.add(post)
        await db.commit()
        await db.refresh(post)
        logger.info("post_created", post_id=str(post.id))
        return post

    @staticmethod
    async def update_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID, data: PostUpdate) -> Post:
        post = await PostService.get_post(db, post_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return post

        await db.execute(update(Post).where(Post.id == post_id).values(**update_data))
        await db.commit()
        await db.refresh(post)
        return post

    @staticmethod
    async def delete_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> None:
        post = await PostService.get_post(db, post_id, user_id)
        from datetime import datetime, timezone
        await db.execute(
            update(Post).where(Post.id == post_id).values(deleted_at=datetime.now(timezone.utc))
        )
        await db.commit()
        logger.info("post_deleted", post_id=str(post_id))

    @staticmethod
    async def duplicate_post(db: AsyncSession, post_id: uuid.UUID, user_id: uuid.UUID) -> Post:
        original = await PostService.get_post(db, post_id, user_id)
        new_post = Post(
            user_id=user_id,
            brand_id=original.brand_id,
            content_text=original.content_text,
            platform_contents=original.platform_contents,
            content_type=original.content_type,
            hashtags=original.hashtags,
            link_url=original.link_url,
            first_comment=original.first_comment,
            alt_text=original.alt_text,
            ai_generated=original.ai_generated,
            ai_prompt=original.ai_prompt,
            status="draft",
        )
        db.add(new_post)
        await db.commit()
        await db.refresh(new_post)
        return new_post
