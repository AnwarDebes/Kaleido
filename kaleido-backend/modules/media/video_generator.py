import structlog

from ai.gpu_models import generate_video

logger = structlog.get_logger()


class VideoGenerator:
    @staticmethod
    async def generate_video(
        prompt: str,
        width: int = 512,
        height: int = 512,
        frames: int = 16,
        fps: int = 8,
    ) -> dict:
        """Generate a video using AnimateDiff-Lightning on local GPU."""
        return await generate_video(
            prompt=prompt,
            width=width,
            height=height,
            num_frames=frames,
            fps=fps,
        )


video_generator = VideoGenerator()
