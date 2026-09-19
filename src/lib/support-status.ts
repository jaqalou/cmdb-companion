import type { CiRecord } from "@/lib/cmdb-data";

export type SupportStatus = "out" | "soon" | "supported" | "unknown";

/** Which attribute drives the lifecycle calculation. Chosen by administrators. */
export type LifecycleBasis = "eol" | "esu";

export const SUPPORT_LABELS: Record<SupportStatus, string> = {
  out: "Out of support",
  soon: "Expiring within 6 months",
  supported: "In support",
  unknown: "No EOL date",
};

const ESU_LABELS: Record<SupportStatus, string> = {
  out: "ESU expired",
  soon: "ESU active",
  supported: "Full support",
  unknown: "No ESU coverage",
};

export function supportLabels(basis: LifecycleBasis = "eol") {
  return basis === "esu" ? ESU_LABELS : SUPPORT_LABELS;
}

export const SUPPORT_COLORS: Record<SupportStatus, string> = {
  out: "#dc2626",
  soon: "#f59e0b",
  supported: "#16a34a",
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

/** Lifecycle judged on Extended Security Updates instead of the EOL date. */
function esuStatus(record: CiRecord, now: Date): SupportStatus {
  const flag = String(record["esu"] ?? "").trim().toLowerCase();
  if (flag === "eol") return "out"; // Red
  if (flag === "false") return "supported"; // Full support — Green
  if (flag === "active") return "soon"; // Amber
  if (flag === "n/a" || flag === "na") return "unknown"; // Grey
  if (flag === "") return "unknown"; // Blank — Grey
  const end = parseEol(record["esu_end_date"]);
  if (end) {
    if (end.getTime() < now.getTime()) return "out";
    const sixMonths = new Date(now);
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    return end.getTime() <= sixMonths.getTime() ? "soon" : "supported";
  }
  return "unknown";
}

export function supportStatus(
  record: CiRecord,
  basis: LifecycleBasis = "eol",
  now = new Date(),
): SupportStatus {
  if (basis === "esu") return esuStatus(record, now);
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

export const SUPPORT_ORDER: SupportStatus[] = ["out", "soon", "supported", "unknown"];
