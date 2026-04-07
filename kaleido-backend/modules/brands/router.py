import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.security import get_current_user
from modules.auth.models import User
from modules.brands.schemas import BrandCreate, BrandResponse, BrandUpdate
from modules.brands.service import BrandService

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.get("")
async def list_brands(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    brands = await BrandService.list_brands(db, user.id)
    return {
        "success": True,
        "data": [BrandResponse.model_validate(b).model_dump() for b in brands],
    }


@router.post("")
async def create_brand(
    data: BrandCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    brand = await BrandService.create_brand(db, user.id, data)
    return {
        "success": True,
        "data": BrandResponse.model_validate(brand).model_dump(),
    }


@router.get("/{brand_id}")
async def get_brand(
    brand_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    brand = await BrandService.get_brand(db, brand_id, user.id)
    return {
        "success": True,
        "data": BrandResponse.model_validate(brand).model_dump(),
    }


@router.patch("/{brand_id}")
async def update_brand(
    brand_id: uuid.UUID,
    data: BrandUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    brand = await BrandService.update_brand(db, brand_id, user.id, data)
    return {
        "success": True,
        "data": BrandResponse.model_validate(brand).model_dump(),
    }


@router.delete("/{brand_id}")
async def delete_brand(
    brand_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await BrandService.delete_brand(db, brand_id, user.id)
    return {
        "success": True,
        "data": {"message": "Brand deleted successfully"},
    }
