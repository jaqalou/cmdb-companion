import type { CiRecord } from "@/lib/cmdb-data";
import type { FieldDef } from "@/lib/cmdb-schema";
import {
  SUPPORT_ORDER,
  supportLabels,
  supportStatus,
  type LifecycleBasis,
} from "@/lib/support-status";

const NAVY = "FF10213F";
const NAVY_SOFT = "FF1E3A63";
const BAND = "FFF3F6FB";
const BORDER = "FFD8E0EC";

const STATUS_FILL: Record<string, string> = {
  out: "FFFCE4E4",
  soon: "FFFDF0D8",
  supported: "FFE3F5E9",
  unknown: "FFF1F3F6",
};
const STATUS_TEXT: Record<string, string> = {
  out: "FF9B1C1C",
  soon: "FF8A5300",
  supported: "FF14532D",
  unknown: "FF52606D",
};

/** Builds a styled, print-ready workbook of the given records. */
export async function buildXlsx(
  records: CiRecord[],
  fields: FieldDef[],
  title: string,
  scopeLabel: string,
  basis: LifecycleBasis = "eol",
): Promise<Blob> {
  const LABELS = supportLabels(basis);
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "CB Assets";
  wb.created = new Date();

  const headers = ["sys_id", "Support status", ...fields.map((f) => f.label)];
  const ws = wb.addWorksheet("Inventory", {
    views: [{ state: "frozen", ySplit: 4, xSplit: 1 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  ws.properties.defaultRowHeight = 18;

  // Title block
  ws.mergeCells(1, 1, 1, headers.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = `CB Assets — ${title}`;
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(1).height = 30;

  ws.mergeCells(2, 1, 2, headers.length);
  const sub = ws.getCell(2, 1);
  sub.value = `${records.length} record${records.length === 1 ? "" : "s"} · ${scopeLabel} · exported ${new Date().toLocaleString()}`;
  sub.font = { name: "Calibri", size: 10, color: { argb: "FFD5DEEC" } };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_SOFT } };
  sub.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.getRow(2).height = 20;
  ws.getRow(3).height = 6;

  // Header row
  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_SOFT } };
    cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true, indent: 1 };
    cell.border = { bottom: { style: "thin", color: { argb: NAVY } } };
  });

  // Data rows
  records.forEach((r, i) => {
    const status = supportStatus(r);
    const row = ws.addRow([
      r["sys_id"] ?? "",
      SUPPORT_LABELS[status],
      ...fields.map((f) => {
        const v = r[f.name];
        return v === null || v === undefined ? "" : (v as string | number);
      }),
    ]);
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cell.font = { name: "Calibri", size: 10, color: { argb: "FF1F2933" } };
      cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
      cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };
      if (i % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BAND } };
      if (col === 2) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: STATUS_FILL[status] ?? BAND },
        };
        cell.font = {
          name: "Calibri",
          size: 10,
          bold: true,
          color: { argb: STATUS_TEXT[status] ?? "FF1F2933" },
        };
      }
    });
  });

  // Column widths from content
  headers.forEach((h, idx) => {
    const col = ws.getColumn(idx + 1);
    let max = h.length;
    records.forEach((r) => {
      const v =
        idx === 0
          ? r["sys_id"]
          : idx === 1
            ? SUPPORT_LABELS[supportStatus(r)]
            : r[fields[idx - 2]!.name];
      const len = v === null || v === undefined ? 0 : String(v).length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 3, 12), 46);
  });

  if (records.length > 0) {
    ws.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + records.length, column: headers.length },
    };
  }

  // Summary sheet
  const summary = wb.addWorksheet("Summary", {
    pageSetup: { orientation: "portrait" },
  });
  summary.mergeCells(1, 1, 1, 2);
  const sTitle = summary.getCell(1, 1);
  sTitle.value = "Support status overview";
  sTitle.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  sTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  sTitle.alignment = { vertical: "middle", indent: 1 };
  summary.getRow(1).height = 26;

  const head = summary.getRow(3);
  head.values = ["Status", "Records"];
  head.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY_SOFT } };
    cell.alignment = { vertical: "middle", indent: 1 };
  });

  SUPPORT_ORDER.forEach((status) => {
    const count = records.filter((r) => supportStatus(r) === status).length;
    const row = summary.addRow([SUPPORT_LABELS[status], count]);
    row.eachCell((cell, col) => {
      cell.font = {
        name: "Calibri",
        size: 10,
        bold: col === 1,
        color: { argb: STATUS_TEXT[status] ?? "FF1F2933" },
      };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: STATUS_FILL[status] ?? BAND },
      };
      cell.alignment = { vertical: "middle", indent: 1 };
      cell.border = { bottom: { style: "hair", color: { argb: BORDER } } };
    });
  });
  const totalRow = summary.addRow(["Total", records.length]);
  totalRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
    cell.alignment = { vertical: "middle", indent: 1 };
  });
  summary.getColumn(1).width = 30;
  summary.getColumn(2).width = 12;

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
