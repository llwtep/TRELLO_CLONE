from fastapi import APIRouter, Depends
from starlette.responses import JSONResponse
from uuid import UUID

from app.api.deps import get_uow, get_current_user
from app.core.unitOfWork import UnitOfWork
from app.services.CardService import CardService
from app.schemas.CardSchema import (
    CardCreate,
    CardUpdate,
    CardOut
)
from app.services.WebSocketManager import WebSocketManager
from app.api.websocket_api import get_ws_manager

cardRouter = APIRouter(tags=["cards"])


@cardRouter.post("/lists/{list_id}/cards", response_model=CardOut, status_code=201)
async def create_card(
        list_id: UUID,
        data: CardCreate,
        current_user=Depends(get_current_user),
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = CardService(uow, ws)
    # optionally use current_user.id as author_id
    return await service.create_card(list_id, data, author_id=current_user.id)


@cardRouter.get("/lists/{list_id}/cards", response_model=list[CardOut])
async def get_list_cards(
        list_id: UUID,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = CardService(uow, ws)
    return await service.get_list_cards(list_id)


@cardRouter.patch("/cards/{card_id}", response_model=CardOut)
async def update_card(
        card_id: UUID,
        data: CardUpdate,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = CardService(uow, ws)
    return await service.update_card(card_id=card_id, data=data)


@cardRouter.delete("/cards/{card_id}", status_code=204)
async def delete_card(
        card_id: UUID,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = CardService(uow, ws)
    if await service.delete_card(card_id=card_id):
        return JSONResponse(status_code=200, content={"detail": f"Successfully deleted: {card_id}"})
    return JSONResponse(status_code=400, content={"detail": f"Failed to delete: {card_id}"})


@cardRouter.patch("/cards/{card_id}/move", response_model=CardOut)
async def move_card(
        card_id: UUID,
        new_list_id: UUID,
        new_position: int,
        uow: UnitOfWork = Depends(get_uow),
        ws: WebSocketManager = Depends(get_ws_manager)
):
    service = CardService(uow, ws)
    return await service.move_card(card_id=card_id, new_list_id=new_list_id, new_position=new_position)
