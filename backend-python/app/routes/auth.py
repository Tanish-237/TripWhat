"""Auth routes — register, login, me, update profile."""

import jwt
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.deps import get_current_user
from app.models import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, AuthResponse,
    UserResponse, UpdateProfileRequest,
)
import bcrypt

router = APIRouter()


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def _verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8")[:72], hashed.encode("utf-8"))


def _create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=settings.jwt_expires_in_days),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        bio=user.bio,
        avatar_url=user.avatar_url,
        preferences=user.preferences or {},
    )


@router.post("/register", response_model=AuthResponse)
async def register(req: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == req.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        name=req.name,
        email=req.email,
        password=_hash_password(req.password),
        preferences=req.preferences or {},
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = _create_token(user.id)
    return AuthResponse(token=token, user=_user_response(user))


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalar_one_or_none()
    if not user or not _verify_password(req.password, user.password):
        raise HTTPException(status_code=400, detail="Invalid credentials")

    token = _create_token(user.id)
    return AuthResponse(token=token, user=_user_response(user))


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {"user": _user_response(user)}


@router.put("/profile")
async def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.name is not None:
        user.name = req.name
    if req.bio is not None:
        user.bio = req.bio
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
    if req.preferences is not None:
        current = user.preferences or {}
        current.update(req.preferences)
        user.preferences = current

    await db.commit()
    await db.refresh(user)
    return {"message": "Profile updated successfully", "user": _user_response(user)}
