from fastapi import FastAPI
from app.api.auth_api import authRouter
from app.api.board_api import boardRouter
from app.api.list_api import listRouter
from app.api.card_api import cardRouter
from app.api.websocket_api import websocketRouter
from app.core.exception_handlers import register_exception_handlers
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router=authRouter)
app.include_router(router=boardRouter)
app.include_router(router=listRouter)
app.include_router(router=cardRouter)
app.include_router(router=websocketRouter)
register_exception_handlers(app)