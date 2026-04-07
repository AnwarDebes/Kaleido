TRANSLATION_PROMPT = """Translate the following text to {target_language}.

TEXT:
{text}

RULES:
1. Maintain the original tone and style
2. Adapt cultural references appropriately
3. Keep hashtags in their original language unless there are common equivalents
4. Preserve formatting (line breaks, emoji placement)
5. For Arabic, ensure natural RTL-compatible phrasing

Respond with the translated text only. No explanations."""
