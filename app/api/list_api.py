from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse
from uuid import UUID

from app.api.deps import get_uow
from app.core.unitOfWork import UnitOfWork
from app.services.ListService import ListService
from app.schemas.ListSchema import (
    ListCreate,
    ListUpdate,
    ListOut
)
from app.services.WebSocketManager import WebSocketManager
from app.api.websocket_api import get_ws_manager

listRouter = APIRouter(prefix="/boards/{board_id}/lists", tags=["lists"])


@listRouter.post("", response_model=ListOut, status_code=201)
async def create_list(
        board_id: UUID,
        data: ListCreate,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = ListService(uow, ws)
    return await service.create_list(board_id, data)


@listRouter.get("", response_model=list[ListOut])
async def get_lists(
        board_id: UUID,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = ListService(uow, ws)
    return await service.get_board_lists(board_id)


@listRouter.patch("/{list_id}", response_model=ListOut)
async def update_list(
        board_id: UUID,
        list_id: UUID,
        data: ListUpdate,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = ListService(uow, ws)
    return await service.update_list(board_id=board_id, list_id=list_id, data=data)


@listRouter.delete("/{list_id}", status_code=204)
async def delete_list(
        board_id: UUID,
        list_id: UUID,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = ListService(uow, ws)
    if await service.delete_list(board_id=board_id, list_id=list_id):
        return JSONResponse(status_code=200, content={"detail": f"Successfully deleted: {list_id}"})
    return JSONResponse(status_code=400, content={"detail": f"Failed to delete: {list_id}"})


@listRouter.patch("/{list_id}/reorder", response_model=ListOut)
async def reorder_list(
        board_id: UUID,
        list_id: UUID,
        new_position: int,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = ListService(uow, ws)
    return await service.reorder_list(board_id=board_id, list_id=list_id, new_position=new_position)
