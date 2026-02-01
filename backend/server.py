from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, UploadFile, File, Query
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
from starlette.middleware.base import BaseHTTPMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
import re
import uuid
from datetime import datetime, timedelta
import json
from jose import jwt, JWTError
import bcrypt

# Импортируем нашу систему БД
from database import get_db, init_db, close_db, get_db_type

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security / Auth
security = HTTPBearer()
JWT_SECRET = os.getenv("JWT_SECRET", "dev_secret_change_me")
JWT_ALG = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ThemeUpdate(BaseModel):
    mode: str = Field(..., description="light или dark")
    palette: str = Field(..., description="blue, green, purple для light; dark-blue, dark-green, dark-purple для dark")

class UserThemeResponse(BaseModel):
    mode: str
    palette: str

class UserPublic(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None

# Валидация: username только латиница, цифры, подчёркивание; 3–30 символов
USERNAME_PATTERN = re.compile(r"^[a-zA-Z0-9_]{3,30}$")
# Упрощённая проверка легитимности почты (формат)
EMAIL_PATTERN = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class RegisterInput(BaseModel):
    username: str
    email: str  # проверяется validator'ом
    password: str

    @field_validator("username")
    @classmethod
    def username_english_only(cls, v: str) -> str:
        if not v or len(v) < 3 or len(v) > 30:
            raise ValueError("Username must be 3–30 characters")
        if not USERNAME_PATTERN.match(v):
            raise ValueError("Username must contain only English letters, numbers and underscore")
        return v.strip()

    @field_validator("email")
    @classmethod
    def email_valid(cls, v: str) -> str:
        if not v or len(v) > 255:
            raise ValueError("Invalid email")
        if not EMAIL_PATTERN.match(v.strip()):
            raise ValueError("Invalid email format")
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if not v or len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

class LoginInput(BaseModel):
    username_or_email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_photo: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    birth_date: Optional[str] = None
    phone: Optional[str] = None
    work_hours: Optional[str] = None
    profile_accent: Optional[str] = None
    community_name: Optional[str] = None
    community_description: Optional[str] = None

class UserSearchResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    status: str = "offline"  # online | inactive | offline

class FriendAction(BaseModel):
    user_id: int

class MessageSend(BaseModel):
    conversation_id: Optional[int] = None
    to_user_id: Optional[int] = None
    content: str

# Post Models
class PostCreate(BaseModel):
    content: str
    images: List[str] = []
    tag_ids: List[int] = []

class PostResponse(BaseModel):
    id: int
    author_id: int
    author_username: str
    author_avatar: Optional[str] = None
    content: str
    images: List[str] = []
    likes: int = 0
    comments: int = 0
    liked: bool = False
    created_at: datetime
    tags: List[dict] = []

class CommentCreate(BaseModel):
    content: str

class CommentResponse(BaseModel):
    id: int
    post_id: int
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    content: str
    created_at: datetime

class TagResponse(BaseModel):
    id: int
    name: str
    subscribed: bool = False

class UserProfileUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_photo: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    birth_date: Optional[str] = None
    phone: Optional[str] = None
    work_hours: Optional[str] = None
    profile_accent: Optional[str] = None
    community_name: Optional[str] = None
    community_description: Optional[str] = None

class ImageUpload(BaseModel):
    image_url: str  # URL или base64 data URL

class AdminUserUpdate(BaseModel):
    is_banned: Optional[bool] = None
    is_admin: Optional[bool] = None

class UserFullProfile(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    location: Optional[str] = None
    birth_date: Optional[str] = None
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_online: bool = True

# Максимальный limit для пагинации (защита от тяжёлых запросов)
PAGINATION_MAX_LIMIT = 100

# Startup event
@app.on_event("startup")
async def startup_event():
    """Инициализация при старте приложения"""
    if os.getenv("JWT_SECRET") in (None, "", "dev_secret_change_me"):
        logging.warning(
            "JWT_SECRET is default or unset. Set JWT_SECRET in production!"
        )
    await init_db()
    db_type = get_db_type()
    logging.info(f"Database initialized: {db_type}")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Закрытие пула подключений при остановке"""
    await close_db()
    logging.info("Database connections closed")

def hash_password(password: str) -> str:
    """Хеширует пароль используя bcrypt"""
    # Конвертируем пароль в bytes
    password_bytes = password.encode('utf-8')
    # Генерируем соль и хешируем пароль
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    # Возвращаем как строку
    return hashed.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    """Проверяет пароль против хеша"""
    try:
        password_bytes = password.encode('utf-8')
        hash_bytes = password_hash.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hash_bytes)
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)

def get_status_from_last_seen(last_seen) -> str:
    """online = последние 5 мин, inactive = 5–30 мин, offline = >30 мин или NULL."""
    if last_seen is None:
        return "offline"
    try:
        now = datetime.utcnow()
        ls = last_seen.replace(tzinfo=None) if getattr(last_seen, "tzinfo", None) else last_seen
        delta = (now - ls).total_seconds()
        if delta <= 300:
            return "online"
        if delta <= 1800:
            return "inactive"
    except Exception:
        pass
    return "offline"

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Получить ID текущего пользователя из JWT"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
        else:
            async with conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    raise HTTPException(status_code=401, detail="User not found")
        # Обновляем last_seen при каждом запросе — тогда статус «В сети» реальный
        if db_type == 'postgresql':
            await conn.execute("UPDATE users SET last_seen = NOW() WHERE id = $1", user_id)
        else:
            await conn.execute("UPDATE users SET last_seen = datetime('now') WHERE id = ?", (user_id,))
            await conn.commit()
    return user_id


async def get_current_admin(user_id: int = Depends(get_current_user_id)) -> int:
    """Только для администраторов; иначе 403. ВРЕМЕННО: всем авторизованным даём доступ к админке."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            r = await conn.fetchrow("SELECT is_admin, is_banned FROM users WHERE id = $1", user_id)
            row = dict(r) if r else None
        else:
            async with conn.execute("SELECT is_admin, is_banned FROM users WHERE id = ?", (user_id,)) as cursor:
                r = await cursor.fetchone()
                row = {"is_admin": bool(r[0]) if r and len(r) > 0 else False, "is_banned": bool(r[1]) if r and len(r) > 1 else False} if r else None
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        if row.get("is_banned"):
            raise HTTPException(status_code=403, detail="Account is banned")
        # ВРЕМЕННО отключено: любой авторизованный = админ. Вернуть проверку: if not row.get("is_admin"): raise ...
        # if not row.get("is_admin"):
        #     raise HTTPException(status_code=403, detail="Admin access required")
    return user_id


async def get_tags_for_posts(conn, db_type: str, post_ids: List[int]):
    """Возвращает словарь post_id -> [{"id": tag_id, "name": tag_name}]"""
    if not post_ids:
        return {}
    ids_placeholders = ",".join(["$" + str(i+1) for i in range(len(post_ids))]) if db_type == 'postgresql' else ",".join(["?"] * len(post_ids))
    params = tuple(post_ids)
    out = {pid: [] for pid in post_ids}
    if db_type == 'postgresql':
        rows = await conn.fetch(
            f"SELECT pt.post_id, t.id, t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id IN ({ids_placeholders})",
            *params
        )
        for r in rows:
            out[r["post_id"]].append({"id": r["id"], "name": r["name"]})
    else:
        async with conn.execute(
            f"SELECT pt.post_id, t.id, t.name FROM post_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.post_id IN ({ids_placeholders})",
            params
        ) as cursor:
            async for r in cursor:
                out[r[0]].append({"id": r[1], "name": r[2]})
    return out


# API Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

# ===================== Auth API =====================
@api_router.post("/auth/register", response_model=UserPublic)
async def register_user(data: RegisterInput):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            exists = await conn.fetchrow(
                "SELECT id FROM users WHERE username = $1 OR email = $2",
                data.username, data.email
            )
            if exists:
                raise HTTPException(status_code=400, detail="Username or email already in use")
            pw_hash = hash_password(data.password)
        else:
            async with conn.execute(
                "SELECT id FROM users WHERE username = ? OR email = ?",
                (data.username, data.email)
            ) as cursor:
                exists = await cursor.fetchone()
                if exists:
                    raise HTTPException(status_code=400, detail="Username or email already in use")
            pw_hash = hash_password(data.password)
        if db_type == 'postgresql':
            user_id = await conn.fetchval(
                "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
                data.username, data.email, pw_hash
            )
            return UserPublic(id=user_id, username=data.username, email=data.email, avatar_url=None)
        else:
            cursor = await conn.execute(
                "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                (data.username, data.email, pw_hash)
            )
            await conn.commit()
            user_id = cursor.lastrowid
            return UserPublic(id=user_id, username=data.username, email=data.email, avatar_url=None)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(data: LoginInput):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                "SELECT id, password_hash, is_banned FROM users WHERE username = $1 OR email = $1",
                data.username_or_email
            )
            if not row:
                raise HTTPException(status_code=401, detail="Invalid credentials")
            user = dict(row)
            if not verify_password(data.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid credentials")
        else:
            async with conn.execute(
                "SELECT id, password_hash, is_banned FROM users WHERE username = ? OR email = ?",
                (data.username_or_email, data.username_or_email)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    user = {"id": row[0], "password_hash": row[1], "is_banned": bool(row[2]) if len(row) > 2 else False}
                else:
                    user = None
            if not user or not verify_password(data.password, user["password_hash"]):
                raise HTTPException(status_code=401, detail="Invalid credentials")
        if user.get("is_banned"):
            raise HTTPException(status_code=403, detail="Account is banned")
        token = create_access_token({"sub": str(user["id"])})
        return TokenResponse(access_token=token)

# ===================== Users API =====================
@api_router.get("/users/me")
async def get_me(user_id: int = Depends(get_current_user_id)):
    """Получить полные данные текущего пользователя"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date, phone, work_hours, profile_accent, community_name, community_description, is_admin, is_banned, last_seen FROM users WHERE id = $1",
                user_id
            )
            if row:
                row = dict(row)
        else:  # sqlite
            async with conn.execute(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date, phone, work_hours, profile_accent, community_name, community_description, is_admin, is_banned, last_seen FROM users WHERE id = ?",
                (user_id,)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "username": row_data[1],
                        "email": row_data[2],
                        "avatar_url": row_data[3],
                        "cover_photo": row_data[4] if len(row_data) > 4 else None,
                        "bio": row_data[5] if len(row_data) > 5 else None,
                        "location": row_data[6] if len(row_data) > 6 else None,
                        "birth_date": row_data[7] if len(row_data) > 7 else None,
                        "phone": row_data[8] if len(row_data) > 8 else None,
                        "work_hours": row_data[9] if len(row_data) > 9 else None,
                        "profile_accent": row_data[10] if len(row_data) > 10 else None,
                        "community_name": row_data[11] if len(row_data) > 11 else None,
                        "community_description": row_data[12] if len(row_data) > 12 else None,
                        "is_admin": bool(row_data[13]) if len(row_data) > 13 else False,
                        "is_banned": bool(row_data[14]) if len(row_data) > 14 else False,
                        "last_seen": row_data[15] if len(row_data) > 15 else None,
                    }
                else:
                    row = None
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
        if db_type == 'postgresql' and row:
            row.setdefault("is_admin", False)
            row.setdefault("is_banned", False)
        row["status"] = get_status_from_last_seen(row.get("last_seen"))
        return row

@api_router.post("/users/me/ping")
async def ping_activity(user_id: int = Depends(get_current_user_id)):
    """Обновить last_seen текущего пользователя (вызывать периодически с фронта)."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute("UPDATE users SET last_seen = NOW() WHERE id = $1", user_id)
        else:
            await conn.execute("UPDATE users SET last_seen = datetime('now') WHERE id = ?", (user_id,))
            await conn.commit()
    return {"status": "ok"}

@api_router.get("/users/username/{username}")
async def get_user_by_username(username: str, _uid: int = Depends(get_current_user_id)):
    """Получить данные пользователя по username (для /profile/@username)"""
    username = username.lstrip('@').strip()
    if not username:
        raise HTTPException(status_code=404, detail="User not found")
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date, phone, work_hours, profile_accent, community_name, community_description, last_seen FROM users WHERE username = $1",
                username
            )
            if row:
                row = dict(row)
        else:  # sqlite
            async with conn.execute(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date, phone, work_hours, profile_accent, community_name, community_description, last_seen FROM users WHERE username = ?",
                (username,)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "username": row_data[1],
                        "email": row_data[2],
                        "avatar_url": row_data[3],
                        "cover_photo": row_data[4] if len(row_data) > 4 else None,
                        "bio": row_data[5] if len(row_data) > 5 else None,
                        "location": row_data[6] if len(row_data) > 6 else None,
                        "birth_date": row_data[7] if len(row_data) > 7 else None,
                        "phone": row_data[8] if len(row_data) > 8 else None,
                        "work_hours": row_data[9] if len(row_data) > 9 else None,
                        "profile_accent": row_data[10] if len(row_data) > 10 else None,
                        "community_name": row_data[11] if len(row_data) > 11 else None,
                        "community_description": row_data[12] if len(row_data) > 12 else None,
                        "last_seen": row_data[13] if len(row_data) > 13 else None,
                    }
                else:
                    row = None
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        row["status"] = get_status_from_last_seen(row.get("last_seen"))
    return row


@api_router.get("/users/search", response_model=List[UserSearchResponse])
async def search_users(q: Optional[str] = None, _uid: int = Depends(get_current_user_id)):
    """Поиск пользователей по логину/email. Пустой q — возвращает рекомендации (кроме себя)."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            if q and q.strip():
                like = f"%{q.strip()}%"
                rows = await conn.fetch(
                    """SELECT id, username, email, avatar_url, last_seen FROM users
                       WHERE id != $1 AND (is_banned IS NOT TRUE OR is_banned IS NULL)
                       AND (username ILIKE $2 OR email ILIKE $2) ORDER BY username LIMIT 50""",
                    _uid, like
                )
            else:
                rows = await conn.fetch(
                    """SELECT id, username, email, avatar_url, last_seen FROM users
                       WHERE id != $1 AND (is_banned IS NOT TRUE OR is_banned IS NULL)
                       ORDER BY id DESC LIMIT 50""",
                    _uid
                )
            rows = [dict(r) for r in rows]
        else:
            if q and q.strip():
                like = f"%{q.strip()}%"
                async with conn.execute(
                    """SELECT id, username, email, avatar_url, last_seen FROM users
                       WHERE id != ? AND (is_banned = 0 OR is_banned IS NULL)
                       AND (username LIKE ? OR email LIKE ?) ORDER BY username LIMIT 50""",
                    (_uid, like, like)
                ) as cursor:
                    rows_data = await cursor.fetchall()
                    rows = [{"id": r[0], "username": r[1], "email": r[2], "avatar_url": r[3], "last_seen": r[4] if len(r) > 4 else None} for r in rows_data]
            else:
                async with conn.execute(
                    """SELECT id, username, email, avatar_url, last_seen FROM users
                       WHERE id != ? AND (is_banned = 0 OR is_banned IS NULL)
                       ORDER BY id DESC LIMIT 50""",
                    (_uid,)
                ) as cursor:
                    rows_data = await cursor.fetchall()
                    rows = [{"id": r[0], "username": r[1], "email": r[2], "avatar_url": r[3], "last_seen": r[4] if len(r) > 4 else None} for r in rows_data]
        for r in rows:
            r["status"] = get_status_from_last_seen(r.get("last_seen"))
        return [UserSearchResponse(**r) for r in rows]


@api_router.get("/users/{id}")
async def get_user_by_id(id: int, _uid: int = Depends(get_current_user_id)):
    """Получить данные пользователя по ID"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date, phone, work_hours, profile_accent, community_name, community_description, last_seen FROM users WHERE id = $1",
                id
            )
            if row:
                row = dict(row)
        else:  # sqlite
            async with conn.execute(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date, phone, work_hours, profile_accent, community_name, community_description, last_seen FROM users WHERE id = ?",
                (id,)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "username": row_data[1],
                        "email": row_data[2],
                        "avatar_url": row_data[3],
                        "cover_photo": row_data[4] if len(row_data) > 4 else None,
                        "bio": row_data[5] if len(row_data) > 5 else None,
                        "location": row_data[6] if len(row_data) > 6 else None,
                        "birth_date": row_data[7] if len(row_data) > 7 else None,
                        "phone": row_data[8] if len(row_data) > 8 else None,
                        "work_hours": row_data[9] if len(row_data) > 9 else None,
                        "profile_accent": row_data[10] if len(row_data) > 10 else None,
                        "community_name": row_data[11] if len(row_data) > 11 else None,
                        "community_description": row_data[12] if len(row_data) > 12 else None,
                        "last_seen": row_data[13] if len(row_data) > 13 else None,
                    }
                else:
                    row = None
            if not row:
                raise HTTPException(status_code=404, detail="User not found")
        row["status"] = get_status_from_last_seen(row.get("last_seen"))
    return row

@api_router.put("/users/me", response_model=UserPublic)
async def update_me(data: UserUpdate, user_id: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    updates = []
    values = []
    param_num = 1
    
    if data.username is not None:
        if db_type == 'postgresql':
            updates.append(f"username = ${param_num}")
            param_num += 1
        else:
            updates.append("username = ?")
        values.append(data.username)
    if data.email is not None:
        if db_type == 'postgresql':
            updates.append(f"email = ${param_num}")
            param_num += 1
        else:
            updates.append("email = ?")
        values.append(data.email)
    if data.avatar_url is not None:
        if db_type == 'postgresql':
            updates.append(f"avatar_url = ${param_num}")
            param_num += 1
        else:
            updates.append("avatar_url = ?")
        values.append(data.avatar_url)
    if data.cover_photo is not None:
        if db_type == 'postgresql':
            updates.append(f"cover_photo = ${param_num}")
            param_num += 1
        else:
            updates.append("cover_photo = ?")
        values.append(data.cover_photo)
    if data.bio is not None:
        if db_type == 'postgresql':
            updates.append(f"bio = ${param_num}")
            param_num += 1
        else:
            updates.append("bio = ?")
        values.append(data.bio)
    if data.location is not None:
        if db_type == 'postgresql':
            updates.append(f"location = ${param_num}")
            param_num += 1
        else:
            updates.append("location = ?")
        values.append(data.location)
    if data.birth_date is not None:
        if db_type == 'postgresql':
            updates.append(f"birth_date = ${param_num}")
            param_num += 1
        else:
            updates.append("birth_date = ?")
        values.append(data.birth_date)
    if data.phone is not None:
        if db_type == 'postgresql':
            updates.append(f"phone = ${param_num}")
            param_num += 1
        else:
            updates.append("phone = ?")
        values.append(data.phone)
    if data.work_hours is not None:
        if db_type == 'postgresql':
            updates.append(f"work_hours = ${param_num}")
            param_num += 1
        else:
            updates.append("work_hours = ?")
        values.append(data.work_hours)
    if data.profile_accent is not None:
        if db_type == 'postgresql':
            updates.append(f"profile_accent = ${param_num}")
            param_num += 1
        else:
            updates.append("profile_accent = ?")
        values.append(data.profile_accent)
    if data.community_name is not None:
        if db_type == 'postgresql':
            updates.append(f"community_name = ${param_num}")
            param_num += 1
        else:
            updates.append("community_name = ?")
        values.append(data.community_name)
    if data.community_description is not None:
        if db_type == 'postgresql':
            updates.append(f"community_description = ${param_num}")
            param_num += 1
        else:
            updates.append("community_description = ?")
        values.append(data.community_description)
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    async with get_db() as conn:
        if db_type == 'postgresql':
            values.append(user_id)
            await conn.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ${param_num}",
                *values
            )
            row = await conn.fetchrow(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date FROM users WHERE id = $1",
                user_id
            )
            if row:
                row = dict(row)
            else:
                row = None
        else:  # sqlite
            values.append(user_id)
            await conn.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = ?",
                tuple(values)
            )
            await conn.commit()
            async with conn.execute(
                "SELECT id, username, email, avatar_url, cover_photo, bio, location, birth_date FROM users WHERE id = ?",
                (user_id,)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "username": row_data[1],
                        "email": row_data[2],
                        "avatar_url": row_data[3],
                        "cover_photo": row_data[4] if len(row_data) > 4 else None,
                        "bio": row_data[5] if len(row_data) > 5 else None,
                        "location": row_data[6] if len(row_data) > 6 else None,
                        "birth_date": row_data[7] if len(row_data) > 7 else None,
                    }
                else:
                    row = None
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return row

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    db_type = get_db_type()
    status_obj = StatusCheck(**input.dict())
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "INSERT INTO status_checks (id, client_name, timestamp) VALUES ($1, $2, $3)",
                status_obj.id, status_obj.client_name, status_obj.timestamp
            )
        else:  # sqlite
            await conn.execute(
                "INSERT INTO status_checks (id, client_name, timestamp) VALUES (?, ?, ?)",
                (status_obj.id, status_obj.client_name, status_obj.timestamp)
            )
            await conn.commit()
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch("SELECT * FROM status_checks ORDER BY timestamp DESC LIMIT 1000")
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute("SELECT * FROM status_checks ORDER BY timestamp DESC LIMIT 1000") as cursor:
                rows_data = await cursor.fetchall()
                columns = [desc[0] for desc in cursor.description]
                rows = [dict(zip(columns, r)) for r in rows_data]
            return [StatusCheck(**row) for row in rows]

