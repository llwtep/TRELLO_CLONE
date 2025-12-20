from collections import defaultdict
from typing import List, Dict, Any
from uuid import UUID

from fastapi import WebSocket


class WebSocketManager:
    def __init__(self):
        # Maps board_id -> List of active WebSockets (for board-level events)
        self.active_connections: Dict[UUID, List[WebSocket]] = defaultdict(list)
        # Maps user_id -> List of active WebSockets (for user-level notifications)
        self.user_connections: Dict[UUID, List[WebSocket]] = defaultdict(list)

    # Board-level connections
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
            for connection in list(self.active_connections[board_id]):
                try:
                    await connection.send_json(message)
                except RuntimeError:
                    self.disconnect(board_id, connection)
                except Exception as e:
                    print(f"Error broadcasting to client: {e}")
                    self.disconnect(board_id, connection)

    # User-level connections for personal notifications (invitations, etc.)
    async def connect_user(self, user_id: UUID, websocket: WebSocket):
        await websocket.accept()
        self.user_connections[user_id].append(websocket)

    def disconnect_user(self, user_id: UUID, websocket: WebSocket):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]

    async def send_to_user(self, user_id: UUID, message: Dict[str, Any]):
        """Send a notification to a specific user across all their connections"""
        if user_id in self.user_connections:
            for connection in list(self.user_connections[user_id]):
                try:
                    await connection.send_json(message)
                except RuntimeError:
                    self.disconnect_user(user_id, connection)
                except Exception as e:
                    print(f"Error sending to user {user_id}: {e}")
                    self.disconnect_user(user_id, connection)

