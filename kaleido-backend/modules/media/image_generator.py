import asyncio
import os
import uuid
from datetime import datetime, timezone

import structlog
from PIL import Image

from ai.comfyui_client import comfyui_client
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
        """Generate an image using ComfyUI FLUX.1 Schnell pipeline."""
        width, height = ASPECT_RATIOS.get(aspect_ratio, (1024, 1024))

        # Enhance prompt with style
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

        # Check if ComfyUI is available
        available = await comfyui_client.is_available()
        if not available:
            logger.warning("comfyui_unavailable_generating_placeholder")
            return await ImageGenerator._generate_placeholder(
                prompt, width, height, aspect_ratio, style
            )

        # Queue the generation
        result = await comfyui_client.generate_image(
            prompt=enhanced_prompt,
            width=width,
            height=height,
            steps=steps,
            seed=seed,
        )

        prompt_id = result.get("prompt_id")
        if not prompt_id:
            raise RuntimeError("ComfyUI did not return a prompt_id")

        # Poll for completion
        image_data = await ImageGenerator._wait_for_result(prompt_id)

        # Save to disk
        file_info = await ImageGenerator._save_image(
            image_data, prompt, aspect_ratio, style
        )

        logger.info("image_generation_completed", file_path=file_info["file_path"])
        return file_info

    @staticmethod
    async def _wait_for_result(prompt_id: str, timeout: int = 120) -> bytes:
        """Poll ComfyUI for generation result."""
        start = asyncio.get_event_loop().time()
        while True:
            elapsed = asyncio.get_event_loop().time() - start
            if elapsed > timeout:
                raise TimeoutError("Image generation timed out")

            status = await comfyui_client.get_status(prompt_id)
            if isinstance(status, dict) and status.get("status") == "pending":
                await asyncio.sleep(0.5)
                continue

            # Extract output image filename
            outputs = status.get("outputs", {})
            for node_id, node_output in outputs.items():
                images = node_output.get("images", [])
                if images:
                    img = images[0]
                    return await comfyui_client.get_image(
                        img["filename"], img.get("subfolder", ""), img.get("type", "output")
                    )

            await asyncio.sleep(0.5)

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
            "ai_model": "flux1-schnell",
        }

    @staticmethod
    async def _generate_placeholder(
        prompt: str,
        width: int,
        height: int,
        aspect_ratio: str,
        style: str,
    ) -> dict:
        """Generate a placeholder image when ComfyUI is unavailable."""
        media_dir = os.path.join(settings.media_root, "generated", "images")
        os.makedirs(media_dir, exist_ok=True)

        file_id = str(uuid.uuid4())
        filename = f"{file_id}.png"
        file_path = os.path.join(media_dir, filename)

        # Create a gradient placeholder with text
        img = Image.new("RGB", (width, height), color=(45, 45, 60))

        # Draw a simple gradient
        from PIL import ImageDraw, ImageFont

        draw = ImageDraw.Draw(img)

        # Gradient overlay
        for y in range(height):
            r = int(45 + (y / height) * 30)
            g = int(45 + (y / height) * 20)
            b = int(60 + (y / height) * 40)
            draw.line([(0, y), (width, y)], fill=(r, g, b))

        # Add text
        text = f"AI Generated\n{aspect_ratio} | {style}"
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 24)
        except (OSError, IOError):
            font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), text, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (width - text_w) // 2
        y = (height - text_h) // 2
        draw.text((x, y), text, fill=(200, 180, 120), font=font)

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
            "ai_model": "placeholder",
        }


image_generator = ImageGenerator()
