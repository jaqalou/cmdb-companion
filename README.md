# CB Assets

Internal configuration management database (CMDB) for CB Group IT, with a GLPI-style API (ServiceNow-compatible dialect included).

## Development

```sh
bun install
bun run dev
```

## Install on an Ubuntu server (fully self-contained)

Ubuntu 22.04 or 24.04, 2 vCPU / 4 GB RAM recommended. Copy the project to the
server, then:

```sh
sudo ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' \
     PUBLIC_URL=https://cmdb.example.com \
     bash deploy/install.sh
```

`PUBLIC_URL` defaults to `http://<vm-ip>`; `ADMIN_*` are optional (see below).
The installer asks whether to install a new PostgreSQL 16 on the VM or to use
an existing PostgreSQL server (it then asks for host, port, database, username
and password). Unattended equivalent:

```sh
sudo DB_MODE=existing DB_HOST=db.internal DB_PORT=5432 DB_NAME=cmdb \
     DB_USER=cbassets DB_PASSWORD='secret' bash deploy/install.sh
```

To only create the CB Assets tables in an existing database:

```sh
python3 deploy/apply-schema.py --host db.internal --dbname cmdb --user postgres
```

The VM ends up running **everything** — no external service is required:

| Piece | What it is | Where |
| --- | --- | --- |
| Website | TanStack Start server build | systemd `cb-assets`, port 3000 |
| CMDB REST API | Python / Flask (GLPI + ServiceNow) | systemd `cb-assets-api`, port 5000 |
| Database | PostgreSQL 16 | Docker, `127.0.0.1:5432` |
| Accounts / sign-in | GoTrue | Docker, behind `/auth/v1/` |
| Data API | PostgREST | Docker, behind `/rest/v1/` |
| Front door | nginx on port 80 | `/`, `/api/public/`, `/auth/v1/`, `/rest/v1/` |

nginx sends `/api/public/` to the Flask service, so external API clients reach
the Python backend while the site itself reads through `/rest/v1/` — same
database, same permissions.

The installer generates the database password and API keys
(`deploy/selfhost/.env`), applies every migration in `supabase/migrations/`
in order, creates the Python virtualenv for the API service, and records what
it applied so re-running is safe.

Full documentation: [docs/README.md](docs/README.md) —
[architecture](docs/architecture.md), [data model](docs/data-model.md),
[permissions](docs/permissions.md), [user guide](docs/user-guide.md),
[API](docs/api.md), [self-hosting](docs/self-hosting.md),
[development](docs/development.md).


Afterwards:

- App settings: `/etc/cb-assets.env` (restart with `sudo systemctl restart cb-assets`)
- Backend secrets: `/opt/cb-assets/deploy/selfhost/.env` (JWT secret, anon and service keys)
- Backend containers: `sudo docker compose --project-directory /opt/cb-assets/deploy/selfhost ps`
- Logs: `sudo journalctl -u cb-assets -f`
- HTTPS: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d your.domain`
  (afterwards re-run with `PUBLIC_URL=https://your.domain` so sign-in links match)
- Remove: `sudo bash deploy/uninstall.sh` (add `PURGE_DATA=1` to delete the database too)

### Accounts

Open self-service sign-up is disabled on a self-hosted install. Create the first
administrator with:

```sh
sudo ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' \
     bash /opt/cb-assets/deploy/selfhost/up.sh
```

The first account created becomes an administrator; further accounts are created
from **Users & permissions** inside the app.

### Backend only

`deploy/selfhost/up.sh` can be run on its own to start or update just the
database, accounts service and data API (`deploy/selfhost/docker-compose.yml`).


### Manual build

```sh
bun install
NITRO_PRESET=node-server bun run build
node .output/server/index.mjs   # honours PORT and HOST
```


## Python / Flask API backend

`backend/` contains a Flask implementation of the CMDB API — the same GLPI
(`/api/public/apirest.php/*`) and ServiceNow (`/api/public/now/table/*`)
dialects, against the same PostgreSQL database and the same permission model.
Run it standalone with gunicorn and proxy `/api/public/` to it, or use it as
the API for Python-based deployments.

See `backend/README.md` for setup, endpoint examples and the systemd unit
(`deploy/cb-assets-api.service`).
