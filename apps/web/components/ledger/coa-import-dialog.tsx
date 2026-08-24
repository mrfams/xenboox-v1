"use client";

import { useState } from "react";
import { Upload, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useEntity } from "@/lib/entity-context";

export function CoaImportDialog() {
  const { entityId } = useEntity();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const utils = trpc.useUtils();

  const importTemplate = trpc.coa.importTemplate.useMutation({
    onSuccess: (res) => {
      toast.success(`Imported ${res.imported} accounts`);
      utils.coa.listHierarchy.invalidate();
      setOpen(false);
      setPreview([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV must have header + rows");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const required = ["code", "name", "type"];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length) {
      toast.error(`Missing headers: ${missing.join(", ")}`);
      return;
    }
    const rows = lines.slice(1, 6).map((line) => {
      const vals = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const rec: Record<string, string> = {};
      headers.forEach((h, i) => (rec[h] = vals[i] ?? ""));
      return rec;
    });
    setPreview(rows);
    toast.info(
      `Previewing ${rows.length} rows — full import uses template flow`,
    );
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Import chart of accounts"
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        Import CSV
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import chart of accounts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold">Import Chart of Accounts (CSV)</h3>
            <p className="text-xs text-muted-foreground">
              Columns: code, name, type, subtype. Example:
              1000,Cash,asset,current_asset
            </p>
            <label className="flex items-center justify-center rounded-xl border-2 border-dashed border-border p-8 hover:bg-accent cursor-pointer">
              <input
                type="file"
                accept=".csv"
                className="hidden"
                aria-label="Upload CSV"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <span className="text-sm text-muted-foreground">
                Drop CSV or click to browse
              </span>
            </label>
            {preview.length > 0 && (
              <div className="rounded-lg border overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {Object.keys(preview[0]).map((h) => (
                        <th
                          key={h}
                          className="px-2 py-1.5 text-left font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(r).map((v, j) => (
                          <td key={j} className="px-2 py-1">
                            {v}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  toast.info(
                    "QuickBooks/Xero import — use ingestion pipeline for full account migration",
                  );
                  setOpen(false);
                }}
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
