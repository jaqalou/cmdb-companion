import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/cmdb/site-chrome";

export const Route = createFileRoute("/api")({
  head: () => ({
    meta: [
      { title: "Table API Reference — Nordbryg CMDB" },
      {
        name: "description",
        content:
          "ServiceNow-style Table API for the CMDB: encoded queries, field selection, pagination and record CRUD over REST.",
      },
      { property: "og:title", content: "Table API Reference — Nordbryg CMDB" },
      {
        property: "og:description",
        content: "REST endpoints, encoded query operators and examples for the CMDB Table API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ApiDocs,
});

const ENDPOINTS = [
  { method: "GET", path: "/api/public/now/table/{table}", desc: "List records with encoded query, field selection and pagination." },
  { method: "POST", path: "/api/public/now/table/{table}", desc: "Create a record. Requires a bearer token." },
  { method: "GET", path: "/api/public/now/table/{table}/{sys_id}", desc: "Retrieve a single record." },
  { method: "PATCH", path: "/api/public/now/table/{table}/{sys_id}", desc: "Update a record. Requires a bearer token." },
  { method: "DELETE", path: "/api/public/now/table/{table}/{sys_id}", desc: "Delete a record. Requires a bearer token." },
];

const PARAMS = [
  ["sysparm_query", "Encoded query, e.g. environment=Production^hostnameLIKEsap"],
  ["sysparm_fields", "Comma-separated list of fields to return"],
  ["sysparm_limit", "Max records to return (default 100, max 1000)"],
  ["sysparm_offset", "Number of records to skip"],
  ["sysparm_order_by", "Field to sort ascending"],
  ["sysparm_order_by_desc", "Field to sort descending"],
];

const OPERATORS = [
  ["field=value", "Equals"],
  ["field!=value", "Not equals"],
  ["fieldLIKEvalue", "Contains"],
  ["fieldSTARTSWITHvalue", "Starts with"],
  ["fieldENDSWITHvalue", "Ends with"],
  ["fieldINa,b,c", "In list"],
  ["field>value / field<value", "Greater / less than"],
];

function ApiDocs() {
  return (
    <PageShell>
      <section className="surface-brand">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
          <p className="eyebrow text-gold">Developers</p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">Table API</h1>
          <p className="mt-4 max-w-2xl text-brand-foreground/70">
            A ServiceNow-compatible REST surface over the CMDB. Same URL shape, same
            <span className="font-mono"> sysparm_</span> parameters, same
            <span className="font-mono"> &#123;"result": …&#125;</span> envelope — so existing
            integrations port over with a base-URL change.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        <h2 className="font-display text-3xl text-brand">Endpoints</h2>
        <div className="gold-rule mt-3 mb-6" />
        <div className="divide-y divide-border border border-border bg-card">
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

        <div className="mt-14 grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl text-brand">Query parameters</h2>
            <div className="gold-rule mt-3 mb-6" />
            <dl className="divide-y divide-border">
              {PARAMS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 gap-4 py-3 text-sm">
                  <dt className="font-mono text-brand">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="font-display text-3xl text-brand">Encoded query operators</h2>
            <div className="gold-rule mt-3 mb-6" />
            <dl className="divide-y divide-border">
              {OPERATORS.map(([k, v]) => (
                <div key={k} className="grid grid-cols-2 gap-4 py-3 text-sm">
                  <dt className="font-mono text-brand">{k}</dt>
                  <dd className="text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <h2 className="mt-16 font-display text-3xl text-brand">Examples</h2>
        <div className="gold-rule mt-3 mb-6" />
        <pre className="overflow-x-auto bg-brand-deep p-6 font-mono text-xs leading-relaxed text-brand-foreground">
{`# Production servers in EMEA, three fields only
curl "$BASE/api/public/now/table/cmdb_ci_server\\
?sysparm_query=environment=Production^region=EMEA\\
&sysparm_fields=hostname,application_name,eol_date&sysparm_limit=10"

# SQL instances running Enterprise edition
curl "$BASE/api/public/now/table/cmdb_ci_db_mssql_instance?sysparm_query=editionLIKEEnterprise"

# Update a record (bearer token of a signed-in user)
curl -X PATCH "$BASE/api/public/now/table/cmdb_ci_server/<sys_id>" \\
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \\
  -d '{"status":"Decommission planned"}'`}
        </pre>

        <p className="mt-6 text-sm text-muted-foreground">
          Reads are open; every write requires a bearer token and is enforced by row-level security
          in the database, not just at the edge.
        </p>
      </section>
    </PageShell>
  );
}