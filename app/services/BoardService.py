from uuid import UUID
from app.core.unitOfWork import UnitOfWork
from app.core.unitOfWork import UnitOfWork
from app.schemas.BoardSchema import BoardCreate, BoardOut, BoardUpdate, BoardFullOut
from app.core.exceptions import BoardNotFound


class BoardService:
    def __init__(self, uow: UnitOfWork):
        self.uow = uow

    async def create_board(self, owner_id: UUID, data: BoardCreate):
        async with self.uow() as uow:
            board = await uow.board.create_board(owner_id=owner_id,
                                                 title=data.title)
            return BoardOut.model_validate(board)

    async def get_user_boards(self, owner_id: UUID):
        async with (self.uow() as uow):
            boards = await uow.board.get_user_boards(user_id=owner_id)
            return [BoardOut.model_validate(board) for board in boards]

    async def get_board(self, owner_id: UUID, board_id: UUID):
        async with self.uow() as uow:
            board = await uow.board.get_board_with_details(board_id=board_id,
                                                           user_id=owner_id)
            if not board:
                raise BoardNotFound("Board not found")
            
            # Sort lists and cards manually since relationships might not be ordered
            # Board.lists is a list of objects.
            # We can sort them in place or rely on Pydantic to not sort.
            # Pydantic preserves order of list.
            
            # Use BoardFullOut to validate, but we might want to ensure sorting first.
            if board.lists:
                board.lists.sort(key=lambda x: x.position)
                for lst in board.lists:
                    if lst.cards:
                        lst.cards.sort(key=lambda x: x.position)
            
            return BoardFullOut.model_validate(board)

    async def update_board(self, owner_id: UUID, board_id: UUID, data: BoardUpdate):
        async with self.uow() as uow:
            board = await uow.board.get_board(board_id, owner_id)
            if not board:
                raise BoardNotFound("Board not found")

            updated_board = await uow.board.update_board(board, data.model_dump())
            return BoardOut.model_validate(updated_board)

    async def delete_board(self, owner_id: UUID, board_id: UUID):
        async with self.uow() as uow:
            board = await uow.board.get_board(board_id, owner_id)
            if not board:
                raise BoardNotFound("Board not found")
            await uow.board.delete(board)
            return True
