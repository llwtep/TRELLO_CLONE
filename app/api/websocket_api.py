from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, status

from app.api.deps import get_uow
from app.core.exceptions import UserNotAuthenticated
from app.core.unitOfWork import UnitOfWork
from app.services.AuthService import AuthService
from app.services.BoardService import BoardService
from app.services.WebSocketManager import WebSocketManager

websocketRouter = APIRouter(tags=["websockets"])

# Singleton instance or dependency injection?
# For simplicity, we'll use a global instance here tailored for dependency injection
manager = WebSocketManager()


def get_ws_manager():
    return manager


async def get_current_user_ws(
        websocket: WebSocket,
        uow: UnitOfWork = Depends(get_uow)
):
    token = websocket.cookies.get("access_token")
    if not token:
        # Try query param as fallback
        token = websocket.query_params.get("token")

    if not token:
        return None

    service = AuthService(uow)
    try:
        user = await service.get_current_user(access_token=token)
        return user
    except Exception:
        return None


@websocketRouter.websocket("/ws/board/{board_id}")
async def websocket_endpoint(
        websocket: WebSocket,
        board_id: UUID,
        uow: UnitOfWork = Depends(get_uow),
        manager: WebSocketManager = Depends(get_ws_manager)
):
    # Authenticate
    user = await get_current_user_ws(websocket, uow)
    if not user:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Verify Board Access
    board_service = BoardService(uow)
    try:
        # Check if board exists and belongs to user
        await board_service.get_board(owner_id=user.id, board_id=board_id)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # Connect
    await manager.connect(board_id, websocket)
    try:
        while True:
            # Keep alive and listen for client messages if any (e.g. ping)
            # We don't necessarily expect messages from client for this implementation,
            # but we need to keep the loop running.
            data = await websocket.receive_text()
            # process data if needed
    except WebSocketDisconnect:
        manager.disconnect(board_id, websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(board_id, websocket)
