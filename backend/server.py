from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import RedirectResponse
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
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

class RegisterInput(BaseModel):
    username: str
    email: str
    password: str

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

class UserSearchResponse(BaseModel):
    id: int
    username: str
    email: str
    avatar_url: Optional[str] = None

class FriendAction(BaseModel):
    user_id: int

class MessageSend(BaseModel):
    conversation_id: Optional[int] = None
    to_user_id: Optional[int] = None
    content: str

# Startup event
@app.on_event("startup")
async def startup_event():
    """Инициализация при старте приложения"""
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

async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    """Получить ID текущего пользователя из JWT"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid token")
    # Доп. проверка, что пользователь существует
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow("SELECT id FROM users WHERE id = $1", user_id)
        else:  # sqlite
            async with conn.execute("SELECT id FROM users WHERE id = ?", (user_id,)) as cursor:
                row = await cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="User not found")
    return user_id

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

# ===================== Auth API =====================
@api_router.post("/auth/register", response_model=UserPublic)
async def register_user(data: RegisterInput):
    db_type = get_db_type()
    async with get_db() as conn:
        # Проверяем уникальность
        if db_type == 'postgresql':
            exists = await conn.fetchrow(
                "SELECT id FROM users WHERE username = $1 OR email = $2",
                data.username, data.email
            )
        else:  # sqlite
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
        else:  # sqlite
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
        # Находим по username или email
        if db_type == 'postgresql':
            user = await conn.fetchrow(
                "SELECT id, password_hash FROM users WHERE username = $1 OR email = $1",
                data.username_or_email
            )
            if user:
                user = dict(user)
        else:  # sqlite
            async with conn.execute(
                "SELECT id, password_hash FROM users WHERE username = ? OR email = ?",
                (data.username_or_email, data.username_or_email)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    user = {"id": row[0], "password_hash": row[1]}
                else:
                    user = None
        
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        token = create_access_token({"sub": str(user["id"])})
        return TokenResponse(access_token=token)

# ===================== Users API =====================
@api_router.get("/users/me", response_model=UserPublic)
async def get_me(user_id: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                "SELECT id, username, email, avatar_url FROM users WHERE id = $1",
                user_id
            )
            if row:
                row = dict(row)
        else:  # sqlite
            async with conn.execute(
                "SELECT id, username, email, avatar_url FROM users WHERE id = ?",
                (user_id,)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "username": row_data[1],
                        "email": row_data[2],
                        "avatar_url": row_data[3]
                    }
                else:
                    row = None
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return UserPublic(**row)

@api_router.get("/users/{id}", response_model=UserPublic)
async def get_user_by_id(id: int, _uid: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            row = await conn.fetchrow(
                "SELECT id, username, email, avatar_url FROM users WHERE id = $1",
                id
            )
            if row:
                row = dict(row)
        else:  # sqlite
            async with conn.execute(
                "SELECT id, username, email, avatar_url FROM users WHERE id = ?",
                (id,)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "username": row_data[1],
                        "email": row_data[2],
                        "avatar_url": row_data[3]
                    }
                else:
                    row = None
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return UserPublic(**row)

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
                "SELECT id, username, email, avatar_url FROM users WHERE id = $1",
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
                "SELECT id, username, email, avatar_url FROM users WHERE id = ?",
                (user_id,)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "username": row_data[1],
                        "email": row_data[2],
                        "avatar_url": row_data[3]
                    }
                else:
                    row = None
        
        if not row:
            raise HTTPException(status_code=404, detail="User not found")
        return UserPublic(**row)

@api_router.get("/users/search", response_model=List[UserSearchResponse])
async def search_users(q: str, _uid: int = Depends(get_current_user_id)):
    like = f"%{q}%"
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                "SELECT id, username, email, avatar_url FROM users WHERE username LIKE $1 OR email LIKE $2 ORDER BY username LIMIT 50",
                like, like
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                "SELECT id, username, email, avatar_url FROM users WHERE username LIKE ? OR email LIKE ? ORDER BY username LIMIT 50",
                (like, like)
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
        return [UserSearchResponse(**r) for r in rows]

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

# ===================== Friends API =====================
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
            if row:
                row = dict(row)
        else:  # sqlite
            async with conn.execute(
                """
                SELECT id, requester_id, addressee_id, status FROM friendships
                WHERE (requester_id=? AND addressee_id=?) OR (requester_id=? AND addressee_id=?)
                """,
                (user_id, data.user_id, data.user_id, user_id)
            ) as cursor:
                row_data = await cursor.fetchone()
                if row_data:
                    row = {
                        "id": row_data[0],
                        "requester_id": row_data[1],
                        "addressee_id": row_data[2],
                        "status": row_data[3]
                    }
                else:
                    row = None
        
        if row:
            if row["status"] == 'accepted':
                raise HTTPException(status_code=400, detail="Already friends")
            if row["requester_id"] == user_id and row["status"] == 'pending':
                raise HTTPException(status_code=400, detail="Request already sent")
            # If inverse pending exists, accept it
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

# ===================== Messaging API =====================
@api_router.get("/conversations")
async def list_conversations(user_id: int = Depends(get_current_user_id)):
    db_type = get_db_type()
    async with get_db() as conn:
        if db_type == 'postgresql':
            rows = await conn.fetch(
                """
                SELECT c.id, c.is_group, c.created_at
                FROM conversation_participants p
                JOIN conversations c ON c.id = p.conversation_id
                WHERE p.user_id = $1
                ORDER BY c.id DESC
                """,
                user_id
            )
            rows = [dict(r) for r in rows]
        else:  # sqlite
            async with conn.execute(
                """
                SELECT c.id, c.is_group, c.created_at
                FROM conversation_participants p
                JOIN conversations c ON c.id = p.conversation_id
                WHERE p.user_id = ?
                ORDER BY c.id DESC
                """,
                (user_id,)
            ) as cursor:
                rows_data = await cursor.fetchall()
                rows = [
                    {
                        "id": r[0],
                        "is_group": bool(r[1]),
                        "created_at": r[2]
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
        else:  # sqlite
            await conn.execute(
                "INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)",
                (conversation_id, user_id, data.content)
            )
            await conn.commit()
        return {"status": "sent", "conversation_id": conversation_id}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
