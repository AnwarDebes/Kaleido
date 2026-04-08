import os
import uuid
from urllib.parse import quote

import httpx
import structlog
from PIL import Image

from config.settings import settings

logger = structlog.get_logger()

ASPECT_RATIOS = {
    "1:1": (1024, 1024),
    "4:5": (896, 1120),
    "16:9": (1344, 768),
    "9:16": (768, 1344),
}

STYLE_PROMPTS = {
    "photorealistic": "photorealistic, highly detailed, professional photography, sharp focus, 8k",
    "illustration": "digital illustration, artistic, vibrant colors, detailed artwork",
    "minimal": "minimalist design, clean lines, simple composition, modern aesthetic",
    "flat": "flat design, vector art style, clean shapes, bold colors",
    "watercolor": "watercolor painting, soft edges, artistic, flowing colors",
    "cinematic": "cinematic lighting, dramatic, film still, professional color grading",
    "3d": "3D render, octane render, volumetric lighting, detailed textures",
}


class ImageGenerator:
    @staticmethod
    async def generate_image(
        prompt: str,
        aspect_ratio: str = "1:1",
        style: str = "photorealistic",
        steps: int = 4,
        seed: int | None = None,
    ) -> dict:
        """Generate an image using Pollinations.ai API."""
        width, height = ASPECT_RATIOS.get(aspect_ratio, (1024, 1024))

        style_suffix = STYLE_PROMPTS.get(style, "")
        enhanced_prompt = f"{prompt}, {style_suffix}" if style_suffix else prompt

        logger.info(
            "image_generation_started",
            prompt=prompt[:100],
            aspect_ratio=aspect_ratio,
            style=style,
            width=width,
            height=height,
        )

        encoded_prompt = quote(enhanced_prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&nologo=true&enhance=true"
        if seed is not None:
            url += f"&seed={seed}"

        try:
            async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                image_data = resp.content

            if len(image_data) < 1000:
                raise ValueError("Received invalid image data (too small)")

            file_info = await ImageGenerator._save_image(
                image_data, prompt, aspect_ratio, style
            )
            logger.info("image_generation_completed", file_path=file_info["file_path"])
            return file_info

        except Exception as e:
            logger.error("image_generation_failed", error=str(e))
            raise

    @staticmethod
    async def _save_image(
        image_data: bytes,
        prompt: str,
        aspect_ratio: str,
        style: str,
    ) -> dict:
        """Save generated image to disk and return file info."""
        media_dir = os.path.join(settings.media_root, "generated", "images")
        os.makedirs(media_dir, exist_ok=True)

        file_id = str(uuid.uuid4())
        filename = f"{file_id}.png"
        file_path = os.path.join(media_dir, filename)

        with open(file_path, "wb") as f:
            f.write(image_data)

        # Get image dimensions
        with Image.open(file_path) as img:
            width, height = img.size
            # Convert to PNG if needed
            if img.format != "PNG":
                img.save(file_path, "PNG")

        file_size = os.path.getsize(file_path)

        return {
            "file_id": file_id,
            "filename": filename,
            "file_path": file_path,
            "file_url": f"/media/files/generated/images/{filename}",
            "file_type": "image",
            "mime_type": "image/png",
            "file_size": file_size,
            "width": width,
            "height": height,
            "ai_generated": True,
            "ai_prompt": prompt,
            "ai_model": "flux-pollinations",
        }


image_generator = ImageGenerator()
