"""
Модуль для работы с базой данных
Поддерживает PostgreSQL (продакшн) и SQLite (разработка)
"""
import os
import logging
from pathlib import Path
from typing import Optional, AsyncGenerator
from contextlib import asynccontextmanager

# Попытка импортировать asyncpg для PostgreSQL
try:
    import asyncpg
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False
    logging.warning("asyncpg не установлен, PostgreSQL недоступен")

# SQLite для разработки
try:
    import aiosqlite
    SQLITE_AVAILABLE = True
except ImportError:
    SQLITE_AVAILABLE = False
    logging.warning("aiosqlite не установлен, SQLite недоступен")

logger = logging.getLogger(__name__)

# Глобальные переменные для подключений
_postgres_pool: Optional[asyncpg.Pool] = None
_sqlite_path: Optional[str] = None
_db_type: Optional[str] = None


def get_db_type() -> str:
    """Определяет тип БД для использования"""
    global _db_type
    
    if _db_type:
        return _db_type
    
    # Проверяем переменные окружения для PostgreSQL
    postgres_url = os.getenv('POSTGRES_URL') or os.getenv('DATABASE_URL')
    postgres_host = os.getenv('POSTGRES_HOST')
    
    # Если есть настройки PostgreSQL и библиотека доступна - используем PostgreSQL
    if (postgres_url or postgres_host) and POSTGRES_AVAILABLE:
        try:
            # Пробуем подключиться к PostgreSQL
            _db_type = 'postgresql'
            logger.info("Используется PostgreSQL")
            return 'postgresql'
        except Exception as e:
            logger.warning(f"Не удалось подключиться к PostgreSQL: {e}, используем SQLite")
    
    # Иначе используем SQLite
    if SQLITE_AVAILABLE:
        _db_type = 'sqlite'
        logger.info("Используется SQLite (режим разработки)")
        return 'sqlite'
    
    raise RuntimeError("Ни PostgreSQL, ни SQLite не доступны. Установите asyncpg или aiosqlite")


async def init_postgres_pool():
    """Инициализация пула подключений PostgreSQL"""
    global _postgres_pool
    
    if _postgres_pool:
        return _postgres_pool
    
    postgres_url = os.getenv('POSTGRES_URL') or os.getenv('DATABASE_URL')
    
    if not postgres_url:
        # Собираем URL из отдельных параметров
        host = os.getenv('POSTGRES_HOST', 'localhost')
        port = int(os.getenv('POSTGRES_PORT', 5432))
        user = os.getenv('POSTGRES_USER', 'postgres')
        password = os.getenv('POSTGRES_PASSWORD', '')
        database = os.getenv('POSTGRES_DB', 'maksum_db')
        
        postgres_url = f"postgresql://{user}:{password}@{host}:{port}/{database}"
    
    _postgres_pool = await asyncpg.create_pool(
        postgres_url,
        min_size=1,
        max_size=10,
        command_timeout=60
    )
    
    logger.info("PostgreSQL пул подключений создан")
    return _postgres_pool


async def init_sqlite_db():
    """Инициализация SQLite базы данных"""
    global _sqlite_path
    
    if _sqlite_path:
        return _sqlite_path
    
    # Определяем путь к БД
    db_dir = Path(__file__).parent / 'data'
    db_dir.mkdir(exist_ok=True)
    _sqlite_path = str(db_dir / 'maksum.db')
    
    # Создаем подключение для инициализации
    async with aiosqlite.connect(_sqlite_path) as db:
        # Включаем поддержку внешних ключей
        await db.execute("PRAGMA foreign_keys = ON")
        await db.commit()
    
    logger.info(f"SQLite база данных инициализирована: {_sqlite_path}")
    return _sqlite_path


@asynccontextmanager
async def get_db():
    """Получить подключение к БД (async context manager)"""
    db_type = get_db_type()
    
    if db_type == 'postgresql':
        pool = await init_postgres_pool()
        async with pool.acquire() as conn:
            yield conn
    else:  # sqlite
        db_path = await init_sqlite_db()
        async with aiosqlite.connect(db_path) as conn:
            # Включаем поддержку внешних ключей
            await conn.execute("PRAGMA foreign_keys = ON")
            await conn.commit()
            yield conn


async def execute_query(query: str, params: tuple = None):
    """Выполнить SQL запрос (универсальный для обеих БД)"""
    db_type = get_db_type()
    
    if db_type == 'postgresql':
        pool = await init_postgres_pool()
        async with pool.acquire() as conn:
            if params:
                return await conn.fetch(query, *params)
            else:
                return await conn.fetch(query)
    else:  # sqlite
        db_path = await init_sqlite_db()
        async with aiosqlite.connect(db_path) as conn:
            await conn.execute("PRAGMA foreign_keys = ON")
            cursor = await conn.execute(query, params or ())
            await conn.commit()
            
            # Для SELECT запросов возвращаем результаты
            if query.strip().upper().startswith('SELECT'):
                rows = await cursor.fetchall()
                # Преобразуем в список словарей для совместимости
                columns = [desc[0] for desc in cursor.description] if cursor.description else []
                return [dict(zip(columns, row)) for row in rows]
            else:
                return cursor.lastrowid


