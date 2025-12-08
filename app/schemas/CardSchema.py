from pydantic import BaseModel
import uuid
from datetime import datetime


class CardCreate(BaseModel):
    title: str
    description: str | None = None
    position: int = 0


class CardUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    position: int | None = None
    list_id: uuid.UUID | None = None


class CardOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str | None
    position: int
    list_id: uuid.UUID
    author_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