# Theme API endpoints
@api_router.get("/user/theme", response_model=UserThemeResponse)
async def get_user_theme(user_id: int = Depends(get_current_user_id)):
    """Получить тему пользователя"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            result = await conn.fetchrow(
                "SELECT theme_mode, theme_palette FROM users WHERE id = $1",
                user_id
            )
            if result:
                result = dict(result)
        else:  # sqlite
            async with conn.execute(
                "SELECT theme_mode, theme_palette FROM users WHERE id = ?",
                (user_id,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    result = {'theme_mode': row[0], 'theme_palette': row[1]}
                else:
                    result = None
            
            if result:
                return UserThemeResponse(
                    mode=result['theme_mode'],
                    palette=result['theme_palette']
                )
            else:
                # Возвращаем дефолтную тему
                return UserThemeResponse(mode='light', palette='blue')

@api_router.put("/user/theme", response_model=UserThemeResponse)
async def update_user_theme(
    theme: ThemeUpdate,
    user_id: int = Depends(get_current_user_id)
):
    """Обновить тему пользователя"""
    # Проверяем валидность темы
    valid_modes = ['light', 'dark']
    valid_palettes_light = ['blue', 'green', 'purple']
    valid_palettes_dark = ['dark-blue', 'dark-green', 'dark-purple']
    
    if theme.mode not in valid_modes:
        raise HTTPException(status_code=400, detail=f"Invalid mode. Must be one of: {valid_modes}")
    
    if theme.mode == 'light' and theme.palette not in valid_palettes_light:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid palette for light mode. Must be one of: {valid_palettes_light}"
        )
    
    if theme.mode == 'dark' and theme.palette not in valid_palettes_dark:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid palette for dark mode. Must be one of: {valid_palettes_dark}"
        )
    
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            # Проверяем, существует ли пользователь
            user_exists = await conn.fetchval("SELECT id FROM users WHERE id = $1", user_id)
            
            if not user_exists:
                # Создаем пользователя, если его нет (не должно происходить, но на всякий случай)
                await conn.execute(
                    """INSERT INTO users (id, username, email, password_hash, theme_mode, theme_palette)
                       VALUES ($1, $2, $3, $4, $5, $6)""",
                    user_id, f'user_{user_id}', f'user_{user_id}@example.com', 'hash', theme.mode, theme.palette
                )
            else:
                # Обновляем тему
                await conn.execute(
                    "UPDATE users SET theme_mode = $1, theme_palette = $2 WHERE id = $3",
                    theme.mode, theme.palette, user_id
                )
        else:  # sqlite
            async with conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)) as cursor:
                user_exists = await cursor.fetchone()
            if not user_exists:
                await conn.execute(
                    """INSERT INTO users (id, username, email, password_hash, theme_mode, theme_palette)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (user_id, f'user_{user_id}', f'user_{user_id}@example.com', 'hash', theme.mode, theme.palette)
                )
            else:
                await conn.execute(
                    "UPDATE users SET theme_mode = ?, theme_palette = ? WHERE id = ?",
                    (theme.mode, theme.palette, user_id)
                )
            await conn.commit()
    
    return UserThemeResponse(mode=theme.mode, palette=theme.palette)

