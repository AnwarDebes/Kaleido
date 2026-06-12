import asyncio
from enum import Enum

import httpx
import structlog

from config.settings import settings
from ai.ollama_client import DEFAULT_MODEL

logger = structlog.get_logger()


class GPUMode(Enum):
    TEXT_HEAVY = "text_heavy"
    IMAGE_GEN = "image_gen"
    VIDEO_GEN = "video_gen"
    DUAL_LIGHT = "dual_light"


class GPUManager:
    def __init__(self):
        self.current_mode = GPUMode.TEXT_HEAVY
        self.lock = asyncio.Lock()
        self.ollama_url = settings.ollama_base_url

    async def ensure_mode(self, required_mode: GPUMode):
        async with self.lock:
            if self.current_mode == required_mode:
                return

            logger.info("gpu_mode_switch", from_mode=self.current_mode.value, to_mode=required_mode.value)

            await self._unload_current()
            await self._load_mode(required_mode)
            self.current_mode = required_mode

    async def _unload_current(self):
        if self.current_mode == GPUMode.TEXT_HEAVY:
            await self._ollama_unload(DEFAULT_MODEL)
        elif self.current_mode == GPUMode.DUAL_LIGHT:
            await self._ollama_unload(DEFAULT_MODEL)

    async def _load_mode(self, mode: GPUMode):
        if mode == GPUMode.TEXT_HEAVY:
            await self._ollama_load(DEFAULT_MODEL)
        elif mode in (GPUMode.IMAGE_GEN, GPUMode.VIDEO_GEN):
            pass  # ComfyUI loads on workflow execution
        elif mode == GPUMode.DUAL_LIGHT:
            await self._ollama_load(DEFAULT_MODEL)

    async def _ollama_unload(self, model: str):
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={"model": model, "keep_alive": 0},
                )
            logger.info("model_unloaded", model=model)
        except Exception as e:
            logger.warning("model_unload_failed", model=model, error=str(e))

    async def _ollama_load(self, model: str):
        try:
            async with httpx.AsyncClient(timeout=120) as client:
                await client.post(
                    f"{self.ollama_url}/api/generate",
                    json={"model": model, "prompt": "Hello", "keep_alive": "24h"},
                )
            logger.info("model_loaded", model=model)
        except Exception as e:
            logger.warning("model_load_failed", model=model, error=str(e))

    async def get_gpu_status(self) -> dict:
        try:
            import subprocess
            result = subprocess.run(
                ["nvidia-smi", "--query-gpu=memory.used,memory.total,utilization.gpu", "--format=csv,noheader,nounits"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            if result.returncode == 0:
                parts = result.stdout.strip().split(", ")
                return {
                    "memory_used_mb": int(parts[0]),
                    "memory_total_mb": int(parts[1]),
                    "gpu_utilization_percent": int(parts[2]),
                    "current_mode": self.current_mode.value,
                }
        except Exception as e:
            logger.warning("gpu_status_failed", error=str(e))

        return {"current_mode": self.current_mode.value, "error": "Unable to query GPU"}


gpu_manager = GPUManager()
