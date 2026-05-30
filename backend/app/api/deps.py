from __future__ import annotations

from typing import Annotated, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.supabase import get_supabase
from app.models.user import User

bearer = HTTPBearer(auto_error=False)


def get_db():
    with get_session() as s:
        yield s


def get_current_user(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    token = None
    if creds is not None and creds.credentials:
        token = creds.credentials
    else:
        token = request.query_params.get("token") or request.query_params.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        supabase = get_supabase()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        user_id_str = user_response.user.id
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user = db.exec(select(User).where(User.id == user_id_str)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def get_current_user_optional(
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(bearer)],
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> Optional[User]:
    """
    Same as `get_current_user` but returns None instead of raising when
    credentials are missing or invalid. Useful for public endpoints that
    want to personalize responses when a user is logged in.
    """
    token: Optional[str] = None
    if creds is not None and creds.credentials:
        token = creds.credentials
    else:
        token = request.query_params.get("token") or request.query_params.get("access_token")

    if not token:
        return None

    try:
        supabase = get_supabase()
        user_response = supabase.auth.get_user(token)
        if not user_response or not user_response.user:
            return None
        user_id_str = user_response.user.id
    except Exception:
        return None

    user = db.exec(select(User).where(User.id == user_id_str)).first()
    return user