# ===================== Avatar API =====================
@api_router.get("/users/me/avatar")
async def get_my_avatar(user_id: int = Depends(get_current_user_id)):
    """Возвращает аватар пользователя или сгенерированный placeholder (SVG)."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            avatar_url = await conn.fetchval("SELECT avatar_url FROM users WHERE id = $1", user_id)
        else:  # sqlite
            async with conn.execute("SELECT avatar_url FROM users WHERE id = ?", (user_id,)) as cursor:
                row = await cursor.fetchone()
                avatar_url = row[0] if row else None
                if avatar_url:
                    return RedirectResponse(url=avatar_url)

    # SVG силуэт человека на сером фоне 128x128
    svg = (
        """
        <svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'>
          <rect width='128' height='128' fill='#e5e7eb'/>
          <circle cx='64' cy='48' r='24' fill='#9ca3af'/>
          <path d='M16 112c0-22.091 17.909-40 40-40h16c22.091 0 40 17.909 40 40' fill='#9ca3af'/>
        </svg>
        """
    ).strip()
    return Response(content=svg, media_type="image/svg+xml")

@api_router.post("/users/me/avatar")
async def upload_avatar(data: ImageUpload, user_id: int = Depends(get_current_user_id)):
    """Загрузить аватар пользователя (URL или base64)"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "UPDATE users SET avatar_url = $1 WHERE id = $2",
                data.image_url, user_id
            )
        else:  # sqlite
            await conn.execute(
                "UPDATE users SET avatar_url = ? WHERE id = ?",
                (data.image_url, user_id)
            )
            await conn.commit()
    
    return {"status": "success", "avatar_url": data.image_url}

@api_router.post("/users/me/cover")
async def upload_cover(data: ImageUpload, user_id: int = Depends(get_current_user_id)):
    """Загрузить баннер профиля (URL или base64)"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "UPDATE users SET cover_photo = $1 WHERE id = $2",
                data.image_url, user_id
            )
        else:  # sqlite
            await conn.execute(
                "UPDATE users SET cover_photo = ? WHERE id = ?",
                (data.image_url, user_id)
            )
            await conn.commit()
    
    return {"status": "success", "cover_photo": data.image_url}

# ===================== Friends API =====================
async def create_notification(user_id: int, notif_type: str, actor_id: int, target_id: int = None, target_type: str = None, content: str = None):
    """Создать уведомление"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, content) VALUES ($1, $2, $3, $4, $5, $6)",
                user_id, notif_type, actor_id, target_id, target_type, content
            )
        else:  # sqlite
            await conn.execute(
                "INSERT INTO notifications (user_id, type, actor_id, target_id, target_type, content) VALUES (?, ?, ?, ?, ?, ?)",
                (user_id, notif_type, actor_id, target_id, target_type, content)
            )
            await conn.commit()

@api_router.post("/friends/request")
async def send_friend_request(data: FriendAction, user_id: int = Depends(get_current_user_id)):
    if data.user_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot friend yourself")
    db_type = get_db_type()
    async with get_db() as conn:
        # Avoid duplicates and normalize requester/addressee pair
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                """
                SELECT id, requester_id, addressee_id, status FROM friendships
                WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$3 AND addressee_id=$4)
                """,
                user_id, data.user_id, data.user_id, user_id
            )
            row = dict(row) if row else None
        else:
            async with conn.execute(
                """
                SELECT id, requester_id, addressee_id, status FROM friendships
                WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)
                """,
                (user_id, data.user_id, data.user_id, user_id)
            ) as cursor:
                row_data = await cursor.fetchone()
                row = {"id": row_data[0], "requester_id": row_data[1], "addressee_id": row_data[2], "status": row_data[3]} if row_data else None

            if row:
                if row["status"] == 'accepted':
                    raise HTTPException(status_code=400, detail="Already friends")
                if row["requester_id"] == user_id and row["status"] == 'pending':
                    raise HTTPException(status_code=400, detail="Request already sent")
                if row["addressee_id"] == user_id and row["status"] == 'pending':
                    if db_type == 'postgresql':
                        await conn.execute("UPDATE friendships SET status='accepted' WHERE id=$1", row["id"])
                    else:
                        await conn.execute("UPDATE friendships SET status='accepted' WHERE id=?", (row["id"],))
                        await conn.commit()
                    return {"status": "accepted"}

            # create new pending
        if db_type == 'postgresql':
            await conn.execute(
                "INSERT INTO friendships (requester_id, addressee_id, status) VALUES ($1, $2, 'pending')",
                user_id, data.user_id
            )
        else:
            await conn.execute(
                "INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')",
                (user_id, data.user_id,)
            )
            await conn.commit()
        
        # Создаём уведомление для получателя заявки
        await create_notification(
            user_id=data.user_id,
            notif_type="friend_request",
            actor_id=user_id,
            content="отправил(а) вам заявку в друзья"
        )
        return {"status": "pending"}

