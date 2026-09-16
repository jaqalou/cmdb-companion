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
# Address browsers will use to reach this VM. Override for a domain:
#   sudo PUBLIC_URL=https://cmdb.example.com bash deploy/install.sh
PUBLIC_URL="${PUBLIC_URL:-http://$(hostname -I | awk '{print $1}')}"
# Accept a bare IP/domain for convenience, but always persist a complete origin.
PUBLIC_URL="$(printf '%s' "$PUBLIC_URL" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
case "$PUBLIC_URL" in
  http://*|https://*) ;;
  *://*) echo "PUBLIC_URL must use http:// or https://" >&2; exit 1 ;;
  *) PUBLIC_URL="http://${PUBLIC_URL}" ;;
esac
while [[ "$PUBLIC_URL" == */ ]]; do PUBLIC_URL="${PUBLIC_URL%/}"; done
if [[ ! "$PUBLIC_URL" =~ ^https?://[^/]+$ ]]; then
  echo "PUBLIC_URL must contain only the protocol and host, for example http://34.60.104.14" >&2
  exit 1
fi



log() { echo -e "\n\033[1;32m==>\033[0m $*"; }

if [[ $EUID -ne 0 ]]; then
  echo "Run this script with sudo: sudo bash deploy/install.sh" >&2
  exit 1
fi

if ! grep -qi ubuntu /etc/os-release; then
  echo "This installer targets Ubuntu." >&2
  exit 1
fi

log "Checking Python"
if ! command -v python3 >/dev/null; then
  echo "python3 is required but not found. Install it with:" >&2
  echo "  sudo apt install python3 python3-venv python3-pip" >&2
  exit 1
fi
PY_MINOR="$(python3 -c 'import sys; print(sys.version_info[1])')"
if [[ "$(python3 -c 'import sys; print(sys.version_info[0])')" -lt 3 ]] || [[ "$PY_MINOR" -lt 8 ]]; then
  echo "Python 3.8 or newer is required (found $(python3 -V 2>&1))." >&2
  echo "On Ubuntu 20.04 or newer, 'sudo apt install python3' provides a suitable version." >&2
  exit 1
fi
python3 -V
log "Using public address ${PUBLIC_URL}"

log "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
  ca-certificates curl gnupg git unzip rsync build-essential \
  python3 python3-venv python3-pip postgresql-client \
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
  --exclude 'deploy/selfhost/.env' \
  "${SRC_DIR}/" "${APP_DIR}/"


log "Installing Docker (runs the database, accounts and data API on this VM)"
if ! command -v docker >/dev/null; then
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg |
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

# --- Database: install a new one, or use an existing PostgreSQL -----------
# Non-interactive:
#   sudo DB_MODE=existing DB_HOST=... DB_PORT=5432 DB_NAME=cmdb \
#        DB_USER=... DB_PASSWORD='...' bash deploy/install.sh
if [[ -z "${DB_MODE:-}" ]]; then
  if [[ -t 0 ]]; then
    echo
    echo "Database"
    echo "  1) Install a new PostgreSQL 16 on this VM (recommended)"
    echo "  2) Use an existing PostgreSQL server"
    read -rp "Choose [1]: " db_choice
    if [[ "${db_choice:-1}" == "2" ]]; then DB_MODE="existing"; else DB_MODE="bundled"; fi
  else
    DB_MODE="bundled"
  fi
fi

if [[ "$DB_MODE" == "existing" ]]; then
  if [[ -t 0 ]]; then
    [[ -n "${DB_HOST:-}" ]] || read -rp "  Host: " DB_HOST
    [[ -n "${DB_PORT:-}" ]] || { read -rp "  Port [5432]: " DB_PORT; DB_PORT="${DB_PORT:-5432}"; }
    [[ -n "${DB_NAME:-}" ]] || { read -rp "  Database name [postgres]: " DB_NAME; DB_NAME="${DB_NAME:-postgres}"; }
    [[ -n "${DB_USER:-}" ]] || { read -rp "  Username [postgres]: " DB_USER; DB_USER="${DB_USER:-postgres}"; }
    if [[ -z "${DB_PASSWORD:-}" ]]; then read -rsp "  Password: " DB_PASSWORD; echo; fi
  fi
  DB_PORT="${DB_PORT:-5432}"; DB_NAME="${DB_NAME:-postgres}"; DB_USER="${DB_USER:-postgres}"
  : "${DB_HOST:?DB_HOST is required when DB_MODE=existing}"
  : "${DB_PASSWORD:?DB_PASSWORD is required when DB_MODE=existing}"

  log "Checking the existing database is reachable"
  PGPASSWORD="$DB_PASSWORD" psql -X -tAc "select 1" \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null || {
      echo "Could not connect to ${DB_HOST}:${DB_PORT}/${DB_NAME} with those credentials." >&2
      exit 1; }
  log "Backend will use the existing PostgreSQL at ${DB_HOST}:${DB_PORT}/${DB_NAME}"
else
  log "Backend will install and run its own PostgreSQL 16 on this VM"
fi

log "Starting the backend (accounts + data API${DB_MODE:+, database: $DB_MODE})"
PUBLIC_URL="$PUBLIC_URL" ADMIN_EMAIL="${ADMIN_EMAIL:-}" ADMIN_PASSWORD="${ADMIN_PASSWORD:-}" \
  DB_MODE="$DB_MODE" DB_HOST="${DB_HOST:-}" DB_PORT="${DB_PORT:-}" DB_NAME="${DB_NAME:-}" \
  DB_USER="${DB_USER:-}" DB_PASSWORD="${DB_PASSWORD:-}" \
  bash "${APP_DIR}/deploy/selfhost/up.sh"

# Read the generated keys and point the app at the local backend.
set -a; . "${APP_DIR}/deploy/selfhost/.env"; set +a
cat >"/etc/${APP_NAME}.env" <<EOF
# Generated by deploy/install.sh — the backend runs on this VM.
VITE_SUPABASE_URL=${PUBLIC_URL}
VITE_SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
VITE_SUPABASE_PROJECT_ID=cb-assets
# The website talks to the accounts/data API through this same web server, so the
# browser always uses the address it is actually visiting (domain or IP, HTTP or HTTPS).
VITE_SELFHOSTED=true
SUPABASE_URL=http://127.0.0.1:8000
SUPABASE_PUBLISHABLE_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
PORT=${APP_PORT}
EOF
chmod 640 "/etc/${APP_NAME}.env"
chown root:"$APP_USER" "/etc/${APP_NAME}.env"
chown -R "$APP_USER":"$APP_USER" "$APP_DIR"


# A previous install leaves compiled pages behind. Mixing them with a new build
# makes some pages fail to load ("ENOENT ... /.output/public/assets/<page>.js"),
# so the old output and every build cache is removed before rebuilding.
log "Removing any previous build output"
systemctl stop "${APP_NAME}" 2>/dev/null || true
rm -rf "${APP_DIR}/.output" "${APP_DIR}/dist" "${APP_DIR}/.nitro" "${APP_DIR}/.tanstack" \
  "${APP_DIR}/.vinxi" "${APP_DIR}/.wrangler" "${APP_DIR}/node_modules/.vite" \
  "${APP_DIR}/node_modules/.cache" "${APP_DIR}/tsconfig.tsbuildinfo"

log "Installing dependencies and building (this takes a few minutes)"
su -s /bin/bash "$APP_USER" -c "cd '$APP_DIR' && set -a && . /etc/${APP_NAME}.env && set +a && '$BUN' install --frozen-lockfile && NITRO_PRESET=node-server '$BUN' run build"

if [[ ! -f "${APP_DIR}/.output/server/index.mjs" ]]; then
  echo "Build did not produce .output/server/index.mjs — aborting." >&2
  exit 1
fi

# Every page chunk the server manifest points at must exist on disk, otherwise
# that page returns a 500 at runtime instead of rendering.
missing_chunks=0
while IFS= read -r chunk; do
  [[ -f "${APP_DIR}/.output/public/${chunk}" ]] || { echo "Missing built file: ${chunk}" >&2; missing_chunks=1; }
done < <(grep -oh '"assets/[^"]*\.js"' "${APP_DIR}"/.output/server/*.mjs 2>/dev/null | tr -d '"' | sort -u)
if [[ "$missing_chunks" == "1" ]]; then
  echo "The build is incomplete — remove ${APP_DIR} and run the installer again." >&2
  exit 1
fi

log "Installing the Python (Flask) API service"
su -s /bin/bash "$APP_USER" -c "cd '${APP_DIR}/backend' && python3 -m venv .venv && ./.venv/bin/pip install --upgrade pip >/dev/null && ./.venv/bin/pip install -r requirements.txt"

log "Installing systemd services"
install -m 0644 "${APP_DIR}/deploy/${APP_NAME}.service" "/etc/systemd/system/${APP_NAME}.service"
install -m 0644 "${APP_DIR}/deploy/${APP_NAME}-api.service" "/etc/systemd/system/${APP_NAME}-api.service"
systemctl daemon-reload
systemctl enable "${APP_NAME}" >/dev/null 2>&1 || true
systemctl enable "${APP_NAME}-api" >/dev/null 2>&1 || true
# restart (not just start): an already-running service would keep serving the old build.
systemctl restart "${APP_NAME}"
systemctl restart "${APP_NAME}-api"

log "Checking the API answers"
for i in $(seq 1 20); do
  if curl -sf -o /dev/null http://127.0.0.1:5000/api/public/health; then echo "API healthy"; break; fi
  sleep 1
done


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
echo "CB Assets is running on ${PUBLIC_URL}/  — everything (website, database,"
echo "accounts and API) runs on this VM; no external service is used."
echo
echo "Settings:        /etc/${APP_NAME}.env      (restart: sudo systemctl restart ${APP_NAME})"
echo "Backend secrets: ${APP_DIR}/deploy/selfhost/.env"
echo "Backend status:  sudo docker compose --project-directory ${APP_DIR}/deploy/selfhost ps"
echo "Logs:            sudo journalctl -u ${APP_NAME} -f"
echo "HTTPS:           sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d your.domain"
if [[ -z "${ADMIN_EMAIL:-}" ]]; then
  echo
  echo "No administrator account yet. Create one with:"
  echo "  sudo ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' bash ${APP_DIR}/deploy/selfhost/up.sh"
fi

