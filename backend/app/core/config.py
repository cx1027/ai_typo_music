from __future__ import annotations

from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", case_sensitive=False, extra="ignore")

    app_name: str = "AI Music"
    env: str = "dev"
    api_prefix: str = "/api"
    cors_origins: str = "http://localhost:5173"

    jwt_secret: str = "change_me"
    jwt_alg: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    database_url: str = "postgresql+psycopg://aimusic:aimusic@localhost:5432/aimusic"
    redis_url: str = "redis://localhost:6379/0"

    storage_backend: str = "local"  # local | s3
    local_storage_dir: str = ".data"

    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "auto"
    s3_bucket: str = ""

    # Music generation: ACE-Step via Replicate API (https://replicate.com/fishaudio/ace-step-1.5)
    replicate_api_token: str = ""

    # Image generation: FLUX.1 Schnell via Hugging Face Inference API
    huggingface_token: str = Field(default="", description="HuggingFace token for FLUX.1-schnell - set via HUGGINGFACE_HUB_TOKEN env var")

    # WeChat Official Account / JS-SDK
    wechat_app_id: str = ""
    wechat_app_secret: str = ""

    # Vercel deployment URL for the Next.js share app
    share_app_url: str = ""

    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