@api_router.post("/friends/accept")
async def accept_friend_request(data: FriendAction, user_id: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            result = await conn.execute(
                "UPDATE friendships SET status='accepted' WHERE requester_id=$1 AND addressee_id=$2 AND status='pending'",
                data.user_id, user_id
            )
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Request not found")
        else:  # sqlite
            await conn.execute(
                "UPDATE friendships SET status='accepted' WHERE requester_id=? AND addressee_id=? AND status='pending'",
                (data.user_id, user_id)
            )
            await conn.commit()
            if conn.total_changes == 0:
                raise HTTPException(status_code=404, detail="Request not found")
        
        # Создаём уведомление для отправителя заявки
        await create_notification(
            user_id=data.user_id,
            notif_type="friend_accepted",
            actor_id=user_id,
            content="принял(а) вашу заявку в друзья"
        )
        return {"status": "accepted"}

@api_router.post("/friends/remove")
async def remove_friend(data: FriendAction, user_id: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "DELETE FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$3 AND addressee_id=$4)",
                user_id, data.user_id, data.user_id, user_id
            )
        else:  # sqlite
            await conn.execute(
                "DELETE FROM friendships WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)",
                (user_id, data.user_id, data.user_id, user_id)
            )
            await conn.commit()
            return {"status": "removed"}

@api_router.get("/friends")
async def list_friends(user_id: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT u.id, u.username, u.email, u.avatar_url
                FROM friendships f
                JOIN users u ON (u.id = CASE WHEN f.requester_id=$1 THEN f.addressee_id ELSE f.requester_id END)
                WHERE (f.requester_id=$1 OR f.addressee_id=$1) AND f.status='accepted'
                ORDER BY u.username
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT u.id, u.username, u.email, u.avatar_url
                FROM friendships f
                JOIN users u ON (u.id = CASE WHEN f.requester_id=? THEN f.addressee_id ELSE f.requester_id END)
                WHERE (f.requester_id=? OR f.addressee_id=?) AND f.status='accepted'
                ORDER BY u.username
                """,
                (user_id, user_id, user_id)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0],
                        "username": r[1],
                        "email": r[2],
                        "avatar_url": r[3]
                    }
                    for r in rows_data
                ]
        return rows

# ===================== Posts API =====================
@api_router.post("/posts")
async def create_post(data: PostCreate, user_id: int = Depends(get_current_user_id)):
    """Создать новый пост (опционально с тегами)"""
    db_type = get_db_type()
    images_json = json.dumps(data.images)
    
    async with get_db() as conn:
        if db_type == 'postgresql':
            post_id = await conn.fetchval(
                "INSERT INTO posts (author_id, content, images) VALUES ($1, $2, $3) RETURNING id",
                user_id, data.content, images_json
            )
            for tag_id in (data.tag_ids or []):
                await conn.execute(
                    "INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    post_id, tag_id
                )
            row = await conn.fetchrow(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url
                FROM posts p
                JOIN users u ON u.id = p.author_id
                WHERE p.id = $1
                """,
                post_id
            )
            row = dict(row)
        else:  # sqlite
            cursor = await conn.execute(
                "INSERT INTO posts (author_id, content, images) VALUES (?, ?, ?)",
                (user_id, data.content, images_json)
            )
            await conn.commit()
            post_id = cursor.lastrowid
            for tag_id in (data.tag_ids or []):
                await conn.execute(
                    "INSERT OR IGNORE INTO post_tags (post_id, tag_id) VALUES (?, ?)",
                    (post_id, tag_id)
                )
            await conn.commit()
            async with conn.execute(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url
                FROM posts p
                JOIN users u ON u.id = p.author_id
                WHERE p.id = ?
                """,
                (post_id,)
            ) as cursor:
                r = await cursor.fetchone()
                row = {
                    "id": r[0], "author_id": r[1], "content": r[2], "images": r[3],
                    "likes_count": r[4], "comments_count": r[5], "created_at": r[6],
                    "username": r[7], "avatar_url": r[8]
                }
        tags_map = await get_tags_for_posts(conn, db_type, [post_id])
        post_tags = tags_map.get(post_id, [])
    
    return {
        "id": row["id"],
        "author_id": row["author_id"],
        "author_username": row["username"],
        "author_avatar": row["avatar_url"],
        "content": row["content"],
        "images": json.loads(row["images"]) if row["images"] else [],
        "likes": row["likes_count"],
        "comments": row["comments_count"],
        "liked": False,
        "created_at": row["created_at"],
        "tags": post_tags
    }

@api_router.get("/posts/my")
async def get_my_posts(user_id: int = Depends(get_current_user_id)):
    """Получить посты текущего пользователя"""
    db_type = get_db_type()
    
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url,
                       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) as liked
                FROM posts p
                JOIN users u ON u.id = p.author_id
                WHERE p.author_id = $1
                ORDER BY p.created_at DESC
                LIMIT 100
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url,
                       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked
                FROM posts p
                JOIN users u ON u.id = p.author_id
                WHERE p.author_id = ?
                ORDER BY p.created_at DESC
                LIMIT 100
                """,
                (user_id, user_id)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0], "author_id": r[1], "content": r[2], "images": r[3],
                        "likes_count": r[4], "comments_count": r[5], "created_at": r[6],
                        "username": r[7], "avatar_url": r[8], "liked": bool(r[9])
                    }
                    for r in rows_data
                ]
        post_ids = [r["id"] for r in rows]
        tags_map = await get_tags_for_posts(conn, db_type, post_ids)
    
    return [
        {
            "id": r["id"],
            "author_id": r["author_id"],
            "author_username": r["username"],
            "author_avatar": r["avatar_url"],
            "content": r["content"],
            "images": json.loads(r["images"]) if r["images"] else [],
            "likes": r["likes_count"],
            "comments": r["comments_count"],
            "liked": r["liked"],
            "created_at": r["created_at"],
            "tags": tags_map.get(r["id"], [])
        }
        for r in rows
    ]

@api_router.get("/feed")
async def get_feed(user_id: int = Depends(get_current_user_id)):
    """Лента: все посты по времени. Рекомендации по лайкам/тегам — отдельно /recommendations/posts"""
    db_type = get_db_type()
    
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url,
                       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) as liked
                FROM posts p
                JOIN users u ON u.id = p.author_id
                ORDER BY p.created_at DESC
                LIMIT 200
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url,
                       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked
                FROM posts p
                JOIN users u ON u.id = p.author_id
                ORDER BY p.created_at DESC
                LIMIT 200
                """,
                (user_id,)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0], "author_id": r[1], "content": r[2], "images": r[3],
                        "likes_count": r[4], "comments_count": r[5], "created_at": r[6],
                        "username": r[7], "avatar_url": r[8], "liked": bool(r[9])
                    }
                    for r in rows_data
                ]
        post_ids = [r["id"] for r in rows]
        tags_map = await get_tags_for_posts(conn, db_type, post_ids)
    
    return [
        {
            "id": r["id"],
            "author_id": r["author_id"],
            "author_username": r["username"],
            "author_avatar": r["avatar_url"],
            "content": r["content"],
            "images": json.loads(r["images"]) if r["images"] else [],
            "likes": r["likes_count"],
            "comments": r["comments_count"],
            "liked": r["liked"],
            "created_at": r["created_at"],
            "tags": tags_map.get(r["id"], [])
        }
        for r in rows
    ]

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: int, user_id: int = Depends(get_current_user_id)):
    """Поставить/убрать лайк посту"""
    db_type = get_db_type()
    liked = False
    likes = 0

    async with get_db() as conn:
        # Проверяем, что пост существует
        if db_type == 'postgresql':
            post_exists = await conn.fetchval("SELECT id FROM posts WHERE id = $1", post_id)
        else:
            async with conn.execute("SELECT id FROM posts WHERE id = ?", (post_id,)) as cur:
                post_exists = await cur.fetchone()
        if not post_exists:
            raise HTTPException(status_code=404, detail="Post not found")

        # Проверяем, есть ли уже лайк
        if db_type == 'postgresql':
            existing = await conn.fetchval(
                "SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2",
                post_id, user_id
            )
            if existing:
                # Убираем лайк
                await conn.execute("DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2", post_id, user_id)
                await conn.execute("UPDATE posts SET likes_count = likes_count - 1 WHERE id = $1", post_id)
                liked = False
            else:
                # Добавляем лайк
                await conn.execute(
                    "INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)",
                    post_id, user_id
                )
                await conn.execute("UPDATE posts SET likes_count = likes_count + 1 WHERE id = $1", post_id)
                liked = True
                # Создаём уведомление для автора поста
                post_author = await conn.fetchval("SELECT author_id FROM posts WHERE id = $1", post_id)
                if post_author and post_author != user_id:
                    await create_notification(
                        user_id=post_author,
                        notif_type="post_like",
                        actor_id=user_id,
                        target_id=post_id,
                        target_type="post",
                        content="поставил(а) лайк вашему посту"
                    )
            
            likes = await conn.fetchval("SELECT likes_count FROM posts WHERE id = $1", post_id)
        else:  # sqlite
            async with conn.execute(
                "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
                (post_id, user_id)
            ) as cursor:
                existing = await cursor.fetchone()
            
            if existing:
                await conn.execute("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", (post_id, user_id))
                await conn.execute("UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?", (post_id,))
                liked = False
            else:
                await conn.execute(
                    "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
                    (post_id, user_id)
                )
                await conn.execute("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?", (post_id,))
                liked = True
                # Создаём уведомление для автора поста
                async with conn.execute("SELECT author_id FROM posts WHERE id = ?", (post_id,)) as cursor:
                    author_row = await cursor.fetchone()
                    post_author = author_row[0] if author_row else None
                if post_author and post_author != user_id:
                    await create_notification(
                        user_id=post_author,
                        notif_type="post_like",
                        actor_id=user_id,
                        target_id=post_id,
                        target_type="post",
                        content="поставил(а) лайк вашему посту"
                    )
            
            await conn.commit()
            async with conn.execute("SELECT likes_count FROM posts WHERE id = ?", (post_id,)) as cursor:
                row = await cursor.fetchone()
                likes = row[0] if row else 0
    
    return {"liked": liked, "likes": likes}

@api_router.get("/posts/{post_id}")
async def get_post(post_id: int, user_id: int = Depends(get_current_user_id)):
    """Получить пост по ID"""
    db_type = get_db_type()
    
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url,
                       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2) as liked
                FROM posts p
                JOIN users u ON u.id = p.author_id
                WHERE p.id = $1
                """,
                post_id, user_id
            )
            if not row:
                raise HTTPException(status_code=404, detail="Post not found")
            row = dict(row)
        else:  # sqlite
            async with conn.execute(
                """
                SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                       u.username, u.avatar_url,
                       EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked
                FROM posts p
                JOIN users u ON u.id = p.author_id
                WHERE p.id = ?
                """,
                (user_id, post_id)
            ) as cursor:
                r = await cursor.fetchone()
                if not r:
                    raise HTTPException(status_code=404, detail="Post not found")
                row = {
                    "id": r[0], "author_id": r[1], "content": r[2], "images": r[3],
                    "likes_count": r[4], "comments_count": r[5], "created_at": r[6],
                    "username": r[7], "avatar_url": r[8], "liked": bool(r[9])
                }
    
    async with get_db() as conn2:
        tags_map = await get_tags_for_posts(conn2, get_db_type(), [post_id])
    post_tags = tags_map.get(post_id, [])

    return {
        "id": row["id"],
        "author_id": row["author_id"],
        "author_username": row["username"],
        "author_avatar": row["avatar_url"],
        "content": row["content"],
        "images": json.loads(row["images"]) if row["images"] else [],
        "likes": row["likes_count"],
        "comments": row["comments_count"],
        "liked": row["liked"],
        "created_at": row["created_at"],
        "tags": post_tags
    }

