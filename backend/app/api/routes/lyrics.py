from __future__ import annotations

import json
import logging
import re

from fastapi import APIRouter, Body, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.deps import get_current_user
from app.models.user import User
from app.services.llm_client import LlmClientError

logger = logging.getLogger(__name__)
router = APIRouter()


class LyricsRequest(BaseModel):
    words: str


class LyricsResponse(BaseModel):
    lyrics: str
    caption: str


# System prompt for generating lyrics from mood words
LYRICS_SYSTEM_PROMPT = """You are a creative songwriter. Given a set of mood words, write an original song with proper structure.

Your task:
1. Write a song caption (1-2 vivid sentences describing the music style and mood) — max 200 chars.
2. Write original lyrics with section markers: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Bridge], [Outro], [Instrumental], [Solo].
3. Use the mood words as inspiration for theme, tone, and imagery.
4. Make lyrics emotionally resonant and specific.

Output ONLY valid JSON:
{
  "caption": "A dreamy indie pop ballad...",
  "lyrics": "[Verse 1]\\nYour lyrics here..."
}

IMPORTANT:
- Lyrics must be original and at least 200 characters long.
- Include at least 2 distinct sections (Verse + Chorus minimum).
- Return ONLY the JSON object. No markdown fences, no explanation.
"""


def _get_anthropic_api_key() -> str:
    import os
    from pathlib import Path

    from dotenv import dotenv_values

    env_path = Path(__file__).parent.parent.parent.parent / ".env"
    try:
        env_vars = dotenv_values(env_path)
        key = env_vars.get("ANTHROPIC_API_KEY", "") or os.getenv("ANTHROPIC_API_KEY", "")
    except Exception:
        key = os.getenv("ANTHROPIC_API_KEY", "")

    if not key:
        raise LlmClientError(
            "ANTHROPIC_API_KEY is required for lyrics generation.\n"
            "Set ANTHROPIC_API_KEY in your backend/.env file."
        )
    return key


def _parse_json_response(raw_text: str) -> dict:
    text = raw_text.strip()

    # Try direct JSON parse first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    # Try to extract from markdown code blocks
    match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    # Try to find any {...} block
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as e:
            raise LlmClientError(f"Could not parse JSON: {e}\nResponse: {text[:500]}")

    raise LlmClientError(f"Could not find JSON in response: {text[:500]}")


@router.post("/lyrics", response_model=LyricsResponse)
def generate_lyrics_from_words(
    payload: LyricsRequest,
    user: User = Depends(get_current_user),
) -> LyricsResponse:
    """
    Generate song lyrics from a list of mood words using Claude.
    """
    import httpx

    words = payload.words.strip()
    if not words:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="words cannot be empty",
        )

    api_key = _get_anthropic_api_key()

    user_message = (
        f"Create a song inspired by these mood words:\n\n{words}\n\n"
        "Make it emotional, vivid, and well-structured."
    )

    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                "https://api.anthropic.com/v1/messages",
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1024,
                    "system": LYRICS_SYSTEM_PROMPT,
                    "messages": [{"role": "user", "content": user_message}],
                },
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
            )
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        logger.error(f"[lyrics] Anthropic API call failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Anthropic API error: {str(e)}",
        )
    except Exception as e:
        logger.error(f"[lyrics] Unexpected error: {type(e).__name__}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate lyrics: {str(e)}",
        )

    content_blocks = data.get("content", [])
    raw_text = ""
    for block in content_blocks:
        if block.get("type") == "text":
            raw_text = block.get("text", "")
            break

    if not raw_text:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Empty response from Claude",
        )

    try:
        parsed = _parse_json_response(raw_text)
    except LlmClientError as e:
        logger.error(f"[lyrics] JSON parse failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse lyrics response: {str(e)}",
        )

    lyrics = str(parsed.get("lyrics", "")).strip()
    caption = str(parsed.get("caption", words)).strip()

    if not lyrics:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Claude did not return lyrics",
        )

    logger.info(f"[lyrics] Generated lyrics for user {user.id}: caption='{caption[:80]}...'")
    return LyricsResponse(lyrics=lyrics, caption=caption)
