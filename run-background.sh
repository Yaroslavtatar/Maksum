#!/usr/bin/env bash
# Фоновый запуск сайта через run.py (бэкенд + фронт).
# Использование: ./run-background.sh { start | stop | status | restart }

set -e
cd "$(dirname "$0")"
ROOT="$(pwd)"
PIDFILE="${ROOT}/.run.pid"
LOGDIR="${ROOT}/logs"
LOGFILE="${LOGDIR}/run.log"

mkdir -p "$LOGDIR"

start() {
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "Уже запущено (PID $PID). Остановите: ./run-background.sh stop"
      return 1
    fi
    rm -f "$PIDFILE"
  fi
  echo "Запуск run.py в фоне..."
  nohup python3 run.py >> "$LOGFILE" 2>&1 &
  echo $! > "$PIDFILE"
  echo "Сайт запущен (PID $(cat "$PIDFILE")). Лог: $LOGFILE"
  echo "Бэкенд: http://127.0.0.1:8001  Фронт: http://0.0.0.0:3000"
}

stop() {
  if [ ! -f "$PIDFILE" ]; then
    echo "Не запущено (нет $PIDFILE)"
    return 0
  fi
  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    sleep 2
    if kill -0 "$PID" 2>/dev/null; then
      kill -9 "$PID" 2>/dev/null || true
    fi
    echo "Остановлено (PID $PID)"
  else
    echo "Процесс $PID уже не запущен"
  fi
  rm -f "$PIDFILE"
}

status() {
  if [ ! -f "$PIDFILE" ]; then
    echo "Статус: не запущено"
    return 0
  fi
  PID=$(cat "$PIDFILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Статус: запущено (PID $PID)"
    echo "Лог: $LOGFILE"
    return 0
  else
    echo "Статус: PID $PID не найден (возможно, процесс завершился)"
    rm -f "$PIDFILE"
    return 1
  fi
}

case "${1:-}" in
  start)   start ;;
  stop)     stop ;;
  status)  status ;;
  restart) stop; start ;;
  *)
    echo "Использование: $0 { start | stop | status | restart }"
    echo "  start   — запустить run.py в фоне (логи в logs/run.log)"
    echo "  stop    — остановить"
    echo "  status  — проверить, запущено ли"
    echo "  restart — остановить и запустить снова"
    exit 1
    ;;
esac
