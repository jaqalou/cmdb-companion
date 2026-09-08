#!/usr/bin/env bash
# Removes the CB Assets service, files and nginx site from an Ubuntu server.
set -euo pipefail
APP_NAME="cb-assets"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi

systemctl disable --now "${APP_NAME}" 2>/dev/null || true
systemctl disable --now "${APP_NAME}-api" 2>/dev/null || true
rm -f "/etc/systemd/system/${APP_NAME}.service" "/etc/systemd/system/${APP_NAME}-api.service"
systemctl daemon-reload
rm -f "/etc/nginx/sites-enabled/${APP_NAME}" "/etc/nginx/sites-available/${APP_NAME}"
nginx -t && systemctl reload nginx || true

# Stop the local backend containers. Data is kept unless PURGE_DATA=1.
if [[ -f "/opt/${APP_NAME}/deploy/selfhost/docker-compose.yml" ]] && command -v docker >/dev/null; then
  COMPOSE="docker compose --project-directory /opt/${APP_NAME}/deploy/selfhost -f /opt/${APP_NAME}/deploy/selfhost/docker-compose.yml"
  if [[ "${PURGE_DATA:-0}" == "1" ]]; then
    $COMPOSE down -v || true
    echo "Database contents deleted."
  else
    $COMPOSE down || true
    echo "Database contents kept (run with PURGE_DATA=1 to delete them)."
  fi
fi

rm -rf "/opt/${APP_NAME}"
echo "Removed. Kept /etc/${APP_NAME}.env — delete it manually if you no longer need the settings."

