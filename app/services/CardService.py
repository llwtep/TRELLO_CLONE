from uuid import UUID
from app.core.unitOfWork import UnitOfWork
from app.schemas.CardSchema import CardCreate, CardOut, CardUpdate
from app.core.exceptions import CardNotFound, ListNotFound
from app.database.models.CardModel import CardModel


from app.services.WebSocketManager import WebSocketManager

class CardService:
    def __init__(self, uow: UnitOfWork, ws: WebSocketManager):
        self.uow = uow
        self.ws = ws

    async def create_card(self, list_id: UUID, data: CardCreate, author_id: UUID = None):
        async with self.uow() as uow:
            # Check if list exists
            list_item = await uow.list.get_by_id(list_id)
            if not list_item:
                raise ListNotFound("List not found")

            # Create card
            card = await uow.card.create_card(
                list_id=list_id,
                data=data.model_dump(),
                author_id=author_id
            )
            card_out = CardOut.model_validate(card)
            
            # Need board_id to broadcast. List has board_id.
            # Assuming we have list_item from check above.
            await self.ws.broadcast(list_item.board_id, {
                "type": "CARD_CREATED",
                "payload": card_out.model_dump(mode='json')
            })
            return card_out

    async def get_list_cards(self, list_id: UUID):
        async with self.uow() as uow:
            # Check if list exists? optional, but good for error reporting.
            # BaseRepo get_by_id doesn't fail if not found, just returns None.
            # skipping list check for performance, returning empty list if list doesn't exist is effectively same for simple gets?
            # But correct REST is 404 if list doesn't exist.
            list_item = await uow.list.get_by_id(list_id)
            if not list_item:
                raise ListNotFound("List not found")

            cards = await uow.card.get_list_cards(list_id)
            return [CardOut.model_validate(card) for card in cards]

    async def update_card(self, card_id: UUID, data: CardUpdate):
        async with self.uow() as uow:
            card = await uow.card.get_by_id(card_id)
            if not card:
                raise CardNotFound("Card not found")

            # If moving to another list, check if that list exists
            if data.list_id:
                target_list = await uow.list.get_by_id(data.list_id)
                if not target_list:
                    raise ListNotFound("Target list not found")

            updated_card_model = await uow.card.update_card(card, data.model_dump(exclude_unset=True))
            updated_card = CardOut.model_validate(updated_card_model)
            
            # Use board_id from list
            list_item = await uow.list.get_by_id(card.list_id)
            if list_item:
                 await self.ws.broadcast(list_item.board_id, {
                    "type": "CARD_UPDATED",
                    "payload": updated_card.model_dump(mode='json')
                })
            
            return updated_card

    async def delete_card(self, card_id: UUID):
        async with self.uow() as uow:
            card = await uow.card.get_by_id(card_id)
            if not card:
                raise CardNotFound("Card not found")
            list_item = await uow.list.get_by_id(card.list_id)
            board_id = list_item.board_id if list_item else None
            
            await uow.card.delete(card)
            
            if board_id:
                await self.ws.broadcast(board_id, {
                    "type": "CARD_DELETED",
                    "payload": {"id": str(card_id)}
                })
            return True

    async def move_card(self, card_id: UUID, new_list_id: UUID, new_position: int):
        async with self.uow() as uow:
            card = await uow.card.get_by_id(card_id)
            if not card:
                raise CardNotFound("Card not found")
            
            old_list_id = card.list_id
            old_position = card.position

            # Get board_id for broadcasting
            current_list = await uow.list.get_by_id(old_list_id)
            if not current_list:
                raise ListNotFound("Current list not found")
            board_id = current_list.board_id

            # Case 1: Reordering within the same list
            if old_list_id == new_list_id:
                if old_position == new_position:
                    return CardOut.model_validate(card)
                
                if new_position > old_position:
                    await uow.card.shift_positions(old_list_id, old_position + 1, new_position, -1)
                else:
                    await uow.card.shift_positions(old_list_id, new_position, old_position - 1, 1)
                
                card.position = new_position
            
            # Case 2: Moving to a different list
            else:
                target_list = await uow.list.get_by_id(new_list_id)
                if not target_list:
                    raise ListNotFound("Target list not found")
                
                # Check if moving between boards? (Optional, assume lists are on same board or allowed)
                # If strict: if target_list.board_id != board_id: raise ...
                
                # Shift cards in OLD list (close gap)
                await uow.card.shift_positions_from(old_list_id, old_position + 1, -1)
                
                # Shift cards in NEW list (make space)
                await uow.card.shift_positions_from(new_list_id, new_position, 1)
                
                card.list_id = new_list_id
                card.position = new_position

            updated_card_model = await uow.card.update_card(card, {"list_id": new_list_id, "position": new_position})
            updated_card = CardOut.model_validate(updated_card_model)

            await self.ws.broadcast(board_id, {
                "type": "CARD_MOVED",
                "payload": updated_card.model_dump(mode='json')
            })
            return updated_card
