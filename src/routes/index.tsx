import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/cmdb/site-chrome";
import { instancesQuery, serversQuery } from "@/lib/cmdb-data";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nordbryg CMDB — Configuration Management Platform" },
      {
        name: "description",
        content:
          "One trusted record of every server and SQL instance across the group, with a ServiceNow-style Table API for integrations.",
      },
      { property: "og:title", content: "Nordbryg CMDB — Configuration Management Platform" },
      {
        property: "og:description",
        content:
          "Browse servers and SQL instances, filter by environment and region, and integrate via the Table API.",
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

  const servers = useQuery({ ...serversQuery, enabled: !!user });
  const instances = useQuery({ ...instancesQuery, enabled: !!user });
  const serverRows = servers.data ?? [];
  const instanceRows = instances.data ?? [];

  const production = serverRows.filter((r) => r["environment"] === "Production").length;
  const eolSoon = [...serverRows, ...instanceRows].filter((r) => {
    const d = String(r["eol_date"] ?? "");
    return d && new Date(d) < new Date("2028-01-01");
  }).length;

  const stats = [
    { value: serverRows.length, label: "Server CIs" },
    { value: instanceRows.length, label: "SQL instances" },
    { value: production, label: "Production servers" },
    { value: eolSoon, label: "Approaching EOL" },
  ];

  return (
    <PageShell>
      <section className="mx-auto max-w-[1400px] px-6 pt-20 pb-16 lg:px-10 lg:pt-28">
        <p className="eyebrow text-gold">Group IT · Configuration Management Database</p>
        <h1 className="mt-6 text-[clamp(2.25rem,5vw,4rem)] leading-[0.9] break-words uppercase">
          Infrastructure
          <br />
          <span className="text-brand">mapped in sync.</span>
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-relaxed font-medium opacity-90">
          Two configuration item classes, ninety-one attributes, one API. Modelled on the
          inventory your teams already maintain — with a developer-first Table API.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link to="/servers" className="btn-accent px-8 py-4">
            Explore assets
          </Link>
          <Link to="/api" className="btn-outline px-8 py-4">
            API reference
          </Link>
        </div>
      </section>

      {user ? (
        <section className="border-y-2 border-foreground bg-sand">
          <div className="mx-auto grid max-w-[1400px] grid-cols-2 divide-foreground px-6 py-10 md:grid-cols-4 md:divide-x-2 lg:px-10">
            {stats.map((s) => (
              <div key={s.label} className="px-2 py-3 md:px-8 md:first:pl-0">
                <p className="font-display text-5xl text-brand">{s.value}</p>
                <p className="eyebrow mt-3 text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="border-y-2 border-foreground bg-brand text-brand-foreground">
          <div className="overflow-hidden py-4" aria-hidden="true">
            <div className="marquee-track gap-10 text-[11px] font-bold tracking-[0.25em] whitespace-nowrap uppercase">
              {Array.from({ length: 2 }).map((_, block) => (
                <div key={block} className="flex gap-10">
                  {Array.from({ length: 4 }).map((__, i) => (
                    <span key={i} className="flex gap-10">
                      <span>Restricted access context</span>
                      <span>•</span>
                      <span>Authentication required for live data</span>
                      <span>•</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-6 border-t-2 border-foreground px-6 py-10 lg:px-10">
            <p className="max-w-xl text-sm font-medium">
              Configuration records contain asset and personal data. Sign in with your Nordbryg
              account to view the inventory — access is role-based and every change is logged.
            </p>
            <Link to="/auth" className="btn-accent px-8 py-4">
              Sign in to continue
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
        <p className="eyebrow text-muted-foreground">Configuration item classes</p>
        <h2 className="mt-4 text-4xl uppercase md:text-5xl">Modelled from your inventory</h2>

        <div className="mt-12 grid gap-8 [&>*]:min-w-0 md:grid-cols-3">
          <Link
            to="/servers"
            className="brutal-card brutal-lift group flex min-h-[320px] flex-col justify-between p-8 md:col-span-2"
          >
            <div>
              <div className="mb-6 flex items-start justify-between">
                <span className="border border-gold px-2 py-1 font-mono text-[10px] font-bold tracking-[0.16em] text-gold uppercase">
                  cmdb_ci_server
                </span>
                <span className="h-3 w-3 rounded-full bg-foreground" />
              </div>
              <h3 className="text-4xl uppercase md:text-5xl">Core server infrastructure</h3>
              <p className="mt-4 max-w-md font-medium text-muted-foreground">
                Hostname, region, environment and SLA tags, technical owner, VM sizing, OS
                lifecycle, EOL dates, maintenance windows and backup status.
              </p>
            </div>
            <div className="mt-8 flex items-end justify-between">
              <div>
                <span className="font-display text-6xl text-brand">44</span>
                <span className="eyebrow mt-1 block">Standardised attributes</span>
              </div>
              <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-foreground transition-colors group-hover:bg-gold">
                →
              </span>
            </div>
          </Link>

          <Link
            to="/databases"
            className="brutal-shadow-accent brutal-lift brutal-border flex flex-col justify-between bg-foreground p-8 text-background"
          >
            <div>
              <span className="font-mono text-[10px] font-bold tracking-[0.16em] text-gold uppercase">
                cmdb_ci_db_mssql_instance
              </span>
              <h3 className="mt-6 text-3xl uppercase">SQL Server instances</h3>
              <p className="mt-4 text-sm leading-relaxed font-medium opacity-70">
                Instance and listener names, edition and build, port, CPU, cores and memory,
                backup chains, CheckDB and index jobs, service accounts and monitoring.
              </p>
            </div>
            <div className="mt-12">
              <div className="font-display text-5xl">47</div>
              <div className="eyebrow mt-2 opacity-50">Metadata fields</div>
            </div>
          </Link>

          <div className="brutal-border min-w-0 flex flex-col items-start justify-between gap-8 border-dashed p-8 md:col-span-3 md:flex-row md:items-center">
            <div className="max-w-md">
              <h3 className="text-2xl uppercase">Table API integration</h3>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                The same URL shape and <span className="font-mono">sysparm_</span> parameters your
                scripts already use, returning the standard result envelope.
              </p>
              <Link to="/api" className="btn-outline mt-6 px-6 py-3">
                Read the reference
              </Link>
            </div>
            <pre className="brutal-border brutal-shadow-sm w-full min-w-0 max-w-full overflow-x-auto bg-card p-5 font-mono text-xs leading-relaxed md:w-auto">
{`GET /api/public/now/table/cmdb_ci_server
    ?sysparm_query=environment=Production^region=EMEA
    &sysparm_fields=hostname,application_name,eol_date
    &sysparm_limit=10`}
            </pre>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
