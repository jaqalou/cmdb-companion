import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/cmdb/site-chrome";
import { accessPointsQuery, instancesQuery, serversQuery, switchesQuery } from "@/lib/cmdb-data";
import {
  INSTANCE_FIELDS,
  SERVER_FIELDS,
  SWITCH_FIELDS,
  WAP_FIELDS,
} from "@/lib/cmdb-schema";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CB Assets — Configuration Management Platform" },
      {
        name: "description",
        content:
          "One trusted record of every server and SQL instance across the group, with a GLPI-compatible REST API for integrations.",
      },
      { property: "og:title", content: "CB Assets — Configuration Management Platform" },
      {
        property: "og:description",
        content:
          "Browse servers and SQL instances, filter by environment and region, and integrate via the GLPI-compatible REST API.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Federated sign-in returns to this public origin; resume the intended
  // destination only once a session actually exists.
  useEffect(() => {
    if (!user) return;
    const saved = sessionStorage.getItem("cmdb.redirect");
    if (saved && saved.startsWith("/") && !saved.startsWith("//")) {
      sessionStorage.removeItem("cmdb.redirect");
      navigate({ to: saved });
    }
  }, [user, navigate]);

  const servers = useQuery(serversQuery);
  const instances = useQuery(instancesQuery);
  const switches = useQuery(switchesQuery);
  const accessPoints = useQuery(accessPointsQuery);

  const serverRows = servers.data ?? [];
  const instanceRows = instances.data ?? [];
  const switchRows = switches.data ?? [];
  const apRows = accessPoints.data ?? [];

  const production = serverRows.filter((r) => r["environment"] === "Production").length;
  const eolSoon = [...serverRows, ...instanceRows].filter((r) => {
    const d = String(r["eol_date"] ?? "");
    return d && new Date(d) < new Date("2028-01-01");
  }).length;

  const stats = [
    { value: serverRows.length, label: "Server CIs", tone: "#fde68a" },
    { value: instanceRows.length, label: "SQL instances", tone: "#bbf7d0" },
    { value: switchRows.length, label: "Network switches", tone: "#fed7aa" },
    { value: apRows.length, label: "Access points", tone: "#bfdbfe" },
    { value: production, label: "Production servers", tone: "#e9d5ff" },
    { value: eolSoon, label: "Approaching EOL", tone: "#fecaca" },
  ];

  return (
    <PageShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-5 lg:px-8">
          <p className="eyebrow text-muted-foreground">Group IT · Configuration Management</p>
          <h1 className="mt-1 font-display text-2xl">Asset inventory dashboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Four configuration item classes — servers, SQL instances, switches and access points —
            exportable to CSV or JSON and served by a GLPI-compatible REST API.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/servers" className="btn-accent h-9 px-4">
              Browse assets
            </Link>
            <Link to="/api" className="btn-outline h-9 px-4">
              API reference
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-6 pt-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="kpi-tile" style={{ backgroundColor: s.tone }}>
              <p className="font-display text-3xl font-bold">{s.value}</p>
              <p className="mt-1 text-xs font-medium opacity-80">{s.label}</p>
            </div>
          ))}
        </div>
        {!user && (
          <div className="brutal-card mt-4 flex flex-wrap items-center justify-between gap-4 border-l-4 border-l-primary p-4">
            <p className="max-w-xl text-sm text-muted-foreground">
              Browsing is open to everyone. Sign in with your CB Assets account to create or modify
              configuration items — write access is role-based and every change is logged.
            </p>
            <Link to="/auth" className="btn-accent h-9 px-4">
              Sign in to edit
            </Link>
          </div>
        )}
      </section>


      <section className="mx-auto max-w-[1400px] px-6 py-6 lg:px-8">
        <h2 className="font-display text-base font-semibold">Configuration item classes</h2>

        <div className="mt-3 grid gap-4 [&>*]:min-w-0 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              to: "/servers" as const,
              table: "cmdb_ci_server",
              title: "Servers",
              count: SERVER_FIELDS.length,
              text: "Hostname, region, environment and SLA tags, technical owner, VM sizing, OS lifecycle, EOL dates, maintenance windows and backup status.",
            },
            {
              to: "/databases" as const,
              table: "cmdb_ci_db_mssql_instance",
              title: "SQL Server instances",
              count: INSTANCE_FIELDS.length,
              text: "Instance and listener names, edition and build, port, CPU, cores and memory, backup chains, CheckDB jobs, service accounts and monitoring.",
            },
            {
              to: "/switches" as const,
              table: "cmdb_ci_netgear_switch",
              title: "Network switches",
              count: SWITCH_FIELDS.length,
              text: "Core, distribution and access layer — ports, PoE, stacks, uplinks, VLANs, firmware levels and config backup posture.",
            },
            {
              to: "/access-points" as const,
              table: "cmdb_ci_wap",
              title: "Wireless access points",
              count: WAP_FIELDS.length,
              text: "Controllers, SSIDs, radio bands and channel width, client capacity, and the exact PoE switch port every radio hangs off.",
            },
          ].map((c) => (
            <Link
              key={c.table}
              to={c.to}
              className="brutal-card brutal-lift flex flex-col justify-between p-4"
            >
              <div>
                <span className="font-mono text-[11px] text-primary">{c.table}</span>
                <h3 className="mt-2 font-display text-lg">{c.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{c.text}</p>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                <span className="font-display text-xl text-foreground">{c.count}</span> attributes
              </p>
            </Link>
          ))}
        </div>

        <div className="brutal-card mt-4 flex flex-col items-start justify-between gap-4 p-4 md:flex-row md:items-center">
            <div className="max-w-md">
              <h3 className="font-display text-base font-semibold">GLPI API integration</h3>
              <p className="mt-1 text-[13px] text-muted-foreground">
                The same <span className="font-mono">apirest.php</span> URL shape, itemtypes and
                criteria your GLPI scripts already speak.
              </p>
              <Link to="/api" className="btn-outline mt-3 h-9 px-4">
                Read the reference
              </Link>
            </div>
            <pre className="w-full min-w-0 max-w-full overflow-x-auto rounded-md bg-brand-deep p-4 font-mono text-xs leading-relaxed text-brand-foreground md:w-auto">
{`GET /api/public/apirest.php/search/Computer
    ?criteria[0][field]=environment
    &criteria[0][searchtype]=equals
    &criteria[0][value]=Production
    &forcedisplay=hostname,application_name,eol_date
    &range=0-9`}
            </pre>
        </div>
      </section>
    </PageShell>
  );
}
