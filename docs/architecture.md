# Architecture

## Components

| Piece | Technology | Where it runs |
| --- | --- | --- |
| Web console | TanStack Start v1, React 19, Vite 7, Tailwind v4 | systemd `cb-assets`, port 3000 |
| CMDB REST API | Python 3 / Flask + gunicorn (`backend/`) | systemd `cb-assets-api`, port 5000 |
| Bundled REST API (fallback) | TypeScript route `src/routes/api/public/$.ts` | inside the web app |
| Database | PostgreSQL 16 | Docker, `127.0.0.1:5432` |
| Accounts / sign-in | GoTrue | Docker, behind `/auth/v1/` |
| Data API | PostgREST | Docker, behind `/rest/v1/` |
| Front door | nginx, port 80/443 | the VM |

## System diagram

```mermaid
graph TD
    B[Browser] -->|HTTPS| N[nginx]
    X[External systems<br/>scripts, ServiceNow, GLPI clients] -->|HTTPS| N

    N -->|/| W[Web console<br/>TanStack Start :3000]
    N -->|/api/public/| F[Flask CMDB API :5000]
    N -->|/auth/v1/| G[GoTrue :8000]
    N -->|/rest/v1/| R[PostgREST :8000]

    W -->|reads via data API| R
    W -->|writes via server functions| R
    F -->|caller's bearer token| R
    G --> P[(PostgreSQL 16)]
    R --> P
```

## Request flow

Reads and writes both end at PostgreSQL, and row level security is the single
place access is decided — there is no second permission layer to keep in sync.

```mermaid
sequenceDiagram
    participant U as User / API client
    participant A as Web console or Flask API
    participant R as PostgREST
    participant P as PostgreSQL

    U->>A: request with bearer token
    A->>R: same token forwarded (apikey + Authorization)
    R->>P: query executed as that account
    P-->>R: rows allowed by row level security
    R-->>A: JSON
    A-->>U: dialect envelope (GLPI / ServiceNow / UI)
```

Anonymous callers get `401`; a viewer can read; editors can create and update;
admins can additionally delete and manage accounts.

## The two API dialects

Both dialects parse their own query shape into one internal `CoreQuery`
(`filters`, `fields`, `sort`, `ascending`, `offset`, `limit`) and call one
shared data-access core. Only the envelope differs.

```mermaid
graph LR
    GL["GLPI<br/>/api/public/apirest.php/*<br/>criteria[], range"] --> C[CoreQuery]
    SN["ServiceNow<br/>/api/public/now/table/*<br/>sysparm_query, sysparm_limit"] --> C
    C --> D[Data access core<br/>list / get / create / update / delete]
    D --> R[PostgREST + RLS]
```

Implementations, kept mirrored:

| Concern | TypeScript | Python |
| --- | --- | --- |
| CI class registry | `src/lib/cmdb-api/classes.ts` | `backend/cmdb/classes.py` |
| Shared core | `src/lib/cmdb-api/core.ts` | `backend/cmdb/core.py` |
| GLPI dialect | `src/lib/glpi-api.ts` | `backend/cmdb/glpi.py` |
| ServiceNow dialect | `src/lib/servicenow-api.ts` | `backend/cmdb/snow.py` |
| Dialect on/off | `API_DIALECTS` in `cmdb-api/config.ts` | `API_DIALECTS` in `classes.py` |

## Front-end structure

```
src/routes/               file-based routes
  index.tsx               dashboard with KPI tiles
  servers|databases|switches|access-points/
    index.tsx             list + support pie chart + export
    $sysId.tsx            record detail, tabs, edit
  new.tsx                 create a record (editor/admin)
  admin/users.tsx         accounts and roles (admin)
  auth.tsx                sign in
  api.tsx                 API reference page
  api/public/$.ts         bundled REST API catch-all
src/components/cmdb/      site chrome, list, detail, support chart
src/lib/                  schema, data queries, server functions, exports
```

Server functions (`*.functions.ts`) carry every write: `createCiRecord`,
`updateCiRecord`, `deleteCiRecords`, `setCiSnoozed`, and the account functions
`listAppUsers`, `createUserAccount`, `grantUserRole`, `revokeUserRole`,
`renameUser`, `deleteUserAccount`.
