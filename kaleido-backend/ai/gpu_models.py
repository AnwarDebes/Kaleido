"""
GPU Model Manager — manages SDXL-Lightning and AnimateDiff-Lightning models.
Handles loading/unloading to share V100 32GB with Ollama.
"""

import asyncio
import gc
import os
import threading
import time
import uuid

import structlog
import torch
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
    if torch.cuda.is_available():
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


def _load_video_model():
    """Load AnimateDiff-Lightning for video generation."""
    global _video_pipe, _current_model

    if _current_model == "video":
        return _video_pipe

    _free_gpu()

    from diffusers import AnimateDiffPipeline, MotionAdapter, EulerDiscreteScheduler
    from huggingface_hub import hf_hub_download
    from safetensors.torch import load_file

    logger.info("loading_video_model", model="AnimateDiff-Lightning")

    adapter = MotionAdapter.from_pretrained(
        "guoyww/animatediff-motion-adapter-v1-5-2",
        torch_dtype=torch.float16,
    )

    pipe = AnimateDiffPipeline.from_pretrained(
        "emilianJR/epiCRealism",
        motion_adapter=adapter,
        torch_dtype=torch.float16,
    )

    pipe.scheduler = EulerDiscreteScheduler.from_config(
        pipe.scheduler.config,
        timestep_spacing="trailing",
        beta_schedule="linear",
    )

    ckpt = hf_hub_download(
        "ByteDance/AnimateDiff-Lightning",
        "animatediff_lightning_4step_diffusers.safetensors",
    )
    # Load Lightning weights, ignoring PE size mismatch
    state_dict = load_file(ckpt)
    missing, unexpected = pipe.unet.load_state_dict(state_dict, strict=False)

    # Expand positional embeddings from 32 to 128 to support more frames
    for name, module in pipe.unet.named_modules():
        if hasattr(module, "pos_embed") and hasattr(module.pos_embed, "pe"):
            pe = module.pos_embed.pe
            if pe.shape[1] < 128:
                new_pe = torch.zeros(1, 128, pe.shape[2], dtype=pe.dtype, device=pe.device)
                new_pe[:, :pe.shape[1], :] = pe
                module.pos_embed.pe = torch.nn.Parameter(new_pe, requires_grad=False)

    pipe.to("cuda")
    pipe.set_progress_bar_config(disable=True)

    _video_pipe = pipe
    _current_model = "video"
    logger.info("video_model_loaded")
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
    width: int = 512,
    height: int = 512,
    num_frames: int = 16,
    fps: int = 8,
) -> dict:
    """Generate a video using AnimateDiff-Lightning on local GPU."""
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
                prompt=prompt + ", cinematic, high quality, smooth motion, professional",
                negative_prompt="blurry, low quality, distorted, watermark, static, still image, ugly",
                guidance_scale=1.0,
                num_inference_steps=4,
                num_frames=num_frames,
                height=height,
                width=width,
            )
            return output.frames[0]

        frames = await loop.run_in_executor(None, _generate)
        elapsed = time.time() - start

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
        "ai_model": "animatediff-lightning",
    }


async def release_gpu():
    """Release GPU memory so Ollama can use it."""
    async with _gpu_lock:
        _free_gpu()
