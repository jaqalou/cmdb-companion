import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiList } from "@/components/cmdb/ci-list";
import { PageShell } from "@/components/cmdb/site-chrome";
import { switchesQuery } from "@/lib/cmdb-data";
import { SWITCH_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/switches/")({
  head: () => ({
    meta: [
      { title: "Network Switch CI Class — CB Assets" },
      {
        name: "description",
        content:
          "Browse every network switch: role, model, firmware, ports, uplinks, VLANs, owner, lifecycle and monitoring.",
      },
      { property: "og:title", content: "Network Switch CI Class — CB Assets" },
      {
        property: "og:description",
        content: "Search, filter and export the switch inventory in CB Assets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SwitchesPage,
});

const COLUMNS = SWITCH_FIELDS.filter((f) =>
  [
    "hostname",
    "switch_role",
    "region",
    "vm_location",
    "model",
    "port_count",
    "status",
  ].includes(f.name),
);

function SwitchesPage() {
  const { data = [], isLoading } = useQuery(switchesQuery);

  return (
    <PageShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-5 lg:px-8">
          <p className="eyebrow text-muted-foreground">cmdb_ci_netgear_switch</p>
          <h1 className="mt-1 font-display text-2xl">Network Switches</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Core, distribution and access layer — port counts, stacks, uplinks, VLANs, firmware
            levels and config backup posture across every site.
          </p>
        </div>
      </section>
      <CiList
        records={data}
        columns={COLUMNS}
        detailTo="/switches/$sysId"
        facets={[
          { field: "environment", label: "Environment" },
          { field: "region", label: "Region" },
          { field: "switch_role", label: "Role" },
        ]}
        isLoading={isLoading}
        exportFields={SWITCH_FIELDS}
        exportName="cmdb_ci_netgear_switch"
      />
    </PageShell>
  );
}