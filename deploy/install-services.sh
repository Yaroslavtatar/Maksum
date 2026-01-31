#!/bin/bash
# Установка systemd-служб VK SOSA на Ubuntu.
# Запуск: sudo ./install-services.sh [/путь/к/проекту]
# Если путь не указан, используется текущая директория (должна быть корень проекта).

set -e

PROJECT_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
SERVICES_DIR="/etc/systemd/system"

if [ ! -f "$BACKEND_DIR/server.py" ] || [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo "Ошибка: не найден проект в $PROJECT_DIR (должны быть папки backend и frontend)."
    exit 1
fi

echo "Проект: $PROJECT_DIR"
echo "Копирование и настройка служб..."

# Временная папка для подстановки пути
TMPD=$(mktemp -d)
trap "rm -rf $TMPD" EXIT

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
for f in vksosa-backend.service vksosa-frontend.service vksosa-frontend-production.service; do
    [ -f "$DEPLOY_DIR/$f" ] || continue
    sed "s|/var/www/vksosa|$PROJECT_DIR|g" "$DEPLOY_DIR/$f" > "$TMPD/$f"
    sudo cp "$TMPD/$f" "$SERVICES_DIR/$f"
    echo "  установлен: $f"
done

sudo systemctl daemon-reload
echo ""
echo "Службы установлены. Команды:"
echo "  sudo systemctl start vksosa-backend    # запуск бэкенда"
echo "  sudo systemctl start vksosa-frontend  # запуск фронта (dev с WebSocket)"
echo "  sudo systemctl enable vksosa-backend vksosa-frontend  # автозапуск при загрузке"
echo "  sudo systemctl status vksosa-backend vksosa-frontend  # статус"
echo "  journalctl -u vksosa-backend -f       # логи бэкенда"
echo "  journalctl -u vksosa-frontend -f      # логи фронта"
echo ""
echo "Для продакшена фронта: в frontend выполните 'yarn build', затем:"
echo "  sudo systemctl stop vksosa-frontend"
echo "  sudo systemctl enable vksosa-frontend-production"
echo "  sudo systemctl start vksosa-frontend-production"
