from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from sqlalchemy import text

from app.api.deps import get_db
from app.core.supabase import get_supabase, get_supabase_admin
from app.models.user import RefreshRequest, TokenPair, User, UserCreate, UserLogin, UserPublic

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/register", response_model=UserPublic)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserPublic:
    try:
        normalized_email = payload.email.lower().strip()
        normalized_username = payload.username.strip()
        logger.info(f"Registration attempt for email: {normalized_email}, username: {normalized_username}")

        # Check for duplicate email in local DB (shouldn't exist since Supabase owns auth,
        # but kept as a safety belt)
        sql_query = text("SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(:email)) LIMIT 1")
        result = db.execute(sql_query, {"email": normalized_email})
        row = result.fetchone()
        if row:
            logger.warning(f"User already exists with email: {normalized_email}")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        # Check for duplicate username
        sql_query = text("SELECT id FROM users WHERE TRIM(username) = TRIM(:username) LIMIT 1")
        result = db.execute(sql_query, {"username": normalized_username})
        row = result.fetchone()
        if row:
            logger.warning(f"Registration rejected: Username {normalized_username} already taken")
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already taken")

        # Sign up with Supabase Auth
        supabase = get_supabase()
        auth_response = supabase.auth.sign_up({
            "email": normalized_email,
            "password": payload.password,
            "options": {
                "data": {"username": normalized_username}
            }
        })

        if auth_response.user is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Registration failed")

        supabase_user = auth_response.user
        session = auth_response.session

        # Create local user record (links to Supabase user by ID)
        user = User(
            id=supabase_user.id,
            email=supabase_user.email or normalized_email,
            username=normalized_username,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        logger.info(f"User registered successfully: {user.id}, email: {user.email}")
        return UserPublic.model_validate(user, from_attributes=True)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Registration failed for email {payload.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=TokenPair)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> TokenPair:
    try:
        if not payload.email or not payload.password:
            logger.warning("Login attempt with empty email or password")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are required"
            )

        normalized_email = payload.email.lower().strip()
        logger.info(f"Login attempt for email: {normalized_email}")

        # Authenticate via Supabase
        supabase = get_supabase()
        auth_response = supabase.auth.sign_in_with_password({
            "email": normalized_email,
            "password": payload.password,
        })

        if auth_response.user is None or auth_response.session is None:
            logger.warning(f"Login failed for email {normalized_email}: invalid credentials")
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        session = auth_response.session
        logger.info(f"Login successful for Supabase user: {auth_response.user.id}")

        return TokenPair(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Login error for email {payload.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed due to server error"
        )


@router.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest) -> TokenPair:
    try:
        supabase = get_supabase()
        auth_response = supabase.auth.refresh_session(payload.refresh_token)
        session = auth_response.session

        if not session:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        return TokenPair(
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
