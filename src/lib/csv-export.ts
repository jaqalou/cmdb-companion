import type { CiRecord } from "@/lib/cmdb-data";
import type { FieldDef } from "@/lib/cmdb-schema";

function cell(value: unknown) {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(records: CiRecord[], fields: FieldDef[]) {
  const header = ["sys_id", ...fields.map((f) => f.label)];
  const rows = records.map((r) => [
    cell(r["sys_id"]),
    ...fields.map((f) => cell(r[f.name])),
  ]);
  return [header.map(cell).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
}

export function toJsonExport(records: CiRecord[], fields: FieldDef[]) {
  const keys = ["sys_id", ...fields.map((f) => f.name)];
  return JSON.stringify(
    records.map((r) => Object.fromEntries(keys.map((k) => [k, r[k] ?? null]))),
    null,
    2,
  );
}

export function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}