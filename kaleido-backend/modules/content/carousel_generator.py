import os
import uuid
from datetime import datetime

import structlog
from PIL import Image, ImageDraw, ImageFont

from ai.ollama_client import ollama_client
from config.settings import settings

logger = structlog.get_logger()

# Carousel slide dimensions
SLIDE_SIZES = {
    "instagram": (1080, 1080),
    "linkedin": (1200, 1200),
    "square": (1080, 1080),
    "portrait": (1080, 1350),
}

# Color schemes
COLOR_SCHEMES = {
    "dark": {"bg": (26, 26, 46), "text": (255, 255, 255), "accent": (212, 165, 116)},
    "light": {"bg": (245, 245, 245), "text": (30, 30, 30), "accent": (79, 70, 229)},
    "blue": {"bg": (15, 23, 42), "text": (255, 255, 255), "accent": (59, 130, 246)},
    "green": {"bg": (20, 30, 20), "text": (255, 255, 255), "accent": (34, 197, 94)},
    "warm": {"bg": (45, 30, 20), "text": (255, 255, 255), "accent": (251, 146, 60)},
}


class CarouselGenerator:
    @staticmethod
    async def generate_carousel(
        topic: str,
        num_slides: int = 5,
        platform: str = "instagram",
        color_scheme: str = "dark",
        brand_name: str | None = None,
    ) -> dict:
        """Generate a multi-slide carousel with AI content."""
        # Generate slide content with AI
        slide_contents = await CarouselGenerator._generate_slide_content(
            topic, num_slides, brand_name
        )

        # Render slides
        width, height = SLIDE_SIZES.get(platform, (1080, 1080))
        colors = COLOR_SCHEMES.get(color_scheme, COLOR_SCHEMES["dark"])

        slides = []
        media_dir = os.path.join(settings.media_root, "generated", "carousels")
        os.makedirs(media_dir, exist_ok=True)

        carousel_id = str(uuid.uuid4())

        for i, content in enumerate(slide_contents):
            slide_id = f"{carousel_id}_slide_{i}"
            filename = f"{slide_id}.png"
            file_path = os.path.join(media_dir, filename)

            # Render slide
            img = CarouselGenerator._render_slide(
                content, width, height, colors, i, len(slide_contents), brand_name
            )
            img.save(file_path, "PNG", quality=95)

            slides.append({
                "slide_number": i + 1,
                "file_id": slide_id,
                "filename": filename,
                "file_path": file_path,
                "file_url": f"/media/files/generated/carousels/{filename}",
                "file_type": "image",
                "mime_type": "image/png",
                "file_size": os.path.getsize(file_path),
                "width": width,
                "height": height,
                "content": content,
            })

        logger.info("carousel_generated", carousel_id=carousel_id, slides=len(slides))

        return {
            "carousel_id": carousel_id,
            "topic": topic,
            "platform": platform,
            "color_scheme": color_scheme,
            "slides": slides,
            "total_slides": len(slides),
        }

    @staticmethod
    async def _generate_slide_content(
        topic: str, num_slides: int, brand_name: str | None
    ) -> list[dict]:
        """Generate content for each slide using AI."""
        prompt = f"""Create content for a {num_slides}-slide carousel about "{topic}".

For each slide, provide:
- headline: A short, punchy headline (5-8 words)
- body: 1-2 sentences of supporting text (max 30 words)
- emoji: A relevant emoji

Slide 1 should be a title/hook slide.
Last slide should be a call-to-action.

Return as a JSON array of objects with keys: headline, body, emoji"""

        try:
            result = await ollama_client.generate_structured(
                prompt=prompt,
                schema={"type": "array"},
            )
            if isinstance(result, list) and len(result) >= num_slides:
                return result[:num_slides]
        except Exception as e:
            logger.warning("carousel_ai_failed", error=str(e))

        # Fallback content
        return CarouselGenerator._generate_fallback_content(topic, num_slides, brand_name)

    @staticmethod
    def _generate_fallback_content(topic: str, num_slides: int, brand_name: str | None) -> list[dict]:
        templates = [
            {"headline": f"{topic}", "body": "Swipe to learn more about this essential topic.", "emoji": "👉"},
            {"headline": "The Problem", "body": f"Many struggle with {topic.lower()}. Here's what you need to know.", "emoji": "🤔"},
            {"headline": "Key Insight #1", "body": "Start with a clear strategy and measurable goals.", "emoji": "💡"},
            {"headline": "Key Insight #2", "body": "Consistency and quality matter more than quantity.", "emoji": "🎯"},
            {"headline": "Key Insight #3", "body": "Use data to guide your decisions and optimize results.", "emoji": "📊"},
            {"headline": "Pro Tip", "body": "Automate repetitive tasks to focus on what matters most.", "emoji": "⚡"},
            {"headline": "Common Mistakes", "body": "Avoid trying to be everywhere at once. Focus and excel.", "emoji": "⚠️"},
            {"headline": "Take Action Today", "body": f"Follow {brand_name or 'us'} for more insights. Save this post!", "emoji": "🚀"},
        ]
        return templates[:num_slides]

    @staticmethod
    def _render_slide(
        content: dict,
        width: int,
        height: int,
        colors: dict,
        slide_num: int,
        total_slides: int,
        brand_name: str | None,
    ) -> Image.Image:
        """Render a single carousel slide."""
        img = Image.new("RGB", (width, height), color=colors["bg"])
        draw = ImageDraw.Draw(img)

        # Gradient background
        for y in range(height):
            factor = y / height
            r = int(colors["bg"][0] + factor * 15)
            g = int(colors["bg"][1] + factor * 10)
            b = int(colors["bg"][2] + factor * 20)
            draw.line([(0, y), (width, y)], fill=(min(r, 255), min(g, 255), min(b, 255)))

        # Accent bar at top
        draw.rectangle([(0, 0), (width, 6)], fill=colors["accent"])

        # Load fonts
        try:
            font_large = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
            font_medium = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
            font_emoji = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 60)
        except (OSError, IOError):
            font_large = ImageFont.load_default()
            font_medium = font_large
            font_small = font_large
            font_emoji = font_large

        # Emoji
        emoji = content.get("emoji", "✨")
        draw.text((width // 2 - 30, height // 4 - 60), emoji, fill=colors["accent"], font=font_emoji)

        # Headline
        headline = content.get("headline", "Slide")
        # Word wrap
        words = headline.split()
        lines = []
        current = ""
        for word in words:
            test = f"{current} {word}".strip()
            bbox = draw.textbbox((0, 0), test, font=font_large)
            if bbox[2] > width - 100:
                lines.append(current)
                current = word
            else:
                current = test
        if current:
            lines.append(current)

        y_offset = height // 3
        for line in lines:
            bbox = draw.textbbox((0, 0), line, font=font_large)
            x = (width - (bbox[2] - bbox[0])) // 2
            draw.text((x, y_offset), line, fill=colors["text"], font=font_large)
            y_offset += bbox[3] - bbox[1] + 10

        # Body text
        body = content.get("body", "")
        if body:
            y_offset += 30
            body_words = body.split()
            body_lines = []
            current = ""
            for word in body_words:
                test = f"{current} {word}".strip()
                bbox = draw.textbbox((0, 0), test, font=font_medium)
                if bbox[2] > width - 120:
                    body_lines.append(current)
                    current = word
                else:
                    current = test
            if current:
                body_lines.append(current)

            for line in body_lines:
                bbox = draw.textbbox((0, 0), line, font=font_medium)
                x = (width - (bbox[2] - bbox[0])) // 2
                draw.text((x, y_offset), line, fill=(*colors["text"][:3],), font=font_medium)
                y_offset += bbox[3] - bbox[1] + 8

        # Slide indicator dots
        dot_y = height - 60
        dot_spacing = 20
        total_width = (total_slides - 1) * dot_spacing
        start_x = (width - total_width) // 2
        for i in range(total_slides):
            x = start_x + i * dot_spacing
            color = colors["accent"] if i == slide_num else tuple(min(c + 40, 255) for c in colors["bg"])
            draw.ellipse([(x - 4, dot_y - 4), (x + 4, dot_y + 4)], fill=color)

        # Brand name
        if brand_name:
            bbox = draw.textbbox((0, 0), brand_name, font=font_small)
            x = (width - (bbox[2] - bbox[0])) // 2
            draw.text((x, height - 35), brand_name, fill=colors["accent"], font=font_small)

        return img


carousel_generator = CarouselGenerator()
