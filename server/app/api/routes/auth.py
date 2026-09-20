"""Auth API endpoints: signup, signin."""

import hashlib
import secrets
from datetime import datetime, timedelta, UTC

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel

from app.config import settings
from app.models.user import UserCreate, UserLogin, UserResponse, AuthResponse
from app.storage.database import session_connection
from app.storage.repositories import UserRepository

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    if salt is None:
        salt = secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 200_000)
    return derived.hex(), salt


def _verify_password(password: str, password_hash: str, salt: str) -> bool:
    derived, _ = _hash_password(password, salt)
    return derived == password_hash


def _make_token(user_id: int, email: str) -> str:
    import jwt

    expiry = datetime.now(UTC) + timedelta(minutes=settings.jwt_expiry_minutes)
    payload = {"sub": str(user_id), "email": email, "exp": int(expiry.timestamp())}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _decode_token(token: str) -> dict | None:
    import jwt

    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


class SignupRequest(BaseModel):
    email: str
    name: str
    password: str


class SigninRequest(BaseModel):
    email: str
    password: str


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(payload: SignupRequest, request: Request) -> AuthResponse:
    """Register a new user."""
    db_path = request.app.state.settings.database_absolute_path
    repo = UserRepository(db_path)

    existing = repo.get_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="Email already registered")

    password_hash, salt = _hash_password(payload.password)
    # Store hash as algorithm$salt$hash for simplicity
    stored = f"pbkdf2_sha256${salt}${password_hash}"
    user = repo.create_user(payload.email, payload.name, stored)

    token = _make_token(user.id, user.email)
    return AuthResponse(token=token, user=UserResponse(id=user.id, email=user.email, name=user.name, created_at=user.created_at))


@router.post("/signin")
async def signin(payload: SigninRequest, request: Request) -> AuthResponse:
    """Authenticate and return a token."""
    db_path = request.app.state.settings.database_absolute_path
    repo = UserRepository(db_path)

    user = repo.get_by_email(payload.email)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    parts = user.password_hash.split("$")
    if len(parts) != 3 or parts[0] != "pbkdf2_sha256":
        raise HTTPException(status_code=401, detail="Invalid password hash")

    salt = parts[1]
    expected_hash = parts[2]
    if not _verify_password(payload.password, expected_hash, salt):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = _make_token(user.id, user.email)
    return AuthResponse(token=token, user=UserResponse(id=user.id, email=user.email, name=user.name, created_at=user.created_at))


@router.get("/me", response_model=UserResponse)
async def get_me(request: Request) -> UserResponse:
    """Get current user from bearer token."""
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")

    token = auth_header[7:]
    payload = _decode_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Token expired or invalid")

    db_path = request.app.state.settings.database_absolute_path
    repo = UserRepository(db_path)
    user = repo.get_by_id(payload["sub"])
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(id=user.id, email=user.email, name=user.name, created_at=user.created_at)
