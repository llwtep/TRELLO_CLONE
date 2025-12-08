from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
from app.database.models.Board import Board as BoardModel
from app.database.models.ListModel import ListModel
from app.repositories.BaseRepo import BaseRepository
from app.core.exceptions import DataBaseError


class BoardRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(BoardModel, session)

    async def get_user_boards(self, user_id: UUID):
        stmt = select(BoardModel).where(BoardModel.owner_id == user_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_board(self, board_id: str, user_id: UUID):
        stmt = (
            select(BoardModel)
            .where(BoardModel.id == board_id, BoardModel.owner_id == user_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def get_board_with_details(self, board_id: UUID, user_id: UUID):
        stmt = (
            select(BoardModel)
            .where(BoardModel.id == board_id)
            .where(BoardModel.owner_id == user_id)
            .options(
                selectinload(BoardModel.lists).selectinload(ListModel.cards)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_board(self, owner_id: UUID, title: str) -> BoardModel:
        try:
            board = BoardModel(title=title, owner_id=owner_id)
            self.session.add(board)
            await self.session.flush()
            await self.session.refresh(board)
            return board
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DataBaseError(f"Failed to create board: {str(e)}")

    async def update_board(self, board: BoardModel, data: dict) -> BoardModel:
        try:
            for key, value in data.items():
                if hasattr(board, key) and value is not None:
                    setattr(board, key, value)
            await self.session.flush()
            return board
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DataBaseError(f"Failed to update board: {str(e)}")


