from sqlalchemy import select, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
from app.database.models.Board import Board as BoardModel
from app.database.models.ListModel import ListModel
from app.database.models.BoardUser import BoardUser, InvitationStatus
from app.repositories.BaseRepo import BaseRepository
from app.core.exceptions import DataBaseError


class BoardRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(BoardModel, session)

    async def get_user_boards(self, user_id: UUID):
        """Get all boards where user is either the owner or an accepted member"""
        # Subquery to get board_ids where user is an accepted member
        accepted_boards_subquery = (
            select(BoardUser.board_id)
            .where(BoardUser.user_id == user_id)
            .where(BoardUser.status == InvitationStatus.ACCEPTED)
        )
        
        # Main query: boards where user is owner OR in the accepted boards list
        stmt = select(BoardModel).where(
            or_(
                BoardModel.owner_id == user_id,
                BoardModel.id.in_(accepted_boards_subquery)
            )
        )
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
        """Get board with all details if user is owner or accepted member"""
        # Subquery to check if user is an accepted member
        accepted_boards_subquery = (
            select(BoardUser.board_id)
            .where(BoardUser.user_id == user_id)
            .where(BoardUser.status == InvitationStatus.ACCEPTED)
        )
        
        stmt = (
            select(BoardModel)
            .where(BoardModel.id == board_id)
            .where(
                or_(
                    BoardModel.owner_id == user_id,
                    BoardModel.id.in_(accepted_boards_subquery)
                )
            )
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


