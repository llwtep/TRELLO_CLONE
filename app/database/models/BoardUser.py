from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from typing import TYPE_CHECKING
import uuid
from app.database.session import Base
from sqlalchemy.dialects.postgresql import UUID
import enum

if TYPE_CHECKING:
    from app.database.models.Board import Board
    from app.database.models.User import UserModel


class InvitationStatus(str, enum.Enum):
    """Enum for board invitation status"""
    PENDING = "pending"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    
    def __str__(self):
        """Return the lowercase value for proper database serialization"""
        return self.value


class BoardUser(Base):
    """Association table for board members/collaborators"""
    __tablename__ = "board_users"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    board_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("boards.id", ondelete="CASCADE"),
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String,
        default=InvitationStatus.PENDING.value,
        nullable=False
    )
    invited_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    
    # Relationships
    board: Mapped["Board"] = relationship("Board", back_populates="board_users")
    user: Mapped["UserModel"] = relationship("UserModel", foreign_keys=[user_id], back_populates="board_memberships")
    inviter: Mapped["UserModel"] = relationship("UserModel", foreign_keys=[invited_by])
