from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
from app.database.models.BoardUser import BoardUser, InvitationStatus
from app.database.models.User import UserModel
from app.repositories.BaseRepo import BaseRepository
from app.core.exceptions import DataBaseError
from typing import Optional, List


class BoardUserRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(BoardUser, session)

    async def create_or_update_board_user(
        self,
        board_id: UUID,
        user_id: UUID,
        invited_by: UUID,
        status: InvitationStatus = InvitationStatus.PENDING
    ) -> BoardUser:
        """Create a new BoardUser record or update existing one"""
        try:
            # Check if record exists
            existing = await self.get_by_board_and_user(board_id, user_id)
            
            if existing:
                # Update existing record
                existing.status = status
                existing.invited_by = invited_by
                await self.session.flush()
                await self.session.refresh(existing)
                return existing
            else:
                # Create new record
                board_user = BoardUser(
                    board_id=board_id,
                    user_id=user_id,
                    invited_by=invited_by,
                    status=status
                )
                self.session.add(board_user)
                await self.session.flush()
                await self.session.refresh(board_user)
                return board_user
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DataBaseError(f"Failed to create or update board user: {str(e)}")

    async def get_by_board_and_user(
        self,
        board_id: UUID,
        user_id: UUID
    ) -> Optional[BoardUser]:
        """Fetch a specific BoardUser record by board_id and user_id"""
        try:
            stmt = select(BoardUser).where(
                and_(
                    BoardUser.board_id == board_id,
                    BoardUser.user_id == user_id
                )
            )
            result = await self.session.execute(stmt)
            return result.scalars().first()
        except SQLAlchemyError as e:
            raise DataBaseError(f"Failed to get board user: {str(e)}")

    async def update_status(
        self,
        board_user: BoardUser,
        status: InvitationStatus
    ) -> BoardUser:
        """Update the status field of an existing BoardUser record"""
        try:
            board_user.status = status
            await self.session.flush()
            await self.session.refresh(board_user)
            return board_user
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DataBaseError(f"Failed to update board user status: {str(e)}")

    async def get_users_by_status(
        self,
        board_id: UUID,
        status: InvitationStatus
    ) -> List[BoardUser]:
        """Generic method to fetch users by board and status"""
        try:
            stmt = (
                select(BoardUser)
                .where(
                    and_(
                        BoardUser.board_id == board_id,
                        BoardUser.status == status
                    )
                )
                .options(selectinload(BoardUser.user))
            )
            result = await self.session.execute(stmt)
            return result.scalars().all()
        except SQLAlchemyError as e:
            raise DataBaseError(f"Failed to get users by status: {str(e)}")

    async def get_accepted_users(self, board_id: UUID) -> List[BoardUser]:
        """Returns list of users with 'accepted' status for a board"""
        return await self.get_users_by_status(board_id, InvitationStatus.ACCEPTED)

    async def get_pending_users(self, board_id: UUID) -> List[BoardUser]:
        """Returns list of users with 'pending' status for a board"""
        return await self.get_users_by_status(board_id, InvitationStatus.PENDING)

    async def check_user_access(
        self,
        board_id: UUID,
        user_id: UUID
    ) -> bool:
        """Validates if a user has accepted access to a board"""
        try:
            board_user = await self.get_by_board_and_user(board_id, user_id)
            return board_user is not None and board_user.status == InvitationStatus.ACCEPTED
        except Exception:
            return False

    async def get_pending_invitations_for_user(self, user_id: UUID) -> List[BoardUser]:
        """Get all pending invitations for a specific user"""
        try:
            stmt = (
                select(BoardUser)
                .where(
                    and_(
                        BoardUser.user_id == user_id,
                        BoardUser.status == InvitationStatus.PENDING
                    )
                )
                .options(selectinload(BoardUser.board))
            )
            result = await self.session.execute(stmt)
            return result.scalars().all()
        except SQLAlchemyError as e:
            raise DataBaseError(f"Failed to get pending invitations: {str(e)}")
