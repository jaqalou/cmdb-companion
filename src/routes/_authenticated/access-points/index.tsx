import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { CiList } from "@/components/cmdb/ci-list";
import { PageShell } from "@/components/cmdb/site-chrome";
import { accessPointsQuery } from "@/lib/cmdb-data";
import { WAP_FIELDS } from "@/lib/cmdb-schema";

export const Route = createFileRoute("/_authenticated/access-points/")({
  head: () => ({
    meta: [
      { title: "Access Point CI Class — Nordbryg CMDB" },
      {
        name: "description",
        content:
          "Browse every wireless access point: model, firmware, controller, SSIDs, radio bands, PoE switch port and lifecycle.",
      },
      { property: "og:title", content: "Access Point CI Class — Nordbryg CMDB" },
      {
        property: "og:description",
        content: "Search, filter and export the wireless inventory in the Nordbryg CMDB.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AccessPointsPage,
});

const COLUMNS = WAP_FIELDS.filter((f) =>
  ["ap_name", "vm_location", "floor_zone", "region", "model", "wifi_standard", "status"].includes(
    f.name,
  ),
);

function AccessPointsPage() {
  const { data = [], isLoading } = useQuery(accessPointsQuery);

  return (
    <PageShell>
      <section className="surface-brand">
        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
          <p className="eyebrow text-gold">cmdb_ci_wap</p>
          <h1 className="mt-4 font-display text-5xl md:text-6xl">Access Points</h1>
          <p className="mt-4 max-w-2xl text-brand-foreground/70">
            Every radio on the floor — controllers, SSIDs, bands, channel width, client capacity and
            the exact PoE switch port each AP hangs off.
          </p>
        </div>
      </section>
      <CiList
        records={data}
        columns={COLUMNS}
        detailTo="/access-points/$sysId"
        facets={[
          { field: "environment", label: "Environment" },
          { field: "region", label: "Region" },
          { field: "manufacturer", label: "Vendor" },
        ]}
        isLoading={isLoading}
        exportFields={WAP_FIELDS}
        exportName="cmdb_ci_wap"
      />
    </PageShell>
  );
}