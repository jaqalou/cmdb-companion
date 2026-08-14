import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/cmdb/site-chrome";
import { instancesQuery, serversQuery } from "@/lib/cmdb-data";
import { useAuth } from "@/hooks/use-auth";
import heroImage from "@/assets/hero-datacenter.jpg";

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
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImage}
          alt="Data centre corridor with illuminated server racks"
          width={1920}
          height={1088}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-brand-deep/80" />
        <div className="relative mx-auto max-w-[1400px] px-6 py-32 lg:px-10 lg:py-44">
          <p className="eyebrow text-gold">Group IT · Configuration Management Database</p>
          <h1 className="mt-6 max-w-3xl font-display text-5xl leading-[1.05] text-brand-foreground md:text-7xl">
            Every asset accounted for. Down to the last instance.
          </h1>
          <p className="mt-6 max-w-xl text-lg text-brand-foreground/75">
            Two configuration item classes, ninety-one attributes, one API. Modelled on the
            inventory your teams already maintain.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              to="/servers"
              className="bg-gold px-8 py-4 text-xs uppercase tracking-[0.2em] text-gold-foreground transition-opacity hover:opacity-90"
            >
              Explore the CMDB
            </Link>
            <Link
              to="/api"
              className="border border-brand-foreground/40 px-8 py-4 text-xs uppercase tracking-[0.2em] text-brand-foreground transition-colors hover:border-gold hover:text-gold"
            >
              Table API
            </Link>
          </div>
        </div>
      </section>

      {user ? (
        <section className="border-b border-border bg-sand">
        <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-px px-6 py-12 lg:grid-cols-4 lg:px-10">
          {stats.map((s) => (
            <div key={s.label} className="px-2">
              <p className="font-display text-5xl text-brand">{s.value}</p>
              <p className="eyebrow mt-3 text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
        </section>
      ) : (
        <section className="border-b border-border bg-sand">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-6 px-6 py-12 lg:px-10">
            <div>
              <p className="eyebrow text-muted-foreground">Restricted content</p>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Configuration records contain asset and personal data. Sign in with your Nordbryg
                account to view the inventory — access is role-based and every change is logged.
              </p>
            </div>
            <Link
              to="/auth"
              className="bg-brand px-8 py-4 text-xs uppercase tracking-[0.2em] text-brand-foreground"
            >
              Sign in to continue
            </Link>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">
        <p className="eyebrow text-muted-foreground">Configuration item classes</p>
        <h2 className="mt-4 font-display text-4xl text-brand md:text-5xl">
          Modelled from your inventory
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <Link
            to="/servers"
            className="group border border-border bg-card p-10 transition-colors hover:border-gold"
          >
            <p className="font-mono text-xs text-muted-foreground">cmdb_ci_server</p>
            <h3 className="mt-4 font-display text-3xl text-brand">Servers</h3>
            <p className="mt-4 text-muted-foreground">
              Hostname, region, environment and SLA tags, technical owner, appliance and LDR,
              VM sizing, OS lifecycle, EOL dates, maintenance windows and backup status.
            </p>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-brand group-hover:text-gold">
              44 attributes →
            </p>
          </Link>
          <Link
            to="/databases"
            className="group border border-border bg-card p-10 transition-colors hover:border-gold"
          >
            <p className="font-mono text-xs text-muted-foreground">cmdb_ci_db_mssql_instance</p>
            <h3 className="mt-4 font-display text-3xl text-brand">SQL Instances</h3>
            <p className="mt-4 text-muted-foreground">
              Instance and listener names, edition and build, port, CPU, cores and memory,
              backup chains, CheckDB and index jobs, service accounts and monitoring.
            </p>
            <p className="mt-8 text-xs uppercase tracking-[0.2em] text-brand group-hover:text-gold">
              47 attributes →
            </p>
          </Link>
        </div>
      </section>

      <section className="surface-brand">
        <div className="mx-auto grid max-w-[1400px] gap-12 px-6 py-24 lg:grid-cols-2 lg:px-10">
          <div>
            <p className="eyebrow text-gold">Integration</p>
            <h2 className="mt-4 font-display text-4xl">A familiar Table API</h2>
            <p className="mt-5 max-w-lg text-brand-foreground/70">
              The same URL shape and <span className="font-mono">sysparm_</span> parameters your
              scripts already use, returning the standard result envelope.
            </p>
            <Link
              to="/api"
              className="mt-8 inline-block border border-gold px-8 py-4 text-xs uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-gold-foreground"
            >
              Read the reference
            </Link>
          </div>
          <pre className="overflow-x-auto border border-brand-foreground/15 p-6 font-mono text-xs leading-relaxed text-brand-foreground/85">
{`GET /api/public/now/table/cmdb_ci_server
    ?sysparm_query=environment=Production^region=EMEA
    &sysparm_fields=hostname,application_name,eol_date
    &sysparm_limit=10

{
  "result": [
    { "hostname": "EUWPRDSAP01", … }
  ]
}`}
          </pre>
        </div>
      </section>
    </PageShell>
  );
}
