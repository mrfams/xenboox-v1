"use client";

import { useState, useCallback } from "react";
import {
  Upload,
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  AlertTriangle,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Type mapping helpers ────────────────────────────────────────────────────

type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
type AccountSubtype = string;

const QB_TYPE_MAP: Record<
  string,
  { type: AccountType; subtype: AccountSubtype }
> = {
  "1": { type: "asset", subtype: "bank_account" },
  "2": { type: "asset", subtype: "accounts_receivable" },
  "3": { type: "asset", subtype: "other_expense" },
  "4": { type: "asset", subtype: "fixed_asset" },
  "5": { type: "liability", subtype: "accounts_payable" },
  "6": { type: "liability", subtype: "current_liability" },
  "7": { type: "equity", subtype: "owner_equity" },
  "8": { type: "revenue", subtype: "sales_revenue" },
  "9": { type: "expense", subtype: "cost_of_goods_sold" },
  "10": { type: "expense", subtype: "operating_expense" },
  "11": { type: "expense", subtype: "other_expense" },
  "12": { type: "revenue", subtype: "other_income" },
  "13": { type: "asset", subtype: "current_asset" },
  "14": { type: "liability", subtype: "long_term_liability" },
};

const XERO_TYPE_MAP: Record<
  string,
  { type: AccountType; subtype: AccountSubtype }
> = {
  BANK: { type: "asset", subtype: "bank_account" },
  CURRENT: { type: "asset", subtype: "current_asset" },
  FIXED: { type: "asset", subtype: "fixed_asset" },
  "CURR.LIAB": { type: "liability", subtype: "current_liability" },
  "NON.CURR.LIAB": { type: "liability", subtype: "long_term_liability" },
  EQUITY: { type: "equity", subtype: "owner_equity" },
  "CURR.EQUITY": { type: "equity", subtype: "current_year_earnings" },
  REVENUE: { type: "revenue", subtype: "sales_revenue" },
  "DIRECT.COSTS": { type: "expense", subtype: "cost_of_goods_sold" },
  OVERHEADS: { type: "expense", subtype: "operating_expense" },
  "OTHER.EXPENSE": { type: "expense", subtype: "other_expense" },
  "OTHER.INCOME": { type: "revenue", subtype: "other_income" },
};

function mapType(
  value: string,
  format: "quickbooks" | "xero" | "generic",
): {
  type: AccountType;
  subtype: AccountSubtype;
} {
  if (format === "quickbooks") {
    const num = value.replace(/[^0-9]/g, "");
    return (
      QB_TYPE_MAP[num] ?? { type: "expense", subtype: "operating_expense" }
    );
  }
  if (format === "xero") {
    const key = value.toUpperCase().replace(/[^A-Z.]/g, "");
    return (
      XERO_TYPE_MAP[key] ?? { type: "expense", subtype: "operating_expense" }
    );
  }
  // Generic: try to infer from text
  const lower = value.toLowerCase();
  if (/^(asset|bank|cash|receivable|inventory|fixed)/.test(lower)) {
    return {
      type: "asset",
      subtype: lower.includes("bank")
        ? "bank_account"
        : lower.includes("fixed")
          ? "fixed_asset"
          : "current_asset",
    };
  }
  if (/^(liability|payable|loan|debt|credit)/.test(lower)) {
    return {
      type: "liability",
      subtype: lower.includes("payable")
        ? "accounts_payable"
        : "current_liability",
    };
  }
  if (/^(equity|capital|retained|owner)/.test(lower)) {
    return { type: "equity", subtype: "owner_equity" };
  }
  if (/^(revenue|income|sales|fee|interest)/.test(lower)) {
    return { type: "revenue", subtype: "sales_revenue" };
  }
  return { type: "expense", subtype: "operating_expense" };
}

// ─── Parsed row ──────────────────────────────────────────────────────────────

type ParsedRow = {
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  description?: string;
  _raw: Record<string, string>;
  _issues: string[];
};

// ─── Step components ─────────────────────────────────────────────────────────

function StepIndicator({ current, total }: { current: number; total: number }) {
  const steps = ["Upload", "Map Columns", "Preview", "Import"];
  return (
    <div className="flex items-center gap-1 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
              i < current
                ? "bg-primary text-primary-foreground"
                : i === current
                  ? "bg-primary/20 text-primary ring-2 ring-primary"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {i < current ? <Check className="h-3.5 w-3.5" /> : i + 1}
          </div>
          <span
            className={cn(
              "text-xs font-medium hidden sm:inline",
              i === current ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {label}
          </span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
        </div>
      ))}
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────

export function CoaImportWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [format, setFormat] = useState<"quickbooks" | "xero" | "generic">(
    "generic",
  );
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const utils = trpc.useUtils();
  const importCsv = trpc.coa.importCsv.useMutation({
    onSuccess: (res) => {
      setImportResult(res);
      utils.coa.listHierarchy.invalidate();
      if (res.errors.length === 0) {
        toast.success(`Imported ${res.imported} accounts`);
      } else {
        toast.warning(
          `Imported ${res.imported} accounts with ${res.errors.length} errors`,
        );
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const reset = () => {
    setStep(0);
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMap({});
    setParsedRows([]);
    setImportResult(null);
  };

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      toast.error("CSV must have a header row and at least one data row");
      return;
    }
    // Parse CSV (handles quoted fields)
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map((line) => {
      const vals = parseCSVLine(line);
      const rec: Record<string, string> = {};
      headers.forEach((h, i) => (rec[h] = vals[i] ?? ""));
      return rec;
    });

    // Auto-detect format
    const headerLower = headers.map((h) => h.toLowerCase());
    if (
      headerLower.includes("account type") &&
      headerLower.includes("detail type")
    ) {
      setFormat("quickbooks");
    } else if (
      headerLower.includes("account type") ||
      headerLower.includes("tax type")
    ) {
      setFormat("xero");
    }

    // Auto-map columns
    const autoMap: Record<string, string> = {};
    for (const h of headers) {
      const lower = h.toLowerCase();
      if (/^(account\s*code|code|number|num|account\s*#|#)$/.test(lower))
        autoMap[h] = "code";
      else if (/^(account\s*name|name|description|account)$/.test(lower))
        autoMap[h] = "name";
      else if (/^(account\s*type|type|kind|category)$/.test(lower))
        autoMap[h] = "type";
      else if (/^(detail\s*tax\s*type|subtype|sub\s*type|detail)$/.test(lower))
        autoMap[h] = "subtype";
      else if (/^(memo|note|description|desc)$/.test(lower))
        autoMap[h] = "description";
    }

    setCsvHeaders(headers);
    setCsvRows(rows);
    setColumnMap(autoMap);
    setStep(1);
  }, []);

  const doParse = useCallback(() => {
    const rows: ParsedRow[] = csvRows.map((raw) => {
      const code = columnMap.code ? (raw[columnMap.code] ?? "") : "";
      const name = columnMap.name ? (raw[columnMap.name] ?? "") : "";
      const typeVal = columnMap.type ? (raw[columnMap.type] ?? "") : "";
      const subtypeVal = columnMap.subtype
        ? (raw[columnMap.subtype] ?? "")
        : "";
      const description = columnMap.description
        ? raw[columnMap.description]
        : undefined;

      const issues: string[] = [];
      if (!code) issues.push("Missing account code");
      if (!name) issues.push("Missing account name");

      const mapped = mapType(typeVal || subtypeVal, format);

      return {
        code: code.replace(/[^a-zA-Z0-9.-]/g, "").slice(0, 20),
        name: name.slice(0, 200),
        type: mapped.type,
        subtype: mapped.subtype,
        description,
        _raw: raw,
        _issues: issues,
      };
    });
    setParsedRows(rows);
    setStep(2);
  }, [csvRows, columnMap, format]);

  const doImport = useCallback(() => {
    const validRows = parsedRows
      .filter((r) => r._issues.length === 0)
      .map(({ _raw, _issues, ...row }) => row);
    importCsv.mutate({ rows: validRows });
    setStep(3);
  }, [parsedRows, importCsv]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        aria-label="Import chart of accounts from CSV"
      >
        <Upload className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
        Import CSV
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Import Chart of Accounts"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0"
          />
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl max-h-[85vh] flex flex-col">
            <h3 className="font-semibold text-lg mb-1">
              Import Chart of Accounts
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Import from QuickBooks, Xero, or any CSV with account code, name,
              and type columns.
            </p>

            <StepIndicator current={step} total={4} />

            <div className="flex-1 overflow-y-auto min-h-0">
              {/* Step 0: Upload */}
              {step === 0 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {(["generic", "quickbooks", "xero"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => setFormat(f)}
                        className={cn(
                          "rounded-lg border p-3 text-sm font-medium text-left transition-all",
                          format === f
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-muted hover:border-border",
                        )}
                      >
                        {f === "generic"
                          ? "Generic CSV"
                          : f === "quickbooks"
                            ? "QuickBooks"
                            : "Xero"}
                      </button>
                    ))}
                  </div>

                  <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-10 hover:bg-accent cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      aria-label="Upload CSV file"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                      }}
                    />
                    <FileText className="h-8 w-8 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium">
                      Drop CSV or click to browse
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Supports QuickBooks, Xero, or generic CSV exports
                    </span>
                  </label>

                  <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">
                      Expected columns:
                    </p>
                    <p>
                      <strong>Required:</strong> code (account number), name
                      (account name), type
                      (asset/liability/equity/revenue/expense)
                    </p>
                    <p>
                      <strong>Optional:</strong> subtype, description
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: Map Columns */}
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Map your CSV columns to the required fields. Auto-detected
                    mappings are pre-filled.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {["code", "name", "type", "subtype", "description"].map(
                      (field) => (
                        <div key={field} className="space-y-1">
                          <label className="text-xs font-medium capitalize">
                            {field}
                            {field !== "description" ? " *" : ""}
                          </label>
                          <select
                            value={columnMap[field] ?? ""}
                            onChange={(e) =>
                              setColumnMap({
                                ...columnMap,
                                [field]: e.target.value,
                              })
                            }
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">— not mapped —</option>
                            {csvHeaders.map((h) => (
                              <option key={h} value={h}>
                                {h}
                              </option>
                            ))}
                          </select>
                        </div>
                      ),
                    )}
                  </div>

                  {/* Sample data preview */}
                  {csvRows.length > 0 && (
                    <div className="rounded-lg border overflow-hidden">
                      <div className="bg-muted/50 px-3 py-1.5 text-xs font-medium">
                        Sample rows
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b">
                              {csvHeaders.slice(0, 6).map((h) => (
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
                            {csvRows.slice(0, 5).map((r, i) => (
                              <tr key={i} className="border-b last:border-0">
                                {csvHeaders.slice(0, 6).map((h) => (
                                  <td key={h} className="px-2 py-1">
                                    {r[h]}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {csvRows.length} rows found.{" "}
                    {csvRows.length > 100 ? "All rows will be imported." : ""}
                  </p>
                </div>
              )}

              {/* Step 2: Preview */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Review {parsedRows.length} accounts before importing.
                    </p>
                    <div className="flex gap-2 text-xs">
                      <span className="text-emerald-600">
                        {
                          parsedRows.filter((r) => r._issues.length === 0)
                            .length
                        }{" "}
                        valid
                      </span>
                      {parsedRows.filter((r) => r._issues.length > 0).length >
                        0 && (
                        <span className="text-amber-600">
                          {
                            parsedRows.filter((r) => r._issues.length > 0)
                              .length
                          }{" "}
                          with issues
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border overflow-hidden max-h-[40vh] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                        <tr className="border-b">
                          <th className="px-2 py-1.5 text-left font-medium">
                            Code
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium">
                            Name
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium">
                            Type
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium">
                            Subtype
                          </th>
                          <th className="px-2 py-1.5 text-left font-medium">
                            Issues
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.map((r, i) => (
                          <tr
                            key={i}
                            className={cn(
                              "border-b last:border-0",
                              r._issues.length > 0 && "bg-amber-50/50",
                            )}
                          >
                            <td className="px-2 py-1 font-mono">{r.code}</td>
                            <td className="px-2 py-1">{r.name}</td>
                            <td className="px-2 py-1">
                              <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                                {r.type}
                              </span>
                            </td>
                            <td className="px-2 py-1 text-muted-foreground">
                              {r.subtype}
                            </td>
                            <td className="px-2 py-1">
                              {r._issues.length > 0 && (
                                <span className="text-amber-600 flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  {r._issues.join(", ")}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Step 3: Result */}
              {step === 3 && importResult && (
                <div className="space-y-4 text-center py-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 mx-auto">
                    <Check className="h-8 w-8 text-emerald-500" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold">Import Complete</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {importResult.imported} accounts imported successfully
                      {importResult.skipped > 0 &&
                        `, ${importResult.skipped} skipped (already exist)`}
                      {importResult.errors.length > 0 &&
                        `, ${importResult.errors.length} errors`}
                    </p>
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-left text-xs text-amber-800 max-h-32 overflow-y-auto">
                      {importResult.errors.map((e, i) => (
                        <p key={i}>{e}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-between pt-4 border-t mt-4">
              <Button
                variant="ghost"
                onClick={() => {
                  if (step === 0) setOpen(false);
                  else if (step === 3) {
                    reset();
                    setOpen(false);
                  } else setStep(step - 1);
                }}
              >
                {step === 0 ? (
                  "Cancel"
                ) : step === 3 ? (
                  "Close"
                ) : (
                  <>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back
                  </>
                )}
              </Button>

              {step === 0 && (
                <Button disabled variant="outline">
                  Next <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {step === 1 && (
                <Button onClick={doParse}>
                  Preview <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={doImport} disabled={importCsv.isPending}>
                  {importCsv.isPending ? (
                    "Importing..."
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" /> Import{" "}
                      {parsedRows.filter((r) => r._issues.length === 0).length}{" "}
                      Accounts
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
