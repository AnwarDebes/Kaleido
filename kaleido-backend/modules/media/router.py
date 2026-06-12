import asyncio
import os
import uuid

import structlog
from fastapi import APIRouter, Depends, Query, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db, async_session
from config.settings import settings
from core.exceptions import KaleidoException
from core.security import get_current_user
from modules.auth.models import User
from modules.media.image_generator import ImageGenerator
from modules.media.video_generator import VideoGenerator
from modules.media.schemas import (
    FolderCreate,
    FolderResponse,
    GenerateImageRequest,
    GenerateVideoRequest,
    MediaUpdate,
    MediaUploadResponse,
)
from modules.media.service import MediaService

logger = structlog.get_logger()

router = APIRouter(prefix="/media", tags=["Media"])

# In-memory job tracker for video generation
_video_jobs: dict[str, dict] = {}


@router.get("")
async def list_media(
    file_type: str | None = None,
    folder: str | None = None,
    tag: str | None = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    offset = (page - 1) * per_page
    tags = [tag] if tag else None
    media_files, total = await MediaService.list_media(
        db, user.id, file_type=file_type, folder=folder, tags=tags, limit=per_page, offset=offset
    )
    return {
        "success": True,
        "data": [MediaUploadResponse.model_validate(m).model_dump() for m in media_files],
        "meta": {
            "page": page,
            "per_page": per_page,
            "total": total,
            "total_pages": (total + per_page - 1) // per_page,
        },
    }


@router.post("/upload")
async def upload_media(
    file: UploadFile = File(...),
    folder: str = "/",
    tags: str = "",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    file_data = await file.read()
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    media = await MediaService.upload_file(
        db=db,
        user_id=user.id,
        file_data=file_data,
        filename=file.filename or "unnamed",
        content_type=file.content_type or "application/octet-stream",
        folder=folder,
        tags=tag_list,
    )
    return {
        "success": True,
        "data": MediaUploadResponse.model_validate(media).model_dump(),
    }


@router.post("/generate-image")
async def generate_image(
    data: GenerateImageRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        file_info = await ImageGenerator.generate_image(
            prompt=data.prompt,
            aspect_ratio=data.aspect_ratio,
            style=data.style,
            steps=data.steps,
            seed=data.seed,
        )
    except KaleidoException:
        raise
    except Exception as e:
        logger.error("image_generation_failed", error=str(e))
        raise KaleidoException(
            status_code=503,
            code="GENERATION_UNAVAILABLE",
            message="Image generation is temporarily unavailable. Please try again shortly.",
        )
    media = await MediaService.save_generated_media(
        db, user.id, file_info, folder=data.folder, tags=data.tags
    )
    return {
        "success": True,
        "data": MediaUploadResponse.model_validate(media).model_dump(),
    }


async def _run_video_generation(job_id: str, user_id: uuid.UUID, data: GenerateVideoRequest):
    """Background task that generates video and saves to DB."""
    fps = 16
    frames = data.duration * fps + 1

    try:
        file_info = await VideoGenerator.generate_video(
            prompt=data.prompt,
            width=data.width,
            height=data.height,
            frames=frames,
            fps=fps,
        )

        async with async_session() as db:
            media = await MediaService.save_generated_media(
                db, user_id, file_info, folder=data.folder, tags=data.tags
            )
            _video_jobs[job_id] = {
                "status": "completed",
                "data": MediaUploadResponse.model_validate(media).model_dump(),
            }
            logger.info("video_job_completed", job_id=job_id)

    except Exception as e:
        logger.error("video_job_failed", job_id=job_id, error=str(e))
        _video_jobs[job_id] = {
            "status": "failed",
            "error": str(e),
        }


@router.post("/generate-video")
async def generate_video(
    data: GenerateVideoRequest,
    user: User = Depends(get_current_user),
):
    """Start video generation as a background job. Returns job_id to poll."""
    job_id = str(uuid.uuid4())
    fps = 16
    frames = data.duration * fps + 1
    est_seconds = round(frames * 1.2)  # measured ~90s for 81 frames on this GPU

    _video_jobs[job_id] = {"status": "generating"}

    asyncio.create_task(_run_video_generation(job_id, user.id, data))

    return {
        "success": True,
        "data": {
            "job_id": job_id,
            "status": "generating",
            "frames": frames,
            "fps": fps,
            "estimated_seconds": est_seconds,
        },
    }


@router.get("/generate-video/status/{job_id}")
async def video_generation_status(
    job_id: str,
    user: User = Depends(get_current_user),
):
    """Poll for video generation status."""
    job = _video_jobs.get(job_id)
    if not job:
        return {"success": False, "error": {"message": "Job not found"}}

    if job["status"] == "completed":
        # Clean up after delivering result
        result = _video_jobs.pop(job_id)
        return {"success": True, "data": {**result}}

    if job["status"] == "failed":
        result = _video_jobs.pop(job_id)
        return {"success": False, "error": {"message": result.get("error", "Generation failed")}}

    return {"success": True, "data": {"status": "generating"}}


@router.get("/folders")
async def list_folders(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    folders = await MediaService.list_folders(db, user.id)
    return {
        "success": True,
        "data": [FolderResponse(**f).model_dump() for f in folders],
    }


@router.post("/folders")
async def create_folder(
    data: FolderCreate,
    user: User = Depends(get_current_user),
):
    parent = data.parent.rstrip("/")
    folder_path = f"{parent}/{data.name}"
    folder = await MediaService.create_folder(folder_path)
    return {
        "success": True,
        "data": FolderResponse(**folder).model_dump(),
    }


@router.get("/files/{file_path:path}")
async def serve_media_file(file_path: str):
    """Serve media files from disk."""
    full_path = os.path.join(settings.media_root, file_path)
    if not os.path.exists(full_path):
        return {"success": False, "error": {"message": "File not found"}}
    if not os.path.abspath(full_path).startswith(os.path.abspath(settings.media_root)):
        return {"success": False, "error": {"message": "Access denied"}}
    return FileResponse(full_path)


@router.get("/{media_id}")
async def get_media(
    media_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    media = await MediaService.get_media(db, media_id, user.id)
    return {
        "success": True,
        "data": MediaUploadResponse.model_validate(media).model_dump(),
    }


@router.patch("/{media_id}")
async def update_media(
    media_id: uuid.UUID,
    data: MediaUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    media = await MediaService.update_media(
        db, media_id, user.id,
        filename=data.filename,
        folder=data.folder,
        tags=data.tags,
    )
    return {
        "success": True,
        "data": MediaUploadResponse.model_validate(media).model_dump(),
    }


@router.delete("/{media_id}")
async def delete_media(
    media_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await MediaService.delete_media(db, media_id, user.id)
    return {"success": True, "data": {"message": "Media file deleted"}}
