import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiDetail } from "@/components/cmdb/ci-detail";
import { PageShell } from "@/components/cmdb/site-chrome";
import { accessPointsQuery } from "@/lib/cmdb-data";
import { WAP_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/access-points/$sysId")({
  head: () => ({
    meta: [
      { title: "Access point record — CB Assets" },
      {
        name: "description",
        content:
          "Full configuration item record for a single wireless access point, with all CMDB attributes.",
      },
      { property: "og:title", content: "Access point record — CB Assets" },
      { property: "og:description", content: "All CMDB attributes for this access point record." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessPointDetail,
});

function AccessPointDetail() {
  const { sysId } = Route.useParams();
  const { data = [], isLoading } = useQuery(accessPointsQuery);
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
          fields={WAP_FIELDS}
          table="cmdb_ci_wap"
          title={String(record["ap_name"])}
          subtitle={`${record["model"] ?? "Access point"} · ${record["vm_location"] ?? ""} · ${record["region"] ?? ""}`}
          backTo="/access-points"
          backLabel="All access points"
        />
      )}
    </PageShell>
  );
}