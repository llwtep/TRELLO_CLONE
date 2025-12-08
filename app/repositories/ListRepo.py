from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
from app.database.models.ListModel import ListModel
from app.repositories.BaseRepo import BaseRepository
from app.core.exceptions import DataBaseError


class ListRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(ListModel, session)

    async def get_board_lists(self, board_id: UUID):
        stmt = select(ListModel).where(ListModel.board_id == board_id).order_by(ListModel.position)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_list(self, board_id: UUID, title: str, position: int = 0) -> ListModel:
        new_list = ListModel(title=title, board_id=board_id, position=position)
        self.session.add(new_list)
        await self.session.flush()
        await self.session.refresh(new_list)
        return new_list

    async def update_list(self, list_: ListModel, data: dict) -> ListModel:
        for key, value in data.items():
            if hasattr(list_, key) and value is not None:
                setattr(list_, key, value)
        await self.session.flush()
        return list_

    async def shift_positions(self, board_id: UUID, start_pos: int, end_pos: int, shift: int):
        stmt = (
            update(ListModel)
            .where(ListModel.board_id == board_id)
            .where(ListModel.position >= start_pos)
            .where(ListModel.position <= end_pos)
            .values(position=ListModel.position + shift)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def shift_positions_from(self, board_id: UUID, start_pos: int, shift: int):
        """Shifts all lists from start_pos onwards"""
        stmt = (
            update(ListModel)
            .where(ListModel.board_id == board_id)
            .where(ListModel.position >= start_pos)
            .values(position=ListModel.position + shift)
        )
        await self.session.execute(stmt)
        await self.session.flush()
