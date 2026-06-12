import uuid

import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
    VerifyEmailRequest,
)
from modules.auth.service import AuthService

logger = structlog.get_logger()

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await AuthService.register(db, data)
    return {
        "success": True,
        "data": {
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "token_type": result["token_type"],
            "user": UserResponse.model_validate(result["user"]).model_dump(),
            "message": "Registration successful",
        },
    }


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await AuthService.login(db, data)
    return {
        "success": True,
        "data": {
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "token_type": result["token_type"],
            "user": UserResponse.model_validate(result["user"]).model_dump(),
        },
    }


@router.post("/refresh")
async def refresh_token(data: RefreshRequest):
    result = await AuthService.refresh_token(data.refresh_token)
    return {
        "success": True,
        "data": result,
    }


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    await AuthService.logout(str(user.id))
    return {
        "success": True,
        "data": {"message": "Logged out successfully"},
    }


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.forgot_password(db, data.email)
    return {
        "success": True,
        "data": {"message": "If the email exists, a reset link has been sent"},
    }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.reset_password(db, data.token, data.new_password)
    return {
        "success": True,
        "data": {"message": "Password reset successfully"},
    }


@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.verify_email(db, data.token)
    return {
        "success": True,
        "data": {"message": "Email verified successfully"},
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {"user": UserResponse.model_validate(user).model_dump()},
    }


@router.patch("/me")
async def update_me(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated_user = await AuthService.update_profile(db, user, data)
    return {
        "success": True,
        "data": {"user": UserResponse.model_validate(updated_user).model_dump()},
    }


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await AuthService.change_password(db, user, data.current_password, data.new_password)
    return {
        "success": True,
        "data": {"message": "Password changed successfully"},
    }


@router.get("/me/export")
async def export_my_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download everything the user has created as one ZIP. Their data is
    theirs; a free product should never hold it hostage."""
    import io
    import json
    import os
    import zipfile
    from datetime import datetime, timezone

    from fastapi import Response
    from sqlalchemy import select

    from modules.brands.models import Brand
    from modules.content.models import ManualStat, MediaFile, Post

    def dump(rows, fields):
        out = []
        for r in rows:
            item = {}
            for f in fields:
                v = getattr(r, f, None)
                if hasattr(v, "isoformat"):
                    v = v.isoformat()
                elif isinstance(v, uuid.UUID):
                    v = str(v)
                elif isinstance(v, list):
                    v = [str(x) for x in v]
                item[f] = v
            out.append(item)
        return json.dumps(out, indent=2, ensure_ascii=False, default=str)

    posts = (
        (await db.execute(select(Post).where(Post.user_id == user.id, Post.deleted_at.is_(None))))
        .scalars()
        .all()
    )
    brands = (await db.execute(select(Brand).where(Brand.user_id == user.id))).scalars().all()
    media = (await db.execute(select(MediaFile).where(MediaFile.user_id == user.id))).scalars().all()
    stats = (await db.execute(select(ManualStat).where(ManualStat.user_id == user.id))).scalars().all()

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "README.txt",
            "Your Kaleido data export, created "
            + datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            + ".\n\nposts.json: all your posts with per-platform content.\n"
            "brands.json: your brand profiles.\nmedia.json: your media library index.\n"
            "stats.json: your self-reported results.\nmedia/: your media files.\n",
        )
        zf.writestr(
            "posts.json",
            dump(
                posts,
                [
                    "id", "content_text", "platform_contents", "content_type", "hashtags",
                    "alt_text", "status", "scheduled_at", "published_at", "ai_generated",
                    "ai_prompt", "created_at",
                ],
            ),
        )
        zf.writestr(
            "brands.json",
            dump(brands, ["id", "name", "industry", "brand_voice", "content_pillars", "target_audience", "created_at"]),
        )
        zf.writestr(
            "media.json",
            dump(media, ["id", "filename", "file_type", "mime_type", "ai_generated", "ai_prompt", "created_at"]),
        )
        zf.writestr(
            "stats.json",
            dump(stats, ["post_id", "platform", "views", "likes", "comments", "shares", "noted_at"]),
        )
        total = 0
        for m in media:
            if m.file_path and os.path.isfile(m.file_path):
                size = os.path.getsize(m.file_path)
                if total + size > 500 * 1024 * 1024:
                    zf.writestr("media/TRUNCATED.txt", "Media over 500 MB total was left out of this export.")
                    break
                total += size
                ext = os.path.splitext(m.file_path)[1]
                zf.write(m.file_path, f"media/{m.id}{ext}")

    logger.info("data_exported", user_id=str(user.id), posts=len(posts), media=len(media))
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="kaleido-export.zip"'},
    )
