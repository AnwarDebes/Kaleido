import structlog

from ai.gpu_models import generate_video

logger = structlog.get_logger()


class VideoGenerator:
    @staticmethod
    async def generate_video(
        prompt: str,
        width: int = 832,
        height: int = 480,
        frames: int = 33,
        fps: int = 16,
    ) -> dict:
        """Generate a video using Wan2.1-T2V-1.3B on local GPU."""
        return await generate_video(
            prompt=prompt,
            width=width,
            height=height,
            num_frames=frames,
            fps=fps,
        )


video_generator = VideoGenerator()
