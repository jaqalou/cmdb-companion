import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiList } from "@/components/cmdb/ci-list";
import { PageShell } from "@/components/cmdb/site-chrome";
import { serversQuery } from "@/lib/cmdb-data";
import { SERVER_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/_authenticated/servers/")({
  head: () => ({
    meta: [
      { title: "Server CI Class — Nordbryg CMDB" },
      {
        name: "description",
        content:
          "Browse every server configuration item: hostname, region, environment, SLA, owner, OS lifecycle and backup status.",
      },
      { property: "og:title", content: "Server CI Class — Nordbryg CMDB" },
      {
        property: "og:description",
        content: "Search and filter the full server inventory in the Nordbryg CMDB.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServersPage,
});

const COLUMNS = SERVER_FIELDS.filter((f) =>
  ["hostname", "environment", "region", "application_name", "operating_system", "status", "technical_owner"].includes(
    f.name,
  ),
);

function ServersPage() {
  const { data = [], isLoading } = useQuery(serversQuery);

  return (
    <PageShell>
      <section className="surface-brand">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
          <p className="eyebrow text-gold">cmdb_ci_server</p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">Servers</h1>
          <p className="mt-4 max-w-2xl text-brand-foreground/70">
            Forty-four attributes per record — from market tags and SLA through OS lifecycle,
            maintenance windows and backup posture.
          </p>
        </div>
      </section>
      <CiList
        records={data}
        columns={COLUMNS}
        detailTo="/servers/$sysId"
        facets={[
          { field: "environment", label: "Environment" },
          { field: "region", label: "Region" },
          { field: "sla", label: "SLA" },
        ]}
        isLoading={isLoading}
        exportFields={SERVER_FIELDS}
        exportName="cmdb_ci_server"
      />
    </PageShell>
  );
}