from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey
from typing import List
import uuid
from app.database.session import Base
from sqlalchemy.dialects.postgresql import UUID

class Board(Base):
    __tablename__ = "boards"
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    owner = relationship("UserModel", back_populates="boards")
    lists: Mapped[List["List"]] = relationship(
        "ListModel", back_populates="board", cascade="all, delete-orphan"
    )
