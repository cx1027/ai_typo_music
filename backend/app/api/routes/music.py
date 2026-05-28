from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlmodel import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.progress_service import init_task
from app.tasks.music_generation import run_generation_task

logger = logging.getLogger(__name__)

router = APIRouter()


def _coerce_int(value: Any, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except Exception:
        return default


@router.post("/generate", status_code=status.HTTP_201_CREATED)
def music_generate(
    payload: dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict:
    """
    Music generation endpoint — submits a generation task via Celery.
    Music is generated via Replicate (ACE-Step API).
    Cover image is generated via HuggingFace (FLUX.1 Schnell).
    """
    mode_raw = payload.get("mode")
    if mode_raw is None:
        raise HTTPException(status_code=400, detail="mode is required (must be 'simple' or 'custom')")
    mode = str(mode_raw).strip().lower()
    if mode not in ("simple", "custom"):
        raise HTTPException(status_code=400, detail="mode must be 'simple' or 'custom'")

    if mode == "simple":
        sample_query = (payload.get("sample_query") or "").strip()
        if not sample_query:
            raise HTTPException(status_code=400, detail="sample_query is required for simple mode")
        prompt = None
        caption = None
        lyrics = None
    else:
        caption = (payload.get("caption") or "").strip()
        if not caption:
            caption = (payload.get("prompt") or "").strip()
        if not caption:
            raise HTTPException(status_code=400, detail="caption is required for custom mode")
        lyrics_raw = payload.get("lyrics")
        lyrics = str(lyrics_raw).strip() if lyrics_raw is not None else ""
        if not lyrics:
            raise HTTPException(status_code=400, detail="lyrics is required for custom mode")
        sample_query = None
        prompt = caption

    title = payload.get("title")
    genre = payload.get("genre")
    thinking = bool(payload.get("thinking", True))
    instrumental = bool(payload.get("instrumental", False))

    audio_duration = payload.get("audio_duration", payload.get("duration", -1))
    try:
        audio_duration_int = int(audio_duration)
    except Exception:
        raise HTTPException(status_code=400, detail="audio_duration must be an integer")
    if audio_duration_int != -1 and (audio_duration_int < 10 or audio_duration_int > 600):
        raise HTTPException(status_code=400, detail="audio_duration out of range (10-600, or -1 for auto)")

    bpm_raw = payload.get("bpm")
    bpm_int = _coerce_int(bpm_raw, default=0)
    bpm = bpm_int if bpm_int > 0 else None

    vocal_language = str(payload.get("vocal_language", "en") or "en")
    audio_format = str(payload.get("audio_format", "mp3") or "mp3")

    inference_steps_raw = payload.get("inference_steps")
    inference_steps_int = max(1, _coerce_int(inference_steps_raw, default=8))

    batch_size_raw = payload.get("batch_size")
    batch_size_int = max(1, _coerce_int(batch_size_raw, default=1))

    if user.credits_balance < 2:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Insufficient credits. Each song costs 2 credits.")
    user.credits_balance -= 2
    db.add(user)
    db.commit()
    db.refresh(user)

    job_id = str(uuid4())
    init_task(
        job_id,
        user_id=str(user.id),
        payload={
            "title": title,
            "genre": genre,
            "mode": mode,
            "caption": caption,
            "prompt": prompt,
            "sample_query": sample_query,
            "lyrics": lyrics,
            "thinking": thinking,
            "instrumental": instrumental,
            "audio_duration": audio_duration_int,
            "bpm": bpm,
            "vocal_language": vocal_language,
            "audio_format": audio_format,
            "inference_steps": inference_steps_int,
            "batch_size": batch_size_int,
        },
    )

    logger.info(f"[music_generate] Submitting job {job_id} via Celery (Replicate + HuggingFace)")
    run_generation_task.delay(
        task_id=job_id,
        user_id=str(user.id),
        title=title,
        mode=mode,
        caption=caption if mode == "custom" else None,
        prompt=prompt if mode == "custom" else None,
        sample_query=sample_query,
        lyrics=lyrics,
        audio_duration=audio_duration_int,
        thinking=thinking,
        instrumental=instrumental,
        bpm=bpm,
        vocal_language=vocal_language,
        audio_format=audio_format,
        inference_steps=inference_steps_int,
        batch_size=batch_size_int,
        genre=genre,
    )

    return {"job_id": job_id, "events_url": f"/api/generate/events/{job_id}"}
