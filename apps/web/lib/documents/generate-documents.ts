"use client";

// ─── Document Generation Orchestrator ──────────────────────────────────────
//
// Routes to the appropriate professional generator based on format.
// All generation happens client-side — no server load, works offline.

import { generateProfessionalPDF } from "./pdf-generator";
import { generateProfessionalExcel } from "./excel-generator";
import { generateWord } from "./word-generator";
import { saveAs } from "file-saver";

// ─── Types ─────────────────────────────────────────────────────────────────

export type DocumentFormat = "pdf" | "excel" | "word";

export type ReportData = {
  title: string;
  subtitle?: string;
  entityName: string;
  currency: string;
  generatedAt: Date;
  sections: ReportSection[];
};

export type ReportSection = {
  heading: string;
  intro?: string;
  table?: {
    columns: string[];
    rows: Array<Array<string | number>>;
  };
  paragraphs?: string[];
  bullets?: string[];
  footer?: Array<{ label: string; value: string }>;
};

// ─── Download Helper ───────────────────────────────────────────────────────

export async function downloadDocument(
  data: ReportData,
  format: DocumentFormat,
): Promise<void> {
  let blob: Blob;
  let filename: string;

  const safeName = data.title.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 50);
  const dateStr = data.generatedAt.toISOString().split("T")[0];

  switch (format) {
    case "pdf":
      blob = await generateProfessionalPDF(data);
      filename = `${safeName}_${dateStr}.pdf`;
      break;
    case "excel":
      blob = await generateProfessionalExcel(data);
      filename = `${safeName}_${dateStr}.xlsx`;
      break;
    case "word":
      blob = await generateWord(data);
      filename = `${safeName}_${dateStr}.docx`;
      break;
  }

  saveAs(blob, filename);
}

// Re-export types for convenience
export type {
  ReportData as ReportDataExport,
  ReportSection as ReportSectionExport,
};
