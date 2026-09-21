#!/usr/bin/env bash
# Rename the CB Assets database on a running installation, keeping all data.
#
#   sudo bash scripts/rename-database.sh [new-name]
#
# Default new name: cmdb
#
# What it does:
#   1. reads the current database settings from deploy/selfhost/.env
#   2. stops the accounts and data services (so nothing holds the database open)
#   3. renames the database
#   4. writes the new name into deploy/selfhost/.env
#   5. starts the services again
set -euo pipefail

NEW_NAME="${1:-cmdb}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SELFHOST="$ROOT/deploy/selfhost"
ENV_FILE="$SELFHOST/.env"

log() { printf '\n==> %s\n' "$*"; }

[[ -f "$ENV_FILE" ]] || { echo "No settings file at $ENV_FILE — run this on the installed copy (usually /opt/cb-assets)." >&2; exit 1; }
set -a; . "$ENV_FILE"; set +a

DB_MODE="${DB_MODE:-bundled}"
OLD_NAME="${DB_NAME:-postgres}"
if [[ "$OLD_NAME" == "$NEW_NAME" ]]; then
  echo "The database is already called ${NEW_NAME}. Nothing to do."
  exit 0
fi

if docker compose version >/dev/null 2>&1; then COMPOSE="docker compose"; else COMPOSE="docker-compose"; fi
COMPOSE="$COMPOSE --project-directory $SELFHOST -f $SELFHOST/docker-compose.yml --env-file $ENV_FILE"

maint() {
  if [[ "$DB_MODE" == "bundled" ]]; then
    $COMPOSE exec -T -e PGPASSWORD="${POSTGRES_PASSWORD:-}" db \
      psql -v ON_ERROR_STOP=1 -U postgres -d template1 "$@"
  else
    docker run --rm -i --network host -e PGPASSWORD="${DB_PASSWORD:-}" postgres:16-alpine \
      psql -v ON_ERROR_STOP=1 -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d template1 "$@"
  fi
}

log "Renaming ${OLD_NAME} to ${NEW_NAME} (all data is kept)"
log "Stopping the accounts and data services"
$COMPOSE stop auth rest >/dev/null 2>&1 || true

maint -c "select pg_terminate_backend(pid) from pg_stat_activity where datname = '${OLD_NAME}' and pid <> pg_backend_pid()" >/dev/null
maint -c "alter database \"${OLD_NAME}\" rename to \"${NEW_NAME}\""

log "Saving the new name in the settings file"
sed -i "/^DB_NAME=/d" "$ENV_FILE"
echo "DB_NAME=${NEW_NAME}" >>"$ENV_FILE"

log "Starting the services again"
bash "$SELFHOST/up.sh"

log "Done — the database is now called ${NEW_NAME}"