def convert_sql_to_postgres(sql: str) -> str:
    """Конвертирует SQL запросы из MySQL/SQLite формата в PostgreSQL"""
    # Замены для совместимости
    sql = sql.replace('AUTO_INCREMENT', 'SERIAL')
    sql = sql.replace('INT AUTO_INCREMENT PRIMARY KEY', 'SERIAL PRIMARY KEY')
    sql = sql.replace('BIGINT AUTO_INCREMENT PRIMARY KEY', 'BIGSERIAL PRIMARY KEY')
    sql = sql.replace('DATETIME', 'TIMESTAMP')
    sql = sql.replace('CURRENT_TIMESTAMP', 'NOW()')
    sql = sql.replace('ENGINE=InnoDB', '')
    sql = sql.replace('DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci', '')
    sql = sql.replace('UNIQUE KEY', 'UNIQUE')
    sql = sql.replace('INDEX idx_', 'CREATE INDEX IF NOT EXISTS idx_')
    
    # Обработка ENUM (PostgreSQL использует CHECK)
    import re
    enum_pattern = r"ENUM\('([^']+)'\)"
    def replace_enum(match):
        values = match.group(1).split("','")
        values_str = ', '.join([f"'{v}'" for v in values])
        return f"VARCHAR(50) CHECK (status IN ({values_str}))"
    sql = re.sub(enum_pattern, replace_enum, sql)
    
    return sql


