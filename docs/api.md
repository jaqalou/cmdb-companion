# CB Assets API

Two REST dialects over the same CMDB data, served by the Flask backend at
`/api/public/` on the self-hosted VM.

| Dialect | Base path |
| --- | --- |
| GLPI | `/api/public/apirest.php/...` |
| ServiceNow Table API | `/api/public/now/table/...` |
| Health / capability probe | `/api/public/health` |

## Authentication

Every request carries a CB Assets account token, either as
`Authorization: Bearer <jwt>` or as GLPI's `Session-Token` header. The query
runs as that account, so PostgreSQL row level security applies exactly as in
the web UI: admins and editors create/edit/delete, viewers read, anonymous
callers get `401`. No database password or service key is involved.

Get a token:

```bash
curl -s -X POST "$BASE/auth/v1/token?grant_type=password" \
  -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"..."}' | jq -r .access_token
```

`ANON_KEY` is `ANON_KEY` in `deploy/selfhost/.env`.

## CI classes

| Table | GLPI itemtype | ServiceNow table |
| --- | --- | --- |
| `cmdb_ci_server` | `Computer` | `cmdb_ci_server` |
| `cmdb_ci_db_mssql_instance` | `DatabaseInstance` | `cmdb_ci_db_mssql_instance` |
| `cmdb_ci_netgear_switch` | `NetworkEquipment` | `cmdb_ci_netgear_switch` |
| `cmdb_ci_wap` | `AccessPoint` | `cmdb_ci_wap` |

Aliases accepted by GLPI paths: `computer`, `server`, `databaseinstance`,
`database`, `networkequipment`, `switch`, `accesspoint`, `wap`.

## GLPI examples

```bash
TOKEN="Bearer <access token>"; BASE=https://cmdb.example.com

curl -H "Authorization: $TOKEN" "$BASE/api/public/apirest.php/Computer?range=0-9"

curl -H "Authorization: $TOKEN" \
 "$BASE/api/public/apirest.php/search/Computer?criteria[0][field]=hostname&criteria[0][searchtype]=contains&criteria[0][value]=web"

curl -X POST -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
 -d '{"input":{"hostname":"web-99","environment":"Test"}}' \
 "$BASE/api/public/apirest.php/Computer"

curl -X PATCH -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
 -d '{"input":{"environment":"Production"}}' \
 "$BASE/api/public/apirest.php/Computer/<sys_id>"

curl -X DELETE -H "Authorization: $TOKEN" "$BASE/api/public/apirest.php/Computer/<sys_id>"
```

`range=0-49` paginates (inclusive, max 1000 rows); list responses carry
`Content-Range`. Search types: `equals`, `notequals`, `contains`,
`notcontains`, `beginswith`, `endswith`, `morethan`, `lessthan`.

Session helpers exist for GLPI clients: `initSession`, `killSession`,
`getMyProfiles`, `getActiveProfile`, `listSearchOptions/<itemtype>`.

## ServiceNow examples

```bash
curl -H "Authorization: $TOKEN" \
 "$BASE/api/public/now/table/cmdb_ci_server?sysparm_query=environmentLIKEProd^ORDERBYhostname&sysparm_limit=10"

curl -X PATCH -H "Authorization: $TOKEN" -H "Content-Type: application/json" \
 -d '{"environment":"Production"}' \
 "$BASE/api/public/now/table/cmdb_ci_server/<sys_id>"
```

Supported operators in `sysparm_query`: `=`, `!=`, `LIKE`, `NOTLIKE`,
`STARTSWITH`, `ENDSWITH`, `IN`, `>`, `<`, `>=`, `<=`, joined with `^`, plus
`ORDERBY` / `ORDERBYDESC`. `sysparm_fields`, `sysparm_limit` (default 50) and
`sysparm_offset` are honoured; list responses set `X-Total-Count`.

## Python client

```python
import requests

BASE, TOKEN = "https://cmdb.example.com", "<access token>"
s = requests.Session()
s.headers["Authorization"] = f"Bearer {TOKEN}"

rows = s.get(f"{BASE}/api/public/now/table/cmdb_ci_server",
             params={"sysparm_limit": 100}).json()["result"]
for r in rows:
    print(r["hostname"], r.get("environment"), r.get("eol_date"))
```

## Extending

Add a CI class in one place — `backend/cmdb/classes.py` (Flask) and
`src/lib/cmdb-api/classes.ts` (bundled TypeScript API). Dialects are toggled
with `API_DIALECTS` in the same files.

## Errors

| Status | Meaning |
| --- | --- |
| 400 | Missing id on update/delete, or malformed body |
| 401 | Missing / expired token |
| 403 | Token valid but the role may not perform the action |
| 404 | Unknown itemtype, table, record or endpoint |
| 405 | Method not allowed on that path |
