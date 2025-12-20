from uuid import UUID
from typing import List, Optional
from app.core.unitOfWork import UnitOfWork
from app.schemas.BoardUserSchema import BoardUserOut, BoardMemberOut
from app.core.exceptions import (
    BoardNotFound,
    UserNotFoundError,
    PermissionDenied,
    InvitationNotFound
)
from app.database.models.BoardUser import InvitationStatus
from app.services.WebSocketManager import WebSocketManager


class BoardUserService:
    def __init__(self, uow: UnitOfWork, ws_manager: Optional[WebSocketManager] = None):
        self.uow = uow
        self.ws_manager = ws_manager

    async def invite_user(
        self,
        board_id: UUID,
        invited_user_email: str,
        inviter_user_id: UUID
    ) -> BoardUserOut:
        """
        Invite a user to a board by email. Only the board owner can invite users.
        If invitation already exists, updates status back to 'pending'.
        """
        async with self.uow() as uow:
            # Verify board exists and inviter is the owner
            board = await uow.board.get_by_id(board_id)
            if not board:
                raise BoardNotFound("Board not found")
            
            if board.owner_id != inviter_user_id:
                raise PermissionDenied("Only the board owner can invite users")
            
            # Look up invited user by email
            invited_user = await uow.users.get_by_email(invited_user_email)
            if not invited_user:
                raise UserNotFoundError(f"No user found with email: {invited_user_email}")
            
            # Prevent owner from inviting themselves
            if invited_user.id == inviter_user_id:
                raise PermissionDenied("Cannot invite yourself to the board")
            
            # Create or update invitation
            board_user = await uow.board_user.create_or_update_board_user(
                board_id=board_id,
                user_id=invited_user.id,
                invited_by=inviter_user_id,
                status="pending"
            )
            
            # Notify the invited user in real-time
            if self.ws_manager:
                await self.ws_manager.send_to_user(invited_user.id, {
                    "type": "INVITATION_RECEIVED",
                    "payload": {
                        "id": str(board_user.id),
                        "board_id": str(board_id),
                        "board_title": board.title,
                        "user_id": str(invited_user.id),
                        "invited_by": str(inviter_user_id),
                        "status": "pending"
                    }
                })
            
            return BoardUserOut.model_validate(board_user)

    async def respond_to_invitation(
        self,
        board_id: UUID,
        user_id: UUID,
        status: str
    ) -> BoardUserOut:
        """
        Allow an invited user to accept or reject a board invitation.
        Broadcasts WebSocket event if accepted.
        """
        # Validate status
        if status not in ["accepted", "rejected"]:
            raise ValueError("Status must be 'accepted' or 'rejected'")
        
        status_enum = "accepted" if status == "accepted" else "rejected"
        
        async with self.uow() as uow:
            # Get the invitation
            board_user = await uow.board_user.get_by_board_and_user(board_id, user_id)
            if not board_user:
                raise InvitationNotFound("No invitation found for this board")
            
            # Update the status
            updated_board_user = await uow.board_user.update_status(
                board_user,
                status_enum
            )
            
            # Broadcast WebSocket event if accepted
            if status == "accepted" and self.ws_manager:
                await self.ws_manager.broadcast(board_id, {
                    "type": "USER_JOINED",
                    "user_id": str(user_id),
                    "board_id": str(board_id)
                })
            
            return BoardUserOut.model_validate(updated_board_user)

    async def get_board_members(
        self,
        board_id: UUID,
        user_id: UUID
    ) -> List[BoardMemberOut]:
        """
        Get all accepted members of a board.
        User must be owner or accepted member to view.
        """
        async with self.uow() as uow:
            # Check if user has access (owner or accepted member)
            has_access = await self.check_board_access(board_id, user_id)
            if not has_access:
                raise PermissionDenied("You don't have access to this board")
            
            # Get accepted members
            board_users = await uow.board_user.get_accepted_users(board_id)
            
            # Convert to output schema with user details
            members = []
            for board_user in board_users:
                if board_user.user:
                    members.append(BoardMemberOut(
                        id=board_user.id,
                        user_id=board_user.user_id,
                        username=board_user.user.username,
                        email=board_user.user.email,
                        status=board_user.status.value,
                        invited_by=board_user.invited_by
                    ))
            
            return members

    async def get_pending_invitations(self, user_id: UUID) -> List[BoardUserOut]:
        """Get all pending invitations for a specific user"""
        async with self.uow() as uow:
            invitations = await uow.board_user.get_pending_invitations_for_user(user_id)
            return [BoardUserOut.model_validate(inv) for inv in invitations]

    async def check_board_access(
        self,
        board_id: UUID,
        user_id: UUID
    ) -> bool:
        """
        Check if user has access to a board.
        Returns True if user is the owner OR has accepted invitation.
        """
        async with self.uow() as uow:
            # Check if user is the board owner
            board = await uow.board.get_by_id(board_id)
            if board and board.owner_id == user_id:
                return True
            
            # Check if user has accepted access
            return await uow.board_user.check_user_access(board_id, user_id)