@api_router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_post_comments(post_id: int, user_id: int = Depends(get_current_user_id)):
    """Список комментариев к посту."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username, u.avatar_url
                   FROM post_comments c JOIN users u ON u.id = c.user_id
                   WHERE c.post_id = $1 ORDER BY c.created_at ASC""",
                post_id
            )
            out = [{"id": r["id"], "post_id": r["post_id"], "user_id": r["user_id"], "username": r["username"], "avatar_url": r["avatar_url"], "content": r["content"], "created_at": r["created_at"]} for r in rows]
        else:
            async with conn.execute(
                """SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username, u.avatar_url
                   FROM post_comments c JOIN users u ON u.id = c.user_id
                   WHERE c.post_id = ? ORDER BY c.created_at ASC""",
                (post_id,)
            ) as cursor:
                rows = await cursor.fetchall()
            out = [{"id": r[0], "post_id": r[1], "user_id": r[2], "content": r[3], "created_at": r[4], "username": r[5], "avatar_url": r[6]} for r in rows]
    return [CommentResponse(**x) for x in out]

@api_router.post("/posts/{post_id}/comments", response_model=CommentResponse)
async def add_post_comment(post_id: int, data: CommentCreate, user_id: int = Depends(get_current_user_id)):
    """Добавить комментарий к посту."""
    if not data.content or not data.content.strip():
        raise HTTPException(status_code=400, detail="Content required")
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            post_exists = await conn.fetchval("SELECT id FROM posts WHERE id = $1", post_id)
            if not post_exists:
                raise HTTPException(status_code=404, detail="Post not found")
            cid = await conn.fetchval(
                "INSERT INTO post_comments (post_id, user_id, content) VALUES ($1, $2, $3) RETURNING id",
                post_id, user_id, data.content.strip()
            )
            await conn.execute("UPDATE posts SET comments_count = comments_count + 1 WHERE id = $1", post_id)
            row = await conn.fetchrow(
                "SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username, u.avatar_url FROM post_comments c JOIN users u ON u.id = c.user_id WHERE c.id = $1",
                cid
            )
            row = dict(row)
        else:
            async with conn.execute("SELECT id FROM posts WHERE id = ?", (post_id,)) as cursor:
                if not await cursor.fetchone():
                    raise HTTPException(status_code=404, detail="Post not found")
            await conn.execute(
                "INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)",
                (post_id, user_id, data.content.strip())
            )
            await conn.execute("UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?", (post_id,))
            await conn.commit()
            cur = await conn.execute(
                "SELECT id FROM post_comments WHERE post_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1",
                (post_id, user_id)
            )
            r = await cur.fetchone()
            cid = r[0] if r else None
            async with conn.execute(
                "SELECT c.id, c.post_id, c.user_id, c.content, c.created_at, u.username, u.avatar_url FROM post_comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?",
                (cid,)
            ) as cursor:
                r = await cursor.fetchone()
            row = {"id": r[0], "post_id": r[1], "user_id": r[2], "content": r[3], "created_at": r[4], "username": r[5], "avatar_url": r[6]} if r else None
    if not row:
        raise HTTPException(status_code=500, detail="Comment not created")
    return CommentResponse(**row)

# ===================== Tags & Subscriptions API =====================
class TagCreate(BaseModel):
    name: str

@api_router.get("/tags")
async def list_tags(user_id: int = Depends(get_current_user_id)):
    """Список всех тегов с флагом подписки текущего пользователя"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT t.id, t.name,
                       EXISTS(SELECT 1 FROM user_tag_subscriptions s WHERE s.user_id = $1 AND s.tag_id = t.id) as subscribed
                FROM tags t
                ORDER BY t.name
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:
            async with conn.execute(
                """
                SELECT t.id, t.name,
                       EXISTS(SELECT 1 FROM user_tag_subscriptions s WHERE s.user_id = ? AND s.tag_id = t.id) as subscribed
                FROM tags t
                ORDER BY t.name
                """,
                (user_id,)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {"id": r[0], "name": r[1], "subscribed": bool(r[2])}
                    for r in rows_data
                ]
    return [{"id": r["id"], "name": r["name"], "subscribed": r["subscribed"]} for r in rows]


@api_router.post("/tags")
async def create_tag(data: TagCreate, user_id: int = Depends(get_current_user_id)):
    """Создать новый тег (по имени). Если тег уже есть — вернуть его id."""
    db_type = get_db_type()
    name = (data.name or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tag name required")
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow("SELECT id, name FROM tags WHERE name = $1", name)
            if row:
                return {"id": row["id"], "name": row["name"]}
            row = await conn.fetchrow("INSERT INTO tags (name) VALUES ($1) RETURNING id, name", name)
            return {"id": row["id"], "name": row["name"]}
        else:
            async with conn.execute("SELECT id, name FROM tags WHERE name = ?", (name,)) as cursor:
                r = await cursor.fetchone()
            if r:
                return {"id": r[0], "name": r[1]}
            await conn.execute("INSERT INTO tags (name) VALUES (?)", (name,))
            await conn.commit()
            async with conn.execute("SELECT id, name FROM tags WHERE name = ?", (name,)) as cursor:
                r = await cursor.fetchone()
            return {"id": r[0], "name": r[1]}


@api_router.post("/tags/{tag_id}/subscribe")
async def subscribe_tag(tag_id: int, user_id: int = Depends(get_current_user_id)):
    """Подписаться на тег"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "INSERT INTO user_tag_subscriptions (user_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                user_id, tag_id
            )
        else:
            await conn.execute(
                "INSERT OR IGNORE INTO user_tag_subscriptions (user_id, tag_id) VALUES (?, ?)",
                (user_id, tag_id)
            )
            await conn.commit()
    return {"subscribed": True}


@api_router.delete("/tags/{tag_id}/subscribe")
async def unsubscribe_tag(tag_id: int, user_id: int = Depends(get_current_user_id)):
    """Отписаться от тега"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute("DELETE FROM user_tag_subscriptions WHERE user_id = $1 AND tag_id = $2", user_id, tag_id)
        else:
            await conn.execute("DELETE FROM user_tag_subscriptions WHERE user_id = ? AND tag_id = ?", (user_id, tag_id))
            await conn.commit()
    return {"subscribed": False}


@api_router.get("/users/me/subscriptions")
async def my_subscriptions(user_id: int = Depends(get_current_user_id)):
    """Мои подписки на теги"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                "SELECT t.id, t.name FROM tags t JOIN user_tag_subscriptions s ON s.tag_id = t.id WHERE s.user_id = $1 ORDER BY t.name",
                user_id
            )
            rows = [dict(r) for r in rows]
        else:
            async with conn.execute(
                "SELECT t.id, t.name FROM tags t JOIN user_tag_subscriptions s ON s.tag_id = t.id WHERE s.user_id = ? ORDER BY t.name",
                (user_id,)
            ) as cursor:
                rows = [{"id": r[0], "name": r[1]} for r in await cursor.fetchall()]
    return rows


