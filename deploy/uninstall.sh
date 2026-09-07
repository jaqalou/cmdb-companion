#!/usr/bin/env bash
# Removes the CB Assets service, files and nginx site from an Ubuntu server.
set -euo pipefail
APP_NAME="cb-assets"

if [[ $EUID -ne 0 ]]; then echo "Run with sudo." >&2; exit 1; fi

systemctl disable --now "${APP_NAME}" 2>/dev/null || true
rm -f "/etc/systemd/system/${APP_NAME}.service"
systemctl daemon-reload
rm -f "/etc/nginx/sites-enabled/${APP_NAME}" "/etc/nginx/sites-available/${APP_NAME}"
nginx -t && systemctl reload nginx || true
rm -rf "/opt/${APP_NAME}"
echo "Removed. Kept /etc/${APP_NAME}.env — delete it manually if you no longer need the settings."
