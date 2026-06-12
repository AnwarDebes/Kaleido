import re
import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.ollama_client import ollama_client
from core.exceptions import NotFoundError, ValidationError
from modules.newsletter.models import Newsletter, Subscriber
from modules.newsletter.schemas import NewsletterCreate, NewsletterUpdate, SubscriberCreate

logger = structlog.get_logger()


def _newsletter_html_template(subject: str, content_html: str, preview_text: str = "") -> str:
    """Wrap newsletter content in a responsive HTML email template."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{subject}</title>
<style>
body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f5f5f5; }}
.container {{ max-width: 600px; margin: 0 auto; background: #ffffff; }}
.header {{ background: #1a1a2e; color: #ffffff; padding: 30px; text-align: center; }}
.header h1 {{ margin: 0; font-size: 24px; color: #d4a574; }}
.content {{ padding: 30px; line-height: 1.6; color: #333; }}
.content h2 {{ color: #1a1a2e; }}
.content a {{ color: #d4a574; }}
.footer {{ background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #888; }}
</style>
</head>
<body>
<span style="display:none">{preview_text}</span>
<div class="container">
<div class="header"><h1>{subject}</h1></div>
<div class="content">{content_html}</div>
<div class="footer">
<p>You received this because you subscribed to our newsletter.</p>
<p><a href="{{{{unsubscribe_url}}}}">Unsubscribe</a></p>
</div>
</div>
</body>
</html>"""


