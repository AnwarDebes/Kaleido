BRAND_ANALYSIS_PROMPT = """Analyze the following website content and existing social media posts
to create a detailed Brand Voice Profile.

WEBSITE CONTENT:
{scraped_content}

EXISTING POSTS:
{existing_posts}

Generate a JSON profile:
{{
    "tone": "professional|casual|friendly|authoritative|playful",
    "formality": 1-10,
    "emoji_usage": "none|minimal|moderate|heavy",
    "sentence_style": "short_punchy|conversational|detailed|academic",
    "vocabulary_level": "simple|moderate|advanced",
    "personality_traits": ["innovative", "trustworthy"],
    "topics_of_expertise": [],
    "do_use": ["specific phrases", "terminology"],
    "dont_use": ["avoided words", "off-brand phrases"],
    "example_posts": {{
        "great_example": "...",
        "bad_example": "..."
    }}
}}"""
