import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import type { CiRecord } from "@/lib/cmdb-data";
import type { FieldDef } from "@/lib/cmdb-schema";
import { deleteCiRecords, setCiSnoozed } from "@/lib/cmdb-mutate.functions";
import { downloadFile, toCsv, toJsonExport } from "@/lib/csv-export";
import { SUPPORT_COLORS, SUPPORT_LABELS, supportStatus } from "@/lib/support-status";

type Props = {
  records: CiRecord[];
  columns: FieldDef[];
  detailTo:
    | "/servers/$sysId"
    | "/databases/$sysId"
    | "/switches/$sysId"
    | "/access-points/$sysId";
  facets: { field: string; label: string }[];
  isLoading: boolean;
  /** All attributes of the CI class — used for the full export */
  exportFields: FieldDef[];
  /** Base filename for downloads, e.g. "cmdb_ci_server" */
  exportName: string;
  /** Physical table name — used for snooze/delete mutations */
  table: string;
};

function value(record: CiRecord, field: string) {
  const v = record[field];
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

/** GLPI renders categorical columns as soft pills rather than plain text. */
const CHIP_FIELDS = new Set([
  "environment",
  "status",
  "region",
  "sla",
  "switch_role",
  "edition",
  "criticality",
  "wifi_standard",
]);

export function CiList({
  records,
  columns,
  detailTo,
  facets,
  isLoading,
  exportFields,
  exportName,
  table,
}: Props) {
  const { canWrite, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const snoozeFn = useServerFn(setCiSnoozed);
  const deleteFn = useServerFn(deleteCiRecords);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["cmdb", table] });

  const snoozeMutation = useMutation({
    mutationFn: (vars: { sysId: string; snoozed: boolean }) =>
      snoozeFn({ data: { table, ...vars } }),
    onSuccess: (_r, vars) => {
      refresh();
      toast.success(vars.snoozed ? "Item snoozed" : "Snooze removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (sysIds: string[]) => deleteFn({ data: { table, sysIds } }),
    onSuccess: (res) => {
      refresh();
      setSelected([]);
      toast.success(`Deleted ${res.deleted} item${res.deleted === 1 ? "" : "s"}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [scope, setScope] = useState<"all" | "filtered" | "selected">("all");

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

  const selectedSet = new Set(selected);
  const filteredIds = filtered.map((r) => String(r["sys_id"]));
  const allFilteredSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedSet.has(id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleAll() {
    setSelected((prev) =>
      allFilteredSelected
        ? prev.filter((id) => !filteredIds.includes(id))
        : Array.from(new Set([...prev, ...filteredIds])),
    );
  }

  const scopeRecords =
    scope === "all" ? records : scope === "filtered" ? filtered : records.filter((r) => selectedSet.has(String(r["sys_id"])));

  function download() {
    if (scopeRecords.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      downloadFile(toCsv(scopeRecords, exportFields), `${exportName}_${stamp}.csv`, "text/csv");
    } else {
      downloadFile(
        toJsonExport(scopeRecords, exportFields),
        `${exportName}_${stamp}.json`,
        "application/json",
      );
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 border-b border-border bg-sand px-6 py-3 lg:px-8">
        <div className="min-w-[220px] flex-1">
          <label className="eyebrow text-muted-foreground">Search all fields</label>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="hostname, application, owner, IP…"
            className="mt-1 h-9 rounded-md border-border bg-card text-[13px]"
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
              className="field-input mt-1 block min-w-[150px]"
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
        <p className="pb-2 text-[11px] font-medium text-muted-foreground">
          {filtered.length} of {records.length} records
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3 border-b border-border bg-card px-6 py-3 lg:px-8">
        <div>
          <label className="eyebrow text-muted-foreground">Download scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as typeof scope)}
            className="field-input mt-1 block min-w-[210px]"
          >
            <option value="all">All records ({records.length})</option>
            <option value="filtered">Current filter ({filtered.length})</option>
            <option value="selected">Selected rows ({selected.length})</option>
          </select>
        </div>
        <div>
          <label className="eyebrow text-muted-foreground">Format</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as typeof format)}
            className="field-input mt-1 block min-w-[110px]"
          >
            <option value="csv">CSV</option>
            <option value="json">JSON</option>
          </select>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={scopeRecords.length === 0}
          className="btn-accent h-9 px-4 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Download {scopeRecords.length} record{scopeRecords.length === 1 ? "" : "s"}
        </button>
        {selected.length > 0 && (
          <button
            type="button"
            onClick={() => setSelected([])}
            className="pb-2 text-[11px] font-medium text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            Clear selection
          </button>
        )}
        {isAdmin && selected.length > 0 && (
          <button
            type="button"
            disabled={deleteMutation.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Permanently delete ${selected.length} item(s)? This cannot be undone and is written to the audit log.`,
                )
              )
                deleteMutation.mutate(selected);
            }}
            className="h-9 rounded-full border border-destructive/40 px-4 text-[12px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            Delete {selected.length} selected
          </button>
        )}
        <p className="pb-2 text-[11px] font-medium text-muted-foreground">
          Exports include all {exportFields.length} attributes
        </p>
      </div>

      <div className="overflow-x-auto bg-card">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary text-foreground">
              <th className="w-10 px-3 py-2 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all visible records"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="size-3.5 accent-[var(--color-primary)]"
                />
              </th>
              {columns.map((c) => (
                <th
                  key={c.name}
                  className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
                >
                  {c.label}
                </th>
              ))}
              <th className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Support
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                Snoozed
              </th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={columns.length + 4} className="px-3 py-8 text-muted-foreground">
                  Loading configuration items…
                </td>
              </tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length + 4} className="px-3 py-8 text-muted-foreground">
                  No configuration items match the current filters.
                </td>
              </tr>
            )}
            {filtered.map((r, rowIndex) => (
              <tr
                key={String(r["sys_id"])}
                className={`border-b border-border hover:bg-primary/5 ${rowIndex % 2 ? "bg-sand" : ""}`}
              >
                <td className="data-cell">
                  <input
                    type="checkbox"
                    aria-label={`Select ${String(r[columns[0]!.name] ?? r["sys_id"])}`}
                    checked={selectedSet.has(String(r["sys_id"]))}
                    onChange={() => toggle(String(r["sys_id"]))}
                    className="size-3.5 accent-[var(--color-primary)]"
                  />
                </td>
                {columns.map((c, i) => {
                  const cellValue = value(r, c.name);
                  const isFirst = i === 0;
                  const content =
                    !isFirst && CHIP_FIELDS.has(c.name) && cellValue !== "—" ? (
                      <span className="chip">{cellValue}</span>
                    ) : (
                      cellValue
                    );
                  return (
                    <td
                      key={c.name}
                      className={
                        isFirst
                          ? "data-cell font-mono font-semibold text-primary"
                          : "data-cell text-foreground/80"
                      }
                    >
                      {isFirst ? (
                        <Link
                          to={detailTo}
                          params={{ sysId: String(r["sys_id"]) }}
                          className="hover:underline"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </td>
                  );
                })}
                <td className="data-cell">
                  <span
                    className="chip"
                    style={{
                      color: SUPPORT_COLORS[supportStatus(r)],
                      borderColor: SUPPORT_COLORS[supportStatus(r)],
                    }}
                  >
                    {SUPPORT_LABELS[supportStatus(r)]}
                  </span>
                </td>
                <td className="data-cell">
                  <input
                    type="checkbox"
                    aria-label={`Snooze ${String(r[columns[0]!.name] ?? r["sys_id"])}`}
                    checked={r["snoozed"] === true}
                    disabled={!canWrite || snoozeMutation.isPending}
                    title={canWrite ? "Mark as snoozing" : "Sign in as an editor to change this"}
                    onChange={(e) =>
                      snoozeMutation.mutate({
                        sysId: String(r["sys_id"]),
                        snoozed: e.target.checked,
                      })
                    }
                    className="size-3.5 accent-[var(--color-primary)] disabled:opacity-50"
                  />
                </td>
                <td className="data-cell text-right">
                  <Link
                    to={detailTo}
                    params={{ sysId: String(r["sys_id"]) }}
                    className="text-[12px] font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Open
                  </Link>
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Permanently delete ${String(r[columns[0]!.name] ?? r["sys_id"])}? This cannot be undone.`,
                          )
                        )
                          deleteMutation.mutate([String(r["sys_id"])]);
                      }}
                      className="ml-3 text-[12px] font-semibold text-destructive underline-offset-4 hover:underline disabled:opacity-40"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}