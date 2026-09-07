# CB Assets — Flask backend

A Python/Flask implementation of the CB Assets CMDB API. It serves the same two
REST dialects as the built-in TypeScript backend, against the same PostgreSQL
database, with the same permission model.

| Dialect | Base path |
| --- | --- |
| GLPI | `/api/public/apirest.php/...` |
| ServiceNow Table API | `/api/public/now/table/...` |
| Health / capability probe | `/api/public/health` |

## How permissions work

Requests carry the caller's CB Assets token (`Authorization: Bearer <jwt>` or
GLPI's `Session-Token` header). Every query runs as that account, so PostgreSQL
row level security grants read/write exactly as it does in the web UI: admins
and editors can create, edit and delete; viewers can read; anonymous callers
get `401`. No database password or service key is used or needed.

## Run it

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # fill in SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY
set -a && . ./.env && set +a
gunicorn -w 4 -b 127.0.0.1:5000 wsgi:app
```

Development: `flask --app cmdb run --port 5000`.

## Examples

```bash
TOKEN="Bearer <your CB Assets access token>"

# GLPI: list servers
curl -H "Authorization: $TOKEN" \
  "http://localhost:5000/api/public/apirest.php/Computer?range=0-9"

# GLPI: search
curl -H "Authorization: $TOKEN" \
  "http://localhost:5000/api/public/apirest.php/search/Computer?criteria[0][field]=hostname&criteria[0][searchtype]=contains&criteria[0][value]=web"

# GLPI: create
curl -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"input":{"hostname":"web-99","environment":"Test"}}' \
  "http://localhost:5000/api/public/apirest.php/Computer"

# ServiceNow: list + filter
curl -H "Authorization: $TOKEN" \
  "http://localhost:5000/api/public/now/table/cmdb_ci_server?sysparm_query=environmentLIKEProd^ORDERBYhostname&sysparm_limit=10"

# ServiceNow: update
curl -X PATCH -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
  -d '{"environment":"Production"}' \
  "http://localhost:5000/api/public/now/table/cmdb_ci_server/<sys_id>"
```

## Layout

```
backend/
  cmdb/classes.py  CI class registry + dialect on/off flags
  cmdb/core.py     dialect-agnostic data access (RLS enforced)
  cmdb/glpi.py     GLPI apirest.php dialect
  cmdb/snow.py     ServiceNow Table API dialect
  wsgi.py          gunicorn entry point
```

Adding a CI class means one entry in `cmdb/classes.py`. Switching dialects off
is a flag in the same file.

## Deploying on Ubuntu

`deploy/cb-assets-api.service` runs this under gunicorn on port 5000. Install
it alongside the web app:

```bash
sudo cp deploy/cb-assets-api.service /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now cb-assets-api
```

Then proxy `/api/public/` to `127.0.0.1:5000` in nginx if you want the Flask
backend to serve the API instead of the bundled one.
