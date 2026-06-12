SOCIAL_POST_SYSTEM_PROMPT = """You are Kaleido AI, an expert social media content creator.
You generate engaging, platform-optimized social media posts.

BRAND CONTEXT:
{brand_context}

RULES:
1. Always match the brand's tone and voice
2. Each platform version must be uniquely tailored, NOT just truncated
3. Include relevant hashtags (5-10 for Instagram, 2-3 for LinkedIn, 1-2 for Twitter)
4. Use emojis appropriately based on platform and brand style
5. Include a clear call-to-action when appropriate
6. Never use generic filler content
7. Content must be original and engaging
8. Never use em dashes or en dashes; use commas, periods, or colons instead

PLATFORM GUIDELINES:
- Twitter/X: Max 280 chars. Punchy, conversational. Thread if needed.
- Instagram: Max 2200 chars. Storytelling, visual-first caption. Hashtag block at end.
- LinkedIn: Max 3000 chars. Professional, thought-leadership. Use line breaks.
- Facebook: Max 2000 chars. Community-focused, conversational. Ask questions.
- TikTok: Max 2200 chars. Trend-aware, casual, hook in first line.
- YouTube: Max 5000 chars. Descriptive, SEO-optimized. Title + Description + Tags.
- Threads: Max 500 chars. Conversational, brief.
- Pinterest: Max 500 chars. Inspirational, descriptive.

OUTPUT FORMAT (JSON):
{{
    "posts": {{
        "<platform>": {{"text": "...", "hashtags": [...]}},
        ...
    }},
    "suggested_media": "description of ideal accompanying image",
    "optimal_posting_time": "suggested time description"
}}"""

POST_GENERATION_PROMPT = """Generate social media posts about the following topic.

TOPIC: {topic}
PLATFORMS: {platforms}
TONE: {tone}
LANGUAGE: {language}

Generate unique, engaging content for each platform listed above.
Respond with valid JSON only."""

POST_ENHANCE_PROMPT = """Improve the following social media post to increase engagement.

ORIGINAL POST:
{original_text}

PLATFORM: {platform}
INSTRUCTIONS: {instructions}

Return the improved post text. Maintain the same topic but make it more engaging, with better hooks and calls to action."""

POST_REPURPOSE_PROMPT = """Repurpose the following post for a different platform.

ORIGINAL POST ({source_platform}):
{original_text}

TARGET PLATFORM: {target_platform}

Adapt the content for the target platform's audience, format, and character limits.
Return only the adapted text."""

REPURPOSE_PACK_PROMPT = """You are given source material (an idea, article, script, or notes).
Turn it into a complete social media content pack.

SOURCE MATERIAL:
{source_text}

PLATFORMS: {platforms}
TONE: {tone}
LANGUAGE: {language}

Create a uniquely tailored post for EACH platform listed (respect the platform
guidelines and character limits from the system prompt; never just truncate).
Also produce:
- "image_prompt": one vivid prompt for an AI image generator that fits the content
- "carousel_outline": 5 to 8 short slide titles telling the story as a carousel
- "hooks": 3 alternative opening lines (hooks), each under 100 characters

OUTPUT FORMAT (JSON):
{{
    "posts": {{
        "<platform>": {{"text": "...", "hashtags": [...]}},
        ...
    }},
    "image_prompt": "...",
    "carousel_outline": ["...", "..."],
    "hooks": ["...", "...", "..."]
}}
Respond with valid JSON only."""

IDEAS_PROMPT = """Suggest {count} fresh, specific social media post ideas.

BRAND CONTEXT:
{brand_context}

DATE CONTEXT: {date_context}

Rules:
- Each idea must be concrete enough to write a post from immediately, not a vague theme
- Vary the formats: tip, story, question, behind the scenes, list, hot take, how-to
- No invented statistics or fake claims
- Match the brand voice when brand context is given

OUTPUT FORMAT (JSON):
{{
    "ideas": [
        {{
            "title": "short catchy name for the idea",
            "description": "1-2 sentences on the angle and why it works",
            "format": "tip|story|question|behind_the_scenes|list|hot_take|how_to",
            "topic": "the exact topic line to feed the post generator"
        }},
        ...
    ]
}}
Respond with valid JSON only."""

PHOTO_TO_POST_PROMPT = """Look at the attached image and create social media posts about it.

PLATFORMS: {platforms}
TONE: {tone}
LANGUAGE: {language}
EXTRA CONTEXT FROM THE USER: {context}

Write what you actually see; never invent details that are not in the image.
Create a uniquely tailored post for EACH platform listed (respect the platform
guidelines and character limits from the system prompt).
Also produce "alt_text": one factual sentence describing the image for
screen readers (no hashtags, no marketing language).

OUTPUT FORMAT (JSON):
{{
    "posts": {{
        "<platform>": {{"text": "...", "hashtags": [...]}},
        ...
    }},
    "alt_text": "..."
}}
Respond with valid JSON only."""

WEEK_PLAN_PROMPT = """Plan {count} social media posts for the coming week.

BRAND CONTEXT:
{brand_context}

FOCUS / THEME FROM THE USER: {focus}
WEEK STARTING: {start_date}

Rules:
- Each topic must be concrete and immediately writable, not a vague theme
- Vary the formats across the week: tip, story, question, behind the scenes, list, how-to
- Spread the topics so the week feels varied, not repetitive
- No invented statistics or fake claims

OUTPUT FORMAT (JSON):
{{
    "plan": [
        {{
            "day_offset": 0,
            "title": "short name",
            "topic": "the exact topic line to feed the post generator",
            "format": "tip|story|question|behind_the_scenes|list|how_to"
        }},
        ...
    ]
}}
day_offset is days after the start date (0 to 6), at most one post per day unless count > 7.
Respond with valid JSON only."""
