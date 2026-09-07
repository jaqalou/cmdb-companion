# CB Assets

Internal configuration management database (CMDB) for CB Group IT, with a GLPI-style API (ServiceNow-compatible dialect included).

## Development

```sh
bun install
bun run dev
```

## Install on an Ubuntu server

Ubuntu 22.04 or 24.04. Copy the project to the server, then:

```sh
sudo bash deploy/install.sh
```

The script installs everything needed (Node.js 22, Bun, build tools, nginx, firewall),
builds the app with the Node server target (`NITRO_PRESET=node-server`, output in
`.output/server/index.mjs`), and starts it as the `cb-assets` service behind nginx on port 80.

Afterwards:

- Backend settings: `/etc/cb-assets.env` (restart with `sudo systemctl restart cb-assets`)
  - `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_*` — required
  - `SUPABASE_SERVICE_ROLE_KEY` — required for creating, renaming and deleting user accounts
- Logs: `sudo journalctl -u cb-assets -f`
- HTTPS: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d your.domain`
- Remove: `sudo bash deploy/uninstall.sh`

### Manual build

```sh
bun install
NITRO_PRESET=node-server bun run build
node .output/server/index.mjs   # honours PORT and HOST
```

