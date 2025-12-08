from uuid import UUID
from app.core.unitOfWork import UnitOfWork
from app.schemas.ListSchema import ListCreate, ListOut, ListUpdate
from app.core.exceptions import ListNotFound
from app.database.models.ListModel import ListModel


from app.services.WebSocketManager import WebSocketManager

class ListService:
    def __init__(self, uow: UnitOfWork, ws: WebSocketManager):
        self.uow = uow
        self.ws = ws

    async def create_list(self, board_id: UUID, data: ListCreate):
        async with self.uow() as uow:
            # We pass position if present, else default from model/repo logic might handle it.
            # However, repo takes position as int = 0.
            # Schema has position default 0.
            list_item = await uow.list.create_list(
                board_id=board_id,
                title=data.title,
                position=data.position
            )
            created_list = ListOut.model_validate(list_item)
            await self.ws.broadcast(board_id, {
                "type": "LIST_CREATED",
                "payload": created_list.model_dump(mode='json')
            })
            return created_list

    async def get_board_lists(self, board_id: UUID):
        async with self.uow() as uow:
            lists = await uow.list.get_board_lists(board_id=board_id)
            return [ListOut.model_validate(lst) for lst in lists]

    async def update_list(self, board_id: UUID, list_id: UUID, data: ListUpdate):
        async with self.uow() as uow:
            # We might want to verify board_id matches?
            # Repo's get_by_id doesn't check board_id, but usually we should.
            # For now I will follow BoardService pattern, which does check owner matching in some way if needed.
            # But here lists belong to boards.
            # BaseRepo has get_by_id. ListRepo inherits it.
            # Let's see if ListRepo has get_list equivalent checking board_id.
            # It does not create one, just inherits get_by_id.
            # So we just get by id.
            # If we want to ensure it belongs to the board, we check list_item.board_id == board_id.
            
            list_item = await uow.list.get_by_id(list_id)
            if not list_item:
                raise ListNotFound("List not found")
            
            if list_item.board_id != board_id:
                 raise ListNotFound("List not found in this board")

            updated_list_model = await uow.list.update_list(list_item, data.model_dump(exclude_unset=True))
            updated_list = ListOut.model_validate(updated_list_model)
            
            await self.ws.broadcast(board_id, {
                "type": "LIST_UPDATED",
                "payload": updated_list.model_dump(mode='json')
            })
            return updated_list

    async def delete_list(self, board_id: UUID, list_id: UUID):
        async with self.uow() as uow:
            list_item = await uow.list.get_by_id(list_id)
            if not list_item:
                raise ListNotFound("List not found")
            
            if list_item.board_id != board_id:
                 raise ListNotFound("List not found in this board")

            await uow.list.delete(list_item)
            await self.ws.broadcast(board_id, {
                "type": "LIST_DELETED",
                "payload": {"id": str(list_id)}
            })
            return True

    async def reorder_list(self, board_id: UUID, list_id: UUID, new_position: int):
        async with self.uow() as uow:
            list_item = await uow.list.get_by_id(list_id)
            if not list_item or list_item.board_id != board_id:
                raise ListNotFound("List not found")

            old_position = list_item.position
            if old_position == new_position:
                return ListOut.model_validate(list_item)

            if new_position > old_position:
                # Shift items between old+1 and new DOWN
                await uow.list.shift_positions(board_id, old_position + 1, new_position, -1)
            else:
                # Shift items between new and old-1 UP
                await uow.list.shift_positions(board_id, new_position, old_position - 1, 1)

            updated_list_model = await uow.list.update_list(list_item, {"position": new_position})
            updated_list = ListOut.model_validate(updated_list_model)
            
            await self.ws.broadcast(board_id, {
                "type": "LIST_REORDERED",
                "payload": updated_list.model_dump(mode='json')
            })
            return updated_list
