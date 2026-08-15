import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiList } from "@/components/cmdb/ci-list";
import { PageShell } from "@/components/cmdb/site-chrome";
import { instancesQuery } from "@/lib/cmdb-data";
import { INSTANCE_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/_authenticated/databases/")({
  head: () => ({
    meta: [
      { title: "SQL Instance CI Class — CB Assets" },
      {
        name: "description",
        content:
          "Browse every SQL Server instance: edition, build, port, capacity, backup schedule, service accounts and monitoring.",
      },
      { property: "og:title", content: "SQL Instance CI Class — CB Assets" },
      {
        property: "og:description",
        content: "Search and filter the SQL inventory in CB Assets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DatabasesPage,
});

const COLUMNS = INSTANCE_FIELDS.filter((f) =>
  ["server_name", "instance_name", "environment", "sql_version", "edition", "memory_gb", "server_state"].includes(
    f.name,
  ),
);

function DatabasesPage() {
  const { data = [], isLoading } = useQuery(instancesQuery);

  return (
    <PageShell>
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-[1400px] px-6 py-5 lg:px-8">
          <p className="eyebrow text-muted-foreground">cmdb_ci_db_mssql_instance</p>
          <h1 className="mt-1 font-display text-2xl">SQL Instances</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Forty-seven attributes per instance — capacity, editions, Always On, backup chains,
            maintenance jobs and service accounts.
          </p>
        </div>
      </section>
      <CiList
        records={data}
        columns={COLUMNS}
        detailTo="/databases/$sysId"
        facets={[
          { field: "environment", label: "Environment" },
          { field: "edition", label: "Edition" },
          { field: "region", label: "Region" },
        ]}
        isLoading={isLoading}
        exportFields={INSTANCE_FIELDS}
        exportName="cmdb_ci_db_mssql_instance"
      />
    </PageShell>
  );
}