# 📚 MAKSUM Backend API - Полная документация

## 📋 Содержание

1. [Обзор](#обзор)
2. [Технологии](#технологии)
3. [Структура проекта](#структура-проекта)
4. [Настройка и запуск](#настройка-и-запуск)
5. [Аутентификация](#аутентификация)
6. [API Эндпоинты](#api-эндпоинты)
7. [Модели данных](#модели-данных)
8. [База данных](#база-данных)
9. [Обработка ошибок](#обработка-ошибок)

---

## 🔍 Обзор

**MAKSUM Backend** — это REST API сервер для социальной сети, построенный на FastAPI.

### Основные возможности:
- Регистрация и авторизация пользователей (JWT)
- Управление профилем пользователя
- Система друзей (заявки, принятие, удаление)
- Личные сообщения и диалоги
- Настройки темы интерфейса
- Поддержка PostgreSQL и SQLite

### Базовые URL:
- **Локальный сервер:** `http://localhost:8001`
- **API базовый путь:** `http://localhost:8001/api`
- **Swagger документация:** `http://localhost:8001/docs`
- **ReDoc документация:** `http://localhost:8001/redoc`

---

## 🛠 Технологии

| Технология | Версия | Описание |
|------------|--------|----------|
| FastAPI | 0.110.1 | Основной веб-фреймворк |
| Uvicorn | 0.25.0 | ASGI сервер |
| Python | 3.11+ | Язык программирования |
| asyncpg | 0.29.0 | Async PostgreSQL драйвер |
| aiosqlite | 0.19.0 | Async SQLite драйвер |
| bcrypt | 4.0.0 | Хеширование паролей |
| python-jose | 3.3.0 | JWT токены |
| Pydantic | 2.6.4 | Валидация данных |

---

## 📁 Структура проекта

```
backend/
├── server.py           # Главный файл приложения
├── database.py         # Модуль работы с БД
├── requirements.txt    # Python зависимости
├── .env               # Переменные окружения (создать)
└── data/
    └── maksum.db      # SQLite база (создается автоматически)
```

### Файл `server.py`
Содержит:
- Инициализацию FastAPI приложения
- Все API эндпоинты
- Модели Pydantic для запросов/ответов
- Функции аутентификации
- Middleware (CORS)

### Файл `database.py`
Содержит:
- Автоматическое определение типа БД (PostgreSQL/SQLite)
- Инициализацию таблиц
- Async context manager для подключений
- Функции конвертации SQL между БД

---

## ⚙️ Настройка и запуск

### 1. Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

### 2. Создание файла `.env`

```env
# JWT настройки
JWT_SECRET=your_super_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=60

# PostgreSQL (для продакшн)
POSTGRES_URL=postgresql://user:password@localhost:5432/maksum_db
# ИЛИ отдельные параметры:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_DB=maksum_db

# CORS (разделять запятой)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

### 3. Запуск сервера

```bash
# Режим разработки (с hot reload)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload

# Продакшн
uvicorn server:app --host 0.0.0.0 --port 8001 --workers 4
```

### 4. Проверка работы

```bash
curl http://localhost:8001/api/
# Ответ: {"message": "Hello World"}
```

---

## 🔐 Аутентификация

### Тип: Bearer Token (JWT)

Все защищенные эндпоинты требуют заголовок:
```
Authorization: Bearer <access_token>
```

### Структура JWT токена

```json
{
  "sub": "user_id",
  "exp": 1234567890
}
```

### Время жизни токена
По умолчанию: **60 минут** (настраивается через `ACCESS_TOKEN_EXPIRE_MINUTES`)

### Алгоритм
**HS256** (HMAC с SHA-256)

---

## 📡 API Эндпоинты

### Общая информация

| Метод | Путь | Аутентификация | Описание |
|-------|------|----------------|----------|
| GET | `/api/` | ❌ | Проверка работы API |

---

### 🔑 Auth API (Авторизация)

#### POST `/api/auth/register`
Регистрация нового пользователя.

**Аутентификация:** Не требуется

**Тело запроса:**
```json
{
  "username": "ivan_petrov",
  "email": "ivan@example.com",
  "password": "securePassword123"
}
```

**Успешный ответ (200):**
```json
{
  "id": 1,
  "username": "ivan_petrov",
  "email": "ivan@example.com",
  "avatar_url": null
}
```

**Ошибки:**
- `400` — Username или email уже используется

**Пример curl:**
```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "ivan", "email": "ivan@test.com", "password": "test123"}'
```

---

#### POST `/api/auth/login`
Авторизация пользователя.

**Аутентификация:** Не требуется

**Тело запроса:**
```json
{
  "username_or_email": "ivan@example.com",
  "password": "securePassword123"
}
```

**Успешный ответ (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

**Ошибки:**
- `401` — Неверные учетные данные

**Пример curl:**
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username_or_email": "ivan@test.com", "password": "test123"}'
```

---

### 👤 Users API (Пользователи)

#### GET `/api/users/me`
Получить данные текущего пользователя.

**Аутентификация:** ✅ Требуется

**Успешный ответ (200):**
```json
{
  "id": 1,
  "username": "ivan_petrov",
  "email": "ivan@example.com",
  "avatar_url": "https://example.com/avatar.jpg"
}
```

**Пример curl:**
```bash
curl http://localhost:8001/api/users/me \
  -H "Authorization: Bearer <token>"
```

---

#### GET `/api/users/{id}`
Получить данные пользователя по ID.

**Аутентификация:** ✅ Требуется

**Параметры пути:**
- `id` (integer) — ID пользователя

**Успешный ответ (200):**
```json
{
  "id": 2,
  "username": "maria_ivanova",
  "email": "maria@example.com",
  "avatar_url": null
}
```

**Ошибки:**
- `404` — Пользователь не найден

---

#### PUT `/api/users/me`
Обновить данные текущего пользователя.

**Аутентификация:** ✅ Требуется

**Тело запроса (все поля опциональны):**
```json
{
  "username": "new_username",
  "email": "new_email@example.com",
  "avatar_url": "https://example.com/new_avatar.jpg"
}
```

**Успешный ответ (200):**
```json
{
  "id": 1,
  "username": "new_username",
  "email": "new_email@example.com",
  "avatar_url": "https://example.com/new_avatar.jpg"
}
```

**Ошибки:**
- `400` — Нет полей для обновления

---

#### GET `/api/users/search?q={query}`
Поиск пользователей по username или email.

**Аутентификация:** ✅ Требуется

**Query параметры:**
- `q` (string) — Поисковый запрос

**Успешный ответ (200):**
```json
[
  {
    "id": 2,
    "username": "maria_ivanova",
    "email": "maria@example.com",
    "avatar_url": null
  },
  {
    "id": 3,
    "username": "maria_petrova",
    "email": "maria2@example.com",
    "avatar_url": "https://example.com/avatar.jpg"
  }
]
```

**Лимит:** 50 результатов

---

#### GET `/api/users/me/avatar`
Получить аватар текущего пользователя.

**Аутентификация:** ✅ Требуется

**Ответ:**
- Если аватар установлен: **Redirect** на URL аватара
- Если аватар не установлен: **SVG placeholder** (серый силуэт)

**Content-Type:** `image/svg+xml` (для placeholder)

---

### 🎨 Theme API (Тема)

#### GET `/api/user/theme`
Получить настройки темы пользователя.

**Аутентификация:** ✅ Требуется

**Успешный ответ (200):**
```json
{
  "mode": "light",
  "palette": "blue"
}
```

---

#### PUT `/api/user/theme`
Обновить настройки темы.

**Аутентификация:** ✅ Требуется

**Тело запроса:**
```json
{
  "mode": "dark",
  "palette": "dark-blue"
}
```

**Валидные значения:**
- `mode`: `"light"`, `"dark"`
- `palette` для light: `"blue"`, `"green"`, `"purple"`
- `palette` для dark: `"dark-blue"`, `"dark-green"`, `"dark-purple"`

**Ошибки:**
- `400` — Невалидный mode или palette

---

### 👥 Friends API (Друзья)

#### GET `/api/friends`
Получить список друзей.

**Аутентификация:** ✅ Требуется

**Успешный ответ (200):**
```json
[
  {
    "id": 2,
    "username": "maria_ivanova",
    "email": "maria@example.com",
    "avatar_url": null
  }
]
```

---

#### POST `/api/friends/request`
Отправить заявку в друзья.

**Аутентификация:** ✅ Требуется

**Тело запроса:**
```json
{
  "user_id": 2
}
```

**Успешные ответы:**
```json
{"status": "pending"}   // Заявка отправлена
{"status": "accepted"}  // Заявка автоматически принята (взаимная)
```

**Ошибки:**
- `400` — Нельзя добавить себя / Уже друзья / Заявка уже отправлена

---

#### POST `/api/friends/accept`
Принять заявку в друзья.

**Аутентификация:** ✅ Требуется

**Тело запроса:**
```json
{
  "user_id": 3
}
```

**Успешный ответ (200):**
```json
{"status": "accepted"}
```

**Ошибки:**
- `404` — Заявка не найдена

---

#### POST `/api/friends/remove`
Удалить из друзей.

**Аутентификация:** ✅ Требуется

**Тело запроса:**
```json
{
  "user_id": 2
}
```

**Успешный ответ (200):**
```json
{"status": "removed"}
```

---

### 💬 Messages API (Сообщения)

#### GET `/api/conversations`
Получить список диалогов пользователя.

**Аутентификация:** ✅ Требуется

**Успешный ответ (200):**
```json
[
  {
    "id": 1,
    "is_group": false,
    "created_at": "2024-01-15T10:30:00"
  },
  {
    "id": 2,
    "is_group": true,
    "created_at": "2024-01-14T15:45:00"
  }
]
```

---

#### GET `/api/conversations/{conversation_id}/messages`
Получить сообщения диалога.

**Аутентификация:** ✅ Требуется

**Параметры пути:**
- `conversation_id` (integer) — ID диалога

**Успешный ответ (200):**
```json
[
  {
    "id": 1,
    "sender_id": 1,
    "content": "Привет!",
    "created_at": "2024-01-15T10:30:00"
  },
  {
    "id": 2,
    "sender_id": 2,
    "content": "Привет! Как дела?",
    "created_at": "2024-01-15T10:31:00"
  }
]
```

**Лимит:** 500 сообщений

**Ошибки:**
- `403` — Вы не участник диалога

---

#### POST `/api/messages/send`
Отправить сообщение.

**Аутентификация:** ✅ Требуется

**Тело запроса (вариант 1 — в существующий диалог):**
```json
{
  "conversation_id": 1,
  "content": "Текст сообщения"
}
```

**Тело запроса (вариант 2 — новый диалог с пользователем):**
```json
{
  "to_user_id": 2,
  "content": "Привет! Это первое сообщение"
}
```

**Успешный ответ (200):**
```json
{
  "status": "sent",
  "conversation_id": 1
}
```

**Ошибки:**
- `400` — Невалидный payload / Нельзя писать себе
- `403` — Вы не участник диалога

---

### 📊 Status API (Статус)

#### GET `/api/status`
Получить записи статуса (для мониторинга).

**Аутентификация:** Не требуется

**Успешный ответ (200):**
```json
[
  {
    "id": "uuid-string",
    "client_name": "frontend",
    "timestamp": "2024-01-15T10:30:00"
  }
]
```

---

#### POST `/api/status`
Создать запись статуса.

**Аутентификация:** Не требуется

**Тело запроса:**
```json
{
  "client_name": "frontend"
}
```

**Успешный ответ (200):**
```json
{
  "id": "generated-uuid",
  "client_name": "frontend",
  "timestamp": "2024-01-15T10:30:00"
}
```

---

## 📦 Модели данных

### Pydantic модели запросов

```python
# Регистрация
class RegisterInput:
    username: str
    email: str
    password: str

# Авторизация
class LoginInput:
    username_or_email: str
    password: str

# Обновление пользователя
class UserUpdate:
    username: Optional[str]
    email: Optional[str]
    avatar_url: Optional[str]

# Обновление темы
class ThemeUpdate:
    mode: str        # "light" | "dark"
    palette: str     # "blue" | "green" | "purple" | "dark-blue" | "dark-green" | "dark-purple"

# Действия с друзьями
class FriendAction:
    user_id: int

# Отправка сообщения
class MessageSend:
    conversation_id: Optional[int]
    to_user_id: Optional[int]
    content: str
```

### Pydantic модели ответов

```python
# Публичные данные пользователя
class UserPublic:
    id: int
    username: str
    email: str
    avatar_url: Optional[str]

# Токен авторизации
class TokenResponse:
    access_token: str
    token_type: str = "bearer"

# Тема пользователя
class UserThemeResponse:
    mode: str
    palette: str

# Проверка статуса
class StatusCheck:
    id: str
    client_name: str
    timestamp: datetime
```

---

## 🗄 База данных

### Поддерживаемые СУБД

| СУБД | Использование | Драйвер |
|------|---------------|---------|
| PostgreSQL | Продакшн | asyncpg |
| SQLite | Разработка | aiosqlite |

### Автоматическое переключение

Система автоматически выбирает БД:
1. Если есть `POSTGRES_URL` или `POSTGRES_HOST` — PostgreSQL
2. Иначе — SQLite (файл `backend/data/maksum.db`)

### Схема таблиц

#### users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(1024) NULL,
    theme_mode VARCHAR(20) DEFAULT 'light',
    theme_palette VARCHAR(50) DEFAULT 'blue',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### friendships
```sql
CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);
```

#### conversations
```sql
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    is_group BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### conversation_participants
```sql
CREATE TABLE conversation_participants (
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (conversation_id, user_id)
);
```

#### messages
```sql
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### status_checks
```sql
CREATE TABLE status_checks (
    id VARCHAR(36) PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);
```

### Индексы

```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at);
CREATE INDEX idx_status_checks_timestamp ON status_checks(timestamp);
```

---

## ⚠️ Обработка ошибок

### HTTP коды ошибок

| Код | Описание |
|-----|----------|
| 400 | Bad Request — невалидные данные |
| 401 | Unauthorized — требуется авторизация или невалидный токен |
| 403 | Forbidden — нет доступа к ресурсу |
| 404 | Not Found — ресурс не найден |
| 500 | Internal Server Error — ошибка сервера |

### Формат ошибки

```json
{
  "detail": "Описание ошибки"
}
```

### Примеры ошибок

```json
// 400 - Регистрация с существующим email
{"detail": "Username or email already in use"}

// 401 - Неверный логин/пароль
{"detail": "Invalid credentials"}

// 401 - Невалидный токен
{"detail": "Invalid token"}

// 403 - Не участник диалога
{"detail": "Not a participant"}

// 404 - Пользователь не найден
{"detail": "User not found"}
```

---

## 🔧 Функции безопасности

### Хеширование паролей

```python
import bcrypt

def hash_password(password: str) -> str:
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(password: str, password_hash: str) -> bool:
    password_bytes = password.encode('utf-8')
    hash_bytes = password_hash.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hash_bytes)
```

### Создание JWT токена

```python
from jose import jwt
from datetime import datetime, timedelta

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=60))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm="HS256")
```

---

## 📝 Примеры использования

### Полный флоу регистрации и авторизации

```bash
# 1. Регистрация
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test_user", "email": "test@test.com", "password": "password123"}'

# Ответ: {"id": 1, "username": "test_user", "email": "test@test.com", "avatar_url": null}

# 2. Авторизация
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username_or_email": "test@test.com", "password": "password123"}'

# Ответ: {"access_token": "eyJ...", "token_type": "bearer"}

# 3. Получение профиля
curl http://localhost:8001/api/users/me \
  -H "Authorization: Bearer eyJ..."

# Ответ: {"id": 1, "username": "test_user", "email": "test@test.com", "avatar_url": null}
```

### Отправка сообщения

```bash
# Отправка первого сообщения пользователю (создаст диалог)
curl -X POST http://localhost:8001/api/messages/send \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"to_user_id": 2, "content": "Привет!"}'

# Ответ: {"status": "sent", "conversation_id": 1}

# Отправка в существующий диалог
curl -X POST http://localhost:8001/api/messages/send \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"conversation_id": 1, "content": "Как дела?"}'
```

---

## 🚀 Deployment

### Переменные окружения для продакшн

```env
JWT_SECRET=<very-long-random-string>
ACCESS_TOKEN_EXPIRE_MINUTES=60
POSTGRES_URL=postgresql://user:password@host:5432/maksum_db
CORS_ORIGINS=https://your-frontend-domain.com
```

### Запуск с Gunicorn

```bash
pip install gunicorn
gunicorn server:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8001
```

### Docker (пример)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 📊 Мониторинг

### Health check

```bash
curl http://localhost:8001/api/
# {"message": "Hello World"}
```

### Логирование

Логи выводятся в stdout в формате:
```
2024-01-15 10:30:00 - root - INFO - Database initialized: sqlite
```

---

**Документация актуальна на:** Январь 2025
**Версия API:** 1.0
