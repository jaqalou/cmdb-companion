import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiDetail } from "@/components/cmdb/ci-detail";
import { PageShell } from "@/components/cmdb/site-chrome";
import { switchesQuery } from "@/lib/cmdb-data";
import { SWITCH_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/switches/$sysId")({
  head: () => ({
    meta: [
      { title: "Network switch record — CB Assets" },
      {
        name: "description",
        content:
          "Full configuration item record for a single network switch, with all CMDB attributes.",
      },
      { property: "og:title", content: "Network switch record — CB Assets" },
      { property: "og:description", content: "All CMDB attributes for this switch record." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SwitchDetail,
});

function SwitchDetail() {
  const { sysId } = Route.useParams();
  const { data = [], isLoading } = useQuery(switchesQuery);
  const record = data.find((r) => String(r["sys_id"]) === sysId);

  return (
    <PageShell>
      {isLoading && <p className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">Loading record…</p>}
      {!isLoading && !record && (
        <p className="mx-auto max-w-[1400px] px-6 py-24 lg:px-10">Record not found.</p>
      )}
      {record && (
        <CiDetail
          record={record}
          fields={SWITCH_FIELDS}
          table="cmdb_ci_netgear_switch"
          title={String(record["hostname"])}
          subtitle={`${record["switch_role"] ?? "Switch"} · ${record["vm_location"] ?? ""} · ${record["region"] ?? ""}`}
          backTo="/switches"
          backLabel="All switches"
        />
      )}
    </PageShell>
  );
}