def _markdown_to_html(md: str) -> str:
    html = md
    html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', html)
    html = re.sub(r'^- (.+)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    paragraphs = html.split('\n\n')
    processed = []
    for p in paragraphs:
        p = p.strip()
        if p and not p.startswith('<h') and not p.startswith('<li'):
            p = f'<p>{p}</p>'
        processed.append(p)
    return '\n'.join(processed)


class NewsletterService:
    @staticmethod
    async def create_newsletter(
        db: AsyncSession, user_id: uuid.UUID, data: NewsletterCreate
    ) -> Newsletter:
        content_html = None
        if data.content_markdown:
            body_html = _markdown_to_html(data.content_markdown)
            content_html = _newsletter_html_template(data.subject, body_html, data.preview_text or "")

        nl = Newsletter(
            user_id=user_id,
            brand_id=data.brand_id,
            subject=data.subject,
            preview_text=data.preview_text,
            content_markdown=data.content_markdown,
            content_html=content_html,
            from_name=data.from_name,
            from_email=data.from_email,
            reply_to=data.reply_to,
        )
        db.add(nl)
        await db.commit()
        await db.refresh(nl)
        return nl

    @staticmethod
    async def list_newsletters(
        db: AsyncSession, user_id: uuid.UUID, status: str | None = None,
        limit: int = 20, offset: int = 0,
    ) -> tuple[list[Newsletter], int]:
        query = select(Newsletter).where(Newsletter.user_id == user_id, Newsletter.deleted_at.is_(None))
        count_q = select(func.count(Newsletter.id)).where(Newsletter.user_id == user_id, Newsletter.deleted_at.is_(None))
        if status:
            query = query.where(Newsletter.status == status)
            count_q = count_q.where(Newsletter.status == status)
        total = (await db.execute(count_q)).scalar() or 0
        result = await db.execute(query.order_by(Newsletter.created_at.desc()).offset(offset).limit(limit))
        return list(result.scalars().all()), total

    @staticmethod
    async def get_newsletter(db: AsyncSession, nl_id: uuid.UUID, user_id: uuid.UUID) -> Newsletter:
        result = await db.execute(
            select(Newsletter).where(Newsletter.id == nl_id, Newsletter.user_id == user_id, Newsletter.deleted_at.is_(None))
        )
        nl = result.scalar_one_or_none()
        if not nl:
            raise NotFoundError("Newsletter not found")
        return nl

    @staticmethod
    async def update_newsletter(
        db: AsyncSession, nl_id: uuid.UUID, user_id: uuid.UUID, data: NewsletterUpdate
    ) -> Newsletter:
        nl = await NewsletterService.get_newsletter(db, nl_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(nl, key, value)
        if "content_markdown" in update_data and update_data["content_markdown"]:
            body_html = _markdown_to_html(update_data["content_markdown"])
            nl.content_html = _newsletter_html_template(nl.subject, body_html, nl.preview_text or "")
        await db.commit()
        await db.refresh(nl)
        return nl

    @staticmethod
    async def delete_newsletter(db: AsyncSession, nl_id: uuid.UUID, user_id: uuid.UUID) -> None:
        nl = await NewsletterService.get_newsletter(db, nl_id, user_id)
        nl.deleted_at = datetime.now(timezone.utc)
        await db.commit()

    @staticmethod
    async def send_newsletter(db: AsyncSession, nl_id: uuid.UUID, user_id: uuid.UUID) -> Newsletter:
        """Send newsletter to all active subscribers (SMTP stub)."""
        nl = await NewsletterService.get_newsletter(db, nl_id, user_id)
        if not nl.content_html:
            raise ValidationError("Newsletter has no content")

        # Get subscribers
        result = await db.execute(
            select(Subscriber).where(Subscriber.user_id == user_id, Subscriber.status == "active")
        )
        subscribers = result.scalars().all()

        # TODO: actual SMTP sending; for now, mark as sent
        nl.status = "sent"
        nl.sent_at = datetime.now(timezone.utc)
        nl.recipients_count = len(subscribers)
        await db.commit()
        await db.refresh(nl)

        logger.info("newsletter_sent", nl_id=str(nl_id), recipients=len(subscribers))
        return nl

    @staticmethod
    async def generate_newsletter(
        db: AsyncSession,
        user_id: uuid.UUID,
        topic: str,
        brand_id: uuid.UUID | None = None,
        tone: str = "professional",
    ) -> Newsletter:
        """Generate newsletter content using AI."""
        prompt = f"""Write a newsletter email about "{topic}".

Requirements:
- Tone: {tone}
- Include a greeting, 2-3 main content sections, and a call-to-action
- Format in Markdown
- Keep it concise and engaging (300-500 words)
- Include a compelling subject line at the top as # Subject

Write the full newsletter in Markdown format."""

        try:
            result = await ollama_client.generate_text(
                prompt=prompt,
                system="You are an expert email marketer who writes engaging newsletters.",
            )
            content = result if isinstance(result, str) else str(result)
        except Exception:
            content = f"""# {topic}: Your Weekly Update

## Hello!

We're excited to bring you the latest updates on {topic}. Here's what you need to know this week.

## What's New

**Exciting developments** are happening in the world of {topic}. Our team has been working hard to bring you the best insights and strategies.

Key highlights:
- New features and improvements
- Industry trends and analysis
- Expert tips and best practices

## Tips & Insights

Here are some actionable tips to help you make the most of {topic}:

1. Stay informed about the latest trends
2. Implement best practices early
3. Measure results and iterate

## What's Coming Next

We have some exciting announcements planned for the coming weeks. Stay tuned!

**Ready to get started?** Visit our platform to explore the latest tools and resources.

Best regards,
The Kaleido Team"""

        subject = topic
        lines = content.strip().split('\n')
        for line in lines:
            if line.startswith('# '):
                subject = line[2:].strip()
                content = '\n'.join(l for l in lines if l != line)
                break

        body_html = _markdown_to_html(content)
        full_html = _newsletter_html_template(subject, body_html, f"Latest updates on {topic}")

        nl = Newsletter(
            user_id=user_id,
            brand_id=brand_id,
            subject=subject,
            preview_text=f"Latest updates on {topic}",
            content_markdown=content,
            content_html=full_html,
            ai_generated=True,
            ai_prompt=topic,
        )
        db.add(nl)
        await db.commit()
        await db.refresh(nl)
        logger.info("newsletter_generated", nl_id=str(nl.id))
        return nl

    # --- Subscriber management ---
    @staticmethod
    async def add_subscriber(
        db: AsyncSession, user_id: uuid.UUID, data: SubscriberCreate
    ) -> Subscriber:
        sub = Subscriber(
            user_id=user_id,
            email=data.email,
            name=data.name,
            tags=data.tags,
        )
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return sub

    @staticmethod
    async def list_subscribers(
        db: AsyncSession, user_id: uuid.UUID, limit: int = 50, offset: int = 0,
    ) -> tuple[list[Subscriber], int]:
        count = (await db.execute(
            select(func.count(Subscriber.id)).where(Subscriber.user_id == user_id)
        )).scalar() or 0
        result = await db.execute(
            select(Subscriber).where(Subscriber.user_id == user_id)
            .order_by(Subscriber.created_at.desc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), count

    @staticmethod
    async def unsubscribe(db: AsyncSession, subscriber_id: uuid.UUID, user_id: uuid.UUID) -> Subscriber:
        result = await db.execute(
            select(Subscriber).where(Subscriber.id == subscriber_id, Subscriber.user_id == user_id)
        )
        sub = result.scalar_one_or_none()
        if not sub:
            raise NotFoundError("Subscriber not found")
        sub.status = "unsubscribed"
        sub.unsubscribed_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(sub)
        return sub
