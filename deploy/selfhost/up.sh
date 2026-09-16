#!/usr/bin/env bash
# Bring up the CB Assets backend: PostgreSQL (bundled or existing) + accounts + data API.
# Idempotent: safe to re-run after changes or a reboot.
#
#   sudo bash deploy/selfhost/up.sh                       # bundled PostgreSQL in Docker
#   sudo DB_MODE=existing DB_HOST=db.internal DB_PORT=5432 \
#        DB_NAME=cmdb DB_USER=postgres DB_PASSWORD='...' \
#        bash deploy/selfhost/up.sh                       # use an existing PostgreSQL
#
#   sudo PUBLIC_URL=https://cmdb.example.com bash deploy/selfhost/up.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "${HERE}/../.." && pwd)"
ENV_FILE="${HERE}/.env"
COMPOSE="docker compose --project-directory ${HERE} -f ${HERE}/docker-compose.yml"

log() { echo -e "\n\033[1;32m==>\033[0m $*"; }

command -v docker >/dev/null || { echo "docker is required (deploy/install.sh installs it)" >&2; exit 1; }

# Keep direct runs consistent with deploy/install.sh. A bare host is accepted,
# but the accounts service must always receive a complete, path-free origin.
if [[ -z "${PUBLIC_URL:-}" ]] && [[ -f "$ENV_FILE" ]] && grep -q '^PUBLIC_URL=' "$ENV_FILE"; then
  PUBLIC_URL="$(grep '^PUBLIC_URL=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
fi
if [[ -n "${PUBLIC_URL:-}" ]]; then
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
fi

# 1. Secrets ---------------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  log "Generating database password and API keys"
  {
    python3 "${HERE}/gen-keys.py"
    echo "PUBLIC_URL=${PUBLIC_URL:-http://$(hostname -I | awk '{print $1}')}"
  } >"$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
if [[ -n "${PUBLIC_URL:-}" ]]; then
  sed -i "/^PUBLIC_URL=/d" "$ENV_FILE"
  echo "PUBLIC_URL=${PUBLIC_URL}" >>"$ENV_FILE"
fi

# 1b. Database target ------------------------------------------------------
# DB_MODE=bundled  -> PostgreSQL 16 in Docker on this VM (default)
# DB_MODE=existing -> an existing PostgreSQL reachable from this VM
DB_MODE="${DB_MODE:-}"
if [[ -z "$DB_MODE" ]] && grep -q '^DB_MODE=' "$ENV_FILE"; then
  DB_MODE="$(grep '^DB_MODE=' "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
fi
DB_MODE="${DB_MODE:-bundled}"

if [[ "$DB_MODE" == "existing" ]]; then
  # Re-use previously stored values when the variable is not given again.
  for var in DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD; do
    if [[ -z "${!var:-}" ]] && grep -q "^${var}=" "$ENV_FILE"; then
      printf -v "$var" '%s' "$(grep "^${var}=" "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
    fi
  done
  DB_PORT="${DB_PORT:-5432}"
  DB_NAME="${DB_NAME:-postgres}"
  : "${DB_HOST:?DB_HOST is required when DB_MODE=existing}"
  : "${DB_USER:?DB_USER is required when DB_MODE=existing}"
  : "${DB_PASSWORD:?DB_PASSWORD is required when DB_MODE=existing}"
  # The bundled services connect with their own roles, using this password.
  POSTGRES_PASSWORD_OVERRIDE="$DB_PASSWORD"
else
  DB_HOST="db"; DB_PORT="5432"; DB_NAME="postgres"; DB_USER="postgres"
fi

# Persist the database settings so re-runs and other scripts agree.
{
  sed -i '/^DB_MODE=/d;/^DB_HOST=/d;/^DB_PORT=/d;/^DB_NAME=/d;/^DB_USER=/d;/^DB_PASSWORD=/d' "$ENV_FILE"
  {
    echo "DB_MODE=${DB_MODE}"
    echo "DB_HOST=${DB_HOST}"
    echo "DB_PORT=${DB_PORT}"
    echo "DB_NAME=${DB_NAME}"
    echo "DB_USER=${DB_USER}"
    [[ "$DB_MODE" == "existing" ]] && echo "DB_PASSWORD=${DB_PASSWORD}"
  } >>"$ENV_FILE"
}
set -a; . "$ENV_FILE"; set +a

