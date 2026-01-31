# Запуск VK SOSA как служб на Ubuntu (фоновый режим)

Бэкенд и фронт работают как systemd-службы: автозапуск при загрузке, перезапуск при падении, логи в journald.

## Требования

- Ubuntu (20.04+)
- Python 3.10+, Node.js 18+, yarn или npm
- Для бэкенда: зависимости из `backend/requirements.txt`
- Для фронта: зависимости из `frontend/package.json`

## 1. Подготовка системы

```bash
# Python и зависимости бэкенда
sudo apt update
sudo apt install -y python3 python3-pip python3-venv
cd /путь/к/проекту/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Node.js и фронт (если ещё не установлены)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn
cd /путь/к/проекту/frontend
yarn install
```

## 2. Настройка прав и пользователя службы

Службы по умолчанию запускаются от `www-data`. Нужно, чтобы этот пользователь имел доступ к проекту:

```bash
# Замените /var/www/vksosa на ваш путь к проекту
PROJECT=/var/www/vksosa
sudo mkdir -p "$(dirname "$PROJECT")"
sudo cp -r /путь/к/вашему/проекту/VK\ SOSA "$PROJECT"
sudo chown -R www-data:www-data "$PROJECT"
```

Если проект лежит в домашней папке (например `/home/user/VK SOSA`), в юнитах можно оставить этот путь — тогда либо запускайте службы от своего пользователя (см. ниже), либо выдайте права на чтение/запись для `www-data`.

### Запуск от своего пользователя (альтернатива)

В файлах `*.service` замените `User=www-data` и `Group=www-data` на своего пользователя и группу (например `User=ubuntu`, `Group=ubuntu`).

## 3. Бэкенд: venv (рекомендуется)

Если используете виртуальное окружение, в `vksosa-backend.service` замените строку `ExecStart` на:

```ini
ExecStart=/var/www/vksosa/backend/venv/bin/python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

(и замените `/var/www/vksosa` на ваш путь к проекту, если он другой.)

## 4. Установка служб

```bash
cd /путь/к/проекту/deploy
chmod +x install-services.sh
sudo ./install-services.sh /путь/к/проекту
```

Скрипт подставит ваш путь в юниты и скопирует их в `/etc/systemd/system/`.

## 5. Запуск и доступ из интернета

```bash
# Запуск
sudo systemctl start vksosa-backend
sudo systemctl start vksosa-frontend

# Автозапуск при загрузке
sudo systemctl enable vksosa-backend vksosa-frontend

# Статус и логи
sudo systemctl status vksosa-backend vksosa-frontend
journalctl -u vksosa-backend -f
journalctl -u vksosa-frontend -f
```

- **Бэкенд**: слушает `0.0.0.0:8001` — доступен по `http://IP_СЕРВЕРА:8001`.
- **Фронт** (vksosa-frontend): dev-сервер с WebSocket (HMR), слушает `0.0.0.0:3000` — сайт по `http://IP_СЕРВЕРА:3000`.

Чтобы сайт был доступен из интернета:

1. В файрволе откройте порты 3000 и 8001 (или только их, если не используете nginx):
   ```bash
   sudo ufw allow 3000/tcp
   sudo ufw allow 8001/tcp
   sudo ufw reload
   ```
2. Во фронте задайте URL бэкенда для браузера: в `vksosa-frontend.service` переменная `REACT_APP_BACKEND_URL` должна указывать на адрес, по которому клиенты ходят к API (например `http://ВАШ_ДОМЕН_ИЛИ_IP:8001`). Пересоберите фронт после смены (`yarn build` для продакшена или перезапустите службу после правки `.env` в dev).

## 6. Вариант фронта для продакшена (без dev-сервера)

Раздача собранного билда (без WebSocket HMR):

```bash
cd /путь/к/проекту/frontend
# В .env или при сборке задайте REACT_APP_BACKEND_URL на ваш API
yarn build
sudo npm install -g serve   # или используйте npx serve в юните
sudo systemctl stop vksosa-frontend
sudo systemctl enable vksosa-frontend-production
sudo systemctl start vksosa-frontend-production
```

Используется юнит `vksosa-frontend-production.service` (раздача `build` через `serve` на порту 3000).

## 7. Остановка и удаление служб

```bash
sudo systemctl stop vksosa-frontend vksosa-backend
sudo systemctl disable vksosa-frontend vksosa-backend
sudo rm /etc/systemd/system/vksosa-backend.service \
       /etc/systemd/system/vksosa-frontend.service \
       /etc/systemd/system/vksosa-frontend-production.service
sudo systemctl daemon-reload
```

## Кратко

| Служба | Назначение |
|--------|------------|
| `vksosa-backend` | FastAPI (uvicorn) на 0.0.0.0:8001, фоновый режим |
| `vksosa-frontend` | React dev-сервер на 0.0.0.0:3000, с WebSocket (HMR), доступ из интернета |
| `vksosa-frontend-production` | Раздача собранного фронта (build) через serve на 3000 |

Пути в юнитах задаются скриптом `install-services.sh` по переданному пути к проекту.
