from fastapi import APIRouter, Depends
from uuid import UUID
from app.api.deps import get_uow, get_current_user
from app.core.unitOfWork import UnitOfWork
from app.services.BoardUserService import BoardUserService
from app.services.WebSocketManager import WebSocketManager
from app.api.websocket_api import get_ws_manager
from app.schemas.BoardUserSchema import (
    InviteUserRequest,
    RespondToInvitationRequest,
    BoardUserOut,
    BoardMemberOut
)

inviteRouter = APIRouter(prefix="/boards", tags=["board-invitations"])


@inviteRouter.post("/{board_id}/invite", response_model=BoardUserOut, status_code=201)
async def invite_user_to_board(
    board_id: UUID,
    data: InviteUserRequest,
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
    ws_manager: WebSocketManager = Depends(get_ws_manager)
):
    """
    Invite a user to a board by email. Only the board owner can invite users.
    If the user was already invited, their status will be reset to 'pending'.
    """
    service = BoardUserService(uow, ws_manager)
    return await service.invite_user(
        board_id=board_id,
        invited_user_email=data.email,
        inviter_user_id=current_user.id
    )


@inviteRouter.post("/{board_id}/invite/respond", response_model=BoardUserOut)
async def respond_to_board_invitation(
    board_id: UUID,
    data: RespondToInvitationRequest,
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow),
    ws_manager: WebSocketManager = Depends(get_ws_manager)
):
    """
    Respond to a board invitation with 'accepted' or 'rejected'.
    When accepted, other users connected to the board via WebSocket will be notified.
    """
    service = BoardUserService(uow, ws_manager)
    return await service.respond_to_invitation(
        board_id=board_id,
        user_id=current_user.id,
        status=data.status
    )


@inviteRouter.get("/{board_id}/members", response_model=list[BoardMemberOut])
async def get_board_members(
    board_id: UUID,
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """
    Get all accepted members of a board.
    User must be the board owner or an accepted member to view this.
    """
    service = BoardUserService(uow)
    return await service.get_board_members(
        board_id=board_id,
        user_id=current_user.id
    )


@inviteRouter.get("/invitations/pending", response_model=list[BoardUserOut])
async def get_my_pending_invitations(
    current_user=Depends(get_current_user),
    uow: UnitOfWork = Depends(get_uow)
):
    """
    Get all pending board invitations for the current user.
    """
    service = BoardUserService(uow)
    return await service.get_pending_invitations(user_id=current_user.id)
