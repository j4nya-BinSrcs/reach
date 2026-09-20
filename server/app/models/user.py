"""User domain model."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class User(BaseModel):
    """A registered REACH user."""

    id: Optional[int] = None
    email: str
    name: str
    password_hash: str = Field(default="", exclude=True)
    created_at: Optional[datetime] = None


class UserCreate(BaseModel):
    """Request body for signing up."""

    email: str = Field(..., min_length=3, max_length=254)
    name: str = Field(..., min_length=2, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def _email_format(cls, value: str) -> str:
        if "@" not in value or "." not in value.split("@")[-1]:
            raise ValueError("Invalid email format")
        return value


class UserLogin(BaseModel):
    """Request body for signing in."""

    email: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=1)


class UserResponse(BaseModel):
    """Public user payload."""

    id: int
    email: str
    name: str
    created_at: datetime


class AuthResponse(BaseModel):
    """Returned after successful signup or signin."""

    token: str
    user: UserResponse


class TokenPayload(BaseModel):
    """Decoded JWT payload."""

    sub: int  # user id
    email: str
    exp: int
