from fastapi import APIRouter, HTTPException, Request, Response, Cookie, Depends
from fastapi.responses import HTMLResponse
from starlette.responses import JSONResponse

from app.schemas.UserSchema import UserCreate, UserSignIn
from app.services.AuthService import AuthService
from app.api.deps import get_uow, get_current_user
from app.core.unitOfWork import UnitOfWork

authRouter = APIRouter(prefix="/auth", tags=["auth"])




@authRouter.post(
    "/signup",
    summary="Register new user",
    description="Registers a new unverified user and sends verification email.",
    responses={201: {"description": "User created"}}
)
async def signup(user_in: UserCreate, uow: UnitOfWork = Depends(get_uow)):
    service = AuthService(uow)
    await service.sign_up(user_in)
    return JSONResponse(
        status_code=201,
        content={"msg": "User created, check email"}
    )



@authRouter.get(
    "/verify",
    response_class=HTMLResponse,
    summary="Verify email"
)
async def verification(token: str, uow: UnitOfWork = Depends(get_uow)):
    service = AuthService(uow)
    await service.verification_process(token)

    return HTMLResponse("<h1>Email successfully verified!</h1>", status_code=200)



@authRouter.post(
    "/login",
    summary="User login",
    description="Authenticates user and issues access/refresh JWT tokens."
)
async def signin(user_in: UserSignIn, response: Response, uow: UnitOfWork = Depends(get_uow)):
    service = AuthService(uow)
    payload = await service.signin(user_in)

    response.set_cookie(
        key="access_token",
        value=payload["access_token"],
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 15
    )
    response.set_cookie(
        key="refresh_token",
        value=payload["refresh_token"],
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 60 * 24 * 7
    )

    return {"msg": "login successful"}



@authRouter.post(
    "/refresh",
    summary="Refresh access token"
)
async def refresh(
    response: Response,
    refresh_token: str = Cookie(None),
    uow: UnitOfWork = Depends(get_uow)
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    service = AuthService(uow)
    new_access = await service.refresh_token(refresh_token)

    response.set_cookie(
        key="access_token",
        value=new_access,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=60 * 15
    )

    return {"msg": "Access token refreshed"}



@authRouter.get("/me")
async def me_data(current_user=Depends(get_current_user)):
    return current_user



@authRouter.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"msg": "Logged out successfully"}
