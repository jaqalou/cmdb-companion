#!/usr/bin/env bash
# CB Assets — Ubuntu installer
# Installs every dependency, builds the app and runs it as a systemd service.
# Tested on Ubuntu 22.04 LTS and 24.04 LTS.
#
#   sudo bash deploy/install.sh
#
set -euo pipefail

APP_NAME="cb-assets"
APP_USER="cbassets"
APP_DIR="/opt/${APP_NAME}"
APP_PORT="${APP_PORT:-3000}"
NODE_MAJOR="22"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { echo -e "\n\033[1;32m==>\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo: sudo bash deploy/install.sh" >&2
  exit 1
fi

if ! grep -qi ubuntu /etc/os-release; then
  echo "This installer targets Ubuntu." >&2
  exit 1
fi

log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git unzip rsync build-essential python3 \
  nginx ufw

log "Installing Node.js ${NODE_MAJOR}.x"
if ! command -v node >/dev/null || [[ "$(node -v | cut -c2- | cut -d. -f1)" -lt "$NODE_MAJOR" ]]; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    >/etc/apt/sources.list.d/nodesource.list
  apt-get update -y
  apt-get install -y nodejs
fi
node -v

log "Creating service account and application directory"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$APP_DIR"

log "Installing Bun for ${APP_USER}"
if [[ ! -x "/home/${APP_USER}/.bun/bin/bun" ]]; then
  su -s /bin/bash "$APP_USER" -c 'curl -fsSL https://bun.sh/install | bash'
fi
BUN="/home/${APP_USER}/.bun/bin/bun"

log "Copying application source to ${APP_DIR}"
rsync -a --delete \
  --exclude node_modules --exclude .git --exclude .output --exclude dist \
  "${SRC_DIR}/" "${APP_DIR}/"

# Environment file: keep an existing one, otherwise seed it from the repo .env
if [[ ! -f "/etc/${APP_NAME}.env" ]]; then
  if [[ -f "${SRC_DIR}/.env" ]]; then
    cp "${SRC_DIR}/.env" "/etc/${APP_NAME}.env"
  else
    cat >"/etc/${APP_NAME}.env" <<'EOF'
# Backend connection — fill these in before starting the service
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
EOF
  fi
fi
sed -i "/^PORT=/d" "/etc/${APP_NAME}.env"
echo "PORT=${APP_PORT}" >>"/etc/${APP_NAME}.env"
chmod 640 "/etc/${APP_NAME}.env"
chown root:"$APP_USER" "/etc/${APP_NAME}.env"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"

log "Installing dependencies and building (this takes a few minutes)"
su -s /bin/bash "$APP_USER" -c "cd '$APP_DIR' && set -a && . /etc/${APP_NAME}.env && set +a && '$BUN' install --frozen-lockfile && NITRO_PRESET=node-server '$BUN' run build"

log "Installing systemd service"
install -m 0644 "${APP_DIR}/deploy/${APP_NAME}.service" "/etc/systemd/system/${APP_NAME}.service"
systemctl daemon-reload
systemctl enable --now "${APP_NAME}"

log "Configuring nginx reverse proxy on port 80"
sed "s/__APP_PORT__/${APP_PORT}/g" "${APP_DIR}/deploy/nginx.conf" >"/etc/nginx/sites-available/${APP_NAME}"
ln -sf "/etc/nginx/sites-available/${APP_NAME}" "/etc/nginx/sites-enabled/${APP_NAME}"
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

log "Configuring firewall"
ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 'Nginx Full' >/dev/null 2>&1 || true
ufw --force enable >/dev/null 2>&1 || true

log "Done"
systemctl --no-pager --full status "${APP_NAME}" | head -n 20
echo
echo "CB Assets is running on http://$(hostname -I | awk '{print $1}')/"
echo "Edit backend settings in /etc/${APP_NAME}.env, then: sudo systemctl restart ${APP_NAME}"
echo "Logs: sudo journalctl -u ${APP_NAME} -f"
echo "HTTPS: sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d your.domain"
