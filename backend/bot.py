"""
Telegram-бот для верификации аккаунтов Maksum.

Запуск (из папки backend):
    pip install aiogram httpx
    python bot.py

Бот читает токен из backend/telegram.env.
При команде /start <token> подтверждает аккаунт через API сайта.
"""

import asyncio
import logging
import os
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / "telegram.env")
load_dotenv(ROOT_DIR / ".env")

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
SITE_URL   = os.getenv("SITE_URL", "https://maksum.cryteam.ru").strip().rstrip("/")

if not BOT_TOKEN:
    raise RuntimeError("TELEGRAM_BOT_TOKEN не задан в backend/telegram.env")

logging.basicConfig(level=logging.INFO)

from aiogram import Bot, Dispatcher, types
from aiogram.filters import CommandStart, CommandObject
import httpx

bot = Bot(token=BOT_TOKEN)
dp  = Dispatcher()


@dp.message(CommandStart(deep_link=True))
async def cmd_start_with_token(message: types.Message, command: CommandObject):
    """Пользователь пришёл по ссылке https://t.me/bot?start=<token>"""
    token = (command.args or "").strip()
    if not token:
        await message.answer(
            "Привет! Перейди на сайт, нажми «Подтвердить через Telegram» — и я пришлю ссылку."
        )
        return

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{SITE_URL}/api/auth/telegram-confirm",
                json={"token": token, "chat_id": message.from_user.id},
            )
        if resp.status_code == 200:
            await message.answer("✅ Аккаунт подтверждён! Можешь вернуться на сайт.")
        elif resp.status_code == 404:
            await message.answer("Ссылка не найдена или уже использована. Запроси новую на сайте.")
        elif resp.status_code == 410:
            await message.answer("Ссылка истекла (действует 10 мин). Запроси новую на сайте.")
        else:
            await message.answer(f"Ошибка сервера ({resp.status_code}). Попробуй позже.")
    except Exception as e:
        logging.error("Bot confirm error: %s", e)
        await message.answer("Не удалось связаться с сервером. Попробуй позже.")


@dp.message(CommandStart())
async def cmd_start_no_token(message: types.Message):
    await message.answer(
        f"Привет! Я бот подтверждения аккаунтов Maksum.\n\n"
        f"Зайди на {SITE_URL}, нажми «Подтвердить через Telegram» — "
        f"я пришлю уведомление о том, что аккаунт подтверждён."
    )


async def main():
    logging.info("Бот запущен (polling)…")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
