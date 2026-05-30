from __future__ import annotations

from typing import Any, Dict

from app.core.supabase import get_supabase


def decode_token(token: str) -> Dict[str, Any]:
    """
    Validates a Supabase access token by calling get_user().
    Returns a payload dict compatible with the previous JWT format:
      {"sub": user_id, "type": "access", "email": email}
    Raises exception on invalid/expired token.
    """
    supabase = get_supabase()
    user_response = supabase.auth.get_user(token)
    if not user_response or not user_response.user:
        raise Exception("Invalid or expired token")
    user = user_response.user
    return {
        "sub": user.id,
        "type": "access",
        "email": user.email,
    }


def create_access_token(subject: str) -> str:
    """
    Deprecated — Supabase manages access tokens.
    Returns empty string. Backend routes should use the tokens returned
    by Supabase sign_in/sign_up calls directly.
    """
    return ""


def create_refresh_token(subject: str) -> str:
    """Deprecated — Supabase manages refresh tokens."""
    return ""


def hash_password(password: str) -> str:
    """Deprecated — Supabase Auth handles password hashing server-side."""
    return ""


def verify_password(password: str, password_hash: str) -> bool:
    """Deprecated — Supabase Auth handles password verification server-side."""
    return False
