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

import ExcelJS from "exceljs";
import type { ReportData } from "./generate-documents";

// ─── Styles ────────────────────────────────────────────────────────────────

const BRAND_COLOR = "4F46E5";

function applyHeaderStyle(row: ExcelJS.Row, colCount: number) {
  row.eachCell((cell, colNumber) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${BRAND_COLOR}` },
    };
    cell.alignment = { horizontal: "center" };
    cell.border = {
      bottom: { style: "thin", color: { argb: "FF000000" } },
    };
  });
}

function formatCurrencyCell(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = '"$"#,##0.00';
  if (value < 0) {
    cell.font = { color: { argb: "FFCC0000" } };
  } else {
    cell.font = { color: { argb: "FF006600" } };
  }
}

function formatPercentCell(cell: ExcelJS.Cell, value: number) {
  cell.value = value;
  cell.numFmt = "0.0%";
}

function autoSizeColumns(worksheet: ExcelJS.Worksheet, columns: string[]) {
  columns.forEach((col, i) => {
    const colIdx = i + 1;
    const maxLen = Math.max(
      col.length,
      ...worksheet
        .getColumn(colIdx)
        .values.filter((v): v is string => typeof v === "string")
        .map((v) => v.length),
    );
    worksheet.getColumn(colIdx).width = Math.min(maxLen + 4, 50);
  });
}

// ─── Excel Generation ──────────────────────────────────────────────────────

export async function generateProfessionalExcel(
  data: ReportData,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Xenboox AI";
  wb.created = new Date();

  // ── Cover Sheet ──────────────────────────────────────────────────────
  const coverWs = wb.addWorksheet("Cover");
  coverWs.columns = [{ width: 40 }];

  const coverData = [
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

  coverData.forEach((row) => {
    const r = coverWs.addRow(row);
    if (row[0] === data.title) {
      r.font = { bold: true, size: 16 };
    }
  });

  // ── Data Sheets ──────────────────────────────────────────────────────
  for (const section of data.sections) {
    if (!section.table || section.table.rows.length === 0) continue;

    const sheetName = section.heading.slice(0, 31).replace(/[\/\\?*\[\]]/g, "");
    const ws = wb.addWorksheet(sheetName);

    // Section header
    const titleRow = ws.addRow([section.heading]);
    titleRow.font = { bold: true, size: 14 };

    if (section.intro) {
      ws.addRow([section.intro]);
    }
    ws.addRow([]); // blank row

    // Column headers
    const headerRow = ws.addRow(section.table.columns);
    applyHeaderStyle(headerRow, section.table.columns.length);

    // Data rows
    for (const row of data.sections.indexOf(section) >= 0 ? section.table.rows : []) {
      ws.addRow(row);
    }

    // Footer
    if (section.footer) {
      ws.addRow([]);
      for (const f of section.footer) {
        ws.addRow([f.label, f.value]);
      }
    }

    // Set column widths
    const colCount = section.table.columns.length;
    section.table.columns.forEach((col, i) => {
      ws.getColumn(i + 1).width =
        i === 0
          ? 35
          : col.includes("Amount") ||
              col.includes("Debit") ||
              col.includes("Credit")
            ? 20
            : 15;
    });

    // Freeze panes (freeze header row)
    const headerRowIdx = (section.intro ? 4 : 3); // 0-based after title + intro + blank
    ws.views = [{ state: "frozen", ySplit: headerRowIdx }];
  }

  // ── Summary Sheet ────────────────────────────────────────────────────
  const summaryWs = wb.addWorksheet("Summary");
  summaryWs.columns = [{ width: 30 }, { width: 25 }];

  summaryWs.addRow(["Report Summary"]);
  summaryWs.addRow([data.title]);
  summaryWs.addRow([data.subtitle || ""]);
  summaryWs.addRow([`Generated: ${data.generatedAt.toLocaleDateString()}`]);
  summaryWs.addRow([]);

  for (const section of data.sections) {
    if (section.footer) {
      for (const f of section.footer) {
        summaryWs.addRow([f.label, f.value]);
      }
    }
  }

  // Move Summary to first position
  const summaryIdx = wb.views.length - 1;
  // ExcelJS doesn't support reordering sheets easily, but the last added is fine

  // Generate blob
  const excelBuffer = await wb.xlsx.writeBuffer();
  return new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
