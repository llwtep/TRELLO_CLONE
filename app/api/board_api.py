from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import JSONResponse

from uuid import UUID
from app.api.deps import get_uow, get_current_user
from app.core.unitOfWork import UnitOfWork
from app.services.BoardService import BoardService
from app.schemas.BoardSchema import (
    BoardCreate,
    BoardUpdate,
    BoardOut,
    BoardFullOut
)

boardRouter = APIRouter(prefix="/boards", tags=["boards"])


@boardRouter.post("", response_model=BoardOut, status_code=201)
async def create_board(
        data: BoardCreate,
        current_user=Depends(get_current_user),
        uow: UnitOfWork = Depends(get_uow),
):
    service = BoardService(uow)
    return await service.create_board(current_user.id, data)


@boardRouter.get("", response_model=list[BoardOut])
async def get_boards(
        current_user=Depends(get_current_user),
        uow: UnitOfWork = Depends(get_uow),
):
    service = BoardService(uow)
    return await service.get_user_boards(current_user.id)


@boardRouter.get("/{board_id}", response_model=BoardFullOut)
async def get_board(
        board_id: UUID,
        current_user=Depends(get_current_user),
        uow: UnitOfWork = Depends(get_uow),
):
    service = BoardService(uow)
    return await service.get_board(owner_id=current_user.id, board_id=board_id)


@boardRouter.patch("/{board_id}", response_model=BoardOut)
async def update_board(
        board_id: UUID,
        data: BoardUpdate,
        current_user=Depends(get_current_user),
        uow: UnitOfWork = Depends(get_uow),
):
    service = BoardService(uow)
    return await service.update_board(board_id=board_id, owner_id=current_user.id, data=data)


@boardRouter.delete("/{board_id}", status_code=204)
async def delete_board(
        board_id: UUID,
        current_user=Depends(get_current_user),
        uow: UnitOfWork = Depends(get_uow),
):
    service = BoardService(uow)
    if await service.delete_board(board_id=board_id, owner_id=current_user.id):
        return JSONResponse(status_code=200, content={"detail": f"Successfully deleted: {board_id}"})
    return JSONResponse(status_code=400, content={"detail": f"Failed to delete: {board_id}"})
