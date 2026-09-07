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
builds the app, and starts it as the `cb-assets` service behind nginx on port 80.

Afterwards:

- Backend settings: `/etc/cb-assets.env` (restart with `sudo systemctl restart cb-assets`)
- Logs: `sudo journalctl -u cb-assets -f`
- HTTPS: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d your.domain`
- Remove: `sudo bash deploy/uninstall.sh`
