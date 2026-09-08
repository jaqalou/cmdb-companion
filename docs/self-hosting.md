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

`PUBLIC_URL` defaults to `http://<vm-ip>` and must match the address browsers
use, otherwise sign-in links break. The installer generates the database
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
| Migrations not applied | `bash deploy/selfhost/up.sh` re-applies pending ones |
