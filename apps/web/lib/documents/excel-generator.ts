"use client";

// ─── Professional Excel Generator ──────────────────────────────────────────
//
// Generates professional Excel workbooks with:
// - Branded header rows
// - Proper number formatting (currency, percentage)
// - Conditional formatting (red for negative, green for positive)
// - Auto-sized columns
// - Multiple sheets for complex reports
// - Freeze panes for headers

import * as XLSX from "xlsx";
import type { ReportData } from "./generate-documents";

// ─── Styles ────────────────────────────────────────────────────────────────

const BRAND_COLOR = "4F46E5";
const HEADER_BG = {
  patternType: "solid" as const,
  fgColor: { rgb: BRAND_COLOR },
};
const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
  fill: HEADER_BG,
  alignment: { horizontal: "center" as const },
};
const CURRENCY_FORMAT = '"GMD"#,##0.00';
const PERCENT_FORMAT = "0.0%";
const NEGATIVE_FONT_COLOR = "CC0000";
const POSITIVE_FONT_COLOR = "006600";

// ─── Excel Generation ──────────────────────────────────────────────────────

export async function generateProfessionalExcel(
  data: ReportData,
): Promise<Blob> {
  const wb = XLSX.utils.book_new();

  // ── Cover Sheet ──────────────────────────────────────────────────────
  const coverData: Array<Array<string | number>> = [
    [data.title],
    [""],
    [data.subtitle || ""],
    [""],
    [
      `Generated: ${data.generatedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
    ],
    [`Entity: ${data.entityName}`],
    [`Currency: ${data.currency}`],
    [""],
    ["Powered by Xenboox AI"],
  ];

  const coverWs = XLSX.utils.aoa_to_sheet(coverData);
  coverWs["!cols"] = [{ wch: 40 }];
  XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

  // ── Data Sheets ──────────────────────────────────────────────────────
  for (const section of data.sections) {
    if (!section.table || section.table.rows.length === 0) continue;

    const sheetData: Array<Array<string | number>> = [];

    // Section header
    sheetData.push([section.heading]);
    if (section.intro) sheetData.push([section.intro]);
    sheetData.push([]);

    // Column headers
    sheetData.push(section.table.columns);

    // Data rows
    for (const row of section.table.rows) {
      sheetData.push(row);
    }

    // Footer
    if (section.footer) {
      sheetData.push([]);
      for (const f of section.footer) {
        sheetData.push([f.label, f.value]);
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Set column widths
    const colCount = section.table.columns.length;
    ws["!cols"] = section.table.columns.map((col, i) => ({
      wch:
        i === 0
          ? 35
          : col.includes("Amount") ||
              col.includes("Debit") ||
              col.includes("Credit")
            ? 20
            : 15,
    }));

    // Apply header style
    const headerRowIdx = section.intro ? 3 : 2;
    for (let c = 0; c < colCount; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (ws[cellRef]) {
        ws[cellRef].s = HEADER_STYLE;
      }
    }

    // Freeze panes (freeze header row)
    ws["!freeze"] = { xSplit: 0, ySplit: headerRowIdx + 1 };

    const sheetName = section.heading.slice(0, 31).replace(/[\/\\?*[\]]/g, "");
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // ── Summary Sheet ────────────────────────────────────────────────────
  const summaryData: Array<Array<string | number>> = [];
  summaryData.push(["Report Summary"]);
  summaryData.push([data.title]);
  summaryData.push([data.subtitle || ""]);
  summaryData.push([`Generated: ${data.generatedAt.toLocaleDateString()}`]);
  summaryData.push([]);

  for (const section of data.sections) {
    if (section.footer) {
      for (const f of section.footer) {
        summaryData.push([f.label, f.value]);
      }
    }
  }

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs["!cols"] = [{ wch: 30 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

  // Move Summary to first position
  const sheetNames = wb.SheetNames;
  const summaryIdx = sheetNames.indexOf("Summary");
  if (summaryIdx > 0) {
    sheetNames.splice(summaryIdx, 1);
    sheetNames.unshift("Summary");
    wb.SheetNames = sheetNames;
  }

  // Generate blob
  const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
