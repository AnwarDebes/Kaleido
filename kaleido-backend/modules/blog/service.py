import re
import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.ollama_client import ollama_client
from core.exceptions import NotFoundError
from modules.blog.models import BlogPost
from modules.blog.schemas import BlogPostCreate, BlogPostUpdate

logger = structlog.get_logger()


def _slugify(text: str) -> str:
    slug = text.lower().strip()
    slug = re.sub(r'[^\w\s-]', '', slug)
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug[:200]


def _markdown_to_html(md: str) -> str:
    """Basic markdown to HTML conversion."""
    html = md
    # Headers
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    # Bold/italic
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    # Lists
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    # Paragraphs
    paragraphs = html.split('\n\n')
    processed = []
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith('<h') and not p.startswith('<li'):
            p = f'<p>{p}</p>'
        processed.append(p)
    return '\n'.join(processed)


class BlogService:
    @staticmethod
    async def create_blog_post(
        db: AsyncSession, user_id: uuid.UUID, data: BlogPostCreate
    ) -> BlogPost:
        slug = _slugify(data.title)
        content_html = _markdown_to_html(data.content_markdown) if data.content_markdown else None
        word_count = len(data.content_markdown.split()) if data.content_markdown else 0
        reading_time = max(1, word_count // 200)

        post = BlogPost(
            user_id=user_id,
            brand_id=data.brand_id,
            title=data.title,
            slug=slug,
            excerpt=data.excerpt,
            content_markdown=data.content_markdown,
            content_html=content_html,
            cover_image_url=data.cover_image_url,
            tags=data.tags,
            category=data.category,
            seo_title=data.seo_title or data.title,
            seo_description=data.seo_description or (data.excerpt[:160] if data.excerpt else None),
            seo_keywords=data.seo_keywords,
            word_count=word_count,
            reading_time_minutes=reading_time,
            status=data.status,
        )
        db.add(post)
        await db.commit()
        await db.refresh(post)
        logger.info("blog_post_created", blog_id=str(post.id), title=post.title)
        return post

    @staticmethod
    async def list_blog_posts(
        db: AsyncSession,
        user_id: uuid.UUID,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[BlogPost], int]:
        query = select(BlogPost).where(BlogPost.user_id == user_id, BlogPost.deleted_at.is_(None))
        count_q = select(func.count(BlogPost.id)).where(BlogPost.user_id == user_id, BlogPost.deleted_at.is_(None))
        if status:
            query = query.where(BlogPost.status == status)
            count_q = count_q.where(BlogPost.status == status)
        total = (await db.execute(count_q)).scalar() or 0
        result = await db.execute(query.order_by(BlogPost.created_at.desc()).offset(offset).limit(limit))
        return list(result.scalars().all()), total

    @staticmethod
    async def get_blog_post(db: AsyncSession, blog_id: uuid.UUID, user_id: uuid.UUID) -> BlogPost:
        result = await db.execute(
            select(BlogPost).where(BlogPost.id == blog_id, BlogPost.user_id == user_id, BlogPost.deleted_at.is_(None))
        )
        post = result.scalar_one_or_none()
        if not post:
            raise NotFoundError("Blog post not found")
        return post

    @staticmethod
    async def update_blog_post(
        db: AsyncSession, blog_id: uuid.UUID, user_id: uuid.UUID, data: BlogPostUpdate
    ) -> BlogPost:
        post = await BlogService.get_blog_post(db, blog_id, user_id)
        update_data = data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(post, key, value)

        if "content_markdown" in update_data and update_data["content_markdown"]:
            post.content_html = _markdown_to_html(update_data["content_markdown"])
            post.word_count = len(update_data["content_markdown"].split())
            post.reading_time_minutes = max(1, post.word_count // 200)

        if "title" in update_data:
            post.slug = _slugify(update_data["title"])

        if data.status == "published" and not post.published_at:
            post.published_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(post)
        return post

    @staticmethod
    async def delete_blog_post(db: AsyncSession, blog_id: uuid.UUID, user_id: uuid.UUID) -> None:
        post = await BlogService.get_blog_post(db, blog_id, user_id)
        post.deleted_at = datetime.now(timezone.utc)
        await db.commit()

    @staticmethod
    async def generate_blog_post(
        db: AsyncSession,
        user_id: uuid.UUID,
        topic: str,
        brand_id: uuid.UUID | None = None,
        tone: str = "professional",
        target_word_count: int = 1500,
        language: str = "en",
        keywords: list[str] | None = None,
    ) -> BlogPost:
        """Generate a blog post using AI."""
        kw_str = ", ".join(keywords) if keywords else "relevant keywords"
        prompt = f"""Write a comprehensive blog post about "{topic}".

Requirements:
- Tone: {tone}
- Target length: approximately {target_word_count} words
- Language: {language}
- Include these keywords naturally: {kw_str}
- Format in Markdown with proper headings (## for sections)
- Include an introduction, 3-5 main sections, and a conclusion
- Make it engaging and informative
- Include a compelling title at the top as # Title

Write the full blog post in Markdown format."""

        try:
            result = await ollama_client.generate_text(
                prompt=prompt,
                system="You are an expert content writer who creates engaging, SEO-optimized blog posts.",
                model="gemma4:26b-a4b-q4_K_M",
            )
            content = result if isinstance(result, str) else str(result)
        except Exception as e:
            logger.warning("ai_blog_generation_failed", error=str(e))
            content = BlogService._generate_fallback_blog(topic, tone, target_word_count, keywords)

        # Extract title from markdown
        title = topic
        lines = content.strip().split('\n')
        for line in lines:
            if line.startswith('# '):
                title = line[2:].strip()
                content = '\n'.join(l for l in lines if l != line)
                break

        # Create excerpt
        plain_text = re.sub(r'[#*_\[\]()]', '', content)
        excerpt = plain_text[:300].strip() + "..."

        post = BlogPost(
            user_id=user_id,
            brand_id=brand_id,
            title=title,
            slug=_slugify(title),
            excerpt=excerpt,
            content_markdown=content,
            content_html=_markdown_to_html(content),
            tags=keywords or [],
            seo_title=title,
            seo_description=excerpt[:160],
            seo_keywords=keywords or [],
            word_count=len(content.split()),
            reading_time_minutes=max(1, len(content.split()) // 200),
            ai_generated=True,
            ai_prompt=topic,
            ai_model="gemma4:26b" if "fallback" not in content else "fallback",
        )
        db.add(post)
        await db.commit()
        await db.refresh(post)
        logger.info("blog_post_generated", blog_id=str(post.id), word_count=post.word_count)
        return post

    @staticmethod
    def _generate_fallback_blog(
        topic: str, tone: str, target_words: int, keywords: list[str] | None
    ) -> str:
        kw_list = keywords or [topic.split()[0] if topic.split() else "topic"]
        sections = [
            f"# {topic}: A Comprehensive Guide",
            f"\n## Introduction\n\nIn today's rapidly evolving landscape, understanding {topic} has become essential. This comprehensive guide explores the key aspects, benefits, and strategies related to {topic}.",
            f"\n## Understanding {topic}\n\n{topic} represents a significant area of focus for professionals and organizations alike. The importance of this subject cannot be overstated, as it impacts multiple facets of modern business and personal development.\n\nKey aspects include:\n- Strategic planning and execution\n- Data-driven decision making\n- Continuous improvement and adaptation",
            f"\n## Key Benefits\n\nEmbracing {topic} offers numerous advantages:\n\n1. **Increased Efficiency**: Streamline processes and optimize workflows\n2. **Better Outcomes**: Achieve measurable results through structured approaches\n3. **Competitive Advantage**: Stay ahead by leveraging best practices\n4. **Scalability**: Build systems that grow with your needs",
            f"\n## Best Practices\n\nTo maximize the potential of {topic}, consider these proven strategies:\n\n- Start with clear objectives and measurable goals\n- Invest in the right tools and technologies\n- Foster a culture of continuous learning\n- Measure results and iterate based on data\n- Collaborate across teams for comprehensive solutions",
            f"\n## Implementation Strategy\n\nSuccessful implementation of {topic} requires a phased approach:\n\n### Phase 1: Assessment\nEvaluate your current state and identify gaps.\n\n### Phase 2: Planning\nDevelop a detailed roadmap with milestones.\n\n### Phase 3: Execution\nImplement changes incrementally, validating at each step.\n\n### Phase 4: Optimization\nContinuously refine based on results and feedback.",
            f"\n## Conclusion\n\n{topic} is not just a trend — it's a fundamental shift in how we approach challenges and opportunities. By following the strategies outlined in this guide, you can position yourself and your organization for long-term success.\n\nThe key is to start small, measure results, and scale what works. The journey of mastering {topic} begins with a single step.",
        ]
        return "\n".join(sections)
