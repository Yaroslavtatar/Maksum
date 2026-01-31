# Подключение к PostgreSQL (maksum_db)

Чтобы бэкенд подключался к PostgreSQL на сервере вместо SQLite, задайте переменные окружения.

## Способ 1: отдельные переменные (рекомендуется)

В папке `backend` создайте или отредактируйте файл **`.env`** и добавьте:

```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=maksum
POSTGRES_PASSWORD=K41gQ)y`fsQ|UK5F
POSTGRES_DB=maksum_db
```

- **POSTGRES_HOST** — хост сервера с PostgreSQL (`localhost` если БД на той же машине, иначе IP или домен).
- **POSTGRES_PORT** — порт (по умолчанию 5432).
- **POSTGRES_USER** — пользователь БД (логин из настроек).
- **POSTGRES_PASSWORD** — пароль из настроек (можно со спецсимволами).
- **POSTGRES_DB** — имя базы: `maksum_db`.

После сохранения `.env` перезапустите бэкенд. В логах должно появиться: `Используется PostgreSQL`.

## Способ 2: одна строка POSTGRES_URL

Вместо отдельных переменных можно задать один URL:

```env
POSTGRES_URL=postgresql://maksum:PASSWORD@localhost:5432/maksum_db
```

Если в пароле есть символы `)`, `` ` ``, `|`, замените их в URL на:
- `)` → `%29`
- `` ` `` → `%60`
- `|` → `%7C`

Пример для пароля `K41gQ)y\`fsQ|UK5F`:

```env
POSTGRES_URL=postgresql://maksum:K41gQ%29y%60fsQ%7CUK5F@localhost:5432/maksum_db
```

## Проверка

1. Убедитесь, что PostgreSQL установлен и база `maksum_db` и пользователь `maksum` созданы.
2. Запустите бэкенд: `uvicorn server:app --host 0.0.0.0 --port 8001 --reload`.
3. При первом запросе таблицы создадутся автоматически (см. `database.py`).

Если переменные не заданы, используется SQLite: `backend/data/maksum.db`.
