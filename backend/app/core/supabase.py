from __future__ import annotations

from supabase import Client, create_client

_supabase_client: Client | None = None
_supabase_admin_client: Client | None = None


def get_supabase() -> Client:
    """Returns a Supabase client using the anon key (for validating user tokens)."""
    global _supabase_client
    if _supabase_client is None:
        from app.core.config import get_settings
        settings = get_settings()
        _supabase_client = create_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_anon_key,
        )
    return _supabase_client


def get_supabase_admin() -> Client:
    """Returns a Supabase client using the service role key (for server-side operations)."""
    global _supabase_admin_client
    if _supabase_admin_client is None:
        from app.core.config import get_settings
        settings = get_settings()
        _supabase_admin_client = create_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_service_role_key,
        )
    return _supabase_admin_client
