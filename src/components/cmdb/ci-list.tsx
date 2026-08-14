import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import type { CiRecord } from "@/lib/cmdb-data";
import type { FieldDef } from "@/lib/cmdb-schema";

type Props = {
  records: CiRecord[];
  columns: FieldDef[];
  detailTo: "/servers/$sysId" | "/databases/$sysId";
  facets: { field: string; label: string }[];
  isLoading: boolean;
};

function value(record: CiRecord, field: string) {
  const v = record[field];
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

export function CiList({ records, columns, detailTo, facets, isLoading }: Props) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  const facetValues = useMemo(
    () =>
      facets.map((f) => ({
        ...f,
        options: Array.from(
          new Set(records.map((r) => (r[f.field] ? String(r[f.field]) : "")).filter(Boolean)),
        ).sort(),
      })),
    [facets, records],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      for (const [field, val] of Object.entries(filters)) {
        if (val && String(r[field] ?? "") !== val) return false;
      }
      if (!q) return true;
      return Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [records, search, filters]);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 border-y-2 border-foreground bg-sand px-6 py-5 lg:px-10">
        <div className="min-w-[240px] flex-1">
          <label className="eyebrow text-muted-foreground">Search all fields</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="hostname, application, owner, IP…"
            className="mt-2 h-11 rounded-none border-2 border-foreground bg-background"
          />
        </div>
        {facetValues.map((f) => (
          <div key={f.field}>
            <label className="eyebrow text-muted-foreground">{f.label}</label>
            <select
              value={filters[f.field] ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, [f.field]: e.target.value }))
              }
              className="mt-2 h-11 min-w-[160px] border-2 border-foreground bg-background px-3 text-sm font-medium"
            >
              <option value="">All</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        ))}
        <p className="pb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {filtered.length} of {records.length} records
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-foreground bg-foreground text-background">
              {columns.map((c) => (
                <th
                  key={c.name}
                  className="whitespace-nowrap px-5 py-4 text-left text-[10px] font-bold uppercase tracking-[0.16em]"
                >
                  {c.label}
                </th>
              ))}
              <th className="px-5 py-4" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-10 text-muted-foreground">
                  Loading configuration items…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-10 text-muted-foreground">
                  No configuration items match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((r) => (
              <tr key={String(r["sys_id"])} className="border-b border-foreground/15 hover:bg-sand">
                {columns.map((c, i) => (
                  <td
                    key={c.name}
                    className={
                      i === 0
                        ? "whitespace-nowrap px-5 py-4 font-mono text-[13px] font-bold text-brand"
                        : "whitespace-nowrap px-5 py-4 text-foreground/80"
                    }
                  >
                    {value(r, c.name)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-5 py-4 text-right">
                  <Link
                    to={detailTo}
                    params={{ sysId: String(r["sys_id"]) }}
                    className="text-[11px] font-bold uppercase tracking-[0.18em] underline-offset-4 hover:text-gold hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}