# Self-hosting CB Assets on Ubuntu

Everything runs on one VM. Nothing outside it is required.

## What ends up running

| Piece | What it is | Where |
| --- | --- | --- |
| Website | TanStack Start server build | systemd `cb-assets`, `127.0.0.1:3000` |
| CMDB REST API | Python / Flask (GLPI + ServiceNow dialects) | systemd `cb-assets-api`, `127.0.0.1:5000` |
| Database | PostgreSQL 16 | Docker, `127.0.0.1:5432` |
| Accounts / sign-in | GoTrue | Docker, behind `/auth/v1/` |
| Data API | PostgREST | Docker, behind `/rest/v1/` |
| Front door | nginx, port 80 | see routing below |

## Routing (nginx, `deploy/nginx.conf`)

```
/                 -> website        127.0.0.1:3000
/api/public/*     -> Flask API      127.0.0.1:5000
/auth/v1/*        -> accounts       127.0.0.1:8000
/rest/v1/*        -> data API       127.0.0.1:8000
```

Because `/api/public/` is proxied to the Flask service, every external API
client on the internet talks to the Python backend, while the browser UI
reads and writes through `/rest/v1/`. Both hit the same PostgreSQL database
and the same row level security rules.

## Install

Ubuntu 22.04 or 24.04, 2 vCPU / 4 GB RAM.

```sh
sudo ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' \
     PUBLIC_URL=https://cmdb.example.com \
     bash deploy/install.sh
```

### Choosing the database

The installer asks whether to install a new PostgreSQL 16 on the VM
(default) or to use an existing PostgreSQL server. Choosing "existing"
prompts for host, port, database name, username and password, verifies the
connection, and then creates the CB Assets schema there — the bundled
database container is never started.

Answer up front to install unattended:

```sh
sudo DB_MODE=existing DB_HOST=db.internal DB_PORT=5432 DB_NAME=cmdb \
     DB_USER=cbassets DB_PASSWORD='secret' \
     ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' \
     PUBLIC_URL=https://cmdb.example.com \
     bash deploy/install.sh
```

`DB_MODE=bundled` (the default) keeps everything on the VM. The settings are
stored in `deploy/selfhost/.env` and reused on every later run of
`deploy/selfhost/up.sh`.

The account supplied for an existing server must be allowed to create roles,
schemas and extensions (a superuser, or the database owner with
`CREATEROLE`). The setup creates the `anon`, `authenticated`, `service_role`,
`authenticator` and `supabase_auth_admin` roles, the `auth` schema and the
`public` CMDB tables.

### Configuring the tables in an existing database, on its own

To prepare a database without installing the application — for example from
a workstation, or ahead of the install:

```sh
python3 deploy/apply-schema.py \
  --host db.internal --port 5432 --dbname cmdb \
  --user postgres --role-password 'password-for-the-service-roles'

python3 deploy/apply-schema.py --env-file          # reuse deploy/selfhost/.env
python3 deploy/apply-schema.py --host db --dry-run # show what would be applied
python3 deploy/apply-schema.py --host db --docker  # no local psql client needed
```

It applies `deploy/selfhost/sql/00-bootstrap.sql` and every file in
`supabase/migrations/` in order, recording each in
`public.applied_migrations`, so re-running only applies what is missing.
`--role-password` is the password given to the `authenticator` and
`supabase_auth_admin` roles; it must match `POSTGRES_PASSWORD` in
`deploy/selfhost/.env` so the accounts service and data API can connect.

`PUBLIC_URL` defaults to `http://<vm-ip>` and must match the address browsers
use, otherwise sign-in links break. A bare IP or domain is accepted and gets
`http://` automatically; paths and unsupported protocols are rejected. The installer generates the database
password and API keys into `deploy/selfhost/.env`, applies every migration in
`supabase/migrations/`, records what it applied (re-running is safe), installs
the Python virtualenv for the Flask service, and starts both systemd units.

## Day to day

```sh
sudo systemctl restart cb-assets          # website
sudo systemctl restart cb-assets-api      # Flask API
sudo journalctl -u cb-assets -f
sudo journalctl -u cb-assets-api -f
sudo docker compose --project-directory /opt/cb-assets/deploy/selfhost ps
curl -s http://localhost/api/public/health
```

- App + API settings: `/etc/cb-assets.env` (shared by both services)
- Backend secrets: `/opt/cb-assets/deploy/selfhost/.env`
- HTTPS: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d your.domain`,
  then re-run the installer with `PUBLIC_URL=https://your.domain`
- Remove: `sudo bash deploy/uninstall.sh` (`PURGE_DATA=1` also deletes the database)

## Backup and restore

```sh
# backup
sudo docker exec cb-assets-db-1 pg_dump -U postgres postgres | gzip > cb-assets-$(date +%F).sql.gz
# restore
gunzip -c cb-assets-2026-01-01.sql.gz | sudo docker exec -i cb-assets-db-1 psql -U postgres postgres
```

Keep a copy of `deploy/selfhost/.env` with the dump — without the JWT secret,
existing accounts and tokens cannot be validated.

## Accounts

Open sign-up is disabled on a self-hosted install. The first account created
becomes an administrator:

```sh
sudo ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='choose-a-strong-one' \
     bash /opt/cb-assets/deploy/selfhost/up.sh
```

Further accounts are created in the app under **Users & permissions**
(admin / editor / viewer).

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| API returns 502 | `systemctl status cb-assets-api`; check the venv exists at `backend/.venv` |
| API returns 401 | No or expired bearer token — see `docs/api.md` |
| Website loads, lists empty | Signed out: inventory reads require an account |
| Sign-in redirects fail | `PUBLIC_URL` does not match the address in the browser |
| Request contains `/<server-ip>/auth/v1/` | Re-run the installer; it now normalizes host-only `PUBLIC_URL` values |
| Migrations not applied | `bash deploy/selfhost/up.sh` re-applies pending ones |

## Sign-in fails with "Failed to fetch"

This means the browser could not reach the accounts service. Since the site and
the accounts/data API are served by the same web server, the app now always
calls them on the address you are actually visiting, so this normally resolves
itself after re-running the installer:

```bash
sudo PUBLIC_URL=https://your.domain bash deploy/install.sh
```

For an IP-only installation, use `sudo PUBLIC_URL=http://34.60.104.14 bash deploy/install.sh`.
The browser may warn that HTTPS-only security features are unavailable over plain HTTP;
use a domain with a valid HTTPS certificate to enable them.

If it persists, check that nginx is running (`sudo systemctl status nginx`) and
that the backend answers locally: `curl -s http://127.0.0.1:8000/health`.
