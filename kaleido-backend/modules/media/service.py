import os
import uuid
from datetime import datetime, timezone

import structlog
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from config.settings import settings
from core.exceptions import NotFoundError, ValidationError
from modules.content.models import MediaFile

logger = structlog.get_logger()

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm", "video/quicktime", "video/avi"}
ALLOWED_TYPES = ALLOWED_IMAGE_TYPES | ALLOWED_VIDEO_TYPES


class MediaService:
    @staticmethod
    async def upload_file(
        db: AsyncSession,
        user_id: uuid.UUID,
        file_data: bytes,
        filename: str,
        content_type: str,
        folder: str = "/",
        tags: list[str] | None = None,
    ) -> MediaFile:
        """Upload a file to the media library."""
        if content_type not in ALLOWED_TYPES:
            raise ValidationError(f"Unsupported file type: {content_type}")

        max_size = settings.max_upload_size_mb * 1024 * 1024
        if len(file_data) > max_size:
            raise ValidationError(f"File too large. Max size: {settings.max_upload_size_mb}MB")

        # Determine file type category
        if content_type in ALLOWED_IMAGE_TYPES:
            file_type = "image"
            sub_dir = "images"
        else:
            file_type = "video"
            sub_dir = "videos"

        # Save file
        upload_dir = os.path.join(settings.media_root, "uploads", sub_dir)
        os.makedirs(upload_dir, exist_ok=True)

        file_id = str(uuid.uuid4())
        ext = os.path.splitext(filename)[1] or (".jpg" if file_type == "image" else ".mp4")
        stored_filename = f"{file_id}{ext}"
        file_path = os.path.join(upload_dir, stored_filename)

        with open(file_path, "wb") as f:
            f.write(file_data)

        file_size = len(file_data)
        width = None
        height = None
        thumbnail_url = None

        # Get image dimensions and create thumbnail
        if file_type == "image" and content_type != "image/svg+xml":
            try:
                with Image.open(file_path) as img:
                    width, height = img.size
                    # Create thumbnail
                    thumbnail_url = await MediaService._create_thumbnail(
                        img, file_id, upload_dir
                    )
            except Exception as e:
                logger.warning("image_dimension_read_failed", error=str(e))

        file_url = f"/media/files/uploads/{sub_dir}/{stored_filename}"

        media = MediaFile(
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            file_url=file_url,
            file_type=file_type,
            mime_type=content_type,
            file_size=file_size,
            width=width,
            height=height,
            thumbnail_url=thumbnail_url,
            folder=folder,
            tags=tags or [],
            source="upload",
        )
        db.add(media)
        await db.commit()
        await db.refresh(media)

        logger.info("media_uploaded", media_id=str(media.id), filename=filename, file_type=file_type)
        return media

    @staticmethod
    async def _create_thumbnail(img: Image.Image, file_id: str, base_dir: str) -> str | None:
        """Create a thumbnail for an image."""
        try:
            thumb_dir = os.path.join(base_dir, "thumbnails")
            os.makedirs(thumb_dir, exist_ok=True)

            thumb = img.copy()
            thumb.thumbnail((300, 300))
            thumb_filename = f"{file_id}_thumb.jpg"
            thumb_path = os.path.join(thumb_dir, thumb_filename)

            if thumb.mode in ("RGBA", "P"):
                thumb = thumb.convert("RGB")
            thumb.save(thumb_path, "JPEG", quality=80)

            return f"/media/files/uploads/images/thumbnails/{thumb_filename}"
        except Exception as e:
            logger.warning("thumbnail_creation_failed", error=str(e))
            return None

    @staticmethod
    async def save_generated_media(
        db: AsyncSession,
        user_id: uuid.UUID,
        file_info: dict,
        folder: str = "/generated",
        tags: list[str] | None = None,
    ) -> MediaFile:
        """Save AI-generated media to the library."""
        media = MediaFile(
            user_id=user_id,
            filename=file_info["filename"],
            file_path=file_info["file_path"],
            file_url=file_info["file_url"],
            file_type=file_info["file_type"],
            mime_type=file_info.get("mime_type"),
            file_size=file_info.get("file_size"),
            width=file_info.get("width"),
            height=file_info.get("height"),
            ai_generated=True,
            ai_prompt=file_info.get("ai_prompt"),
            ai_model=file_info.get("ai_model"),
            folder=folder,
            tags=tags or [],
            source="ai_generated",
        )
        db.add(media)
        await db.commit()
        await db.refresh(media)

        logger.info("generated_media_saved", media_id=str(media.id))
        return media

    @staticmethod
    async def list_media(
        db: AsyncSession,
        user_id: uuid.UUID,
        file_type: str | None = None,
        folder: str | None = None,
        tags: list[str] | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[MediaFile], int]:
        """List media files with filtering."""
        query = select(MediaFile).where(MediaFile.user_id == user_id)
        count_query = select(func.count(MediaFile.id)).where(MediaFile.user_id == user_id)

        if file_type:
            query = query.where(MediaFile.file_type == file_type)
            count_query = count_query.where(MediaFile.file_type == file_type)

        if folder:
            query = query.where(MediaFile.folder == folder)
            count_query = count_query.where(MediaFile.folder == folder)

        if tags:
            query = query.where(MediaFile.tags.overlap(tags))
            count_query = count_query.where(MediaFile.tags.overlap(tags))

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        query = query.order_by(MediaFile.created_at.desc()).offset(offset).limit(limit)
        result = await db.execute(query)
        media_files = result.scalars().all()

        return media_files, total

    @staticmethod
    async def get_media(db: AsyncSession, media_id: uuid.UUID, user_id: uuid.UUID) -> MediaFile:
        """Get a single media file."""
        result = await db.execute(
            select(MediaFile).where(MediaFile.id == media_id, MediaFile.user_id == user_id)
        )
        media = result.scalar_one_or_none()
        if not media:
            raise NotFoundError("Media file not found")
        return media

    @staticmethod
    async def update_media(
        db: AsyncSession,
        media_id: uuid.UUID,
        user_id: uuid.UUID,
        filename: str | None = None,
        folder: str | None = None,
        tags: list[str] | None = None,
    ) -> MediaFile:
        """Update media file metadata."""
        media = await MediaService.get_media(db, media_id, user_id)

        if filename is not None:
            media.filename = filename
        if folder is not None:
            media.folder = folder
        if tags is not None:
            media.tags = tags

        await db.commit()
        await db.refresh(media)
        return media

    @staticmethod
    async def delete_media(db: AsyncSession, media_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Delete a media file from DB and disk."""
        media = await MediaService.get_media(db, media_id, user_id)

        # Delete file from disk
        if os.path.exists(media.file_path):
            os.remove(media.file_path)
            logger.info("media_file_deleted_from_disk", path=media.file_path)

        await db.delete(media)
        await db.commit()
        logger.info("media_deleted", media_id=str(media_id))

    @staticmethod
    async def list_folders(db: AsyncSession, user_id: uuid.UUID) -> list[dict]:
        """List all folders with file counts."""
        result = await db.execute(
            select(MediaFile.folder, func.count(MediaFile.id).label("count"))
            .where(MediaFile.user_id == user_id)
            .group_by(MediaFile.folder)
            .order_by(MediaFile.folder)
        )
        rows = result.all()
        folders = []
        for row in rows:
            folder_path = row[0]
            name = folder_path.rstrip("/").split("/")[-1] or "Root"
            folders.append({"path": folder_path, "name": name, "file_count": row[1]})
        return folders

    @staticmethod
    async def create_folder(folder_path: str) -> dict:
        """Create a folder on disk (folders are virtual in DB, but we prep the physical dir)."""
        # Sanitize
        folder_path = folder_path.strip().replace("..", "").replace("~", "")
        if not folder_path.startswith("/"):
            folder_path = f"/{folder_path}"

        name = folder_path.rstrip("/").split("/")[-1] or "Root"
        return {"path": folder_path, "name": name, "file_count": 0}
