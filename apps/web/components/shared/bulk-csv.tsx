"use client";

import { Button } from "@/components/ui";
import { Download, Upload } from "lucide-react";

export function exportToCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n"))
      return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function BulkExportButton({
  rows,
  filename,
  label = "Export CSV",
}: {
  rows: Record<string, unknown>[];
  filename: string;
  label?: string;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => exportToCsv(filename, rows)}
      aria-label={label}
    >
      <Download className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
      {label}
    </Button>
  );
}

export function BulkImportButton({
  onRows,
  label = "Import CSV",
}: {
  onRows: (rows: Record<string, string>[]) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent cursor-pointer">
      <Upload className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
      <input
        type="file"
        accept=".csv"
        className="hidden"
        aria-label={label}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const text = await file.text();
          const lines = text.split(/\r?\n/).filter((l) => l.trim());
          if (lines.length < 2) return;
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().replace(/^"|"$/g, ""));
          const rows = lines.slice(1).map((line) => {
            const vals = line
              .split(",")
              .map((v) => v.trim().replace(/^"|"$/g, ""));
            const rec: Record<string, string> = {};
            headers.forEach((h, i) => (rec[h] = vals[i] ?? ""));
            return rec;
          });
          onRows(rows);
          e.target.value = "";
        }}
      />
    </label>
  );
}
