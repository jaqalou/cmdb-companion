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
    *) PUBLIC_URL="https://${PUBLIC_URL}" ;;
  esac
  # The site is served over HTTPS only.
  PUBLIC_URL="${PUBLIC_URL/#http:\/\//https://}"
  while [[ "$PUBLIC_URL" == */ ]]; do PUBLIC_URL="${PUBLIC_URL%/}"; done
  if [[ ! "$PUBLIC_URL" =~ ^https?://[^/]+$ ]]; then
    echo "PUBLIC_URL must contain only the protocol and host, for example https://34.60.104.14" >&2
    exit 1
  fi
fi

# 1. Secrets ---------------------------------------------------------------
if [[ ! -f "$ENV_FILE" ]]; then
  log "Generating database password and API keys"
  {
    python3 "${HERE}/gen-keys.py"
    echo "PUBLIC_URL=${PUBLIC_URL:-https://$(hostname -I | awk '{print $1}')}"
  } >"$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
if [[ -n "${PUBLIC_URL:-}" ]]; then
  sed -i "/^PUBLIC_URL=/d" "$ENV_FILE"
  echo "PUBLIC_URL=${PUBLIC_URL}" >>"$ENV_FILE"
fi

# 1a. Google sign-in (optional) -------------------------------------------
for var in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET; do
  if [[ -z "${!var:-}" ]] && grep -q "^${var}=" "$ENV_FILE"; then
    printf -v "$var" '%s' "$(grep "^${var}=" "$ENV_FILE" | tail -n1 | cut -d= -f2-)"
  fi
  sed -i "/^${var}=/d" "$ENV_FILE"
  echo "${var}=${!var:-}" >>"$ENV_FILE"
done
sed -i "/^GOOGLE_ENABLED=/d" "$ENV_FILE"
if [[ -n "${GOOGLE_CLIENT_ID:-}" && -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  echo "GOOGLE_ENABLED=true" >>"$ENV_FILE"
  log "Google sign-in enabled — allowed redirect URI: ${PUBLIC_URL}/auth/v1/callback"
else
  echo "GOOGLE_ENABLED=false" >>"$ENV_FILE"
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

if [[ "$DB_MODE" != "bundled" && "$DB_MODE" != "existing" ]]; then
  echo "DB_MODE must be either bundled or existing (received: ${DB_MODE})." >&2
  exit 1
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
  # Services reach the external database through a relay on the compose
  # network. A database on the VM itself is reached via the host gateway.
  case "$DB_HOST" in
    localhost|127.0.0.1|::1|0.0.0.0) DB_TARGET_HOST="host.docker.internal" ;;
    *) DB_TARGET_HOST="$DB_HOST" ;;
  esac
  DB_HOST_FOR_CONTAINERS="db-proxy"
  DB_PORT_FOR_CONTAINERS="5432"
else
  DB_TARGET_HOST=""
  DB_HOST_FOR_CONTAINERS="db"
  DB_PORT_FOR_CONTAINERS="5432"
fi
export DB_HOST DB_PORT DB_NAME DB_USER DB_TARGET_HOST DB_HOST_FOR_CONTAINERS DB_PORT_FOR_CONTAINERS

# Keep direct `docker compose` maintenance commands aligned with the mode last
# selected through this script. Without these values in .env, Compose may use
# its defaults and point services at the wrong database after a manual restart.
sed -i '/^DB_HOST_FOR_CONTAINERS=/d;/^DB_PORT_FOR_CONTAINERS=/d;/^DB_PROXY_PORT=/d;/^DB_TARGET_HOST=/d' "$ENV_FILE"
{
  echo "DB_HOST_FOR_CONTAINERS=${DB_HOST_FOR_CONTAINERS}"
  echo "DB_PORT_FOR_CONTAINERS=${DB_PORT_FOR_CONTAINERS}"
  [[ "$DB_MODE" == "existing" ]] && echo "DB_TARGET_HOST=${DB_TARGET_HOST}"
} >>"$ENV_FILE"

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
  # Compose profiles do not remove services from a previously selected mode.
  # Remove the old relay so stale external-database settings cannot survive.
  $COMPOSE stop db-proxy >/dev/null 2>&1 || true
  $COMPOSE rm -f db-proxy >/dev/null 2>&1 || true
  # The bundled database is published on 5432. If anything else already holds
  # that port, reclaim it: stop leftover containers publishing it, and stop a
  # PostgreSQL installed directly on the VM.
  port_free() {
    ! (command -v ss >/dev/null && ss -ltn "sport = :$1" 2>/dev/null | grep -q LISTEN) \
      && ! (docker ps --format '{{.Ports}}' | grep -q ":$1->")
  }
  DB_BUNDLED_PORT="${DB_BUNDLED_PORT:-5432}"
  if ! port_free "$DB_BUNDLED_PORT"; then
    log "Freeing port ${DB_BUNDLED_PORT} for the bundled database"

    # a) other containers publishing the port (including our own older ones)
    for cid in $(docker ps --format '{{.ID}} {{.Ports}}' | grep ":${DB_BUNDLED_PORT}->" | awk '{print $1}'); do
      name="$(docker inspect -f '{{.Name}}' "$cid" | sed 's#^/##')"
      echo "  stopping container ${name}"
      docker stop "$cid" >/dev/null || true
    done

    # b) PostgreSQL installed on the VM itself
    if ! port_free "$DB_BUNDLED_PORT" && command -v systemctl >/dev/null; then
      for unit in postgresql postgresql@*-main; do
        if systemctl is-active --quiet "$unit" 2>/dev/null; then
          echo "  stopping the VM's own PostgreSQL service (${unit})"
          systemctl stop "$unit" || true
          systemctl disable "$unit" >/dev/null 2>&1 || true
        fi
      done
    fi

    for i in $(seq 1 15); do port_free "$DB_BUNDLED_PORT" && break; sleep 1; done
    if ! port_free "$DB_BUNDLED_PORT"; then
      echo "Port ${DB_BUNDLED_PORT} is still held by another process:" >&2
      (ss -ltnp "sport = :${DB_BUNDLED_PORT}" 2>/dev/null || true) >&2
      echo "Stop that process and re-run, or use it as the database with:" >&2
      echo "  sudo DB_MODE=existing DB_HOST=127.0.0.1 DB_NAME=... DB_USER=... DB_PASSWORD='...' bash deploy/selfhost/up.sh" >&2
      exit 1
    fi
    echo "  port ${DB_BUNDLED_PORT} is free"
  fi
  export DB_BUNDLED_PORT
  sed -i '/^DB_BUNDLED_PORT=/d' "$ENV_FILE"
  echo "DB_BUNDLED_PORT=${DB_BUNDLED_PORT}" >>"$ENV_FILE"

  log "Starting PostgreSQL"
  if ! $COMPOSE --profile bundled up -d db; then
    echo "PostgreSQL could not start. If the message mentions a port already allocated," >&2
    echo "another process still owns port 5432. Stop the process shown above, then re-run." >&2
    echo "If that process is the PostgreSQL you intend to keep, select it with DB_MODE=existing." >&2
    exit 1
  fi
  db_ready=""
  for i in $(seq 1 60); do
    $COMPOSE exec -T db pg_isready -U postgres >/dev/null 2>&1 && { db_ready="yes"; break; }
    sleep 2
  done
  if [[ -z "$db_ready" ]]; then
    echo "PostgreSQL started but never became ready." >&2
    $COMPOSE --profile bundled logs --tail 40 db >&2
    exit 1
  fi
else
  # Likewise, an existing-database install must not leave the bundled database
  # running and occupying host port 5432.
  $COMPOSE stop db >/dev/null 2>&1 || true
  $COMPOSE rm -f db >/dev/null 2>&1 || true
  log "Using the existing PostgreSQL at ${DB_HOST}:${DB_PORT}/${DB_NAME}"
  psql_run -tAc "select 1" >/dev/null || {
    echo "Could not connect with the supplied credentials." >&2; exit 1; }

  log "Starting the database relay for container services"
  $COMPOSE --profile existing up -d --force-recreate db-proxy
  proxy_cid="$($COMPOSE --profile existing ps -q db-proxy)"
  proxy_ready=""
  for i in $(seq 1 30); do
    # Probe from inside the relay's own network namespace: that is exactly the
    # path the accounts and data services use.
    if [[ -n "$proxy_cid" ]] && docker run --rm --network "container:${proxy_cid}" \
      postgres:16-alpine pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
      proxy_ready="yes"
      break
    fi
    sleep 1
  done
  if [[ -z "$proxy_ready" ]]; then
    echo "The container database relay could not reach ${DB_TARGET_HOST}:${DB_PORT}." >&2
    echo "PostgreSQL must accept TCP connections from Docker containers on this VM." >&2
    if [[ "$DB_TARGET_HOST" == "host.docker.internal" ]]; then
      echo "For a database on this VM, check listen_addresses, pg_hba.conf and the" >&2
      echo "firewall: sudo ufw allow from 172.16.0.0/12 to any port ${DB_PORT} proto tcp" >&2
    fi
    $COMPOSE --profile existing logs --tail 30 db-proxy >&2
    exit 1
  fi
fi

# A previous failed installation may have left auth in a restart loop. Stop it
# before repairing helper ownership so it cannot race the bootstrap transaction.
$COMPOSE stop auth >/dev/null 2>&1 || true

log "Preparing roles and helper functions"
psql_run -v db_password="$POSTGRES_PASSWORD" -f - <"${HERE}/sql/00-bootstrap.sql"

# 3. Accounts service (creates the auth tables the app schema references) ---
# Probe its host-published HTTP endpoint. Existing tables and a nominally
# running container do not prove that GoTrue finished migrations or bound 9999.
log "Starting the accounts service"
$COMPOSE up -d --force-recreate auth
auth_ready=""
for i in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:9999/health"; then
    auth_ready="yes"
    break
  fi
  state="$($COMPOSE ps --format '{{.State}}' auth 2>/dev/null | tr -d '[:space:]')"
  if [[ "$state" != "running" && -n "$state" ]]; then break; fi
  sleep 2
done
if [[ -z "$auth_ready" ]]; then
  echo "The accounts service did not become reachable on its HTTP endpoint (state: ${state:-unknown})." >&2
  $COMPOSE logs --since 5m --tail 80 auth >&2
  exit 1
fi

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
$COMPOSE up -d --force-recreate rest gateway
psql_run -c "NOTIFY pgrst, 'reload schema'" >/dev/null

gateway_ready=""
for i in $(seq 1 30); do
  if curl -sf -o /dev/null "http://127.0.0.1:8000/health"; then gateway_ready="yes"; break; fi
  sleep 2
done
if [[ -z "$gateway_ready" ]]; then
  echo "The backend gateway on 127.0.0.1:8000 is not answering (sign-in would return 502)." >&2
  $COMPOSE logs --since 5m --tail 60 gateway rest >&2
  exit 1
fi

# The sign-in endpoint itself must answer; a reachable gateway with a dead
# accounts service still produces 502 in the browser.
auth_code="$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  -H 'content-type: application/json' -d '{}' \
  "http://127.0.0.1:8000/auth/v1/token?grant_type=password" || echo 000)"
if [[ "$auth_code" == "000" || "$auth_code" == "502" || "$auth_code" == "504" ]]; then
  echo "The accounts service is not reachable through the gateway (HTTP ${auth_code})." >&2
  $COMPOSE logs --since 5m --tail 60 auth gateway >&2
  exit 1
fi

# Verify the second upstream as well. The gateway's own /health response is
# static and can return 200 while the data service is still unavailable.
rest_code="$(curl -s -o /dev/null -w '%{http_code}' \
  -H "apikey: ${ANON_KEY}" \
  "http://127.0.0.1:8000/rest/v1/" || echo 000)"
if [[ "$rest_code" == "000" || "$rest_code" == "502" || "$rest_code" == "503" || "$rest_code" == "504" ]]; then
  echo "The data service is not reachable through the gateway (HTTP ${rest_code})." >&2
  $COMPOSE logs --since 5m --tail 60 rest gateway >&2
  exit 1
fi

log "Backend is up on http://127.0.0.1:8000 (accounts ${auth_code}, data ${rest_code})"
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
