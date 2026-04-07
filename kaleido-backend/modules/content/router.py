import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.content.generator import ContentGenerator
from modules.content.carousel_generator import CarouselGenerator
from modules.content.schemas import (
    EnhancePostRequest,
    GenerateCarouselRequest,
    GeneratePostRequest,
    PostCreate,
    PostResponse,
    PostUpdate,
    TranslatePostRequest,
)
from modules.content.service import PostService

router = APIRouter(prefix="/posts", tags=["Posts"])


@router.get("")
async def list_posts(
    status: str | None = None,
    brand_id: uuid.UUID | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    posts, total = await PostService.list_posts(db, user.id, status=status, brand_id=brand_id, limit=per_page, offset=offset)
    return {
        "success": True,
        "data": [PostResponse.model_validate(p).model_dump() for p in posts],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }


@router.post("")
async def create_post(
    data: PostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.create_post(db, user.id, data)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.post("/generate")
async def generate_posts(
    data: GeneratePostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await ContentGenerator.generate_posts(
        db=db,
        user_id=user.id,
        topic=data.topic,
        platforms=data.platforms,
        tone=data.tone,
        language=data.language,
        brand_id=data.brand_id,
    )
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.post("/generate-carousel")
async def generate_carousel(
    data: GenerateCarouselRequest,
    user: User = Depends(get_current_user),
):
    result = await CarouselGenerator.generate_carousel(
        topic=data.topic,
        num_slides=data.num_slides,
        platform=data.platform,
        color_scheme=data.color_scheme,
        brand_name=data.brand_name,
    )
    return {"success": True, "data": result}


@router.get("/{post_id}")
async def get_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.get_post(db, post_id, user.id)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.patch("/{post_id}")
async def update_post(
    post_id: uuid.UUID,
    data: PostUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.update_post(db, post_id, user.id, data)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.delete("/{post_id}")
async def delete_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await PostService.delete_post(db, post_id, user.id)
    return {"success": True, "data": {"message": "Post deleted"}}


@router.post("/{post_id}/duplicate")
async def duplicate_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.duplicate_post(db, post_id, user.id)
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.post("/{post_id}/enhance")
async def enhance_post(
    post_id: uuid.UUID,
    data: EnhancePostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.get_post(db, post_id, user.id)
    enhanced = await ContentGenerator.enhance_post(db, post, data.instructions, data.platform)
    return {
        "success": True,
        "data": PostResponse.model_validate(enhanced).model_dump(),
    }


@router.post("/{post_id}/translate")
async def translate_post(
    post_id: uuid.UUID,
    data: TranslatePostRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.get_post(db, post_id, user.id)
    translated = await ContentGenerator.translate_post(db, post, data.target_language)
    return {
        "success": True,
        "data": PostResponse.model_validate(translated).model_dump(),
    }
