# 🔧 Настройка MySQL для MAKSUM

## 📋 Требования

- MySQL Server 8.0+ или MariaDB 10.5+
- Python 3.8+

## 🚀 Установка зависимостей

```bash
cd backend
pip install -r requirements.txt
```

## 📝 Настройка переменных окружения

Создайте файл `.env` в папке `backend/`:

```env
# MySQL Configuration
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=maksum_db

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 🗄️ Создание базы данных

### Вариант 1: Через MySQL CLI

```sql
CREATE DATABASE maksum_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Вариант 2: Через MySQL Workbench

1. Откройте MySQL Workbench
2. Создайте новое подключение
3. Выполните SQL:
```sql
CREATE DATABASE IF NOT EXISTS maksum_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

## 🏃 Запуск сервера

```bash
cd backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Сервер автоматически создаст необходимые таблицы при первом запуске.

## 📊 Структура таблиц

### Таблица `users`

```sql
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    theme_mode VARCHAR(20) DEFAULT 'light',
    theme_palette VARCHAR(50) DEFAULT 'blue',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### Таблица `status_checks`

```sql
CREATE TABLE IF NOT EXISTS status_checks (
    id VARCHAR(36) PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🔍 Проверка подключения

После запуска сервера откройте:
- API документация: http://localhost:8001/docs
- Проверка API: http://localhost:8001/api/

## 🔐 API эндпоинты для темы

### Получить тему пользователя
```http
GET /api/user/theme
```

### Обновить тему пользователя
```http
PUT /api/user/theme
Content-Type: application/json

{
  "mode": "light",
  "palette": "blue"
}
```

## 🐛 Устранение проблем

### Ошибка подключения к MySQL

1. Проверьте, что MySQL сервер запущен:
   ```bash
   # Linux/Mac
   sudo systemctl status mysql
   
   # Windows
   # Проверьте через службы Windows
   ```

2. Проверьте переменные окружения в `.env`
3. Убедитесь, что пользователь имеет права доступа к базе данных:
   ```sql
   GRANT ALL PRIVILEGES ON maksum_db.* TO 'your_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

### Ошибка "Table doesn't exist"

Таблицы создаются автоматически при первом запуске. Если ошибка повторяется:
1. Убедитесь, что база данных существует
2. Проверьте права пользователя MySQL
3. Перезапустите сервер

## 📝 Примечания

- База данных использует UTF8MB4 для поддержки эмодзи и специальных символов
- Таблицы создаются автоматически при первом запуске сервера
- В продакшене используйте отдельного пользователя MySQL с ограниченными правами

