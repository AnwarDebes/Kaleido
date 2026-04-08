import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ai.ollama_client import ollama_client
from core.exceptions import NotFoundError
from modules.chat.models import ChatConversation, ChatMessage

logger = structlog.get_logger()

SYSTEM_PROMPT = """You are Kaleido CMO, an AI-powered Chief Marketing Officer assistant. You help users with:
- Social media strategy and content planning
- Brand voice development and consistency
- Content optimization and engagement tactics
- Analytics interpretation and actionable insights
- Campaign planning and execution
- Industry trends and competitive analysis

Always provide specific, actionable advice. Reference the user's brand context when available.
Be concise but thorough. Use bullet points and structured responses when helpful."""


class ChatService:
    @staticmethod
    async def create_conversation(
        db: AsyncSession,
        user_id: uuid.UUID,
        brand_id: uuid.UUID | None = None,
        title: str = "New Conversation",
        context_type: str = "general",
        context_id: uuid.UUID | None = None,
    ) -> ChatConversation:
        conv = ChatConversation(
            user_id=user_id,
            brand_id=brand_id,
            title=title,
            context_type=context_type,
            context_id=context_id,
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
        return conv

    @staticmethod
    async def list_conversations(
        db: AsyncSession, user_id: uuid.UUID, limit: int = 20, offset: int = 0,
    ) -> tuple[list[ChatConversation], int]:
        count = (await db.execute(
            select(func.count(ChatConversation.id)).where(ChatConversation.user_id == user_id)
        )).scalar() or 0
        result = await db.execute(
            select(ChatConversation).where(ChatConversation.user_id == user_id)
            .order_by(ChatConversation.updated_at.desc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all()), count

    @staticmethod
    async def get_conversation(
        db: AsyncSession, conv_id: uuid.UUID, user_id: uuid.UUID
    ) -> ChatConversation:
        result = await db.execute(
            select(ChatConversation).where(
                ChatConversation.id == conv_id, ChatConversation.user_id == user_id
            )
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise NotFoundError("Conversation not found")
        return conv

    @staticmethod
    async def get_messages(
        db: AsyncSession, conv_id: uuid.UUID, limit: int = 50, offset: int = 0,
    ) -> list[ChatMessage]:
        result = await db.execute(
            select(ChatMessage).where(ChatMessage.conversation_id == conv_id)
            .order_by(ChatMessage.created_at.asc()).offset(offset).limit(limit)
        )
        return list(result.scalars().all())

    @staticmethod
    async def send_message(
        db: AsyncSession,
        user_id: uuid.UUID,
        conv_id: uuid.UUID,
        content: str,
    ) -> ChatMessage:
        """Send a user message and get AI response."""
        conv = await ChatService.get_conversation(db, conv_id, user_id)

        # Save user message
        user_msg = ChatMessage(
            conversation_id=conv_id,
            role="user",
            content=content,
        )
        db.add(user_msg)
        await db.commit()

        # Build conversation history
        messages = await ChatService.get_messages(db, conv_id)
        chat_history = [{"role": "system", "content": SYSTEM_PROMPT}]

        # Add brand context if available
        if conv.brand_id:
            brand_context = await ChatService._get_brand_context(db, conv.brand_id)
            if brand_context:
                chat_history.append({"role": "system", "content": f"Brand context:\n{brand_context}"})

        for msg in messages:
            chat_history.append({"role": msg.role, "content": msg.content})

        # Generate AI response
        try:
            response = await ollama_client.generate_chat(
                messages=chat_history,
                model="gemma3:12b-it-q4_K_M",
            )
            ai_content = response if isinstance(response, str) else str(response)
        except Exception as e:
            logger.warning("chat_ai_failed", error=str(e))
            ai_content = ChatService._generate_fallback_response(content)

        # Save AI response
        ai_msg = ChatMessage(
            conversation_id=conv_id,
            role="assistant",
            content=ai_content,
        )
        db.add(ai_msg)

        # Update conversation title if first message
        if len(messages) <= 1:
            conv.title = content[:100]

        await db.commit()
        await db.refresh(ai_msg)

        logger.info("chat_response_generated", conv_id=str(conv_id))
        return ai_msg

    @staticmethod
    async def chat_with_post(
        db: AsyncSession,
        user_id: uuid.UUID,
        post_id: uuid.UUID,
        question: str,
    ) -> dict:
        """Analyze a specific post and answer questions about it."""
        from modules.content.models import Post

        result = await db.execute(
            select(Post).where(Post.id == post_id, Post.user_id == user_id)
        )
        post = result.scalar_one_or_none()
        if not post:
            raise NotFoundError("Post not found")

        post_context = f"""Post details:
- Content: {post.content_text or 'N/A'}
- Platform content: {post.platform_contents}
- Status: {post.status}
- AI generated: {post.ai_generated}
- Hashtags: {post.hashtags}
- Created: {post.created_at}"""

        prompt = f"""{post_context}

User question: {question}

Provide a helpful analysis and answer based on the post above."""

        try:
            response = await ollama_client.generate_text(
                prompt=prompt,
                system="You are a social media marketing expert analyzing a post. Give specific, actionable feedback.",
            )
            answer = response if isinstance(response, str) else str(response)
        except Exception:
            answer = ChatService._generate_post_analysis_fallback(post, question)

        return {
            "post_id": str(post_id),
            "question": question,
            "answer": answer,
        }

    @staticmethod
    async def _get_brand_context(db: AsyncSession, brand_id: uuid.UUID) -> str | None:
        from modules.brands.models import Brand
        result = await db.execute(select(Brand).where(Brand.id == brand_id))
        brand = result.scalar_one_or_none()
        if not brand:
            return None
        return f"Brand: {brand.name}\nIndustry: {brand.industry or 'N/A'}\nVoice: {brand.brand_voice or 'N/A'}\nTarget audience: {brand.target_audience or 'N/A'}"

    @staticmethod
    def _generate_fallback_response(user_message: str) -> str:
        msg_lower = user_message.lower()
        if any(w in msg_lower for w in ["strategy", "plan", "campaign"]):
            return """Here's a recommended approach for your marketing strategy:

**1. Define Clear Goals**
- Set specific, measurable objectives (e.g., increase engagement by 20%)
- Align goals with your broader business objectives

**2. Know Your Audience**
- Create detailed audience personas
- Analyze when your audience is most active

**3. Content Mix**
- Follow the 80/20 rule: 80% value, 20% promotion
- Mix content types: educational, entertaining, inspirational, promotional

**4. Platform Strategy**
- Tailor content for each platform's unique format
- Focus on 2-3 platforms where your audience is most active

**5. Measure & Iterate**
- Track key metrics weekly
- A/B test content formats and posting times

Would you like me to dive deeper into any of these areas?"""

        elif any(w in msg_lower for w in ["hashtag", "tag", "reach"]):
            return """Here are some hashtag best practices:

**Research-Based Approach:**
- Use a mix of popular (100K+ posts) and niche (1K-50K posts) hashtags
- Include 5-10 relevant hashtags per post on Instagram
- Use 1-3 hashtags on Twitter/LinkedIn
- Create a branded hashtag for your campaigns

**Tools for Research:**
- Check competitors' successful posts
- Use platform search to gauge hashtag popularity
- Track which hashtags drive the most engagement for your content

**Pro Tips:**
- Rotate hashtags to avoid shadowbanning
- Place hashtags in the first comment on Instagram for cleaner captions
- Use trending hashtags when relevant to your content"""

        else:
            return f"""Great question! Here are my thoughts on "{user_message[:50]}":

**Key Considerations:**
1. **Audience First** — Always start by understanding who you're trying to reach
2. **Consistency** — Maintain a regular posting schedule
3. **Quality Over Quantity** — One great post beats five mediocre ones
4. **Engagement** — Respond to comments and engage with your community
5. **Analytics** — Let data guide your decisions

**Recommended Next Steps:**
- Review your recent post performance
- Identify your top-performing content types
- Plan your content calendar for the next 2 weeks

Would you like more specific advice on any of these points?"""

    @staticmethod
    def _generate_post_analysis_fallback(post, question: str) -> str:
        platforms = list(post.platform_contents.keys()) if post.platform_contents else []
        return f"""**Post Analysis:**

📊 **Overview:**
- Status: {post.status}
- Platforms: {', '.join(platforms) if platforms else 'None specified'}
- AI Generated: {'Yes' if post.ai_generated else 'No'}
- Hashtags: {', '.join(post.hashtags) if post.hashtags else 'None'}

💡 **Recommendations:**
1. Consider adding more platform-specific variations
2. Include relevant hashtags for better discoverability
3. Add a clear call-to-action
4. Schedule posting for optimal engagement times

Regarding your question: "{question[:100]}"
This is a thoughtful question. Based on the post content, I recommend focusing on audience engagement and ensuring the message aligns with your brand voice."""

    @staticmethod
    async def delete_conversation(
        db: AsyncSession, conv_id: uuid.UUID, user_id: uuid.UUID
    ) -> None:
        conv = await ChatService.get_conversation(db, conv_id, user_id)
        await db.delete(conv)
        await db.commit()
