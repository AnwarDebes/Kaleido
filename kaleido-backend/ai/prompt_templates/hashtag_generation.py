HASHTAG_GENERATION_PROMPT = """Generate relevant hashtags for the following social media post.

POST TEXT:
{post_text}

PLATFORM: {platform}
INDUSTRY: {industry}

Generate hashtags that are:
1. Relevant to the content
2. A mix of popular and niche tags
3. Appropriate for the platform

For Instagram: 10-15 hashtags
For Twitter/X: 2-3 hashtags
For LinkedIn: 3-5 hashtags
For TikTok: 5-8 hashtags
For other platforms: 3-5 hashtags

Respond with valid JSON:
{{
    "hashtags": ["hashtag1", "hashtag2", ...],
    "reasoning": "brief explanation of hashtag selection"
}}"""
