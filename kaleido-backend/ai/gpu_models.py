"""
GPU Model Manager for the SDXL-Lightning and Wan2.1 models.
Handles loading/unloading to share V100 32GB with Ollama.
"""

import asyncio
import gc
import os
import threading
import time
import uuid

import structlog

try:
    import torch
except ImportError:
    torch = None

from PIL import Image

from config.settings import settings

logger = structlog.get_logger()

# Singleton lock for GPU access
_gpu_lock = asyncio.Lock()
_current_model: str | None = None
_image_pipe = None
_video_pipe = None


def _free_gpu():
    """Free all GPU memory."""
    global _image_pipe, _video_pipe, _current_model
    _image_pipe = None
    _video_pipe = None
    _current_model = None
    gc.collect()
    if torch is not None and torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
    logger.info("gpu_memory_freed")


def _load_image_model():
    """Load SDXL-Lightning for image generation."""
    global _image_pipe, _current_model

    if _current_model == "image":
        return _image_pipe

    _free_gpu()

    from diffusers import StableDiffusionXLPipeline, EulerDiscreteScheduler
    from huggingface_hub import hf_hub_download
    from safetensors.torch import load_file

    logger.info("loading_image_model", model="SDXL-Lightning")

    pipe = StableDiffusionXLPipeline.from_pretrained(
        "stabilityai/stable-diffusion-xl-base-1.0",
        torch_dtype=torch.float16,
        variant="fp16",
        use_safetensors=True,
    )

    ckpt = hf_hub_download(
        "ByteDance/SDXL-Lightning", "sdxl_lightning_4step_unet.safetensors"
    )
    unet_state = load_file(ckpt)
    pipe.unet.load_state_dict(unet_state, strict=False)

    pipe.scheduler = EulerDiscreteScheduler.from_config(
        pipe.scheduler.config, timestep_spacing="trailing"
    )
    pipe = pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)

    _image_pipe = pipe
    _current_model = "image"
    logger.info("image_model_loaded")
    return pipe


def _ollama_set_keepalive(keep_alive) -> None:
    """Ask Ollama to load or unload the text model. The 5B video model plus
    the text model do not fit in 32GB together, so video generation borrows
    the whole card and gives it back afterwards."""
    try:
        import httpx

        httpx.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": "OK",
                "stream": False,
                "keep_alive": keep_alive,
                "options": {"num_predict": 1},
            },
            timeout=600,
        )
    except Exception as e:
        logger.warning("ollama_keepalive_failed", error=str(e))


# FastWan2.2-TI2V-5B was tested on this V100 and produced empty frames in
# fp16 (Volta has no bf16; the 5B weights overflow when cast). The 1.3B
# distill shares the architecture of the original Wan2.1-1.3B, which ran
# stably in fp16 here, and needs 3 steps instead of 30.
# Model choice, measured on this V100 with the same prompt and settings:
#   FastWan2.1-T2V-1.3B: 5s clip in ~90s total, stable fp16, solid quality
#   FastWan2.2-TI2V-5B:  4s clip in ~249s total, works but too slow for users
# Both are 3-step DMD distills; the 1.3B inherits its quality from the
# Wan2.1-14B teacher and wins on speed by a wide margin here.
VIDEO_MODEL_REPO = "FastVideo/FastWan2.1-T2V-1.3B-Diffusers"
VIDEO_MODEL_NAME = "fastwan2.1-t2v-1.3b"


def _load_video_model():
    """Load FastWan2.1-T2V-1.3B, a 3 step distilled video model.

    Loading notes for the V100 (fp16 only, no bf16): the repo declares a
    FastVideo-only pipeline class in model_index.json, so the generic
    DiffusionPipeline loader fails. Load WanPipeline explicitly, cast the
    bf16 weights to fp16, and keep the VAE in fp32 with tiling enabled."""
    global _video_pipe, _current_model

    if _current_model == "video":
        return _video_pipe

    _free_gpu()
    _ollama_set_keepalive(0)  # evict the text model, we need the VRAM

    from diffusers import AutoencoderKLWan, WanPipeline

    logger.info("loading_video_model", model=VIDEO_MODEL_NAME)

    vae = AutoencoderKLWan.from_pretrained(
        VIDEO_MODEL_REPO, subfolder="vae", torch_dtype=torch.float32
    )
    pipe = WanPipeline.from_pretrained(
        VIDEO_MODEL_REPO, vae=vae, torch_dtype=torch.float16
    )
    pipe.to("cuda")
    pipe.vae.enable_tiling()
    pipe.set_progress_bar_config(disable=True)

    _video_pipe = pipe
    _current_model = "video"
    logger.info("video_model_loaded", vram_gb=f"{torch.cuda.memory_allocated()/1e9:.1f}")
    return pipe


# ─── Public async API ────────────────────────────────────────────────

ASPECT_RATIOS = {
    "1:1": (1024, 1024),
    "4:5": (896, 1120),
    "16:9": (1344, 768),
    "9:16": (768, 1344),
}

STYLE_PROMPTS = {
    "photorealistic": ", photorealistic, highly detailed, professional photography, sharp focus, 8k uhd",
    "illustration": ", digital illustration, artistic, vibrant colors, detailed artwork",
    "minimal": ", minimalist design, clean lines, simple composition, modern aesthetic",
    "flat": ", flat design, vector art style, clean shapes, bold colors",
    "watercolor": ", watercolor painting, soft edges, artistic, flowing colors",
    "cinematic": ", cinematic lighting, dramatic, film still, professional color grading, anamorphic",
    "3d": ", 3D render, octane render, volumetric lighting, detailed textures, studio lighting",
}


