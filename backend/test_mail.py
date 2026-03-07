#!/usr/bin/env python3
"""
Тест отправки почты. Запуск из папки backend:
  python test_mail.py
  python test_mail.py your@email.com   # отправить на указанный адрес

Использует настройки из mail.env. Проверяет подключение к SMTP и отправку письма.
"""
import os
import sys
from pathlib import Path

# Загружаем mail.env
ROOT = Path(__file__).parent
from dotenv import load_dotenv
load_dotenv(ROOT / "mail.env")

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "").strip()
MAIL_FROM = os.getenv("MAIL_FROM", SMTP_USER or "").strip()

def main():
    to_email = (sys.argv[1] if len(sys.argv) > 1 else SMTP_USER or "").strip()
    if not to_email:
        print("Укажи email для теста: python test_mail.py your@email.com")
        print("Или заполни SMTP_USER в mail.env — письмо уйдёт туда.")
        sys.exit(1)

    print("Проверка почты (mail.env):")
    print(f"  SMTP_HOST: {SMTP_HOST or '(пусто)'}")
    print(f"  SMTP_PORT: {SMTP_PORT}")
    print(f"  SMTP_USER: {SMTP_USER or '(пусто)'}")
    print(f"  SMTP_PASSWORD: {'***' if SMTP_PASSWORD else '(пусто)'}")
    print(f"  Отправить на: {to_email}")
    print()

    if not SMTP_HOST or "example.com" in SMTP_HOST:
        print("Ошибка: SMTP_HOST не настроен (smtp.example.com — заглушка). Заполни backend/mail.env")
        sys.exit(1)
    if not SMTP_USER or not SMTP_PASSWORD:
        print("Ошибка: SMTP_USER или SMTP_PASSWORD пустые. Заполни backend/mail.env")
        sys.exit(1)

    print("Отправка тестового письма...")
    try:
        import smtplib
        from email.mime.text import MIMEText
        subject = "Тест почты — Maksum"
        body = "Если ты это видишь — почта работает. Код подтверждения будет отправляться."
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = MAIL_FROM or SMTP_USER
        msg["To"] = to_email

        timeout_sec = 30
        if SMTP_PORT == 465:
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=timeout_sec) as s:
                s.login(SMTP_USER, SMTP_PASSWORD)
                s.sendmail(msg["From"], to_email, msg.as_string())
        else:
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=timeout_sec) as s:
                if SMTP_PORT == 587:
                    s.starttls()
                s.login(SMTP_USER, SMTP_PASSWORD)
                s.sendmail(msg["From"], to_email, msg.as_string())

        print("OK. Письмо отправлено. Проверь папку «Входящие» и «Спам» на", to_email)
    except Exception as e:
        print(f"Ошибка: {e}")
        if "timed out" in str(e).lower() or "timeout" in str(e).lower():
            print()
            print("Таймаут = сервер не может достучаться до SMTP. Часто:")
            print("  • Firewall/VPS блокирует порты 587, 465 — открой их или смени хостинг")
            print("  • Попробуй порт 465 вместо 587 (в mail.env: SMTP_PORT=465)")
            print("  • Запускай с того же сервера, где крутится сайт (не с локального ПК)")
        sys.exit(1)

if __name__ == "__main__":
    main()
