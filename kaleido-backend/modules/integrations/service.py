import uuid
from datetime import datetime, timezone
from xml.etree import ElementTree

import httpx
import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import NotFoundError, ValidationError
from modules.integrations.models import Integration, RSSFeed
from modules.integrations.schemas import RSSFeedCreate, RSSFeedUpdate

logger = structlog.get_logger()


class IntegrationService:
    @staticmethod
    async def list_integrations(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[Integration]:
        result = await db.execute(
            select(Integration).where(Integration.user_id == user_id)
            .order_by(Integration.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def disconnect_integration(
        db: AsyncSession, integration_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        result = await db.execute(
            select(Integration).where(
                Integration.id == integration_id, Integration.user_id == user_id
            )
        )
        integration = result.scalar_one_or_none()
        if not integration:
            raise NotFoundError("Integration not found")
        await db.delete(integration)
        await db.commit()


class RSSService:
    @staticmethod
    async def add_feed(
        db: AsyncSession, user_id: uuid.UUID, data: RSSFeedCreate
    ) -> RSSFeed:
        """Add an RSS feed and auto-detect its title."""
        title = None
        description = None

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(data.url)
                resp.raise_for_status()
                # Parse RSS/Atom
                root = ElementTree.fromstring(resp.text)
                # Try RSS 2.0
                channel = root.find("channel")
                if channel is not None:
                    title_el = channel.find("title")
                    desc_el = channel.find("description")
                    title = title_el.text if title_el is not None else None
                    description = desc_el.text if desc_el is not None else None
                else:
                    # Try Atom
                    ns = {"atom": "http://www.w3.org/2005/Atom"}
                    title_el = root.find("atom:title", ns)
                    subtitle_el = root.find("atom:subtitle", ns)
                    title = title_el.text if title_el is not None else None
                    description = subtitle_el.text if subtitle_el is not None else None
        except Exception as e:
            logger.warning("rss_fetch_failed", url=data.url, error=str(e))

        feed = RSSFeed(
            user_id=user_id,
            brand_id=data.brand_id,
            url=data.url,
            title=title or data.url,
            description=description,
            auto_post=data.auto_post,
            auto_post_platforms=data.auto_post_platforms,
            auto_post_tone=data.auto_post_tone,
            check_interval_minutes=data.check_interval_minutes,
        )
        db.add(feed)
        await db.commit()
        await db.refresh(feed)
        logger.info("rss_feed_added", feed_id=str(feed.id), url=data.url)
        return feed

    @staticmethod
    async def list_feeds(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[RSSFeed]:
        result = await db.execute(
            select(RSSFeed).where(RSSFeed.user_id == user_id)
            .order_by(RSSFeed.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_feed(
        db: AsyncSession, feed_id: uuid.UUID, user_id: uuid.UUID
    ) -> RSSFeed:
        result = await db.execute(
            select(RSSFeed).where(RSSFeed.id == feed_id, RSSFeed.user_id == user_id)
        )
        feed = result.scalar_one_or_none()
        if not feed:
            raise NotFoundError("RSS feed not found")
        return feed

    @staticmethod
    async def update_feed(
        db: AsyncSession, feed_id: uuid.UUID, user_id: uuid.UUID, data: RSSFeedUpdate
    ) -> RSSFeed:
        feed = await RSSService.get_feed(db, feed_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(feed, key, value)
        await db.commit()
        await db.refresh(feed)
        return feed

    @staticmethod
    async def delete_feed(
        db: AsyncSession, feed_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        feed = await RSSService.get_feed(db, feed_id, user_id)
        await db.delete(feed)
        await db.commit()

    @staticmethod
    async def fetch_entries(
        db: AsyncSession, feed_id: uuid.UUID, user_id: uuid.UUID, limit: int = 10
    ) -> list[dict]:
        """Fetch latest entries from an RSS feed."""
        feed = await RSSService.get_feed(db, feed_id, user_id)

        entries = []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(feed.url)
                resp.raise_for_status()

                root = ElementTree.fromstring(resp.text)

                # Try RSS 2.0
                items = root.findall(".//item")
                if items:
                    for item in items[:limit]:
                        entries.append({
                            "title": (item.find("title").text or "") if item.find("title") is not None else "",
                            "link": (item.find("link").text or "") if item.find("link") is not None else "",
                            "summary": (item.find("description").text or "")[:500] if item.find("description") is not None else None,
                            "published": (item.find("pubDate").text or "") if item.find("pubDate") is not None else None,
                        })
                else:
                    # Try Atom
                    ns = {"atom": "http://www.w3.org/2005/Atom"}
                    atom_entries = root.findall("atom:entry", ns)
                    for entry in atom_entries[:limit]:
                        title_el = entry.find("atom:title", ns)
                        link_el = entry.find("atom:link", ns)
                        summary_el = entry.find("atom:summary", ns)
                        published_el = entry.find("atom:published", ns) or entry.find("atom:updated", ns)
                        entries.append({
                            "title": title_el.text if title_el is not None else "",
                            "link": link_el.get("href", "") if link_el is not None else "",
                            "summary": (summary_el.text[:500] if summary_el is not None and summary_el.text else None),
                            "published": published_el.text if published_el is not None else None,
                        })

            # Update last checked
            feed.last_checked_at = datetime.now(timezone.utc)
            if entries:
                feed.last_entry_id = entries[0].get("link") or entries[0].get("title")
            await db.commit()

        except Exception as e:
            logger.warning("rss_fetch_entries_failed", feed_id=str(feed_id), error=str(e))

        return entries
