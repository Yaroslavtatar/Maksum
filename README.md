# MAKSUM — социальная сеть (аналог VK)

Современный клон социальной сети с полным бэкендом, JWT-авторизацией, лентой постов, друзьями, сообщениями, уведомлениями и рекомендациями по интересам.

---

## Стек технологий

| Часть | Технологии |
|-------|------------|
| **Frontend** | React 18, Tailwind CSS, ShadCN/UI, React Router v6, Axios |
| **Backend** | FastAPI (Python 3.11+), JWT (python-jose), bcrypt |
| **БД** | PostgreSQL (продакшн) или SQLite (разработка) — asyncpg / aiosqlite |
| **API** | REST, полная документация в [BACKEND_API_DOCUMENTATION.md](BACKEND_API_DOCUMENTATION.md) |

---

## Быстрый старт

### Требования

- Node.js 18+
- Python 3.11+
- npm или yarn

### 1. Backend

```bash
cd backend
pip install -r requirements.txt
# Опционально: создайте .env (POSTGRES_URL или оставьте по умолчанию — будет SQLite)
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

- API: `http://localhost:8001/api`
- Swagger: `http://localhost:8001/docs`
- По умолчанию используется SQLite: `backend/data/maksum.db`

### 2. Frontend

```bash
cd frontend
npm install
# В .env задайте REACT_APP_BACKEND_URL=http://localhost:8001 при необходимости
npm start
```

- Приложение: `http://localhost:3000`

---

## Структура проекта

```
├── backend/
│   ├── server.py           # FastAPI: маршруты, модели, JWT
│   ├── database.py         # Инициализация БД (PostgreSQL/SQLite), миграции
│   ├── requirements.txt
│   ├── .env                # Переменные окружения (не коммитить)
│   └── data/
│       └── maksum.db       # SQLite (создаётся автоматически)
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── api/            # Axios, перехватчики, JWT
│   │   ├── components/
│   │   │   ├── Auth/       # Вход/регистрация
│   │   │   ├── Feed/       # Лента, PostCard, создание поста
│   │   │   ├── Layout/     # Header, Sidebar, MainLayout
│   │   │   ├── Profile/    # EditProfileModal, UserPreviewModal
│   │   │   └── ui/         # ShadCN компоненты
│   │   ├── context/         # UserContext (user, posts, feed, friends, API)
│   │   ├── hooks/           # useTheme
│   │   └── pages/
│   │       ├── HomePage.jsx      # Лента
│   │       ├── ProfilePage.jsx   # Свой профиль
│   │       ├── UserProfile.jsx   # Чужой профиль
│   │       ├── MessagesPage.jsx  # Чаты
│   │       ├── FriendsPage.jsx  # Друзья, заявки, рекомендации
│   │       ├── NotificationsPage.jsx
│   │       ├── MediaPage.jsx     # Медиа (фото из постов)
│   │       ├── UsersPage.jsx     # Поиск пользователей
│   │       ├── SettingsPage.jsx
│   │       └── MusicPage.jsx
│   ├── package.json
│   └── .env                # REACT_APP_BACKEND_URL (не коммитить)
├── BACKEND_API_DOCUMENTATION.md   # Подробное описание API
├── DATABASE_MIGRATION.md          # Миграции БД
└── README.md                      # Этот файл
```

---

## Основные возможности

### Авторизация и пользователи

- Регистрация и вход по email/username, JWT в заголовке `Authorization`
- Профиль: аватар, обложка, био, город, дата рождения, телефон, часы работы, цветовая гамма (profile_accent), привязка сообщества (название и описание)
- Редактирование профиля через модальное окно
- Поиск пользователей

### Лента и посты

- Создание поста (текст, опционально теги)
- Лента: свои посты и посты друзей
- Лайки, счётчики
- В ленте по клику на имя/аватар автора открывается **модальное превью** (телефон, о себе, часы работы, сообщество и т.д.) с кнопкой «Открыть полностью» — без перехода на страницу профиля

### Друзья

- Список друзей, входящие/исходящие заявки, рекомендации
- Отправка заявки, принятие/отклонение

### Сообщения

- Список диалогов, отправка сообщений
- Создание нового диалога по `to_user_id`

### Уведомления

- Список уведомлений (лайки, друзья, сообщения)
- Отметка прочитанным, счётчик непрочитанных в шапке

### Рекомендации и теги

- Таблицы: `tags`, `post_tags`, `user_tag_subscriptions`
- Создание поста с тегами, подписка на теги
- Эндпоинт рекомендаций постов: `/api/recommendations/posts` (по подпискам и лайкам)

### Медиа

- Раздел «Медиа» в меню: галерея фото из своих постов и из ленты (вкладки: Все / Мои фото / Лента)

### Тема

- Светлая/тёмная тема и палитры, сохранение в localStorage

---

## Маршруты (Frontend)

| Путь | Описание |
|------|----------|
| `/` | Главная (лента) |
| `/login` | Вход / регистрация |
| `/profile` | Свой профиль |
| `/users/:id` | Профиль пользователя |
| `/messages` | Сообщения |
| `/friends` | Друзья |
| `/find-friends` | Поиск пользователей |
| `/notifications` | Уведомления |
| `/media` | Медиа (фото) |
| `/music` | Музыка |
| `/settings` | Настройки |

---

## Переменные окружения

### Backend (backend/.env)

```env
# Опционально: для PostgreSQL
POSTGRES_URL=postgresql://user:password@localhost:5432/maksum_db
# или POSTGRES_HOST, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB

# JWT
JWT_SECRET=your-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Если не задан PostgreSQL — используется SQLite (`backend/data/maksum.db`).

### Frontend (frontend/.env)

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

---

## Документация

- **API**: [BACKEND_API_DOCUMENTATION.md](BACKEND_API_DOCUMENTATION.md) — эндпоинты, модели, схема БД, примеры.
- **Миграции БД**: [DATABASE_MIGRATION.md](DATABASE_MIGRATION.md) — при необходимости.

---

## Лицензия и развитие

Проект готов к доработке: можно добавлять группы, комментарии, загрузку файлов на сервер и т.д. Бэкенд и фронт синхронизированы: реальные пользователи, посты, друзья, сообщения, уведомления, теги и рекомендации.
