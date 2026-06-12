import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.notifications.service import ReminderService

logger = structlog.get_logger()

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class ReminderSettingsRequest(BaseModel):
    telegram_bot_token: str = Field(min_length=10, max_length=200)
    telegram_chat_id: str = Field(min_length=1, max_length=100)
    reminders_enabled: bool = True


@router.get("/reminders")
async def get_reminder_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings_row = await ReminderService.get_settings(db, user.id)
    return {
        "success": True,
        "data": {
            "configured": bool(settings_row and settings_row.telegram_bot_token_encrypted),
            "telegram_chat_id": settings_row.telegram_chat_id if settings_row else None,
            "reminders_enabled": bool(settings_row and settings_row.reminders_enabled),
        },
    }


@router.put("/reminders")
async def save_reminder_settings(
    data: ReminderSettingsRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    settings_row = await ReminderService.save_settings(
        db,
        user.id,
        bot_token=data.telegram_bot_token,
        chat_id=data.telegram_chat_id,
        reminders_enabled=data.reminders_enabled,
    )
    return {
        "success": True,
        "data": {
            "configured": True,
            "telegram_chat_id": settings_row.telegram_chat_id,
            "reminders_enabled": settings_row.reminders_enabled,
            "message": "Connected. Check Telegram for a hello message from your bot.",
        },
    }


@router.delete("/reminders")
async def delete_reminder_settings(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await ReminderService.delete_settings(db, user.id)
    return {"success": True, "data": {"message": "Reminder settings removed"}}