async def generate_image(
    prompt: str,
    aspect_ratio: str = "1:1",
    style: str = "photorealistic",
    seed: int | None = None,
) -> dict:
    """Generate an image using SDXL-Lightning on local GPU."""
    if torch is None or not torch.cuda.is_available():
        raise RuntimeError("Image generation is temporarily unavailable on this server")

    width, height = ASPECT_RATIOS.get(aspect_ratio, (1024, 1024))
    style_suffix = STYLE_PROMPTS.get(style, "")
    enhanced_prompt = prompt + style_suffix

    logger.info(
        "image_generation_started",
        prompt=prompt[:80],
        style=style,
        size=f"{width}x{height}",
    )

    async with _gpu_lock:
        loop = asyncio.get_event_loop()
        start = time.time()

        def _generate():
            pipe = _load_image_model()
            generator = torch.Generator("cuda").manual_seed(seed) if seed else None
            image = pipe(
                prompt=enhanced_prompt,
                negative_prompt="blurry, low quality, distorted, watermark, text, logo, ugly, deformed",
                num_inference_steps=4,
                guidance_scale=0,
                height=height,
                width=width,
                generator=generator,
            ).images[0]
            return image

        image = await loop.run_in_executor(None, _generate)
        elapsed = time.time() - start

    # Save
    media_dir = os.path.join(settings.media_root, "generated", "images")
    os.makedirs(media_dir, exist_ok=True)

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.png"
    file_path = os.path.join(media_dir, filename)
    image.save(file_path, "PNG", optimize=True)

    file_size = os.path.getsize(file_path)

    logger.info(
        "image_generation_completed",
        elapsed=f"{elapsed:.1f}s",
        size=file_size,
        file=filename,
    )

    return {
        "file_id": file_id,
        "filename": filename,
        "file_path": file_path,
        "file_url": f"/media/files/generated/images/{filename}",
        "file_type": "image",
        "mime_type": "image/png",
        "file_size": file_size,
        "width": width,
        "height": height,
        "ai_generated": True,
        "ai_prompt": prompt,
        "ai_model": "sdxl-lightning",
    }


async def generate_video(
    prompt: str,
    width: int = 832,
    height: int = 480,
    num_frames: int = 81,
    fps: int = 16,
) -> dict:
    """Generate a video with FastWan2.1 (3 distilled steps, guidance off).

    The prompt should already be detailed; the caller enriches short
    prompts with the text model before calling this."""
    if torch is None or not torch.cuda.is_available():
        raise RuntimeError("Video generation is temporarily unavailable on this server")

    logger.info(
        "video_generation_started",
        prompt=prompt[:80],
        size=f"{width}x{height}",
        frames=num_frames,
    )

    async with _gpu_lock:
        loop = asyncio.get_event_loop()
        start = time.time()

        def _generate():
            pipe = _load_video_model()
            output = pipe(
                prompt=prompt,
                num_inference_steps=3,
                guidance_scale=1.0,
                num_frames=num_frames,
                height=height,
                width=width,
            )
            return output.frames[0]

        try:
            frames = await loop.run_in_executor(None, _generate)
        finally:
            # Give the card back: drop the video model, re-warm the text
            # model and reload the image model so the next image request
            # stays fast (a cold reload can outlive proxy timeouts).
            _free_gpu()
            threading.Thread(
                target=_ollama_set_keepalive, args=("1h",), daemon=True
            ).start()
            threading.Thread(target=warm_image_model, daemon=True).start()
        elapsed = time.time() - start

        # fp16 on Volta can overflow and produce NaN or flat black frames.
        # Frames may be floats in [0, 1] or uint8 in [0, 255]; normalize
        # before judging flatness.
        try:
            import numpy as np

            arr = np.asarray(frames[len(frames) // 2], dtype=np.float32)
            if not np.isfinite(arr).all():
                raise RuntimeError("Video generation produced invalid frames on this GPU")
            scale = 255.0 if float(arr.max()) > 1.5 else 1.0
            if float(arr.std()) / scale < 0.005:
                raise RuntimeError("Video generation produced empty frames on this GPU")
        except RuntimeError:
            raise
        except Exception:
            pass

    # Save
    from diffusers.utils import export_to_video

    media_dir = os.path.join(settings.media_root, "generated", "videos")
    os.makedirs(media_dir, exist_ok=True)

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.mp4"
    file_path = os.path.join(media_dir, filename)
    export_to_video(frames, file_path, fps=fps)

    file_size = os.path.getsize(file_path)
    duration = num_frames / fps

    logger.info(
        "video_generation_completed",
        elapsed=f"{elapsed:.1f}s",
        size=file_size,
        duration=f"{duration:.1f}s",
        file=filename,
    )

    return {
        "file_id": file_id,
        "filename": filename,
        "file_path": file_path,
        "file_url": f"/media/files/generated/videos/{filename}",
        "file_type": "video",
        "mime_type": "video/mp4",
        "file_size": file_size,
        "width": width,
        "height": height,
        "duration_seconds": duration,
        "ai_generated": True,
        "ai_prompt": prompt,
        "ai_model": VIDEO_MODEL_NAME,
    }


def warm_image_model() -> None:
    """Load SDXL into VRAM so the first user request is seconds, not a
    minute of cold disk reads. Safe to call from a background thread."""
    try:
        if torch is None or not torch.cuda.is_available():
            return
        _load_image_model()
        logger.info("image_model_warmed")
    except Exception as e:
        logger.warning("image_model_warmup_failed", error=str(e))


async def release_gpu():
    """Release GPU memory so Ollama can use it."""
    async with _gpu_lock:
        _free_gpu()
