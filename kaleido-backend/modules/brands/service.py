import uuid

import structlog
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from core.exceptions import AuthorizationError, NotFoundError
from modules.brands.models import Brand
from modules.brands.schemas import BrandCreate, BrandUpdate

logger = structlog.get_logger()


class BrandService:
    @staticmethod
    async def list_brands(db: AsyncSession, user_id: uuid.UUID) -> list[Brand]:
        result = await db.execute(
            select(Brand).where(Brand.user_id == user_id).order_by(Brand.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def get_brand(db: AsyncSession, brand_id: uuid.UUID, user_id: uuid.UUID) -> Brand:
        result = await db.execute(
            select(Brand).where(Brand.id == brand_id, Brand.user_id == user_id)
        )
        brand = result.scalar_one_or_none()
        if not brand:
            raise NotFoundError("Brand", str(brand_id))
        return brand

    @staticmethod
    async def create_brand(db: AsyncSession, user_id: uuid.UUID, data: BrandCreate) -> Brand:
        brand = Brand(user_id=user_id, **data.model_dump())
        db.add(brand)
        await db.commit()
        await db.refresh(brand)
        logger.info("brand_created", brand_id=str(brand.id), user_id=str(user_id))
        return brand

    @staticmethod
    async def update_brand(db: AsyncSession, brand_id: uuid.UUID, user_id: uuid.UUID, data: BrandUpdate) -> Brand:
        brand = await BrandService.get_brand(db, brand_id, user_id)
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return brand

        await db.execute(
            update(Brand).where(Brand.id == brand_id).values(**update_data)
        )
        await db.commit()
        await db.refresh(brand)
        logger.info("brand_updated", brand_id=str(brand_id))
        return brand

    @staticmethod
    async def delete_brand(db: AsyncSession, brand_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await BrandService.get_brand(db, brand_id, user_id)
        await db.execute(delete(Brand).where(Brand.id == brand_id))
        await db.commit()
        logger.info("brand_deleted", brand_id=str(brand_id))
