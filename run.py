#!/usr/bin/env python3
"""
Запуск бэкенда (127.0.0.1:8001) и фронта (0.0.0.0:3000) с общим логом.
  - Бэкенд только на localhost (снаружи недоступен).
  - Фронт слушает все интерфейсы — доступ по IP сервера (http://IP:3000).
  - Запросы к /api проксируются с фронта на бэкенд (proxy в package.json).
Остановка: Ctrl+C (оба процесса завершаются).

Использование:
  python run.py
  # или: python3 run.py
"""
import os
import sys
import subprocess
import signal
import threading
import platform
import time

# Корень проекта (каталог, где лежат backend/ и frontend/)
ROOT = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(ROOT, "backend")
FRONTEND_DIR = os.path.join(ROOT, "frontend")

BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = "8001"
FRONTEND_HOST = "0.0.0.0"
FRONTEND_PORT = "3000"

processes = []


def log(prefix: str, line: str) -> None:
    line = line.rstrip()
    if line:
        print(f"[{prefix}] {line}", flush=True)


def read_stream(stream, prefix: str) -> None:
    try:
        for line in iter(stream.readline, ""):
            log(prefix, line)
    except (BrokenPipeError, OSError):
        pass


def start_backend() -> subprocess.Popen:
    """Бэкенд только на localhost."""
    env = os.environ.copy()
    cmd = [
        sys.executable, "-m", "uvicorn", "server:app",
        "--host", BACKEND_HOST,
        "--port", BACKEND_PORT,
    ]
    proc = subprocess.Popen(
        cmd,
        cwd=BACKEND_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    return proc


def start_frontend() -> subprocess.Popen:
    """Фронт на всех интерфейсах (доступ по IP сервера)."""
    env = os.environ.copy()
    env["HOST"] = FRONTEND_HOST
    env["PORT"] = FRONTEND_PORT
    env["BROWSER"] = "none"  # не открывать браузер автоматически
    # Фронт обращается только на localhost:8001
    env["REACT_APP_BACKEND_URL"] = "http://127.0.0.1:8001"

    use_yarn = os.path.isfile(os.path.join(FRONTEND_DIR, "yarn.lock"))
    if use_yarn:
        cmd = "yarn start"
    else:
        cmd = "npm run start"
    proc = subprocess.Popen(
        cmd,
        cwd=FRONTEND_DIR,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        shell=True,
    )
    return proc


def main():
    if not os.path.isdir(BACKEND_DIR) or not os.path.isfile(os.path.join(BACKEND_DIR, "server.py")):
        print("Ошибка: папка backend/ не найдена.", file=sys.stderr)
        sys.exit(1)
    if not os.path.isdir(FRONTEND_DIR) or not os.path.isfile(os.path.join(FRONTEND_DIR, "package.json")):
        print("Ошибка: папка frontend/ не найдена.", file=sys.stderr)
        sys.exit(1)

    print("Бэкенд:  http://{}:{} (только localhost)".format(BACKEND_HOST, BACKEND_PORT))
    print("Фронт:   http://0.0.0.0:{} (доступ по IP сервера)".format(FRONTEND_PORT))
    print("Остановка: Ctrl+C")
    print("-" * 60)

    backend_proc = start_backend()
    processes.append(backend_proc)
    threading.Thread(target=read_stream, args=(backend_proc.stdout, "backend"), daemon=True).start()

    frontend_proc = start_frontend()
    processes.append(frontend_proc)
    threading.Thread(target=read_stream, args=(frontend_proc.stdout, "frontend"), daemon=True).start()

    def shutdown(signum=None, frame=None):
        for p in processes:
            if p.poll() is None:
                p.terminate()
        for p in processes:
            try:
                p.wait(timeout=5)
            except subprocess.TimeoutExpired:
                p.kill()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, shutdown)

    # Ждём завершения любого из процессов (или Ctrl+C)
    try:
        while True:
            if backend_proc.poll() is not None:
                log("backend", "Процесс бэкенда завершился.")
                shutdown()
            if frontend_proc.poll() is not None:
                log("frontend", "Процесс фронта завершился.")
                shutdown()
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        shutdown()


if __name__ == "__main__":
    main()
