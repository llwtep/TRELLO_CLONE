from pydantic import BaseModel
import uuid


class ListCreate(BaseModel):
    title: str
    position: int = 0


class ListUpdate(BaseModel):
    title: str | None = None
    position: int | None = None


class ListOut(BaseModel):
    id: uuid.UUID
    title: str
    position: int
    board_id: uuid.UUID

    class Config:
        from_attributes = True
