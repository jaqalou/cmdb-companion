import { useMemo, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import type { CiRecord } from "@/lib/cmdb-data";
import { useLifecycleBasis } from "@/lib/app-settings";
import {
  SUPPORT_COLORS,
  SUPPORT_ORDER,
  supportLabels,
  supportStatus,
} from "@/lib/support-status";

const FILTERS = [
  { field: "region", label: "Region" },
  { field: "environment", label: "Environment" },
  { field: "application_name", label: "Application" },
] as const;

export function SupportChart({ records }: { records: CiRecord[] }) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const { basis } = useLifecycleBasis();
  const labels = supportLabels(basis);

  const options = useMemo(
    () =>
      FILTERS.map((f) => ({
        ...f,
        values: Array.from(
          new Set(records.map((r) => (r[f.field] ? String(r[f.field]) : "")).filter(Boolean)),
        ).sort(),
      })),
    [records],
  );

  const scoped = useMemo(
    () =>
      records.filter((r) =>
        Object.entries(filters).every(([field, val]) => !val || String(r[field] ?? "") === val),
      ),
    [records, filters],
  );

  const data = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of scoped) {
      const s = supportStatus(r, basis);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return SUPPORT_ORDER.filter((s) => counts.get(s)).map((s) => ({
      key: s,
      name: labels[s],
      value: counts.get(s) ?? 0,
    }));
  }, [scoped, basis, labels]);

  const outOfSupport = data.find((d) => d.key === "out")?.value ?? 0;

  return (
    <section className="border-b border-border bg-card px-6 py-5 lg:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 lg:flex-row lg:items-center">
        <div className="h-[250px] w-full max-w-[420px] shrink-0">
          {scoped.length === 0 ? (
            <p className="py-16 text-sm text-muted-foreground">No records in this selection.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={85}
                  cy="45%"
                  paddingAngle={2}
                  isAnimationActive={false}
                >
                  {data.map((d) => (
                    <Cell key={d.key} fill={SUPPORT_COLORS[d.key]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="horizontal"
                  align="center"
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: 11 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex-1">
          <p className="eyebrow text-muted-foreground">
            Support posture · based on {basis === "esu" ? "ESU" : "EOL date"}
          </p>
          <p className="mt-1 text-sm text-foreground">
            <span className="font-mono text-2xl font-semibold text-destructive">
              {outOfSupport}
            </span>{" "}
            of {scoped.length} components are out of support
            {Object.values(filters).some(Boolean) ? " in this selection" : ""}.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {options.map((f) => (
              <div key={f.field}>
                <label className="eyebrow text-muted-foreground">{f.label}</label>
                <select
                  value={filters[f.field] ?? ""}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, [f.field]: e.target.value }))
                  }
                  className="field-input mt-1 block min-w-[160px]"
                >
                  <option value="">All</option>
                  {f.values.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            {Object.values(filters).some(Boolean) && (
              <button
                type="button"
                onClick={() => setFilters({})}
                className="self-end pb-2 text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
