import secrets
import uuid
from datetime import datetime, timezone

import structlog
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from config.redis import redis_client
from core.exceptions import AuthenticationError, NotFoundError, ValidationError
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from modules.auth.models import User
from modules.auth.schemas import (
    LoginRequest,
    RegisterRequest,
    UpdateProfileRequest,
)

logger = structlog.get_logger()


class AuthService:
    @staticmethod
    async def register(db: AsyncSession, data: RegisterRequest) -> User:
        # Check if email already exists
        result = await db.execute(select(User).where(User.email == data.email))
        if result.scalar_one_or_none():
            raise ValidationError("Email already registered")

        # Generate referral code
        referral_code = secrets.token_urlsafe(8)[:10]

        user = User(
            email=data.email,
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            referral_code=referral_code,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        logger.info("user_registered", user_id=str(user.id), email=user.email)
        return user

    @staticmethod
    async def login(db: AsyncSession, data: LoginRequest) -> dict:
        result = await db.execute(select(User).where(User.email == data.email))
        user = result.scalar_one_or_none()

        if not user or not user.password_hash:
            raise AuthenticationError("Invalid email or password")

        if not verify_password(data.password, user.password_hash):
            raise AuthenticationError("Invalid email or password")

        if not user.is_active:
            raise AuthenticationError("Account is disabled")

        # Update last login
        await db.execute(
            update(User).where(User.id == user.id).values(last_login_at=datetime.now(timezone.utc))
        )
        await db.commit()

        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        # Store refresh token in Redis for invalidation support
        await redis_client.setex(
            f"refresh_token:{str(user.id)}",
            60 * 60 * 24 * 7,  # 7 days
            refresh_token,
        )

        logger.info("user_logged_in", user_id=str(user.id))
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": user,
        }

    @staticmethod
    async def refresh_token(refresh_token_str: str) -> dict:
        payload = decode_token(refresh_token_str)

        if payload.get("type") != "refresh":
            raise AuthenticationError("Invalid token type")

        user_id = payload.get("sub")

        # Verify refresh token is still valid in Redis
        stored_token = await redis_client.get(f"refresh_token:{user_id}")
        if stored_token != refresh_token_str:
            raise AuthenticationError("Refresh token has been revoked")

        # Rotate tokens
        new_access = create_access_token(user_id)
        new_refresh = create_refresh_token(user_id)

        await redis_client.setex(
            f"refresh_token:{user_id}",
            60 * 60 * 24 * 7,
            new_refresh,
        )

        return {
            "access_token": new_access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
        }

    @staticmethod
    async def logout(user_id: str) -> None:
        await redis_client.delete(f"refresh_token:{user_id}")
        logger.info("user_logged_out", user_id=user_id)

    @staticmethod
    async def forgot_password(db: AsyncSession, email: str) -> None:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if not user:
            # Don't reveal if email exists
            return

        # Generate reset token and store in Redis (30 min expiry)
        reset_token = secrets.token_urlsafe(32)
        await redis_client.setex(
            f"password_reset:{reset_token}",
            60 * 30,
            str(user.id),
        )

        logger.info("password_reset_requested", user_id=str(user.id))
        # TODO: Send email with reset link when SMTP is configured

    @staticmethod
    async def reset_password(db: AsyncSession, token: str, new_password: str) -> None:
        user_id = await redis_client.get(f"password_reset:{token}")
        if not user_id:
            raise AuthenticationError("Invalid or expired reset token")

        await db.execute(
            update(User).where(User.id == uuid.UUID(user_id)).values(password_hash=hash_password(new_password))
        )
        await db.commit()

        # Invalidate the reset token
        await redis_client.delete(f"password_reset:{token}")
        logger.info("password_reset_completed", user_id=user_id)

    @staticmethod
    async def verify_email(db: AsyncSession, token: str) -> None:
        user_id = await redis_client.get(f"email_verify:{token}")
        if not user_id:
            raise AuthenticationError("Invalid or expired verification token")

        await db.execute(
            update(User).where(User.id == uuid.UUID(user_id)).values(is_email_verified=True)
        )
        await db.commit()
        await redis_client.delete(f"email_verify:{token}")
        logger.info("email_verified", user_id=user_id)

    @staticmethod
    async def change_password(db: AsyncSession, user: User, current_password: str, new_password: str) -> None:
        if not user.password_hash or not verify_password(current_password, user.password_hash):
            raise AuthenticationError("Current password is incorrect")

        await db.execute(
            update(User).where(User.id == user.id).values(password_hash=hash_password(new_password))
        )
        await db.commit()
        logger.info("password_changed", user_id=str(user.id))

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, data: UpdateProfileRequest) -> User:
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return user

        await db.execute(
            update(User).where(User.id == user.id).values(**update_data)
        )
        await db.commit()
        await db.refresh(user)
        logger.info("profile_updated", user_id=str(user.id))
        return user
