import structlog

from ai.gpu_models import generate_video
from ai.ollama_client import ollama_client

logger = structlog.get_logger()

ENRICH_SYSTEM = (
    "You turn short video ideas into one detailed prompt for a text-to-video "
    "model. Describe the scene, subject, motion, camera movement, lighting and "
    "mood in concrete visual terms, in chronological order, as a single flowing "
    "paragraph of 60 to 100 words. Plain factual visual language, present tense. "
    "Never use em dashes. Return ONLY the prompt text, nothing else."
)


class VideoGenerator:
    @staticmethod
    async def enrich_prompt(prompt: str) -> str:
        """Expand a short user idea into the detailed prompt video models
        need. Falls back to the raw prompt if the text model is unavailable."""
        if len(prompt.split()) >= 40:
            return prompt
        try:
            enriched = await ollama_client.generate_text(
                prompt=f"Video idea: {prompt}",
                system=ENRICH_SYSTEM,
                temperature=0.6,
                max_tokens=220,
            )
            enriched = enriched.strip().strip('"')
            if 20 <= len(enriched.split()) <= 140:
                logger.info("video_prompt_enriched", original=prompt[:60])
                return enriched
        except Exception as e:
            logger.warning("video_prompt_enrich_failed", error=str(e))
        return prompt

    @staticmethod
    async def generate_video(
        prompt: str,
        width: int = 832,
        height: int = 480,
        frames: int = 33,
        fps: int = 16,
    ) -> dict:
        """Generate a video on the local GPU, with the prompt expanded first
        so short ideas still produce coherent motion and composition."""
        enriched = await VideoGenerator.enrich_prompt(prompt)
        result = await generate_video(
            prompt=enriched,
            num_frames=frames,
            width=width,
            height=height,
            fps=fps,
        )
        # Keep the user's original words as the stored prompt
        result["ai_prompt"] = prompt
        return result


video_generator = VideoGenerator()
