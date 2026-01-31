#!/bin/bash
# Управление службами VK SOSA: start | stop | restart | status
# Использование: ./service-ctl.sh [start|stop|restart|status] [backend|frontend|frontend-production|all]

CMD="${1:-status}"
SVC="${2:-all}"

case "$SVC" in
  backend)  UNITS="vksosa-backend" ;;
  frontend) UNITS="vksosa-frontend" ;;
  frontend-production) UNITS="vksosa-frontend-production" ;;
  all) UNITS="vksosa-backend vksosa-frontend" ;;
  *) echo "Неизвестная служба: $SVC (backend|frontend|frontend-production|all)"; exit 1 ;;
esac

for u in $UNITS; do
  case "$CMD" in
    start)   sudo systemctl start "$u"   ;;
    stop)    sudo systemctl stop "$u"    ;;
    restart) sudo systemctl restart "$u" ;;
    status)  sudo systemctl status "$u" --no-pager ;;
    *) echo "Команда: start|stop|restart|status"; exit 1 ;;
  esac
done
