from pydantic import BaseModel
import uuid
from app.schemas.ListSchema import ListOut
from app.schemas.CardSchema import CardOut

class BoardCreate(BaseModel):
    title: str


class BoardUpdate(BaseModel):
    title: str | None = None


class BoardOut(BaseModel):
    id: uuid.UUID
    title: str
    owner_id: uuid.UUID

    class Config:
        from_attributes = True


class ListFull(ListOut):
    cards: list[CardOut] = []

    class Config:
        from_attributes = True


class BoardFullOut(BoardOut):
    lists: list[ListFull] = []

    class Config:
        from_attributes = True
