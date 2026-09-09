# CB Assets documentation

Configuration management database (CMDB) for CB Group IT: a web console for
server, SQL, switch and access point inventory, plus a REST API in two
dialects (GLPI and ServiceNow).

| Guide | What it covers |
| --- | --- |
| [Architecture](architecture.md) | How the pieces fit together, request flow, diagrams |
| [Data model](data-model.md) | Tables, fields, audit log, GDPR registers, ER diagram |
| [Permissions](permissions.md) | Roles, row level security, sign-in flow |
| [User guide](user-guide.md) | Day-to-day use of the console |
| [API](api.md) | GLPI and ServiceNow endpoints, tokens, examples |
| [Self-hosting](self-hosting.md) | Ubuntu install, backups, troubleshooting |
| [Development](development.md) | Local setup, code layout, conventions, adding a CI class |

## In one paragraph

The website is a TanStack Start (React 19 + Vite) application. Inventory reads
go straight from the browser to PostgreSQL through the PostgREST data API, with
row level security deciding what each account may see. Writes go through server
functions that verify the caller's token. External systems use the REST API,
served by the Python/Flask service in `backend/` on a self-hosted VM, or by the
bundled TypeScript route (`src/routes/api/public/$.ts`) when hosted. Both
dialects sit on one shared core, so switching from GLPI to ServiceNow is a
naming change, not a rewrite.
