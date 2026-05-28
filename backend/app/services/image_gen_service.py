from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from io import BytesIO
from typing import Callable, Optional

from app.core.config import get_settings

logger = logging.getLogger(__name__)


@dataclass
class ImageGenResult:
    image_bytes: bytes


ProgressCb = Callable[[int, str], None]


class FluxNotInstalledError(Exception):
    """Raised when FLUX.1 Schnell dependencies are not available."""


def generate_cover_image(
    *, prompt: str, title: str | None = None, progress_cb: Optional[ProgressCb] = None
) -> ImageGenResult:
    """
    Generate a cover image using FLUX.1 Schnell via Hugging Face Inference API.

    Creates an album cover-style image based on the song prompt and title.
    """
    print(f"[image_gen_service] generate_cover_image called: prompt='{prompt[:50]}...'", flush=True)

    try:
        # Enhance prompt for album cover style
        enhanced_prompt = f"Album cover art, {prompt}"
        if title:
            enhanced_prompt = (
                f"Album cover art for '{title}', {prompt}, "
                "professional music artwork, vibrant colors, artistic design, "
                "no text, no words, no letters, no typography, textless"
            )
        else:
            enhanced_prompt = (
                f"Album cover art, {prompt}, "
                "professional music artwork, vibrant colors, artistic design, "
                "no text, no words, no letters, no typography, textless"
            )

        logger.info(f"[image_gen_service] Generating cover image via HuggingFace: prompt='{enhanced_prompt[:100]}...'")

        if progress_cb:
            progress_cb(10, "Initializing FLUX.1 Schnell API client...")

        print(f"[image_gen_service] Attempting to import huggingface_hub...", flush=True)
        from huggingface_hub import InferenceClient
        from PIL import Image
        print(f"[image_gen_service] Successfully imported huggingface_hub", flush=True)

        # Get Hugging Face token
        settings = get_settings()
        hf_token = (
            getattr(settings, 'huggingface_token', None)
            or os.getenv('HUGGINGFACE_HUB_TOKEN')
            or os.getenv('HF_TOKEN')
        )

        if not hf_token:
            try:
                from huggingface_hub import HfFolder
                hf_token = HfFolder.get_token()
            except Exception:
                pass

        if not hf_token:
            error_msg = (
                "Hugging Face token is required for cover image generation.\n\n"
                "To fix this:\n"
                "1. Accept the model license at: https://huggingface.co/black-forest-labs/FLUX.1-schnell\n"
                "2. Get your token from: https://huggingface.co/settings/tokens\n"
                "3. Set one of these environment variables:\n"
                "   - HUGGINGFACE_HUB_TOKEN (recommended)\n"
                "   - HF_TOKEN\n"
                "   - Or set huggingface_token in your .env file"
            )
            logger.error(f"[image_gen_service] {error_msg}")
            raise FluxNotInstalledError(error_msg)

        model_id = "black-forest-labs/FLUX.1-schnell"
        logger.info(f"[image_gen_service] Initializing Inference API client for: {model_id}")
        client = InferenceClient(token=hf_token)

        if progress_cb:
            progress_cb(30, "Generating cover image...")

        logger.info(f"[image_gen_service] Generating image with prompt: '{enhanced_prompt[:100]}...'")

        image = client.text_to_image(
            enhanced_prompt,
            model=model_id,
            num_inference_steps=4,
            guidance_scale=3.5,
        )

        if progress_cb:
            progress_cb(80, "Processing image...")

        # Convert PIL Image to bytes (PNG format)
        img_buffer = BytesIO()
        image.save(img_buffer, format="PNG")
        image_bytes = img_buffer.getvalue()

        logger.info(f"[image_gen_service] Cover image generated successfully ({len(image_bytes)} bytes)")

        return ImageGenResult(image_bytes=image_bytes)

    except FluxNotInstalledError:
        raise
    except ImportError as e:
        print(f"[image_gen_service] ImportError: Dependencies not available: {e}", flush=True)
        import traceback
        print(f"[image_gen_service] ImportError traceback: {traceback.format_exc()}", flush=True)
        logger.warning(f"[image_gen_service] Dependencies not available: {e}")
        raise FluxNotInstalledError(f"Required dependencies not installed: {e}") from e
    except Exception as e:
        print(f"[image_gen_service] Exception: Error generating cover image: {type(e).__name__}: {e}", flush=True)
        import traceback
        print(f"[image_gen_service] Exception traceback: {traceback.format_exc()}", flush=True)
        logger.error(f"[image_gen_service] Error generating cover image: {e}", exc_info=True)
        raise FluxNotInstalledError(f"Failed to generate cover image: {type(e).__name__}: {e}") from e
