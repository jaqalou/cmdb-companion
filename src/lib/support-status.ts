import type { CiRecord } from "@/lib/cmdb-data";

export type SupportStatus = "out" | "soon" | "supported" | "snoozed" | "unknown";

export const SUPPORT_LABELS: Record<SupportStatus, string> = {
  out: "Out of support",
  soon: "Expiring within 6 months",
  supported: "In support",
  snoozed: "Snoozed",
  unknown: "No EOL date",
};

export const SUPPORT_COLORS: Record<SupportStatus, string> = {
  out: "#dc2626",
  soon: "#f59e0b",
  supported: "#16a34a",
  snoozed: "#94a3b8",
  unknown: "#cbd5e1",
};

function parseEol(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  const raw = String(value).trim();
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  // dd-mm-yyyy / dd/mm/yyyy
  const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return null;
}

export function supportStatus(record: CiRecord, now = new Date()): SupportStatus {
  if (record["snoozed"] === true) return "snoozed";
  const eol = parseEol(record["eol_date"]);
  if (!eol) {
    const cycle = String(record["support_cycle"] ?? "").toLowerCase();
    if (cycle.includes("end of life") || cycle.includes("unsupported") || cycle.includes("expired"))
      return "out";
    return "unknown";
  }
  if (eol.getTime() < now.getTime()) return "out";
  const sixMonths = new Date(now);
  sixMonths.setMonth(sixMonths.getMonth() + 6);
  return eol.getTime() <= sixMonths.getTime() ? "soon" : "supported";
}

export const SUPPORT_ORDER: SupportStatus[] = ["out", "soon", "supported", "snoozed", "unknown"];