def convert_sql_to_sqlite(sql: str) -> str:
    """Конвертирует SQL запросы для SQLite"""
    # SQLite более близок к MySQL, но есть отличия
    sql = sql.replace('AUTO_INCREMENT', '')
    sql = sql.replace('INT AUTO_INCREMENT PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    sql = sql.replace('BIGINT AUTO_INCREMENT PRIMARY KEY', 'INTEGER PRIMARY KEY AUTOINCREMENT')
    sql = sql.replace('DATETIME', 'DATETIME')
    sql = sql.replace('ENGINE=InnoDB', '')
    sql = sql.replace('DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci', '')
    
    return sql


async def init_db():
    """Инициализация базы данных - создание таблиц"""
    db_type = get_db_type()
    
    async with get_db() as conn:
        if db_type == 'postgresql':
            # PostgreSQL таблицы
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    avatar_url VARCHAR(1024) NULL,
                    cover_photo VARCHAR(1024) NULL,
                    theme_mode VARCHAR(20) DEFAULT 'light',
                    theme_palette VARCHAR(50) DEFAULT 'blue',
                    is_admin BOOLEAN DEFAULT FALSE,
                    is_banned BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS status_checks (
                    id VARCHAR(36) PRIMARY KEY,
                    client_name VARCHAR(255) NOT NULL,
                    timestamp TIMESTAMP DEFAULT NOW()
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS friendships (
                    id SERIAL PRIMARY KEY,
                    requester_id INTEGER NOT NULL,
                    addressee_id INTEGER NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(requester_id, addressee_id),
                    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    is_group BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS conversation_participants (
                    conversation_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    joined_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (conversation_id, user_id),
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id SERIAL PRIMARY KEY,
                    conversation_id INTEGER NOT NULL,
                    sender_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Таблица уведомлений
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    type VARCHAR(50) NOT NULL,
                    actor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                    target_id INTEGER,
                    target_type VARCHAR(50),
                    content TEXT,
                    is_read BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Индексы PostgreSQL
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_status_checks_timestamp ON status_checks(timestamp)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)")
            
            # Таблица постов
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS posts (
                    id SERIAL PRIMARY KEY,
                    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    images TEXT DEFAULT '[]',
                    likes_count INTEGER DEFAULT 0,
                    comments_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            
            # Таблица лайков постов
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS post_likes (
                    id SERIAL PRIMARY KEY,
                    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(post_id, user_id)
                )
            """)
            # Таблица комментариев к постам
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS post_comments (
                    id SERIAL PRIMARY KEY,
                    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    content TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id)")
            
            # Дополнительные поля пользователя
            try:
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS location VARCHAR(255)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date VARCHAR(50)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_photo VARCHAR(1024)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS work_hours VARCHAR(255)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_accent VARCHAR(50)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS community_name VARCHAR(255)")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS community_description TEXT")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT FALSE")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP NULL")
                # Основа для подтверждения почты: после реализации — отправлять письмо и ставить email_verified_at при переходе по ссылке
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255) NULL")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP NULL")
            except Exception:
                pass

            # Устройства безопасности: список доверенных устройств/сессий, можно отзывать
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_devices (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL DEFAULT 'Устройство',
                    user_agent TEXT NULL,
                    last_used_at TIMESTAMP DEFAULT NOW(),
                    created_at TIMESTAMP DEFAULT NOW()
                )
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id)")

            # Таблицы для системы рекомендаций: теги и подписки
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS post_tags (
                    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
                    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                    PRIMARY KEY (post_id, tag_id)
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_tag_subscriptions (
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    PRIMARY KEY (user_id, tag_id)
                )
            """)

            # Индексы для постов
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_tag_subscriptions_user ON user_tag_subscriptions(user_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_tag_subscriptions_tag ON user_tag_subscriptions(tag_id)")
            
            # Триггеры для updated_at
            await conn.execute("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = NOW();
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
            """)
            
            await conn.execute("""
                DROP TRIGGER IF EXISTS update_users_updated_at ON users;
                CREATE TRIGGER update_users_updated_at
                BEFORE UPDATE ON users
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            """)
            
            await conn.execute("""
                DROP TRIGGER IF EXISTS update_friendships_updated_at ON friendships;
                CREATE TRIGGER update_friendships_updated_at
                BEFORE UPDATE ON friendships
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            """)

            # Одноразовая миграция: админы только durov и илья_новиков_65vsj
            await conn.execute("CREATE TABLE IF NOT EXISTS applied_migrations (name TEXT PRIMARY KEY)")
            done = await conn.fetchval("SELECT 1 FROM applied_migrations WHERE name = $1", "reset_admins_durov_ilya")
            if done is None:
                await conn.execute(
                    "UPDATE users SET is_admin = FALSE WHERE username IS NULL OR username NOT IN ('durov', 'илья_новиков_65vsj')"
                )
                await conn.execute(
                    "UPDATE users SET is_admin = TRUE WHERE username IN ('durov', 'илья_новиков_65vsj')"
                )
                await conn.execute("INSERT INTO applied_migrations (name) VALUES ($1)", "reset_admins_durov_ilya")
                logger.info("Миграция reset_admins_durov_ilya применена: админы только durov, илья_новиков_65vsj")

            # Одноразовая миграция: avatar_url и cover_photo — TEXT (base64/длинные URL не влезают в VARCHAR(1024))
            done2 = await conn.fetchval("SELECT 1 FROM applied_migrations WHERE name = $1", "avatar_cover_to_text")
            if done2 is None:
                await conn.execute("ALTER TABLE users ALTER COLUMN avatar_url TYPE TEXT")
                await conn.execute("ALTER TABLE users ALTER COLUMN cover_photo TYPE TEXT")
                await conn.execute("INSERT INTO applied_migrations (name) VALUES ($1)", "avatar_cover_to_text")
                logger.info("Миграция avatar_cover_to_text применена: avatar_url, cover_photo — TEXT")

            # Приватность: скрытие телефона и почты в профиле
            done3 = await conn.fetchval("SELECT 1 FROM applied_migrations WHERE name = $1", "privacy_hide_phone_email")
            if done3 is None:
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hide_phone BOOLEAN DEFAULT FALSE")
                await conn.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hide_email BOOLEAN DEFAULT FALSE")
                await conn.execute("INSERT INTO applied_migrations (name) VALUES ($1)", "privacy_hide_phone_email")
                logger.info("Миграция privacy_hide_phone_email применена: hide_phone, hide_email")
            
        else:  # SQLite
            # SQLite таблицы
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    email VARCHAR(255) UNIQUE NOT NULL,
                    password_hash VARCHAR(255) NOT NULL,
                    avatar_url VARCHAR(1024) NULL,
                    cover_photo VARCHAR(1024) NULL,
                    bio TEXT NULL,
                    location VARCHAR(255) NULL,
                    birth_date VARCHAR(50) NULL,
                    theme_mode VARCHAR(20) DEFAULT 'light',
                    theme_palette VARCHAR(50) DEFAULT 'blue',
                    is_admin BOOLEAN DEFAULT 0,
                    is_banned BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS status_checks (
                    id VARCHAR(36) PRIMARY KEY,
                    client_name VARCHAR(255) NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS friendships (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    requester_id INTEGER NOT NULL,
                    addressee_id INTEGER NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(requester_id, addressee_id),
                    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    is_group BOOLEAN NOT NULL DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS conversation_participants (
                    conversation_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (conversation_id, user_id),
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    conversation_id INTEGER NOT NULL,
                    sender_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Таблица постов SQLite
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    author_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    images TEXT DEFAULT '[]',
                    likes_count INTEGER DEFAULT 0,
                    comments_count INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Таблица лайков постов SQLite
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS post_likes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(post_id, user_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            # Таблица комментариев к постам SQLite
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS post_comments (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    post_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id)")
            
            # Миграция: добавляем недостающие колонки в users (для существующих БД)
            try:
                async with conn.execute("PRAGMA table_info(users)") as cursor:
                    columns = [row[1] for row in await cursor.fetchall()]
                if 'bio' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN bio TEXT NULL")
                if 'location' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN location VARCHAR(255) NULL")
                if 'birth_date' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN birth_date VARCHAR(50) NULL")
                if 'cover_photo' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN cover_photo VARCHAR(1024) NULL")
                if 'phone' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN phone VARCHAR(50) NULL")
                if 'work_hours' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN work_hours VARCHAR(255) NULL")
                if 'profile_accent' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN profile_accent VARCHAR(50) NULL")
                if 'community_name' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN community_name VARCHAR(255) NULL")
                if 'community_description' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN community_description TEXT NULL")
                if 'is_admin' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0")
                if 'is_banned' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0")
                if 'last_seen' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN last_seen DATETIME NULL")
                # Основа для подтверждения почты
                if 'email_verified_at' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN email_verified_at DATETIME NULL")
                if 'email_verification_token' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255) NULL")
                if 'email_verification_sent_at' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN email_verification_sent_at DATETIME NULL")
                if 'hide_phone' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN hide_phone BOOLEAN DEFAULT 0")
                if 'hide_email' not in columns:
                    await conn.execute("ALTER TABLE users ADD COLUMN hide_email BOOLEAN DEFAULT 0")
            except Exception as e:
                logger.warning(f"Миграция колонок users: {e}")

            # Устройства безопасности (SQLite)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_devices (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name VARCHAR(255) NOT NULL DEFAULT 'Устройство',
                    user_agent TEXT NULL,
                    last_used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id)")
            
            # Таблица уведомлений SQLite
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    type VARCHAR(50) NOT NULL,
                    actor_id INTEGER,
                    target_id INTEGER,
                    target_type VARCHAR(50),
                    content TEXT,
                    is_read BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE CASCADE
                )
            """)
            
            # Индексы SQLite
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages(conversation_id, created_at)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_status_checks_timestamp ON status_checks(timestamp)")
            # Таблицы для системы рекомендаций: теги и подписки (SQLite)
            # Миграция: пересоздать post_tags/user_tag_subscriptions, если схема старая (нет tag_id)
            try:
                async with conn.execute("PRAGMA table_info(post_tags)") as cursor:
                    cols = [row[1] for row in await cursor.fetchall()]
                if cols and 'tag_id' not in cols:
                    await conn.execute("DROP TABLE IF EXISTS post_tags")
                    await conn.execute("DROP TABLE IF EXISTS user_tag_subscriptions")
            except Exception:
                pass
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS tags (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(100) UNIQUE NOT NULL
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS post_tags (
                    post_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    PRIMARY KEY (post_id, tag_id),
                    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS user_tag_subscriptions (
                    user_id INTEGER NOT NULL,
                    tag_id INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, tag_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
                )
            """)

            await conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_tags_post ON post_tags(post_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_post_tags_tag ON post_tags(tag_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_tag_subscriptions_user ON user_tag_subscriptions(user_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_user_tag_subscriptions_tag ON user_tag_subscriptions(tag_id)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)")
            await conn.execute("CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)")

            # Одноразовая миграция: админы только durov и илья_новиков_65vsj
            await conn.execute("CREATE TABLE IF NOT EXISTS applied_migrations (name TEXT PRIMARY KEY)")
            async with conn.execute(
                "SELECT 1 FROM applied_migrations WHERE name = ?", ("reset_admins_durov_ilya",)
            ) as cur:
                done = await cur.fetchone()
            if done is None:
                await conn.execute(
                    "UPDATE users SET is_admin = 0 WHERE username IS NULL OR username NOT IN ('durov', 'илья_новиков_65vsj')"
                )
                await conn.execute(
                    "UPDATE users SET is_admin = 1 WHERE username IN ('durov', 'илья_новиков_65vsj')"
                )
                await conn.execute(
                    "INSERT INTO applied_migrations (name) VALUES (?)", ("reset_admins_durov_ilya",)
                )
                logger.info("Миграция reset_admins_durov_ilya применена: админы только durov, илья_новиков_65vsj")
            
            await conn.commit()
    
    logger.info("База данных инициализирована")


async def close_db():
    """Закрыть все подключения к БД"""
    global _postgres_pool
    
    if _postgres_pool:
        await _postgres_pool.close()
        _postgres_pool = None
        logger.info("PostgreSQL пул подключений закрыт")