# In "existing" mode every service role shares the supplied password.
if [[ "$DB_MODE" == "existing" ]]; then
  POSTGRES_PASSWORD="${POSTGRES_PASSWORD_OVERRIDE}"
  export POSTGRES_PASSWORD
  # Containers reach a host-local database through the gateway alias.
  [[ "$DB_HOST" == "localhost" || "$DB_HOST" == "127.0.0.1" ]] && DB_HOST_FOR_CONTAINERS="host.docker.internal" || DB_HOST_FOR_CONTAINERS="$DB_HOST"
else
  DB_HOST_FOR_CONTAINERS="db"
fi
export DB_HOST DB_PORT DB_NAME DB_USER DB_HOST_FOR_CONTAINERS

psql_run() {
  if [[ "$DB_MODE" == "bundled" ]]; then
    $COMPOSE exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db \
      psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
  else
    docker run --rm -i --network host -e PGPASSWORD="$DB_PASSWORD" postgres:16-alpine \
      psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" "$@"
  fi
}

# 2. Database --------------------------------------------------------------
if [[ "$DB_MODE" == "bundled" ]]; then
  log "Starting PostgreSQL"
  $COMPOSE --profile bundled up -d db
  for i in $(seq 1 60); do
    $COMPOSE exec -T db pg_isready -U postgres >/dev/null 2>&1 && break
    sleep 2
  done
else
  log "Using the existing PostgreSQL at ${DB_HOST}:${DB_PORT}/${DB_NAME}"
  psql_run -tAc "select 1" >/dev/null || {
    echo "Could not connect with the supplied credentials." >&2; exit 1; }
fi

# A previous failed installation may have left auth in a restart loop. Stop it
# before repairing helper ownership so it cannot race the bootstrap transaction.
$COMPOSE stop auth >/dev/null 2>&1 || true

log "Preparing roles and helper functions"
psql_run -v db_password="$POSTGRES_PASSWORD" -f - <"${HERE}/sql/00-bootstrap.sql"

# 3. Accounts service (creates the auth tables the app schema references) ---
log "Starting the accounts service"
$COMPOSE up -d auth
for i in $(seq 1 60); do
  $COMPOSE exec -T auth wget -qO- http://localhost:9999/health >/dev/null 2>&1 && break
  sleep 2
done
$COMPOSE exec -T auth wget -qO- http://localhost:9999/health >/dev/null 2>&1 || {
  echo "The accounts service did not finish setting up its tables." >&2
  $COMPOSE logs --tail 40 auth >&2
  exit 1
}

log "Installing the request helper functions"
psql_run -f - <"${HERE}/sql/10-auth-helpers.sql"

# 4. Application schema ----------------------------------------------------
log "Applying the application schema"
psql_run -c "CREATE TABLE IF NOT EXISTS public.applied_migrations (
  filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());"

for file in "${REPO}"/supabase/migrations/*.sql; do
  name="$(basename "$file")"
  applied="$(psql_run -tAc "SELECT 1 FROM public.applied_migrations WHERE filename = '${name}'")"
  [[ "$applied" == "1" ]] && continue
  echo "  - ${name}"
  psql_run -f - <"$file"
  psql_run -c "INSERT INTO public.applied_migrations (filename) VALUES ('${name}')"
done

# 5. Data API + gateway ----------------------------------------------------
log "Starting the data API"
$COMPOSE up -d rest gateway
psql_run -c "NOTIFY pgrst, 'reload schema'" >/dev/null

for i in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:8000/health" && break
  sleep 2
done

log "Backend is up on http://127.0.0.1:8000"
$COMPOSE ps

# 6. First administrator ---------------------------------------------------
# The first account created becomes an administrator (database trigger).
if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
  existing="$(psql_run -tAc "SELECT 1 FROM auth.users WHERE email = '${ADMIN_EMAIL}'")"
  if [[ "$existing" != "1" ]]; then
    log "Creating the administrator account ${ADMIN_EMAIL}"
    curl -sf -X POST "http://127.0.0.1:8000/auth/v1/admin/users" \
      -H "apikey: ${SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
      -H "content-type: application/json" \
      -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\",\"email_confirm\":true}" \
      >/dev/null && echo "  account ready"
  fi
fi
