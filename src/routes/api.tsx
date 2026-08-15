import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/cmdb/site-chrome";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "GLPI-Compatible REST API — CB Assets" },
      {
        name: "description",
        content:
          "GLPI-compatible REST API for the CMDB: itemtypes, search criteria, ranges and item CRUD over apirest.php.",
      },
      { property: "og:title", content: "GLPI-Compatible REST API — CB Assets" },
      {
        property: "og:description",
        content: "Endpoints, search criteria and examples for the GLPI-compatible CMDB API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiDocs,
});

const ENDPOINTS = [
  { method: "POST", path: "/api/public/apirest.php/initSession", desc: "Open a session and receive a session_token." },
  { method: "GET", path: "/api/public/apirest.php/{itemtype}", desc: "List items with range, sort and forcedisplay. Viewer role or above." },
  { method: "GET", path: "/api/public/apirest.php/{itemtype}/{id}", desc: "Retrieve one item. Viewer role or above." },
  { method: "GET", path: "/api/public/apirest.php/search/{itemtype}", desc: "Search with criteria[] and receive the GLPI search envelope." },
  { method: "POST", path: "/api/public/apirest.php/{itemtype}", desc: "Add one or many items via the input envelope. Editor role or above." },
  { method: "PUT", path: "/api/public/apirest.php/{itemtype}/{id}", desc: "Update an item. Editor role or above." },
  { method: "DELETE", path: "/api/public/apirest.php/{itemtype}/{id}", desc: "Purge an item. Admin role only." },
  { method: "GET", path: "/api/public/apirest.php/listSearchOptions/{itemtype}", desc: "Discover the searchable fields of an itemtype." },
];

const ITEMTYPE_ROWS = [
  ["Computer", "cmdb_ci_server"],
  ["DatabaseInstance", "cmdb_ci_db_mssql_instance"],
  ["NetworkEquipment", "cmdb_ci_netgear_switch"],
  ["AccessPoint", "cmdb_ci_wap"],
];

const SNOW_ENDPOINTS = [
  { method: "GET", path: "/api/public/now/table/{table}", desc: "List records with sysparm_query, sysparm_fields, sysparm_limit, sysparm_offset." },
  { method: "GET", path: "/api/public/now/table/{table}/{sys_id}", desc: "Retrieve one record." },
  { method: "POST", path: "/api/public/now/table/{table}", desc: "Insert a record (plain JSON body)." },
  { method: "PATCH", path: "/api/public/now/table/{table}/{sys_id}", desc: "Update a record." },
  { method: "DELETE", path: "/api/public/now/table/{table}/{sys_id}", desc: "Delete a record (204 on success)." },
];

const PARAMS = [
  ["range", "Inclusive slice of results, e.g. 0-49 (max 1000 per call)"],
  ["forcedisplay", "Comma-separated list of fields to return"],
  ["sort", "Field to sort on"],
  ["order", "ASC or DESC"],
  ["criteria[i][field]", "Field name to filter on (search endpoint)"],
  ["criteria[i][searchtype]", "contains, equals, notequals, beginswith, endswith, morethan, lessthan"],
  ["criteria[i][value]", "Value to match"],
];

const OPERATORS = [
  ["contains", "Case-insensitive substring match (default)"],
  ["equals", "Exact match"],
  ["notequals", "Excludes the value"],
  ["beginswith", "Prefix match"],
  ["endswith", "Suffix match"],
  ["notcontains", "Excludes a substring"],
  ["morethan / lessthan", "Greater / less than"],
];

