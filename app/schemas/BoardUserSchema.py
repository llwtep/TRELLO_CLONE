from pydantic import BaseModel
from uuid import UUID
from typing import Literal


class InviteUserRequest(BaseModel):
    """Request schema for inviting a user to a board"""
    user_id: UUID


class RespondToInvitationRequest(BaseModel):
    """Request schema for responding to a board invitation"""
    status: Literal["accepted", "rejected"]


class BoardUserOut(BaseModel):
    """Output schema for BoardUser"""
    id: UUID
    board_id: UUID
    user_id: UUID
    status: str
    invited_by: UUID

    class Config:
        from_attributes = True


class BoardMemberOut(BaseModel):
    """Extended schema with user details for board members"""
    id: UUID
    user_id: UUID
    username: str
    email: str
    status: str
    invited_by: UUID

    class Config:
        from_attributes = True
