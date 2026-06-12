import json
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.ollama_client import DEFAULT_MODEL, ollama_client
from ai.prompt_templates.content_generation import (
    IDEAS_PROMPT,
    PHOTO_TO_POST_PROMPT,
    WEEK_PLAN_PROMPT,
    POST_ENHANCE_PROMPT,
    POST_GENERATION_PROMPT,
    POST_REPURPOSE_PROMPT,
    REPURPOSE_PACK_PROMPT,
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
            logger.error("content_generation_failed", error=str(e), error_type=type(e).__name__)
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
            ai_model=DEFAULT_MODEL,
            status="draft",
        )
        db.add(post)
        await db.commit()
        await db.refresh(post)

        logger.info("post_generated", post_id=str(post.id), platforms=platforms)
        return post

    @staticmethod
    async def _brand_context(db: AsyncSession, brand_id: uuid.UUID | None) -> str:
        if not brand_id:
            return "No specific brand context provided."
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if not brand:
            return "No specific brand context provided."
        return json.dumps({
            "name": brand.name,
            "industry": brand.industry,
            "voice": brand.brand_voice,
            "pillars": brand.content_pillars,
            "target_audience": brand.target_audience,
        })

    @staticmethod
    async def repurpose_content(
        db: AsyncSession,
        user_id: uuid.UUID,
        source_text: str,
        platforms: list[str],
        tone: str = "professional",
        language: str = "en",
        brand_id: uuid.UUID | None = None,
        create_draft: bool = False,
    ) -> dict:
        """Turn long-form source material into a full multi-platform pack:
        per-platform posts, an image prompt, a carousel outline and hooks.
        Raises on AI failure; the router converts that into an honest 503."""
        brand_context = await ContentGenerator._brand_context(db, brand_id)
        system_prompt = SOCIAL_POST_SYSTEM_PROMPT.format(brand_context=brand_context)
        user_prompt = REPURPOSE_PACK_PROMPT.format(
            source_text=source_text[:12000],
            platforms=", ".join(platforms),
            tone=tone,
            language=language,
        )

        response = await ollama_client.generate_structured(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.7,
        )

        platform_contents = response.get("posts", {}) or {}
        result = {
            "platform_contents": platform_contents,
            "image_prompt": response.get("image_prompt", ""),
            "carousel_outline": response.get("carousel_outline", []) or [],
            "hooks": response.get("hooks", []) or [],
            "post": None,
        }

        if create_draft and platform_contents:
            all_texts = [v.get("text", "") for v in platform_contents.values()]
            all_hashtags: set[str] = set()
            for v in platform_contents.values():
                all_hashtags.update(v.get("hashtags", []))
            post = Post(
                user_id=user_id,
                brand_id=brand_id,
                content_text=all_texts[0] if all_texts else source_text[:500],
                platform_contents=platform_contents,
                content_type="post",
                hashtags=list(all_hashtags),
                ai_generated=True,
                ai_prompt=source_text[:500],
                ai_model=DEFAULT_MODEL,
                status="draft",
            )
            db.add(post)
            await db.commit()
            await db.refresh(post)
            result["post"] = post
            logger.info("content_repurposed", post_id=str(post.id), platforms=platforms)
        else:
            logger.info("content_repurposed", platforms=platforms, draft=False)

        return result

    @staticmethod
    async def generate_ideas(
        db: AsyncSession,
        brand_id: uuid.UUID | None = None,
        count: int = 5,
        date_context: str = "",
    ) -> list[dict]:
        """Generate concrete post ideas, brand-aware when a brand is given.
        Raises on AI failure; callers decide how to degrade."""
        brand_context = await ContentGenerator._brand_context(db, brand_id)
        response = await ollama_client.generate_structured(
            prompt=IDEAS_PROMPT.format(
                count=count,
                brand_context=brand_context,
                date_context=date_context or "No special date context.",
            ),
            system="You are Kaleido AI, a sharp social media strategist.",
            temperature=0.9,
        )
        ideas = response.get("ideas", []) or []
        return [
            {
                "title": str(i.get("title", ""))[:120],
                "description": str(i.get("description", ""))[:400],
                "format": str(i.get("format", "tip"))[:40],
                "topic": str(i.get("topic", i.get("title", "")))[:400],
            }
            for i in ideas
            if i.get("title")
        ][:count]

    @staticmethod
    async def photo_to_post(
        db: AsyncSession,
        user_id: uuid.UUID,
        image_b64: str,
        media_id: uuid.UUID,
        platforms: list[str],
        tone: str = "casual",
        language: str = "en",
        context: str = "",
        brand_id: uuid.UUID | None = None,
        create_draft: bool = True,
    ) -> dict:
        """Look at an image and write platform posts about it, plus factual
        alt text. Raises on AI failure."""
        brand_context = await ContentGenerator._brand_context(db, brand_id)
        system_prompt = SOCIAL_POST_SYSTEM_PROMPT.format(brand_context=brand_context)
        user_prompt = PHOTO_TO_POST_PROMPT.format(
            platforms=", ".join(platforms),
            tone=tone,
            language=language,
            context=context or "None provided.",
        )

        response = await ollama_client.generate_structured(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.7,
            images=[image_b64],
        )

        platform_contents = response.get("posts", {}) or {}
        alt_text = str(response.get("alt_text", "") or "")[:500]
        result = {"platform_contents": platform_contents, "alt_text": alt_text, "post": None}

        if create_draft and platform_contents:
            all_texts = [v.get("text", "") for v in platform_contents.values()]
            all_hashtags: set[str] = set()
            for v in platform_contents.values():
                all_hashtags.update(v.get("hashtags", []))
            post = Post(
                user_id=user_id,
                brand_id=brand_id,
                content_text=all_texts[0] if all_texts else "",
                platform_contents=platform_contents,
                content_type="post",
                hashtags=list(all_hashtags),
                media_ids=[media_id],
                alt_text=alt_text or None,
                ai_generated=True,
                ai_prompt="photo-to-post",
                ai_model=DEFAULT_MODEL,
                status="draft",
            )
            db.add(post)
            await db.commit()
            await db.refresh(post)
            result["post"] = post
            logger.info("photo_to_post_created", post_id=str(post.id))

        return result

    @staticmethod
    async def plan_week(
        db: AsyncSession,
        user_id: uuid.UUID,
        platforms: list[str],
        focus: str = "",
        count: int = 5,
        start_date=None,
        tone: str = "professional",
        language: str = "en",
        brand_id: uuid.UUID | None = None,
    ) -> list[dict]:
        """Plan a week: AI picks varied topics, then writes and schedules one
        draft per topic at a sensible time. Returns [{post, title, scheduled_at}].
        Raises on AI failure of the planning step; individual post failures
        are skipped with a log entry so one bad generation does not kill
        the whole week."""
        from datetime import datetime, time, timedelta, timezone as tz

        from modules.scheduling.scheduler import OPTIMAL_TIMES

        brand_context = await ContentGenerator._brand_context(db, brand_id)
        if start_date is None:
            start_date = datetime.now(tz.utc).date() + timedelta(days=1)

        response = await ollama_client.generate_structured(
            prompt=WEEK_PLAN_PROMPT.format(
                count=count,
                brand_context=brand_context,
                focus=focus or "No specific focus, plan a varied week.",
                start_date=start_date.strftime("%A, %d %B %Y"),
            ),
            system="You are Kaleido AI, a sharp social media strategist.",
            temperature=0.8,
        )
        plan = [item for item in (response.get("plan") or []) if item.get("topic")][:count]

        import re as _re

        primary = platforms[0] if platforms else "instagram"
        primary_id = _re.sub(r"[^a-z0-9]+", "_", primary.strip().lower()).strip("_")
        primary_id = {"twitter_x": "twitter", "x": "twitter"}.get(primary_id, primary_id)
        hours = OPTIMAL_TIMES.get(primary_id, [9, 12, 17])

        results: list[dict] = []
        for i, item in enumerate(plan):
            try:
                post = await ContentGenerator.generate_posts(
                    db=db,
                    user_id=user_id,
                    topic=str(item["topic"])[:400],
                    platforms=platforms,
                    tone=tone,
                    language=language,
                    brand_id=brand_id,
                )
                day = min(int(item.get("day_offset", i)), 6)
                hour = hours[i % len(hours)]
                post.status = "scheduled"
                post.scheduled_at = datetime.combine(
                    start_date + timedelta(days=day), time(hour=hour), tzinfo=tz.utc
                )
                await db.commit()
                await db.refresh(post)
                results.append(
                    {
                        "post": post,
                        "title": str(item.get("title", ""))[:120],
                        "format": str(item.get("format", ""))[:40],
                    }
                )
            except Exception as e:
                logger.warning("plan_week_post_failed", index=i, error=str(e))

        logger.info("week_planned", user_id=str(user_id), posts=len(results))
        return results

    @staticmethod
    async def suggest_hashtags(
        text: str,
        platform: str = "instagram",
        industry: str = "general",
    ) -> list[str]:
        """Suggest hashtags for a piece of text. Raises on AI failure."""
        from ai.prompt_templates.hashtag_generation import HASHTAG_GENERATION_PROMPT

        response = await ollama_client.generate_structured(
            prompt=HASHTAG_GENERATION_PROMPT.format(
                post_text=text[:4000], platform=platform, industry=industry
            ),
            system="You are Kaleido AI, an expert in social media reach.",
            temperature=0.5,
        )
        tags = response.get("hashtags", []) or []
        cleaned = []
        for t in tags:
            t = str(t).strip().lstrip("#")
            if t and t not in cleaned:
                cleaned.append(t)
        return cleaned[:20]

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
