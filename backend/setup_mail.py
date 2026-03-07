#!/usr/bin/env python3
"""
Скрипт настройки mail.env. Запусти из папки backend:
  python setup_mail.py

Скрипт спросит по очереди: хост, порт, email, пароль, URL сайта.
Пароль вводится в терминале и сразу записывается в mail.env (на экран не выводится).
"""
import os

MAIL_ENV_PATH = os.path.join(os.path.dirname(__file__), "mail.env")

def main():
    print("Настройка backend/mail.env для отправки кодов на почту.\n")
    print("Если не знаешь что ввести — смотри backend/MAIL_SETUP.md (Gmail/Mail.ru/Yandex).\n")

    smtp_host = input("SMTP-сервер (Gmail: smtp.gmail.com, Mail.ru: smtp.mail.ru, Yandex: smtp.yandex.ru): ").strip() or "smtp.example.com"
    smtp_port = input("Порт (обычно 587, нажми Enter если 587): ").strip() or "587"
    smtp_user = input("Твой email (логин): ").strip() or "your-email@example.com"
    smtp_password = input("Пароль от почты или пароль приложения: ").strip()
    mail_from = input("От кого письмо (Enter = тот же что email): ").strip() or smtp_user
    frontend_url = input("URL сайта куда юзеры заходят (например https://mysite.ru): ").strip() or "https://your-site.com"

    content = f"""# Сгенерировано setup_mail.py. Пароль храни только здесь, не коммить в git.

SMTP_HOST={smtp_host}
SMTP_PORT={smtp_port}
SMTP_USER={smtp_user}
SMTP_PASSWORD={smtp_password}
MAIL_FROM={mail_from}
FRONTEND_VERIFY_EMAIL_URL={frontend_url}
"""
    with open(MAIL_ENV_PATH, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"\nГотово. Записано в {MAIL_ENV_PATH}")
    print("Перезапусти бэкенд (run.py или uvicorn), чтобы подхватить настройки.")

if __name__ == "__main__":
    main()