function ApiDocs() {
  return (
    <PageShell>
      <section className="surface-brand">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
          <p className="eyebrow text-gold">Developers</p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">GLPI-compatible API</h1>
          <p className="mt-4 max-w-2xl text-brand-foreground/70">
            A GLPI-flavoured REST surface over the CMDB. The same
            <span className="font-mono"> apirest.php</span> URL shape, the same itemtypes,
            <span className="font-mono"> criteria[]</span> search and
            <span className="font-mono"> input</span> write envelope — so GLPI scripts port over
            with a base-URL change.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        <h2 className="font-display text-3xl text-brand">Endpoints</h2>
        <div className="gold-rule mt-3 mb-6" />
        <div className="divide-y divide-foreground/10 border border-foreground/10 bg-card">
          {ENDPOINTS.map((e) => (
            <div key={e.method + e.path} className="flex flex-wrap items-center gap-4 px-6 py-5">
              <span className="w-20 font-mono text-xs font-semibold uppercase text-gold-foreground bg-gold px-2 py-1 text-center">
                {e.method}
              </span>
              <span className="font-mono text-sm text-brand">{e.path}</span>
              <span className="text-sm text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>

        <h2 className="mt-14 font-display text-3xl text-brand">ServiceNow-compatible mode</h2>
        <div className="gold-rule mt-3 mb-6" />
        <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
          Both dialects run on one shared data core, so moving to ServiceNow is a routing change
          rather than a rewrite. The Table API is live in parallel with GLPI: same tables, same
          role-based access, ServiceNow request and response envelopes
          (<span className="font-mono">sysparm_query</span>, <span className="font-mono">result</span>).
        </p>
        <div className="divide-y divide-foreground/10 border border-foreground/10 bg-card">
          {SNOW_ENDPOINTS.map((e) => (
            <div key={e.method + e.path} className="flex flex-wrap items-center gap-4 px-6 py-5">
              <span className="w-20 font-mono text-xs font-semibold uppercase text-gold-foreground bg-gold px-2 py-1 text-center">
                {e.method}
              </span>
              <span className="font-mono text-sm text-brand">{e.path}</span>
              <span className="text-sm text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>

        <h2 className="mt-14 font-display text-3xl text-brand">Itemtypes</h2>
        <div className="gold-rule mt-3 mb-6" />
        <dl className="divide-y divide-foreground/10 border border-foreground/10 bg-card rounded-[var(--radius)] px-6">
          {ITEMTYPE_ROWS.map(([itemtype, table]) => (
            <div key={itemtype} className="grid grid-cols-2 gap-4 py-3 text-sm">
              <dt className="font-mono text-brand">{itemtype}</dt>
              <dd className="font-mono text-muted-foreground">{table}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-brand">Query parameters</h2>
            <div className="gold-rule mt-3 mb-6" />
            <dl className="divide-y divide-foreground/10">
              {PARAMS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 gap-4 py-3 text-sm">
                  <dt className="font-mono text-brand">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="font-display text-3xl text-brand">Search types</h2>
            <div className="gold-rule mt-3 mb-6" />
            <dl className="divide-y divide-foreground/10">
              {OPERATORS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 gap-4 py-3 text-sm">
                  <dt className="font-mono text-brand">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <h2 className="mt-16 font-display text-3xl text-brand">Authentication</h2>
        <div className="gold-rule mt-3 mb-6" />
        <p className="max-w-3xl text-muted-foreground">
          Call <span className="font-mono">initSession</span> with a bearer token for a signed-in
          account, then pass the returned token as <span className="font-mono">Session-Token</span>
          on every request. There is no anonymous access: unauthenticated requests receive{" "}
          <span className="font-mono">401</span> with a GLPI-style{" "}
          <span className="font-mono">["ERROR_SESSION_TOKEN_INVALID", …]</span> body.
          Row-level security in PostgreSQL then decides what that account may see and change, so a
          token cannot be used to exceed its role. Responses are returned{" "}
          <span className="font-mono">no-store</span> because records may contain personal data.
        </p>

        <h2 className="mt-16 font-display text-3xl text-brand">Examples</h2>
        <div className="gold-rule mt-3 mb-6" />
        <pre className="overflow-x-auto bg-brand-deep p-6 font-mono text-xs leading-relaxed text-brand-foreground">
{`# Open a session
curl -X POST "$BASE/api/public/apirest.php/initSession" \\
  -H "Authorization: Bearer $TOKEN"
# -> {"session_token":"..."}

# Production servers in EMEA, three fields only
curl -G "$BASE/api/public/apirest.php/search/Computer" \\
  -H "Session-Token: $SESSION" \\
  -d "criteria[0][field]=environment" \\
  -d "criteria[0][searchtype]=equals" \\
  -d "criteria[0][value]=Production" \\
  -d "criteria[1][field]=region&criteria[1][searchtype]=equals&criteria[1][value]=EMEA" \\
  -d "forcedisplay=hostname,application_name,eol_date&range=0-9"

# One SQL instance by id
curl -H "Session-Token: $SESSION" \\
  "$BASE/api/public/apirest.php/DatabaseInstance/<id>"

# Update an item (requires the editor or admin role)
curl -X PUT "$BASE/api/public/apirest.php/Computer/<id>" \\
  -H "Session-Token: $SESSION" -H "Content-Type: application/json" \\
  -d '{"input":{"status":"Decommission planned"}}'`}
        </pre>

        <p className="mt-6 text-sm text-muted-foreground">
          Every configuration change is written to an immutable audit trail with the acting
          account, timestamp and the exact fields that changed.
        </p>
      </section>
    </PageShell>
  );
}