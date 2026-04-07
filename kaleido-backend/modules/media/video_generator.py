import asyncio
import os
import uuid

import structlog
from PIL import Image, ImageDraw, ImageFont

from ai.comfyui_client import comfyui_client
from config.settings import settings

logger = structlog.get_logger()


class VideoGenerator:
    @staticmethod
    async def generate_video(
        prompt: str,
        width: int = 848,
        height: int = 480,
        frames: int = 81,
        fps: int = 16,
    ) -> dict:
        """Generate a short video using ComfyUI Wan 2.1."""
        logger.info("video_generation_started", prompt=prompt[:100], width=width, height=height)

        available = await comfyui_client.is_available()
        if not available:
            logger.warning("comfyui_unavailable_generating_placeholder_video")
            return await VideoGenerator._generate_placeholder(prompt, width, height, frames, fps)

        result = await comfyui_client.generate_video(
            prompt=prompt, width=width, height=height, frames=frames, fps=fps
        )

        prompt_id = result.get("prompt_id")
        if not prompt_id:
            raise RuntimeError("ComfyUI did not return a prompt_id")

        # Poll for completion
        video_data = await VideoGenerator._wait_for_result(prompt_id)

        file_info = await VideoGenerator._save_video(video_data, prompt, width, height, fps)
        logger.info("video_generation_completed", file_path=file_info["file_path"])
        return file_info

    @staticmethod
    async def _wait_for_result(prompt_id: str, timeout: int = 300) -> bytes:
        start = asyncio.get_event_loop().time()
        while True:
            elapsed = asyncio.get_event_loop().time() - start
            if elapsed > timeout:
                raise TimeoutError("Video generation timed out")

            status = await comfyui_client.get_status(prompt_id)
            if isinstance(status, dict) and status.get("status") == "pending":
                await asyncio.sleep(2)
                continue

            outputs = status.get("outputs", {})
            for node_id, node_output in outputs.items():
                gifs = node_output.get("gifs", [])
                if gifs:
                    g = gifs[0]
                    return await comfyui_client.get_image(
                        g["filename"], g.get("subfolder", ""), g.get("type", "output")
                    )
                videos = node_output.get("videos", [])
                if videos:
                    v = videos[0]
                    return await comfyui_client.get_image(
                        v["filename"], v.get("subfolder", ""), v.get("type", "output")
                    )

            await asyncio.sleep(2)

    @staticmethod
    async def _save_video(video_data: bytes, prompt: str, width: int, height: int, fps: int) -> dict:
        media_dir = os.path.join(settings.media_root, "generated", "videos")
        os.makedirs(media_dir, exist_ok=True)

        file_id = str(uuid.uuid4())
        filename = f"{file_id}.mp4"
        file_path = os.path.join(media_dir, filename)

        with open(file_path, "wb") as f:
            f.write(video_data)

        return {
            "file_id": file_id,
            "filename": filename,
            "file_path": file_path,
            "file_url": f"/media/files/generated/videos/{filename}",
            "file_type": "video",
            "mime_type": "video/mp4",
            "file_size": len(video_data),
            "width": width,
            "height": height,
            "duration_seconds": 81 / fps if fps else 5.0,
            "ai_generated": True,
            "ai_prompt": prompt,
            "ai_model": "wan2.1-1.3b",
        }

    @staticmethod
    async def _generate_placeholder(prompt: str, width: int, height: int, frames: int, fps: int) -> dict:
        """Create a placeholder thumbnail for when ComfyUI is unavailable."""
        media_dir = os.path.join(settings.media_root, "generated", "videos")
        os.makedirs(media_dir, exist_ok=True)

        file_id = str(uuid.uuid4())

        # Create placeholder thumbnail
        thumb = Image.new("RGB", (width, height), color=(30, 30, 50))
        draw = ImageDraw.Draw(thumb)
        for y in range(height):
            r = int(30 + (y / height) * 20)
            g = int(30 + (y / height) * 15)
            b = int(50 + (y / height) * 30)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # Play button
        cx, cy = width // 2, height // 2
        draw.polygon([(cx - 30, cy - 40), (cx - 30, cy + 40), (cx + 40, cy)], fill=(200, 180, 120))

        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
        except (OSError, IOError):
            font = ImageFont.load_default()
        draw.text((20, height - 40), f"AI Video Placeholder | {width}x{height}", fill=(150, 150, 150), font=font)

        thumb_filename = f"{file_id}_thumb.png"
        thumb_path = os.path.join(media_dir, thumb_filename)
        thumb.save(thumb_path, "PNG")

        # Create a minimal valid file as placeholder
        filename = f"{file_id}.mp4"
        file_path = os.path.join(media_dir, filename)
        with open(file_path, "wb") as f:
            f.write(b"\x00" * 100)  # Minimal placeholder

        return {
            "file_id": file_id,
            "filename": filename,
            "file_path": file_path,
            "file_url": f"/media/files/generated/videos/{filename}",
            "file_type": "video",
            "mime_type": "video/mp4",
            "file_size": 100,
            "width": width,
            "height": height,
            "duration_seconds": frames / fps if fps else 5.0,
            "thumbnail_url": f"/media/files/generated/videos/{thumb_filename}",
            "ai_generated": True,
            "ai_prompt": prompt,
            "ai_model": "placeholder",
        }


video_generator = VideoGenerator()
