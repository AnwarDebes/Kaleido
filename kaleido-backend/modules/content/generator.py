import json
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.ollama_client import ollama_client
from ai.prompt_templates.content_generation import (
    POST_ENHANCE_PROMPT,
    POST_GENERATION_PROMPT,
    POST_REPURPOSE_PROMPT,
    SOCIAL_POST_SYSTEM_PROMPT,
)
from ai.prompt_templates.translation import TRANSLATION_PROMPT
from modules.brands.models import Brand
from modules.content.models import Post

logger = structlog.get_logger()


class ContentGenerator:
    @staticmethod
    async def generate_posts(
        db: AsyncSession,
        user_id: uuid.UUID,
        topic: str,
        platforms: list[str],
        tone: str = "professional",
        language: str = "en",
        brand_id: uuid.UUID | None = None,
    ) -> Post:
        brand_context = "No specific brand context provided."
        if brand_id:
            result = await db.execute(select(Brand).where(Brand.id == brand_id))
            brand = result.scalar_one_or_none()
            if brand:
                brand_context = json.dumps({
                    "name": brand.name,
                    "industry": brand.industry,
                    "voice": brand.brand_voice,
                    "pillars": brand.content_pillars,
                    "target_audience": brand.target_audience,
                })

        system_prompt = SOCIAL_POST_SYSTEM_PROMPT.format(brand_context=brand_context)
        user_prompt = POST_GENERATION_PROMPT.format(
            topic=topic,
            platforms=", ".join(platforms),
            tone=tone,
            language=language,
        )

        try:
            response = await ollama_client.generate_structured(
                prompt=user_prompt,
                system=system_prompt,
                temperature=0.7,
            )
        except Exception as e:
            logger.error("content_generation_failed", error=str(e))
            # Fallback: create a basic post structure
            response = {
                "posts": {p: {"text": f"[AI generation unavailable] Topic: {topic}", "hashtags": []} for p in platforms},
                "suggested_media": f"Image related to: {topic}",
            }

        platform_contents = response.get("posts", {})

        # Collect all text into content_text
        all_texts = [v.get("text", "") for v in platform_contents.values()]
        content_text = all_texts[0] if all_texts else topic

        # Collect all hashtags
        all_hashtags = set()
        for v in platform_contents.values():
            all_hashtags.update(v.get("hashtags", []))

        post = Post(
            user_id=user_id,
            brand_id=brand_id,
            content_text=content_text,
            platform_contents=platform_contents,
            content_type="post",
            hashtags=list(all_hashtags),
            ai_generated=True,
            ai_prompt=topic,
            ai_model="gemma4:26b-a4b-q4_K_M",
            status="draft",
        )
        db.add(post)
        await db.commit()
        await db.refresh(post)

        logger.info("post_generated", post_id=str(post.id), platforms=platforms)
        return post

    @staticmethod
    async def enhance_post(
        db: AsyncSession,
        post: Post,
        instructions: str,
        platform: str,
    ) -> Post:
        prompt = POST_ENHANCE_PROMPT.format(
            original_text=post.content_text or "",
            platform=platform,
            instructions=instructions,
        )

        try:
            enhanced_text = await ollama_client.generate_text(prompt=prompt, temperature=0.7)
        except Exception:
            enhanced_text = post.content_text or ""

        post.content_text = enhanced_text.strip()
        await db.commit()
        await db.refresh(post)
        return post

    @staticmethod
    async def translate_post(
        db: AsyncSession,
        post: Post,
        target_language: str,
    ) -> Post:
        prompt = TRANSLATION_PROMPT.format(
            target_language=target_language,
            text=post.content_text or "",
        )

        try:
            translated = await ollama_client.generate_text(prompt=prompt, temperature=0.3)
        except Exception:
            translated = post.content_text or ""

        post.content_text = translated.strip()
        await db.commit()
        await db.refresh(post)
        return post
