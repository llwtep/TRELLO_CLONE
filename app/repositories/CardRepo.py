from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID
from app.database.models.CardModel import CardModel
from app.repositories.BaseRepo import BaseRepository


class CardRepository(BaseRepository):
    def __init__(self, session):
        super().__init__(CardModel, session)

    async def get_list_cards(self, list_id: UUID):
        stmt = select(CardModel).where(CardModel.list_id == list_id).order_by(CardModel.position)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def create_card(self, list_id: UUID, data: dict, author_id: UUID = None) -> CardModel:
        new_card = CardModel(list_id=list_id, author_id=author_id, **data)
        self.session.add(new_card)
        await self.session.flush()
        await self.session.refresh(new_card)
        return new_card

    async def update_card(self, card: CardModel, data: dict) -> CardModel:
        for key, value in data.items():
            if hasattr(card, key) and value is not None:
                setattr(card, key, value)
        await self.session.flush()
        return card

    async def shift_positions(self, list_id: UUID, start_pos: int, end_pos: int, shift: int):
        stmt = (
            update(CardModel)
            .where(CardModel.list_id == list_id)
            .where(CardModel.position >= start_pos)
            .where(CardModel.position <= end_pos)
            .values(position=CardModel.position + shift)
        )
        await self.session.execute(stmt)
        await self.session.flush()

    async def shift_positions_from(self, list_id: UUID, start_pos: int, shift: int):
        """Shifts all cards from start_pos onwards"""
        stmt = (
            update(CardModel)
            .where(CardModel.list_id == list_id)
            .where(CardModel.position >= start_pos)
            .values(position=CardModel.position + shift)
        )
        await self.session.execute(stmt)
        await self.session.flush()
