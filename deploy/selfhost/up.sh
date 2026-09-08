#!/usr/bin/env bash
# Bring up the self-contained CB Assets backend: PostgreSQL + accounts + data API.
# Idempotent: safe to re-run after changes or a reboot.
#
#   sudo bash deploy/selfhost/up.sh            # uses http://<vm-ip> as public URL
#   sudo PUBLIC_URL=https://cmdb.example.com bash deploy/selfhost/up.sh
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "${HERE}/../.." && pwd)"
ENV_FILE="${HERE}/.env"
COMPOSE="docker compose --project-directory ${HERE} -f ${HERE}/docker-compose.yml"

log() { echo -e "\n\033[1;32m==>\033[0m $*"; }

command -v docker >/dev/null || { echo "docker is required (deploy/install.sh installs it)" >&2; exit 1; }

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
set -a; . "$ENV_FILE"; set +a

psql_run() {
  $COMPOSE exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db \
    psql -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

# 2. Database --------------------------------------------------------------
log "Starting PostgreSQL"
$COMPOSE up -d db
for i in $(seq 1 60); do
  $COMPOSE exec -T db pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 2
done

log "Preparing roles and helper functions"
psql_run -v db_password="$POSTGRES_PASSWORD" -f - <"${HERE}/sql/00-bootstrap.sql"

# 3. Accounts service (creates the auth tables the app schema references) ---
log "Starting the accounts service"
$COMPOSE up -d auth
for i in $(seq 1 60); do
  psql_run -tAc "SELECT to_regclass('auth.users') IS NOT NULL" 2>/dev/null | grep -q '^t$' && break
  sleep 2
done
psql_run -tAc "SELECT to_regclass('auth.users') IS NOT NULL" | grep -q '^t$' || {
  echo "The accounts service did not finish setting up its tables." >&2
  $COMPOSE logs --tail 40 auth >&2
  exit 1
}

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
$COMPOSE exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db \
  psql -U postgres -d postgres -c "NOTIFY pgrst, 'reload schema'" >/dev/null

for i in $(seq 1 30); do
  curl -sf -o /dev/null "http://127.0.0.1:8000/health" && break
  sleep 2
done

log "Backend is up on http://127.0.0.1:8000"
$COMPOSE ps
