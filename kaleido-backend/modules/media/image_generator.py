import structlog

from ai.gpu_models import generate_image

logger = structlog.get_logger()


class ImageGenerator:
    @staticmethod
    async def generate_image(
        prompt: str,
        aspect_ratio: str = "1:1",
        style: str = "photorealistic",
        steps: int = 4,
        seed: int | None = None,
    ) -> dict:
        """Generate an image using SDXL-Lightning on local GPU."""
        return await generate_image(
            prompt=prompt,
            aspect_ratio=aspect_ratio,
            style=style,
            seed=seed,
        )


image_generator = ImageGenerator()
