import base64
import io
import os
import re
import uuid
import zipfile
from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from config.redis import redis_client
from core.exceptions import KaleidoException
from core.security import get_current_user
from modules.auth.models import User
from modules.content.generator import ContentGenerator
from modules.content.carousel_generator import CarouselGenerator
from modules.content.models import ManualStat, MediaFile
from modules.content.schemas import (
    EnhancePostRequest,
    GenerateCarouselRequest,
    GeneratePostRequest,
    PostCreate,
    PostResponse,
    PostUpdate,
    RepurposeRequest,
    TranslatePostRequest,
)
from modules.content.service import PostService
from modules.notifications.service import ReminderService

logger = structlog.get_logger()

# Mirrors the frontend's platform definitions (src/lib/platforms.ts)
PLATFORM_CHAR_LIMITS = {
    "twitter": 280,
    "facebook": 63206,
    "instagram": 2200,
    "linkedin": 3000,
    "tiktok": 2200,
    "youtube": 5000,
    "pinterest": 500,
    "reddit": 40000,
    "bluesky": 300,
    "threads": 500,
    "google_business": 1500,
    "telegram": 4096,
    "snapchat": 250,
    "whatsapp": 1024,
}


def _platform_key(label: str) -> str:
    pid = re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_")
    return {"twitter_x": "twitter", "x": "twitter", "whatsapp_business": "whatsapp"}.get(pid, pid)


def _safe_name(s: str, fallback: str = "post") -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9-_ ]+", "", s).strip().replace(" ", "-")[:50]
    return cleaned or fallback


async def _post_media_paths(db: AsyncSession, post) -> list[tuple[str, str]]:
    """Resolve a post's media_ids to (disk_path, filename) pairs."""
    if not post.media_ids:
        return []
    result = await db.execute(
        select(MediaFile).where(
            MediaFile.id.in_(post.media_ids),
            MediaFile.user_id == post.user_id,
        )
    )
    out = []
    for m in result.scalars().all():
        if m.file_path and os.path.isfile(m.file_path):
            ext = os.path.splitext(m.file_path)[1]
            out.append((m.file_path, _safe_name(os.path.splitext(m.filename or "media")[0], "media") + ext))
    return out

from datetime import date as _date

from pydantic import BaseModel as _BaseModel, Field as _Field


class FromImageRequest(_BaseModel):
    media_id: uuid.UUID
    platforms: list[str] = _Field(default=["Instagram", "Twitter / X", "LinkedIn"])
    tone: str = "casual"
    language: str = "en"
    context: str = _Field(default="", max_length=2000)
    brand_id: uuid.UUID | None = None
    create_draft: bool = True


class PlanWeekRequest(_BaseModel):
    platforms: list[str] = _Field(default=["Instagram", "Twitter / X", "LinkedIn"])
    focus: str = _Field(default="", max_length=2000)
    count: int = _Field(default=5, ge=1, le=7)
    start_date: _date | None = None
    tone: str = "professional"
    language: str = "en"
    brand_id: uuid.UUID | None = None


class SuggestHashtagsRequest(_BaseModel):
    text: str = _Field(min_length=3, max_length=8000)
    platform: str = "instagram"
    industry: str = "general"


class MarkPostedRequest(_BaseModel):
    platforms: list[str] = _Field(default_factory=list)


class ManualStatsRequest(_BaseModel):
    platform: str = _Field(min_length=2, max_length=50)
    views: int = _Field(default=0, ge=0)
    likes: int = _Field(default=0, ge=0)
    comments: int = _Field(default=0, ge=0)
    shares: int = _Field(default=0, ge=0)


