import structlog

from ai.comfyui_client import comfyui_client
from ai.gpu_manager import GPUMode, gpu_manager
from ai.ollama_client import ollama_client

logger = structlog.get_logger()


class ModelRouter:
    """Route AI tasks to appropriate models based on task type and GPU availability."""

    @staticmethod
    async def generate_text(
        prompt: str,
        system: str = "",
        temperature: float = 0.7,
        max_tokens: int = 2048,
        use_fast_model: bool = False,
    ) -> str:
        if use_fast_model:
            await gpu_manager.ensure_mode(GPUMode.DUAL_LIGHT)
            model = "gemma3:12b-it-q4_K_M"
        else:
            await gpu_manager.ensure_mode(GPUMode.TEXT_HEAVY)
            model = "gemma3:12b-it-q4_K_M"

        return await ollama_client.generate_text(
            prompt=prompt,
            system=system,
            model=model,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    @staticmethod
    async def generate_structured(
        prompt: str,
        system: str = "",
        temperature: float = 0.3,
        use_fast_model: bool = False,
    ) -> dict:
        if use_fast_model:
            await gpu_manager.ensure_mode(GPUMode.DUAL_LIGHT)
            model = "gemma3:12b-it-q4_K_M"
        else:
            await gpu_manager.ensure_mode(GPUMode.TEXT_HEAVY)
            model = "gemma3:12b-it-q4_K_M"

        return await ollama_client.generate_structured(
            prompt=prompt,
            system=system,
            model=model,
            temperature=temperature,
        )

    @staticmethod
    async def generate_image(
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        steps: int = 4,
    ) -> dict:
        await gpu_manager.ensure_mode(GPUMode.IMAGE_GEN)
        return await comfyui_client.generate_image(
            prompt=prompt,
            width=width,
            height=height,
            steps=steps,
        )

    @staticmethod
    async def generate_video(
        prompt: str,
        width: int = 848,
        height: int = 480,
        frames: int = 81,
    ) -> dict:
        await gpu_manager.ensure_mode(GPUMode.VIDEO_GEN)
        return await comfyui_client.generate_video(
            prompt=prompt,
            width=width,
            height=height,
            frames=frames,
        )

    @staticmethod
    async def chat(
        messages: list[dict],
        temperature: float = 0.7,
        use_fast_model: bool = False,
    ) -> str:
        if use_fast_model:
            await gpu_manager.ensure_mode(GPUMode.DUAL_LIGHT)
            model = "gemma3:12b-it-q4_K_M"
        else:
            await gpu_manager.ensure_mode(GPUMode.TEXT_HEAVY)
            model = "gemma3:12b-it-q4_K_M"

        return await ollama_client.generate_chat(
            messages=messages,
            model=model,
            temperature=temperature,
        )


model_router = ModelRouter()
