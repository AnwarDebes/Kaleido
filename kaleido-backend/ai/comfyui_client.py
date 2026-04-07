import json
import uuid

import httpx
import structlog

from config.settings import settings

logger = structlog.get_logger()


class ComfyUIClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.comfyui_base_url
        self.client_id = str(uuid.uuid4())

    async def generate_image(
        self,
        prompt: str,
        width: int = 1024,
        height: int = 1024,
        steps: int = 4,
        seed: int | None = None,
    ) -> dict:
        """Generate image using FLUX.1 Schnell workflow."""
        import random

        if seed is None:
            seed = random.randint(0, 2**32 - 1)

        workflow = self._build_flux_workflow(prompt, width, height, steps, seed)
        return await self._queue_prompt(workflow)

    async def generate_video(
        self,
        prompt: str,
        width: int = 848,
        height: int = 480,
        frames: int = 81,
        fps: int = 16,
    ) -> dict:
        """Generate video using Wan 2.1 1.3B workflow."""
        workflow = self._build_wan_workflow(prompt, width, height, frames)
        return await self._queue_prompt(workflow)

    async def get_status(self, prompt_id: str) -> dict:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{self.base_url}/history/{prompt_id}")
            resp.raise_for_status()
            data = resp.json()
            if prompt_id in data:
                return data[prompt_id]
            return {"status": "pending"}

    async def get_image(self, filename: str, subfolder: str = "", folder_type: str = "output") -> bytes:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(
                f"{self.base_url}/view",
                params={"filename": filename, "subfolder": subfolder, "type": folder_type},
            )
            resp.raise_for_status()
            return resp.content

    async def _queue_prompt(self, workflow: dict) -> dict:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{self.base_url}/prompt",
                json={"prompt": workflow, "client_id": self.client_id},
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("comfyui_queued", prompt_id=data.get("prompt_id"))
            return data

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/system_stats")
                return resp.status_code == 200
        except Exception:
            return False

    def _build_flux_workflow(self, prompt: str, width: int, height: int, steps: int, seed: int) -> dict:
        """Build a FLUX.1 Schnell ComfyUI workflow."""
        return {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": 1.0,
                    "sampler_name": "euler",
                    "scheduler": "simple",
                    "denoise": 1.0,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0],
                },
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "flux1-schnell.safetensors"},
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": width, "height": height, "batch_size": 1},
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": prompt, "clip": ["4", 1]},
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": "", "clip": ["4", 1]},
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {"filename_prefix": "kaleido", "images": ["8", 0]},
            },
        }

    def _build_wan_workflow(self, prompt: str, width: int, height: int, frames: int) -> dict:
        """Build a Wan 2.1 1.3B video workflow."""
        return {
            "1": {
                "class_type": "WanT2V",
                "inputs": {
                    "prompt": prompt,
                    "width": width,
                    "height": height,
                    "num_frames": frames,
                    "model": "Wan2.1-T2V-1.3B",
                },
            },
        }


comfyui_client = ComfyUIClient()