# ===================== Recommendations API =====================
@api_router.get("/recommendations/posts")
async def get_recommended_posts(
    user_id: int = Depends(get_current_user_id),
    limit: int = Query(50, ge=1, le=PAGINATION_MAX_LIMIT),
):
    """
    Рекомендации постов по интересам:
    - теги, на которые подписан пользователь;
    - теги постов, которые пользователь лайкнул.
    Посты ранжируются по количеству совпадающих тегов и по дате.
    """
    db_type = get_db_type()
    async with get_db() as conn:
        # 1) Интересные теги: подписки + теги с лайкнутых постов
        if db_type == 'postgresql':
            sub_rows = await conn.fetch("SELECT tag_id FROM user_tag_subscriptions WHERE user_id = $1", user_id)
            liked_tag_rows = await conn.fetch(
                "SELECT DISTINCT pt.tag_id FROM post_likes pl JOIN post_tags pt ON pt.post_id = pl.post_id WHERE pl.user_id = $1",
                user_id
            )
        else:
            async with conn.execute("SELECT tag_id FROM user_tag_subscriptions WHERE user_id = ?", (user_id,)) as cursor:
                sub_rows = await cursor.fetchall()
            async with conn.execute(
                "SELECT DISTINCT pt.tag_id FROM post_likes pl JOIN post_tags pt ON pt.post_id = pl.post_id WHERE pl.user_id = ?",
                (user_id,)
            ) as cursor:
                liked_tag_rows = await cursor.fetchall()
        interest_tag_ids = set()
        for r in (sub_rows or []):
            interest_tag_ids.add(r["tag_id"] if db_type == 'postgresql' else r[0])
        for r in (liked_tag_rows or []):
            interest_tag_ids.add(r["tag_id"] if db_type == 'postgresql' else r[0])
        interest_tag_ids = list(interest_tag_ids)

        # 2) Кандидаты: посты не свои, не лайкнутые, (от друзей ИЛИ с совпадающими тегами)
        rows = []
        if db_type == 'postgresql':
            if interest_tag_ids:
                n = len(interest_tag_ids)
                tag_ph1 = ",".join(["$" + str(i+3) for i in range(n)])
                tag_ph2 = ",".join(["$" + str(i+3+n) for i in range(n)])
                limit_idx = 3 + 2 * n
                params = [user_id, user_id] + interest_tag_ids + interest_tag_ids + [limit]
                q = f"""
                    SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                           u.username, u.avatar_url,
                           EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) as liked,
                           (SELECT COUNT(*) FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id IN ({tag_ph1})) as match_count
                    FROM posts p
                    JOIN users u ON u.id = p.author_id
                    WHERE p.author_id != $2
                      AND NOT EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $2)
                      AND (
                        p.author_id IN (SELECT CASE WHEN requester_id = $2 THEN addressee_id ELSE requester_id END FROM friendships WHERE (requester_id = $2 OR addressee_id = $2) AND status = 'accepted')
                        OR EXISTS(SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id IN ({tag_ph2}))
                      )
                    ORDER BY match_count DESC, p.created_at DESC
                    LIMIT ${limit_idx}
                """
                rows_pg = await conn.fetch(q, *params)
                rows = [dict(r) for r in rows_pg]
            else:
                rows_pg = await conn.fetch(
                    """
                    SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                           u.username, u.avatar_url,
                           EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = $1) as liked
                    FROM posts p
                    JOIN users u ON u.id = p.author_id
                    WHERE p.author_id != $1
                      AND p.author_id IN (SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END FROM friendships WHERE (requester_id = $1 OR addressee_id = $1) AND status = 'accepted')
                    ORDER BY p.created_at DESC
                    LIMIT $2
                    """,
                    user_id, limit
                )
                rows = [dict(r) for r in rows_pg]
        else:
            if interest_tag_ids:
                placeholders = ",".join(["?" for _ in interest_tag_ids])
                params = (user_id, user_id) + tuple(interest_tag_ids) + (user_id, user_id, user_id) + tuple(interest_tag_ids) + (limit,)
                async with conn.execute(
                    f"""
                    SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                           u.username, u.avatar_url,
                           EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked,
                           (SELECT COUNT(*) FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id IN ({placeholders})) as match_count
                    FROM posts p
                    JOIN users u ON u.id = p.author_id
                    WHERE p.author_id != ? AND NOT EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?)
                      AND (p.author_id IN (SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted')
                           OR EXISTS(SELECT 1 FROM post_tags pt WHERE pt.post_id = p.id AND pt.tag_id IN ({placeholders})))
                    ORDER BY match_count DESC, p.created_at DESC
                    LIMIT ?
                    """,
                    params
                ) as cursor:
                    rows_data = await cursor.fetchall()
                rows = [
                    {"id": r[0], "author_id": r[1], "content": r[2], "images": r[3], "likes_count": r[4], "comments_count": r[5], "created_at": r[6], "username": r[7], "avatar_url": r[8], "liked": bool(r[9]), "match_count": r[10] or 0}
                    for r in rows_data
                ]
            else:
                async with conn.execute(
                    """
                    SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.comments_count, p.created_at,
                           u.username, u.avatar_url,
                           EXISTS(SELECT 1 FROM post_likes pl WHERE pl.post_id = p.id AND pl.user_id = ?) as liked
                    FROM posts p
                    JOIN users u ON u.id = p.author_id
                    WHERE p.author_id != ? AND p.author_id IN (SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END FROM friendships WHERE (requester_id = ? OR addressee_id = ?) AND status = 'accepted')
                    ORDER BY p.created_at DESC
                    LIMIT ?
                    """,
                    (user_id, user_id, user_id, user_id, user_id, limit)
                ) as cursor:
                    rows_data = await cursor.fetchall()
                rows = [
                    {"id": r[0], "author_id": r[1], "content": r[2], "images": r[3], "likes_count": r[4], "comments_count": r[5], "created_at": r[6], "username": r[7], "avatar_url": r[8], "liked": bool(r[9])}
                    for r in rows_data
                ]

        post_ids = [r["id"] for r in rows]
        tags_map = await get_tags_for_posts(conn, db_type, post_ids)

    return [
        {
            "id": r["id"],
            "author_id": r["author_id"],
            "author_username": r["username"],
            "author_avatar": r["avatar_url"],
            "content": r["content"],
            "images": json.loads(r["images"]) if r["images"] else [],
            "likes": r["likes_count"],
            "comments": r["comments_count"],
            "liked": r["liked"],
            "created_at": r["created_at"],
            "tags": tags_map.get(r["id"], [])
        }
        for r in rows
    ]


@api_router.get("/conversations")
async def list_conversations(user_id: int = Depends(get_current_user_id)):
    """Получить список диалогов с информацией о собеседниках и последнем сообщении"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT DISTINCT ON (c.id)
                    c.id,
                    c.is_group,
                    c.created_at,
                    u.id as other_user_id,
                    u.username as other_username,
                    u.avatar_url as other_avatar,
                    m.content as last_message,
                    m.created_at as last_message_at,
                    m.sender_id as last_message_sender_id
                FROM conversation_participants p
                JOIN conversations c ON c.id = p.conversation_id
                LEFT JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id != $1
                LEFT JOIN users u ON u.id = p2.user_id AND c.is_group = FALSE
                LEFT JOIN LATERAL (
                    SELECT content, created_at, sender_id
                    FROM messages
                    WHERE conversation_id = c.id
                    ORDER BY created_at DESC
                    LIMIT 1
                ) m ON TRUE
                WHERE p.user_id = $1
                ORDER BY c.id DESC, m.created_at DESC NULLS LAST
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT 
                    c.id,
                    c.is_group,
                    c.created_at,
                    u.id as other_user_id,
                    u.username as other_username,
                    u.avatar_url as other_avatar,
                    m.content as last_message,
                    m.created_at as last_message_at,
                    m.sender_id as last_message_sender_id
                FROM conversation_participants p
                JOIN conversations c ON c.id = p.conversation_id
                LEFT JOIN conversation_participants p2 ON p2.conversation_id = c.id AND p2.user_id != ?
                LEFT JOIN users u ON u.id = p2.user_id AND c.is_group = 0
                LEFT JOIN (
                    SELECT conversation_id, content, created_at, sender_id
                    FROM messages m1
                    WHERE m1.created_at = (
                        SELECT MAX(created_at) FROM messages m2 WHERE m2.conversation_id = m1.conversation_id
                    )
                ) m ON m.conversation_id = c.id
                WHERE p.user_id = ?
                GROUP BY c.id
                ORDER BY c.id DESC
                """,
                (user_id, user_id)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0],
                        "is_group": bool(r[1]),
                        "created_at": r[2],
                        "other_user_id": r[3],
                        "other_username": r[4],
                        "other_avatar": r[5],
                        "last_message": r[6],
                        "last_message_at": r[7],
                        "last_message_sender_id": r[8]
                    }
                    for r in rows_data
                ]
        return rows

@api_router.get("/conversations/{conversation_id}/messages")
async def get_messages(conversation_id: int, user_id: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    async with get_db() as conn:
            # Ensure membership
        if db_type == 'postgresql':
            member = await conn.fetchval(
                "SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2",
                conversation_id, user_id
            )
        else:  # sqlite
            async with conn.execute(
                "SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?",
                (conversation_id, user_id)
            ) as cursor:
                member = await cursor.fetchone()
        
        if not member:
                raise HTTPException(status_code=403, detail="Not a participant")
        
        if db_type == 'postgresql':
            rows = await conn.fetch(
                "SELECT id, sender_id, content, created_at FROM messages WHERE conversation_id=$1 ORDER BY created_at ASC LIMIT 500",
                conversation_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                "SELECT id, sender_id, content, created_at FROM messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 500",
                (conversation_id,)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0],
                        "sender_id": r[1],
                        "content": r[2],
                        "created_at": r[3]
                    }
                    for r in rows_data
                ]
        return rows

@api_router.post("/messages/send")
async def send_message(data: MessageSend, user_id: int = Depends(get_current_user_id)):
    if not data.content or (not data.conversation_id and not data.to_user_id):
        raise HTTPException(status_code=400, detail="Invalid payload")
    db_type = get_db_type()
    async with get_db() as conn:
        conversation_id = data.conversation_id
        # Create conversation with direct user if needed
        if conversation_id is None:
            to_user = data.to_user_id
            if to_user == user_id:
                raise HTTPException(status_code=400, detail="Cannot message yourself")
            # Try find existing two-user conversation
            if db_type == 'postgresql':
                row = await conn.fetchrow(
                    """
                    SELECT c.id FROM conversations c
                    JOIN conversation_participants p1 ON p1.conversation_id=c.id AND p1.user_id=$1
                    JOIN conversation_participants p2 ON p2.conversation_id=c.id AND p2.user_id=$2
                    WHERE c.is_group=0
                    LIMIT 1
                    """,
                    user_id, to_user
                )
                if row:
                    conversation_id = row['id']
                else:
                    # create new conversation
                    conversation_id = await conn.fetchval("INSERT INTO conversations (is_group) VALUES (0) RETURNING id")
                    await conn.execute("INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)", conversation_id, user_id)
                    await conn.execute("INSERT INTO conversation_participants (conversation_id, user_id) VALUES ($1, $2)", conversation_id, to_user)
            else:  # sqlite
                async with conn.execute(
                    """
                    SELECT c.id FROM conversations c
                    JOIN conversation_participants p1 ON p1.conversation_id=c.id AND p1.user_id=?
                    JOIN conversation_participants p2 ON p2.conversation_id=c.id AND p2.user_id=?
                    WHERE c.is_group=0
                    LIMIT 1
                    """,
                    (user_id, to_user)
                ) as cursor:
                    row = await cursor.fetchone()
                    if row:
                        conversation_id = row[0]
                    else:
                        # create new conversation
                        cursor = await conn.execute("INSERT INTO conversations (is_group) VALUES (0)")
                        await conn.commit()
                        conversation_id = cursor.lastrowid
                        await conn.execute("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)", (conversation_id, user_id))
                        await conn.execute("INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)", (conversation_id, to_user))
                        await conn.commit()

        # Ensure sender is participant
        if db_type == 'postgresql':
            member = await conn.fetchval(
                "SELECT 1 FROM conversation_participants WHERE conversation_id=$1 AND user_id=$2",
                conversation_id, user_id
            )
        else:  # sqlite
            async with conn.execute(
                "SELECT 1 FROM conversation_participants WHERE conversation_id=? AND user_id=?",
                (conversation_id, user_id)
            ) as cursor:
                member = await cursor.fetchone()

        if not member:
            raise HTTPException(status_code=403, detail="Not a participant")

        if db_type == 'postgresql':
            await conn.execute(
                "INSERT INTO messages (conversation_id, sender_id, content) VALUES ($1, $2, $3)",
                conversation_id, user_id, data.content
            )
            # Получаем участников диалога для создания уведомлений
            participants = await conn.fetch(
                "SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2",
                conversation_id, user_id
            )
        else:  # sqlite
            await conn.execute(
                "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
                (conversation_id, user_id, data.content)
            )
            await conn.commit()
            # Получаем участников диалога для создания уведомлений
            async with conn.execute(
                "SELECT user_id FROM conversation_participants WHERE conversation_id = ? AND user_id != ?",
                (conversation_id, user_id)
            ) as cursor:
                participants_data = await cursor.fetchall()
                participants = [{"user_id": r[0]} for r in participants_data]
        
        # Создаём уведомления для всех участников диалога
        for participant in participants:
            await create_notification(
                user_id=participant["user_id"],
                notif_type="message",
                actor_id=user_id,
                target_id=conversation_id,
                target_type="conversation",
                content="отправил(а) вам сообщение"
            )
        return {"status": "sent", "conversation_id": conversation_id}

