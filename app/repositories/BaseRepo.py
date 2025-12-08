from sqlalchemy import select
from uuid import UUID
from abc import ABC
from typing import Generic, TypeVar, Optional
from sqlalchemy.exc import SQLAlchemyError

from app.core.exceptions import DataBaseError

T = TypeVar('T')





class BaseRepository(Generic[T], ABC):
    def __init__(self, model_class, session):
        self.model_class = model_class
        self.session = session

    async def add(self, entity: T) -> T:
        try:
            self.session.add(entity)
            await self.session.flush()
            return entity
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DataBaseError(f"Failed to add entity:{str(e)}")

    async def get_by_id(self, uid: UUID) -> Optional[T]:
        stmt = select(self.model_class).where(self.model_class.id == uid)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def delete(self, entity: T):
        try:
            await self.session.delete(entity)
            await self.session.flush()
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DataBaseError(f"Failed to add entity:{str(e)}")



