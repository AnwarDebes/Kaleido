import structlog
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.auth.schemas import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
    UserResponse,
    VerifyEmailRequest,
)
from modules.auth.service import AuthService

logger = structlog.get_logger()

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register")
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await AuthService.register(db, data)
    return {
        "success": True,
        "data": {
            "user": UserResponse.model_validate(user).model_dump(),
            "message": "Registration successful",
        },
    }


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await AuthService.login(db, data)
    return {
        "success": True,
        "data": {
            "access_token": result["access_token"],
            "refresh_token": result["refresh_token"],
            "token_type": result["token_type"],
            "user": UserResponse.model_validate(result["user"]).model_dump(),
        },
    }


@router.post("/refresh")
async def refresh_token(data: RefreshRequest):
    result = await AuthService.refresh_token(data.refresh_token)
    return {
        "success": True,
        "data": result,
    }


@router.post("/logout")
async def logout(user: User = Depends(get_current_user)):
    await AuthService.logout(str(user.id))
    return {
        "success": True,
        "data": {"message": "Logged out successfully"},
    }


@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.forgot_password(db, data.email)
    return {
        "success": True,
        "data": {"message": "If the email exists, a reset link has been sent"},
    }


@router.post("/reset-password")
async def reset_password(data: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.reset_password(db, data.token, data.new_password)
    return {
        "success": True,
        "data": {"message": "Password reset successfully"},
    }


@router.post("/verify-email")
async def verify_email(data: VerifyEmailRequest, db: AsyncSession = Depends(get_db)):
    await AuthService.verify_email(db, data.token)
    return {
        "success": True,
        "data": {"message": "Email verified successfully"},
    }


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": {"user": UserResponse.model_validate(user).model_dump()},
    }


@router.patch("/me")
async def update_me(
    data: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updated_user = await AuthService.update_profile(db, user, data)
    return {
        "success": True,
        "data": {"user": UserResponse.model_validate(updated_user).model_dump()},
    }


@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await AuthService.change_password(db, user, data.current_password, data.new_password)
    return {
        "success": True,
        "data": {"message": "Password changed successfully"},
    }