# ===================== Notifications API =====================
@api_router.get("/notifications")
async def get_notifications(user_id: int = Depends(get_current_user_id)):
    """Получить уведомления пользователя"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT n.id, n.type, n.actor_id, n.target_id, n.target_type, n.content, n.is_read, n.created_at,
                       u.username as actor_username, u.avatar_url as actor_avatar
                FROM notifications n
                LEFT JOIN users u ON u.id = n.actor_id
                WHERE n.user_id = $1
                ORDER BY n.created_at DESC
                LIMIT 100
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT n.id, n.type, n.actor_id, n.target_id, n.target_type, n.content, n.is_read, n.created_at,
                       u.username as actor_username, u.avatar_url as actor_avatar
                FROM notifications n
                LEFT JOIN users u ON u.id = n.actor_id
                WHERE n.user_id = ?
                ORDER BY n.created_at DESC
                LIMIT 100
                """,
                (user_id,)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0],
                        "type": r[1],
                        "actor_id": r[2],
                        "target_id": r[3],
                        "target_type": r[4],
                        "content": r[5],
                        "is_read": bool(r[6]),
                        "created_at": r[7],
                        "actor_username": r[8],
                        "actor_avatar": r[9]
                    }
                    for r in rows_data
                ]
        return rows

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, user_id: int = Depends(get_current_user_id)):
    """Отметить уведомление как прочитанное"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
                notification_id, user_id
            )
        else:  # sqlite
            await conn.execute(
                "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
                (notification_id, user_id)
            )
            await conn.commit()
        return {"status": "read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(user_id: int = Depends(get_current_user_id)):
    """Отметить все уведомления как прочитанные"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
                user_id
            )
        else:  # sqlite
            await conn.execute(
                "UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0",
                (user_id,)
            )
            await conn.commit()
        return {"status": "all_read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(user_id: int = Depends(get_current_user_id)):
    """Получить количество непрочитанных уведомлений"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            count = await conn.fetchval(
                "SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE",
                user_id
            )
        else:  # sqlite
            async with conn.execute(
                "SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = 0",
                (user_id,)
            ) as cursor:
                row = await cursor.fetchone()
                count = row[0] if row else 0
        return {"count": count}

# ===================== Friends Requests API =====================
@api_router.get("/friends/requests")
async def get_friend_requests(user_id: int = Depends(get_current_user_id)):
    """Получить заявки в друзья (входящие и исходящие)"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            # Входящие заявки
            incoming = await conn.fetch(
                """
                SELECT f.id, f.requester_id, f.status, f.created_at,
                       u.id as user_id, u.username, u.email, u.avatar_url
                FROM friendships f
                JOIN users u ON u.id = f.requester_id
                WHERE f.addressee_id = $1 AND f.status = 'pending'
                ORDER BY f.created_at DESC
                """,
                user_id
            )
            # Исходящие заявки
            outgoing = await conn.fetch(
                """
                SELECT f.id, f.addressee_id, f.status, f.created_at,
                       u.id as user_id, u.username, u.email, u.avatar_url
                FROM friendships f
                JOIN users u ON u.id = f.addressee_id
                WHERE f.requester_id = $1 AND f.status = 'pending'
                ORDER BY f.created_at DESC
                """,
                user_id
            )
            incoming = [dict(r) for r in incoming]
            outgoing = [dict(r) for r in outgoing]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT f.id, f.requester_id, f.status, f.created_at,
                       u.id as user_id, u.username, u.email, u.avatar_url
                FROM friendships f
                JOIN users u ON u.id = f.requester_id
                WHERE f.addressee_id = ? AND f.status = 'pending'
                ORDER BY f.created_at DESC
                """,
                (user_id,)
            ) as cursor:
                incoming_data = await cursor.fetchall()
                incoming = [
                    {
                        "id": r[0],
                        "requester_id": r[1],
                        "status": r[2],
                        "created_at": r[3],
                        "user_id": r[4],
                        "username": r[5],
                        "email": r[6],
                        "avatar_url": r[7]
                    }
                    for r in incoming_data
                ]
            async with conn.execute(
                """
                SELECT f.id, f.addressee_id, f.status, f.created_at,
                       u.id as user_id, u.username, u.email, u.avatar_url
                FROM friendships f
                JOIN users u ON u.id = f.addressee_id
                WHERE f.requester_id = ? AND f.status = 'pending'
                ORDER BY f.created_at DESC
                """,
                (user_id,)
            ) as cursor:
                outgoing_data = await cursor.fetchall()
                outgoing = [
                    {
                        "id": r[0],
                        "addressee_id": r[1],
                        "status": r[2],
                        "created_at": r[3],
                        "user_id": r[4],
                        "username": r[5],
                        "email": r[6],
                        "avatar_url": r[7]
                    }
                    for r in outgoing_data
                ]
        return {"incoming": incoming, "outgoing": outgoing}

@api_router.get("/friends/suggestions")
async def get_friend_suggestions(user_id: int = Depends(get_current_user_id)):
    """Получить рекомендации друзей (пользователи, с которыми еще нет связи)"""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT u.id, u.username, u.email, u.avatar_url
                FROM users u
                WHERE u.id != $1
                  AND u.id NOT IN (
                      SELECT CASE WHEN requester_id = $1 THEN addressee_id ELSE requester_id END
                      FROM friendships
                      WHERE requester_id = $1 OR addressee_id = $1
                  )
                ORDER BY u.created_at DESC
                LIMIT 20
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT u.id, u.username, u.email, u.avatar_url
                FROM users u
                WHERE u.id != ?
                  AND u.id NOT IN (
                      SELECT CASE WHEN requester_id = ? THEN addressee_id ELSE requester_id END
                      FROM friendships
                      WHERE requester_id = ? OR addressee_id = ?
                  )
                ORDER BY u.created_at DESC
                LIMIT 20
                """,
                (user_id, user_id, user_id, user_id)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0],
                        "username": r[1],
                        "email": r[2],
                        "avatar_url": r[3]
                    }
                    for r in rows_data
                ]
        return rows

