import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiDetail } from "@/components/cmdb/ci-detail";
import { PageShell } from "@/components/cmdb/site-chrome";
import { instancesQuery } from "@/lib/cmdb-data";
import { INSTANCE_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/databases/$sysId")({
  head: () => ({
    meta: [
      { title: "SQL instance record — CB Assets" },
      {
        name: "description",
        content: "Full configuration item record for a single SQL Server instance.",
      },
      { property: "og:title", content: "SQL instance record — CB Assets" },
      { property: "og:description", content: "All CMDB attributes for this SQL instance." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstanceDetail,
});

function InstanceDetail() {
  const { sysId } = Route.useParams();
  const { data = [], isLoading } = useQuery(instancesQuery);
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
          fields={INSTANCE_FIELDS}
          table="cmdb_ci_db_mssql_instance"
          title={`${record["server_name"]} \\ ${record["instance_name"]}`}
          subtitle={`${record["application_name"] ?? "Unassigned"} · ${record["sql_version"] ?? ""} ${record["edition"] ?? ""}`}
          backTo="/databases"
          backLabel="All SQL instances"
        />
      )}
    </PageShell>
  );
}