from fastapi import APIRouter, HTTPException, status

from backend.models.user import UserCreate, UserResponse
from backend.services import firestore
from backend.utils.auth import (
    create_jwt_token,
    generate_api_key,
    hash_password,
    verify_password,
)

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserCreate):
    existing = await firestore.get_user_by_email(body.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    api_key = generate_api_key()
    password_hash = hash_password(body.password)
    user = await firestore.create_user(body.email, password_hash, api_key)

    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        api_key=user["api_key"],
        created_at=user["created_at"],
    )


class LoginRequest(UserCreate):
    pass


class LoginResponse(UserResponse):
    token: str


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    user = await firestore.get_user_by_email(body.email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_jwt_token(user["user_id"])
    return LoginResponse(
        user_id=user["user_id"],
        email=user["email"],
        api_key=user["api_key"],
        created_at=user["created_at"],
        token=token,
    )
