import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiDetail } from "@/components/cmdb/ci-detail";
import { PageShell } from "@/components/cmdb/site-chrome";
import { serversQuery } from "@/lib/cmdb-data";
import { SERVER_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/_authenticated/servers/$sysId")({
  head: () => ({
    meta: [
      { title: "Server record — CB Assets" },
      {
        name: "description",
        content: "Full configuration item record for a single server, with all CMDB attributes.",
      },
      { property: "og:title", content: "Server record — CB Assets" },
      { property: "og:description", content: "All CMDB attributes for this server record." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServerDetail,
});

function ServerDetail() {
  const { sysId } = Route.useParams();
  const { data = [], isLoading } = useQuery(serversQuery);
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
          fields={SERVER_FIELDS}
          table="cmdb_ci_server"
          title={String(record["hostname"])}
          subtitle={`${record["application_name"] ?? "Unassigned"} · ${record["environment"] ?? ""} · ${record["region"] ?? ""}`}
          backTo="/servers"
          backLabel="All servers"
        />
      )}
    </PageShell>
  );
}