# ===================== Admin API (prefix /api, path /admin/...) =====================
@api_router.get("/admin/stats")
async def admin_stats(_admin_id: int = Depends(get_current_admin)):
    """Полная статистика для админки: пользователи, посты, активность, сообщества."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            total_users = await conn.fetchval("SELECT COUNT(*) FROM users")
            users_today = await conn.fetchval(
                "SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE")
            users_week = await conn.fetchval(
                "SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'")
            users_month = await conn.fetchval(
                "SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'")
            banned_count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE is_banned = TRUE")
            admin_count = await conn.fetchval("SELECT COUNT(*) FROM users WHERE is_admin = TRUE")
            total_posts = await conn.fetchval("SELECT COUNT(*) FROM posts")
            posts_today = await conn.fetchval(
                "SELECT COUNT(*) FROM posts WHERE created_at >= CURRENT_DATE")
            posts_week = await conn.fetchval(
                "SELECT COUNT(*) FROM posts WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'")
            total_messages = await conn.fetchval("SELECT COUNT(*) FROM messages")
            messages_today = await conn.fetchval(
                "SELECT COUNT(*) FROM messages WHERE created_at >= CURRENT_DATE")
            total_friendships = await conn.fetchval(
                "SELECT COUNT(*) FROM friendships WHERE status = 'accepted'")
            total_notifications = await conn.fetchval("SELECT COUNT(*) FROM notifications")
            unread_notifications = await conn.fetchval(
                "SELECT COUNT(*) FROM notifications WHERE is_read = FALSE")
            communities_count = await conn.fetchval(
                "SELECT COUNT(*) FROM users WHERE community_name IS NOT NULL AND community_name != ''")
            active_last_24h = await conn.fetchval("""
                SELECT COUNT(DISTINCT u.id) FROM users u
                WHERE EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id AND p.created_at >= NOW() - INTERVAL '24 hours')
                   OR EXISTS (SELECT 1 FROM messages m WHERE m.sender_id = u.id AND m.created_at >= NOW() - INTERVAL '24 hours')
            """)
        else:
            async def _fetchval(conn, sql, params=()):
                cur = await conn.execute(sql, params if params else ())
                row = await cur.fetchone()
                return row[0] if row else 0
            total_users = await _fetchval(conn, "SELECT COUNT(*) FROM users")
            users_today = await _fetchval(conn, "SELECT COUNT(*) FROM users WHERE date(created_at) >= date('now')")
            users_week = await _fetchval(conn, "SELECT COUNT(*) FROM users WHERE created_at >= datetime('now', '-7 days')")
            users_month = await _fetchval(conn, "SELECT COUNT(*) FROM users WHERE created_at >= datetime('now', '-30 days')")
            banned_count = await _fetchval(conn, "SELECT COUNT(*) FROM users WHERE is_banned = 1")
            admin_count = await _fetchval(conn, "SELECT COUNT(*) FROM users WHERE is_admin = 1")
            total_posts = await _fetchval(conn, "SELECT COUNT(*) FROM posts")
            posts_today = await _fetchval(conn, "SELECT COUNT(*) FROM posts WHERE date(created_at) >= date('now')")
            posts_week = await _fetchval(conn, "SELECT COUNT(*) FROM posts WHERE created_at >= datetime('now', '-7 days')")
            total_messages = await _fetchval(conn, "SELECT COUNT(*) FROM messages")
            messages_today = await _fetchval(conn, "SELECT COUNT(*) FROM messages WHERE date(created_at) >= date('now')")
            total_friendships = await _fetchval(conn, "SELECT COUNT(*) FROM friendships WHERE status = 'accepted'")
            total_notifications = await _fetchval(conn, "SELECT COUNT(*) FROM notifications")
            unread_notifications = await _fetchval(conn, "SELECT COUNT(*) FROM notifications WHERE is_read = 0")
            communities_count = await _fetchval(conn, "SELECT COUNT(*) FROM users WHERE community_name IS NOT NULL AND community_name != ''")
            active_last_24h = await _fetchval(conn, """
                SELECT COUNT(DISTINCT u.id) FROM users u
                WHERE EXISTS (SELECT 1 FROM posts p WHERE p.author_id = u.id AND p.created_at >= datetime('now', '-24 hours'))
                   OR EXISTS (SELECT 1 FROM messages m WHERE m.sender_id = u.id AND m.created_at >= datetime('now', '-24 hours'))
            """)
    return {
        "users": {
            "total": total_users,
            "registered_today": users_today,
            "registered_this_week": users_week,
            "registered_this_month": users_month,
            "active_last_24h": active_last_24h or 0,
            "banned": banned_count,
            "admins": admin_count,
        },
        "posts": {
            "total": total_posts,
            "today": posts_today,
            "this_week": posts_week,
        },
        "messages": {"total": total_messages, "today": messages_today},
        "friendships": {"accepted": total_friendships},
        "notifications": {"total": total_notifications, "unread": unread_notifications},
        "communities": communities_count,
    }


@api_router.get("/admin/users")
async def admin_list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=PAGINATION_MAX_LIMIT),
    search: Optional[str] = None,
    _admin_id: int = Depends(get_current_admin),
):
    """Список всех пользователей (только админ)."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            if search:
                rows = await conn.fetch(
                    """SELECT id, username, email, avatar_url, is_admin, is_banned, created_at
                       FROM users WHERE username ILIKE $1 OR email ILIKE $1 ORDER BY id LIMIT $2 OFFSET $3""",
                    f"%{search}%", limit, skip
                )
            else:
                rows = await conn.fetch(
                    "SELECT id, username, email, avatar_url, is_admin, is_banned, created_at FROM users ORDER BY id LIMIT $1 OFFSET $2",
                    limit, skip
                )
            out = [dict(r) for r in rows]
        else:
            if search:
                async with conn.execute(
                    """SELECT id, username, email, avatar_url, is_admin, is_banned, created_at
                       FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY id LIMIT ? OFFSET ?""",
                    (f"%{search}%", f"%{search}%", limit, skip)
                ) as cursor:
                    rows = await cursor.fetchall()
            else:
                async with conn.execute(
                    "SELECT id, username, email, avatar_url, is_admin, is_banned, created_at FROM users ORDER BY id LIMIT ? OFFSET ?",
                    (limit, skip)
                ) as cursor:
                    rows = await cursor.fetchall()
            out = [
                {"id": r[0], "username": r[1], "email": r[2], "avatar_url": r[3], "is_admin": bool(r[4]) if len(r) > 4 else False, "is_banned": bool(r[5]) if len(r) > 5 else False, "created_at": r[6] if len(r) > 6 else None}
                for r in rows
            ]
    return {"users": out, "skip": skip, "limit": limit}

@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: int, _admin_id: int = Depends(get_current_admin)):
    """Данные пользователя для админки."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                "SELECT id, username, email, avatar_url, bio, is_admin, is_banned, community_name, community_description, created_at FROM users WHERE id = $1",
                user_id
            )
            out = dict(row) if row else None
        else:
            async with conn.execute(
                "SELECT id, username, email, avatar_url, bio, is_admin, is_banned, community_name, community_description, created_at FROM users WHERE id = ?",
                (user_id,)
            ) as cursor:
                r = await cursor.fetchone()
            out = {"id": r[0], "username": r[1], "email": r[2], "avatar_url": r[3], "bio": r[4] if len(r) > 4 else None, "is_admin": bool(r[5]) if len(r) > 5 else False, "is_banned": bool(r[6]) if len(r) > 6 else False, "community_name": r[7] if len(r) > 7 else None, "community_description": r[8] if len(r) > 8 else None, "created_at": r[9] if len(r) > 9 else None} if r else None
    if not out:
        raise HTTPException(status_code=404, detail="User not found")
    return out

@api_router.patch("/admin/users/{user_id}")
async def admin_update_user(user_id: int, data: AdminUserUpdate, _admin_id: int = Depends(get_current_admin)):
    """Обновить пользователя (бан, права админа)."""
    db_type = get_db_type()
    updates, values = [], []
    if data.is_banned is not None:
        updates.append(("is_banned", data.is_banned))
    if data.is_admin is not None:
        updates.append(("is_admin", data.is_admin))
    if not updates:
        return {"ok": True}
    async with get_db() as conn:
        if db_type == 'postgresql':
            set_parts = [f"{k} = ${i+1}" for i, (k, _) in enumerate(updates)]
            values = [v for _, v in updates] + [user_id]
            sql = "UPDATE users SET " + ", ".join(set_parts) + " WHERE id = $" + str(len(values))
            await conn.execute(sql, *values)
        else:
            set_parts = [f"{k} = ?" for k, _ in updates]
            values = [v for _, v in updates] + [user_id]
            sql = "UPDATE users SET " + ", ".join(set_parts) + " WHERE id = ?"
            await conn.execute(sql, tuple(values))
            await conn.commit()
    return {"ok": True}

@api_router.get("/admin/posts")
async def admin_list_posts(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=PAGINATION_MAX_LIMIT),
    _admin_id: int = Depends(get_current_admin),
):
    """Все посты для модерации."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.created_at, u.username
                   FROM posts p JOIN users u ON p.author_id = u.id ORDER BY p.created_at DESC LIMIT $1 OFFSET $2""",
                limit, skip
            )
            out = [{"id": r["id"], "author_id": r["author_id"], "author_username": r["username"], "content": r["content"], "images": json.loads(r["images"]) if isinstance(r["images"], str) else (r["images"] or []), "likes_count": r["likes_count"], "created_at": r["created_at"]} for r in rows]
        else:
            async with conn.execute(
                """SELECT p.id, p.author_id, p.content, p.images, p.likes_count, p.created_at, u.username
                   FROM posts p JOIN users u ON p.author_id = u.id ORDER BY p.created_at DESC LIMIT ? OFFSET ?""",
                (limit, skip)
            ) as cursor:
                rows = await cursor.fetchall()
            out = [{"id": r[0], "author_id": r[1], "content": r[2], "images": json.loads(r[3]) if r[3] else [], "likes_count": r[4], "created_at": r[5], "author_username": r[6]} for r in rows]
    return {"posts": out, "skip": skip, "limit": limit}

@api_router.delete("/admin/posts/{post_id}")
async def admin_delete_post(post_id: int, _admin_id: int = Depends(get_current_admin)):
    """Удалить пост (модерация)."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            await conn.execute("DELETE FROM posts WHERE id = $1", post_id)
        else:
            await conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
            await conn.commit()
    return {"ok": True}

@api_router.get("/admin/communities")
async def admin_list_communities(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=PAGINATION_MAX_LIMIT),
    _admin_id: int = Depends(get_current_admin),
):
    """Пользователи с заполненным сообществом (community_name)."""
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """SELECT id, username, email, avatar_url, community_name, community_description
                   FROM users WHERE community_name IS NOT NULL AND community_name != '' ORDER BY id LIMIT $1 OFFSET $2""",
                limit, skip
            )
            out = [dict(r) for r in rows]
        else:
            async with conn.execute(
                """SELECT id, username, email, avatar_url, community_name, community_description
                   FROM users WHERE community_name IS NOT NULL AND community_name != '' ORDER BY id LIMIT ? OFFSET ?""",
                (limit, skip)
            ) as cursor:
                rows = await cursor.fetchall()
            out = [{"id": r[0], "username": r[1], "email": r[2], "avatar_url": r[3], "community_name": r[4], "community_description": r[5] if len(r) > 5 else None} for r in rows]
    return {"communities": out, "skip": skip, "limit": limit}


# ===================== Health (для мониторинга и load balancer) =====================
@api_router.get("/health")
async def health():
    """Проверка доступности API и БД. Возвращает 200 при успехе."""
    try:
        async with get_db() as conn:
            if get_db_type() == "postgresql":
                await conn.fetchval("SELECT 1")
            else:
                await conn.execute("SELECT 1")
        return {"status": "ok", "database": get_db_type()}
    except Exception as e:
        logging.exception("Health check failed: %s", e)
        raise HTTPException(status_code=503, detail="Database unavailable")


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Добавляет заголовки безопасности к ответам."""

    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


app.add_middleware(SecurityHeadersMiddleware)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
