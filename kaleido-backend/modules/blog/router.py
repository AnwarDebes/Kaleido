import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.blog.schemas import BlogPostCreate, BlogPostResponse, BlogPostUpdate, GenerateBlogRequest
from modules.blog.service import BlogService

router = APIRouter(prefix="/blog", tags=["Blog"])


@router.get("/posts")
async def list_blog_posts(
    status: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    posts, total = await BlogService.list_blog_posts(db, user.id, status=status, limit=per_page, offset=offset)
    return {
        "success": True,
        "data": [BlogPostResponse.model_validate(p).model_dump() for p in posts],
        "meta": {"page": page, "per_page": per_page, "total": total},
    }


@router.post("/posts")
async def create_blog_post(
    data: BlogPostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await BlogService.create_blog_post(db, user.id, data)
    return {"success": True, "data": BlogPostResponse.model_validate(post).model_dump()}


@router.post("/posts/generate")
async def generate_blog_post(
    data: GenerateBlogRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await BlogService.generate_blog_post(
        db, user.id,
        topic=data.topic,
        brand_id=data.brand_id,
        tone=data.tone,
        target_word_count=data.target_word_count,
        language=data.language,
        keywords=data.keywords,
    )
    return {"success": True, "data": BlogPostResponse.model_validate(post).model_dump()}


@router.get("/posts/{blog_id}")
async def get_blog_post(
    blog_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await BlogService.get_blog_post(db, blog_id, user.id)
    return {"success": True, "data": BlogPostResponse.model_validate(post).model_dump()}


@router.patch("/posts/{blog_id}")
async def update_blog_post(
    blog_id: uuid.UUID,
    data: BlogPostUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await BlogService.update_blog_post(db, blog_id, user.id, data)
    return {"success": True, "data": BlogPostResponse.model_validate(post).model_dump()}


@router.delete("/posts/{blog_id}")
async def delete_blog_post(
    blog_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await BlogService.delete_blog_post(db, blog_id, user.id)
    return {"success": True, "data": {"message": "Blog post deleted"}}
