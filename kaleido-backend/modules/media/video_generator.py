import asyncio
import os
import uuid
from urllib.parse import quote

import httpx
import structlog

from config.settings import settings

logger = structlog.get_logger()


class VideoGenerator:
    @staticmethod
    async def generate_video(
        prompt: str,
        width: int = 848,
        height: int = 480,
        frames: int = 81,
        fps: int = 16,
    ) -> dict:
        """Generate a short video by creating AI keyframes and interpolating with ffmpeg."""
        logger.info("video_generation_started", prompt=prompt[:100], width=width, height=height)

        media_dir = os.path.join(settings.media_root, "generated", "videos")
        os.makedirs(media_dir, exist_ok=True)

        file_id = str(uuid.uuid4())
        work_dir = os.path.join(media_dir, f"tmp_{file_id}")
        os.makedirs(work_dir, exist_ok=True)

        try:
            # Generate keyframes using Pollinations.ai with sequential seeds
            num_keyframes = 3  # 3 frames is the sweet spot for speed vs quality
            base_seed = hash(prompt) % 100000

            encoded_prompt = quote(prompt)

            async with httpx.AsyncClient(timeout=90, follow_redirects=True) as client:
                results = []
                for i in range(num_keyframes):
                    seed = base_seed + i * 7
                    url = (
                        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
                        f"?width={width}&height={height}&nologo=true&seed={seed}"
                    )
                    try:
                        frame = await VideoGenerator._download_frame(client, url, work_dir, i)
                        results.append(frame)
                        logger.info("video_frame_downloaded", frame=i, total=num_keyframes)
                    except Exception as e:
                        logger.warning("video_frame_failed", frame=i, error=str(e))
                        results.append(e)
                    # Delay to avoid rate limiting (Pollinations free tier)
                    if i < num_keyframes - 1:
                        await asyncio.sleep(3)

            # Check we got enough frames
            valid_frames = [r for r in results if isinstance(r, str)]
            if len(valid_frames) < 2:
                raise RuntimeError(f"Only got {len(valid_frames)} valid frames, need at least 2")

            # Use ffmpeg to create video with crossfade transitions
            duration_per_frame = max(frames / fps / len(valid_frames), 0.5)
            output_path = os.path.join(media_dir, f"{file_id}.mp4")

            # Create a concat file for ffmpeg
            concat_path = os.path.join(work_dir, "concat.txt")
            with open(concat_path, "w") as f:
                for frame_path in valid_frames:
                    f.write(f"file '{frame_path}'\n")
                    f.write(f"duration {duration_per_frame:.2f}\n")
                # Repeat last frame to avoid cut
                f.write(f"file '{valid_frames[-1]}'\n")

            # Use ffmpeg: zoompan for Ken Burns effect + crossfade between frames
            cmd = (
                f"ffmpeg -y -f concat -safe 0 -i {concat_path} "
                f"-vf \"zoompan=z='min(zoom+0.001,1.3)':d={int(duration_per_frame * fps)}:"
                f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps},"
                f"format=yuv420p\" "
                f"-c:v libx264 -preset fast -crf 23 -t {frames / fps:.1f} "
                f"{output_path}"
            )

            proc = await asyncio.create_subprocess_shell(
                cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
            )
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=120)

            if proc.returncode != 0:
                logger.error("ffmpeg_failed", stderr=stderr.decode()[-500:])
                raise RuntimeError(f"ffmpeg failed: {stderr.decode()[-200:]}")

            file_size = os.path.getsize(output_path)
            actual_duration = frames / fps if fps else 5.0

            logger.info("video_generation_completed", file_path=output_path, size=file_size)

            return {
                "file_id": file_id,
                "filename": f"{file_id}.mp4",
                "file_path": output_path,
                "file_url": f"/media/files/generated/videos/{file_id}.mp4",
                "file_type": "video",
                "mime_type": "video/mp4",
                "file_size": file_size,
                "width": width,
                "height": height,
                "duration_seconds": actual_duration,
                "ai_generated": True,
                "ai_prompt": prompt,
                "ai_model": "flux-pollinations-video",
            }

        finally:
            # Cleanup work directory
            import shutil
            shutil.rmtree(work_dir, ignore_errors=True)

    @staticmethod
    async def _download_frame(
        client: httpx.AsyncClient, url: str, work_dir: str, index: int
    ) -> str:
        """Download a single frame image with retry on rate limit."""
        for attempt in range(4):
            resp = await client.get(url)
            if resp.status_code == 429:
                wait = 5 * (attempt + 1)
                logger.info("rate_limited_retrying", frame=index, wait=wait, attempt=attempt)
                await asyncio.sleep(wait)
                continue
            resp.raise_for_status()

            if len(resp.content) < 1000:
                raise ValueError(f"Frame {index} too small")

            frame_path = os.path.join(work_dir, f"frame_{index:04d}.png")
            with open(frame_path, "wb") as f:
                f.write(resp.content)
            return frame_path

        raise RuntimeError(f"Frame {index} failed after 3 retries")


video_generator = VideoGenerator()
