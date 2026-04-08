import json
from typing import AsyncGenerator

import httpx
import structlog

from config.settings import settings

logger = structlog.get_logger()


class OllamaClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = base_url or settings.ollama_base_url

    async def generate_text(
        self,
        prompt: str,
        system: str = "",
        model: str = "gemma3:12b-it-q4_K_M",
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "system": system,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info(
                "ollama_generate",
                model=model,
                eval_count=data.get("eval_count"),
                eval_duration_ms=round(data.get("eval_duration", 0) / 1_000_000, 2),
            )
            return data["response"]

    async def generate_chat(
        self,
        messages: list[dict],
        model: str = "gemma3:12b-it-q4_K_M",
        temperature: float = 0.7,
        max_tokens: int = 2048,
    ) -> str:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "options": {
                        "temperature": temperature,
                        "num_predict": max_tokens,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            return data["message"]["content"]

    async def generate_structured(
        self,
        prompt: str,
        system: str = "",
        model: str = "gemma3:12b-it-q4_K_M",
        temperature: float = 0.3,
    ) -> dict:
        """Generate a JSON response from the model."""
        json_system = system + "\n\nYou MUST respond with valid JSON only. No markdown, no explanations."
        response = await self.generate_text(
            prompt=prompt,
            system=json_system,
            model=model,
            temperature=temperature,
        )
        # Try to extract JSON from the response
        response = response.strip()
        if response.startswith("```"):
            # Strip markdown code blocks
            lines = response.split("\n")
            response = "\n".join(lines[1:-1] if lines[-1].startswith("```") else lines[1:])

        return json.loads(response)

    async def stream_chat(
        self,
        messages: list[dict],
        model: str = "gemma3:12b-it-q4_K_M",
        temperature: float = 0.7,
    ) -> AsyncGenerator[str, None]:
        """Stream chat response tokens."""
        async with httpx.AsyncClient(timeout=300) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "options": {"temperature": temperature},
                },
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if not data.get("done"):
                            yield data["message"]["content"]

    async def list_models(self) -> list[dict]:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(f"{self.base_url}/api/tags")
            resp.raise_for_status()
            return resp.json().get("models", [])

    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False


ollama_client = OllamaClient()
