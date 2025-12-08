from collections import defaultdict
from typing import List, Dict, Any
from uuid import UUID

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        # Maps board_id -> List of active WebSockets
        self.active_connections: Dict[UUID, List[WebSocket]] = defaultdict(list)

    async def connect(self, board_id: UUID, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[board_id].append(websocket)

    def disconnect(self, board_id: UUID, websocket: WebSocket):
        if board_id in self.active_connections:
            if websocket in self.active_connections[board_id]:
                self.active_connections[board_id].remove(websocket)
            if not self.active_connections[board_id]:
                del self.active_connections[board_id]

    async def broadcast(self, board_id: UUID, message: Dict[str, Any]):
        if board_id in self.active_connections:
            # Iterate over a copy to avoid modification issues if disconnect happens concurrently
            # or if we want to handle dead connections here
            for connection in list(self.active_connections[board_id]):
                try:
                    await connection.send_json(message)
                except RuntimeError:
                    # Connection might be closed already
                    self.disconnect(board_id, connection)
                except Exception as e:
                    # Log error but don't stop broadcasting to others
                    print(f"Error broadcasting to client: {e}")
                    # Optionally disconnect
                    self.disconnect(board_id, connection)
