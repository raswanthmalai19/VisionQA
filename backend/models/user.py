from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)


class UserResponse(BaseModel):
    user_id: str
    email: str
    api_key: str
    created_at: datetime


class UserInDB(BaseModel):
    user_id: str
    email: str
    password_hash: str
    api_key: str
    created_at: datetime