async def _attach_media(db: AsyncSession, user_id: uuid.UUID, dumps: list[dict]) -> list[dict]:
    """Add a resolvable "media" array to dumped posts so the UI can show a
    post and its image together (thumbnails, previews, share downloads)."""
    ids: set = set()
    for d in dumps:
        for m in d.get("media_ids") or []:
            ids.add(m)
    lookup = {}
    if ids:
        result = await db.execute(
            select(MediaFile).where(MediaFile.id.in_(ids), MediaFile.user_id == user_id)
        )
        for m in result.scalars().all():
            lookup[m.id] = {
                "id": str(m.id),
                "file_url": m.file_url,
                "file_type": m.file_type,
                "thumbnail_url": m.thumbnail_url,
                "filename": m.filename,
                "width": m.width,
                "height": m.height,
            }
    for d in dumps:
        d["media"] = [lookup[m] for m in (d.get("media_ids") or []) if m in lookup]
    return dumps


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
    dumps = await _attach_media(db, user.id, [PostResponse.model_validate(p).model_dump() for p in posts])
    return {
        "success": True,
        "data": dumps,
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
    dumps = await _attach_media(db, user.id, [PostResponse.model_validate(post).model_dump()])
    return {
        "success": True,
        "data": dumps[0],
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


@router.post("/repurpose")
async def repurpose_content(
    data: RepurposeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One source text in, a full per-platform content pack out."""
    try:
        result = await ContentGenerator.repurpose_content(
            db=db,
            user_id=user.id,
            source_text=data.source_text,
            platforms=data.platforms,
            tone=data.tone,
            language=data.language,
            brand_id=data.brand_id,
            create_draft=data.create_draft,
        )
    except Exception as e:
        logger.error("repurpose_failed", error=str(e))
        raise KaleidoException(
            status_code=503,
            code="GENERATION_UNAVAILABLE",
            message="AI generation is temporarily unavailable. Please try again shortly.",
        )

    post = result.pop("post", None)
    return {
        "success": True,
        "data": {
            **result,
            "post": PostResponse.model_validate(post).model_dump() if post else None,
        },
    }


@router.get("/ideas")
async def get_post_ideas(
    brand_id: uuid.UUID | None = None,
    count: int = Query(default=5, ge=1, le=10),
    refresh: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Daily brand-aware post ideas. Cached per user per day so the
    dashboard widget stays stable and cheap; refresh=true regenerates."""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    cache_key = f"ideas:{user.id}:{brand_id or 'none'}:{today}"

    if not refresh:
        try:
            cached = await redis_client.get(cache_key)
            if cached:
                import json as _json

                return {"success": True, "data": {"ideas": _json.loads(cached), "cached": True}}
        except Exception:
            pass

    try:
        ideas = await ContentGenerator.generate_ideas(
            db=db,
            brand_id=brand_id,
            count=count,
            date_context=datetime.now(timezone.utc).strftime("%A, %d %B %Y"),
        )
    except Exception as e:
        logger.error("ideas_failed", error=str(e))
        raise KaleidoException(
            status_code=503,
            code="GENERATION_UNAVAILABLE",
            message="AI generation is temporarily unavailable. Please try again shortly.",
        )

    try:
        import json as _json

        await redis_client.setex(cache_key, 60 * 60 * 24, _json.dumps(ideas))
    except Exception:
        pass

    return {"success": True, "data": {"ideas": ideas, "cached": False}}


@router.get("/{post_id}/pack")
async def download_post_pack(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a post as a ready-to-publish ZIP: one folder per platform
    with the caption and hashtags, all media files, and a posting checklist."""
    post = await PostService.get_post(db, post_id, user.id)
    media = await _post_media_paths(db, post)

    contents = post.platform_contents or {}
    if not contents and post.content_text:
        contents = {"Any platform": {"text": post.content_text, "hashtags": post.hashtags or []}}

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        checklist = [
            "# Posting checklist",
            "",
            f"Created with Kaleido on {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC.",
            "",
            "Each folder contains the caption and hashtags for one platform.",
            "Media files are in the media/ folder. Suggested order:",
            "",
        ]
        for label, c in contents.items():
            text = (c or {}).get("text", "") or ""
            tags = (c or {}).get("hashtags", []) or []
            tag_line = " ".join(t if t.startswith("#") else f"#{t}" for t in tags)
            folder = _safe_name(label, "platform")
            zf.writestr(f"{folder}/caption.txt", text + ("\n\n" + tag_line if tag_line else "") + "\n")
            if tag_line:
                zf.writestr(f"{folder}/hashtags.txt", tag_line + "\n")
            limit = PLATFORM_CHAR_LIMITS.get(_platform_key(label))
            length_note = ""
            if limit:
                length_note = f" ({len(text)}/{limit} characters" + (", TOO LONG, trim before posting)" if len(text) > limit else ")")
            checklist.append(f"- [ ] {label}: open the app, paste {folder}/caption.txt, attach media{length_note}")
        if media:
            checklist.extend(["", f"Media files included: {len(media)}"])
        for path, name in media:
            zf.write(path, f"media/{name}")
        zf.writestr("CHECKLIST.md", "\n".join(checklist) + "\n")

    filename = f"kaleido-{_safe_name((post.content_text or 'post').split(chr(10))[0])[:30]}-{str(post.id)[:8]}.zip"
    return Response(
        content=buf.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/{post_id}/send-to-phone")
async def send_post_to_phone(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send the post's caption (and media files) to the user's own Telegram
    chat so they can paste it straight into Instagram, TikTok, etc."""
    post = await PostService.get_post(db, post_id, user.id)

    settings_row = await ReminderService.get_settings(db, user.id)
    if settings_row is None or not settings_row.telegram_bot_token_encrypted:
        raise KaleidoException(
            status_code=400,
            code="REMINDERS_NOT_CONFIGURED",
            message="Connect your Telegram bot in Settings first (Send to phone).",
        )

    platforms = list((post.platform_contents or {}).keys())
    message = ReminderService.format_post_message(
        heading="Your Kaleido post, ready to paste:",
        content_text=post.content_text,
        hashtags=post.hashtags,
        platforms=platforms,
    )
    sent = await ReminderService.send_to_phone(db, user.id, message)
    if not sent:
        raise KaleidoException(
            status_code=502,
            code="SEND_FAILED",
            message="Could not reach your Telegram bot. Check Settings and try again.",
        )

    media = await _post_media_paths(db, post)
    files_sent = await ReminderService.send_files_to_phone(db, user.id, [p for p, _ in media])

    return {
        "success": True,
        "data": {
            "message": "Sent to your phone",
            "files_sent": files_sent,
        },
    }


@router.post("/from-image")
async def post_from_image(
    data: FromImageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Look at one of the user's media images and write posts about it."""
    result = await db.execute(
        select(MediaFile).where(MediaFile.id == data.media_id, MediaFile.user_id == user.id)
    )
    media = result.scalar_one_or_none()
    if media is None or not media.file_path or not os.path.isfile(media.file_path):
        raise KaleidoException(status_code=404, code="NOT_FOUND", message="Image not found")
    if media.file_type != "image":
        raise KaleidoException(
            status_code=422, code="VALIDATION_ERROR", message="Photo to post works with images only"
        )

    with open(media.file_path, "rb") as fh:
        image_b64 = base64.b64encode(fh.read()).decode()

    try:
        result = await ContentGenerator.photo_to_post(
            db=db,
            user_id=user.id,
            image_b64=image_b64,
            media_id=media.id,
            platforms=data.platforms,
            tone=data.tone,
            language=data.language,
            context=data.context,
            brand_id=data.brand_id,
            create_draft=data.create_draft,
        )
    except KaleidoException:
        raise
    except Exception as e:
        logger.error("photo_to_post_failed", error=str(e))
        raise KaleidoException(
            status_code=503,
            code="GENERATION_UNAVAILABLE",
            message="AI generation is temporarily unavailable. Please try again shortly.",
        )

    post = result.pop("post", None)
    return {
        "success": True,
        "data": {
            **result,
            "post": PostResponse.model_validate(post).model_dump() if post else None,
        },
    }


@router.post("/plan-week")
async def plan_week(
    data: PlanWeekRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI plans a varied week and creates scheduled drafts. Takes a while
    (one generation per post), the frontend shows progress copy."""
    try:
        results = await ContentGenerator.plan_week(
            db=db,
            user_id=user.id,
            platforms=data.platforms,
            focus=data.focus,
            count=data.count,
            start_date=data.start_date,
            tone=data.tone,
            language=data.language,
            brand_id=data.brand_id,
        )
    except Exception as e:
        logger.error("plan_week_failed", error=str(e))
        raise KaleidoException(
            status_code=503,
            code="GENERATION_UNAVAILABLE",
            message="AI generation is temporarily unavailable. Please try again shortly.",
        )

    return {
        "success": True,
        "data": [
            {
                "title": r["title"],
                "format": r["format"],
                "post": PostResponse.model_validate(r["post"]).model_dump(),
            }
            for r in results
        ],
    }


@router.post("/suggest-hashtags")
async def suggest_hashtags(
    data: SuggestHashtagsRequest,
    user: User = Depends(get_current_user),
):
    try:
        tags = await ContentGenerator.suggest_hashtags(
            text=data.text, platform=data.platform, industry=data.industry
        )
    except Exception as e:
        logger.error("suggest_hashtags_failed", error=str(e))
        raise KaleidoException(
            status_code=503,
            code="GENERATION_UNAVAILABLE",
            message="AI generation is temporarily unavailable. Please try again shortly.",
        )
    return {"success": True, "data": {"hashtags": tags}}


@router.post("/{post_id}/mark-posted")
async def mark_posted(
    post_id: uuid.UUID,
    data: MarkPostedRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """The user posted this manually; make Kaleido reflect reality."""
    from datetime import datetime, timezone

    post = await PostService.get_post(db, post_id, user.id)
    post.status = "published"
    post.published_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(post)
    logger.info(
        "post_marked_posted",
        post_id=str(post_id),
        platforms=data.platforms,
    )
    return {
        "success": True,
        "data": PostResponse.model_validate(post).model_dump(),
    }


@router.post("/{post_id}/stats")
async def log_manual_stats(
    post_id: uuid.UUID,
    data: ManualStatsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Self-reported results for a manually shared post (upsert per platform)."""
    post = await PostService.get_post(db, post_id, user.id)

    platform_id = _platform_key(data.platform)
    result = await db.execute(
        select(ManualStat).where(
            ManualStat.post_id == post.id, ManualStat.platform == platform_id
        )
    )
    stat = result.scalar_one_or_none()
    if stat is None:
        stat = ManualStat(user_id=user.id, post_id=post.id, platform=platform_id)
        db.add(stat)
    stat.views = data.views
    stat.likes = data.likes
    stat.comments = data.comments
    stat.shares = data.shares
    from datetime import datetime, timezone

    stat.noted_at = datetime.now(timezone.utc)
    await db.commit()
    return {
        "success": True,
        "data": {
            "post_id": str(post.id),
            "platform": platform_id,
            "views": stat.views,
            "likes": stat.likes,
            "comments": stat.comments,
            "shares": stat.shares,
        },
    }


@router.get("/{post_id}/stats")
async def get_manual_stats(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.get_post(db, post_id, user.id)
    result = await db.execute(select(ManualStat).where(ManualStat.post_id == post.id))
    return {
        "success": True,
        "data": [
            {
                "platform": st.platform,
                "views": st.views,
                "likes": st.likes,
                "comments": st.comments,
                "shares": st.shares,
                "noted_at": st.noted_at.isoformat(),
            }
            for st in result.scalars().all()
        ],
    }


@router.get("/{post_id}")
async def get_post(
    post_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.get_post(db, post_id, user.id)
    dumps = await _attach_media(db, user.id, [PostResponse.model_validate(post).model_dump()])
    return {
        "success": True,
        "data": dumps[0],
    }


@router.patch("/{post_id}")
async def update_post(
    post_id: uuid.UUID,
    data: PostUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    post = await PostService.update_post(db, post_id, user.id, data)
    dumps = await _attach_media(db, user.id, [PostResponse.model_validate(post).model_dump()])
    return {
        "success": True,
        "data": dumps[0],
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
