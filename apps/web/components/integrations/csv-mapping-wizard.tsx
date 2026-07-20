"use client";

import { useState, useCallback, useMemo } from "react";
import { Button, Badge } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Upload,
  RefreshCw,
  Save,
  HelpCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type GuessResult = {
  columnCount: number;
  headers: string[];
  sampleRows: string[][];
  guess: Record<string, string>;
  sourceName: string;
  validation: {
    dateFormatsValid: boolean;
    amountsNumeric: boolean;
    requiredFieldsPresent: boolean;
    missingRequired: string[];
    warnings: string[];
  };
  delimiter: string;
};

type Step = "upload" | "mapping" | "save" | "done";

const STANDARD_FIELD_LABELS: Record<string, string> = {
  date: "Date",
  description: "Description",
  amount: "Amount (single column)",
  debit: "Debit Amount",
  credit: "Credit Amount",
  balance: "Balance",
  reference: "Reference",
  value_date: "Value Date",
  type: "Transaction Type",
  category: "Category",
  counterparty: "Counterparty",
  notes: "Notes",
};

const STANDARD_FIELD_HELP: Record<string, string> = {
  date: "The transaction date. Required.",
  description: "Transaction narration or details. Strongly recommended.",
  amount:
    "Use this if your CSV has a single amount column (positive = credit, negative = debit).",
  debit: "The debit/withdrawal column.",
  credit: "The credit/deposit column.",
  balance: "Running balance after each transaction.",
  reference: "Cheque number, transaction ID, or reference code.",
  value_date: "The settlement/value date (if different from transaction date).",
  type: "Transaction type indicator (e.g., credit/debit).",
  category: "Transaction category or classification.",
  counterparty: "The other party in the transaction (payee/payer).",
  notes: "Additional notes or remarks.",
};

// ---------------------------------------------------------------------------
// CSV Mapping Wizard Component
// ---------------------------------------------------------------------------

interface CsvMappingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: CSV text content to preload */
  csvContent?: string;
  /** Called when a mapping is saved and processing should begin */
  onMappingComplete?: (mapping: {
    sourceName: string;
    fieldMapping: Record<string, string>;
    delimiter: string;
  }) => void;
}

export function CsvMappingWizard({
  open,
  onOpenChange,
  csvContent,
  onMappingComplete,
}: CsvMappingWizardProps) {
  const [step, setStep] = useState<Step>(csvContent ? "mapping" : "upload");
  const [csvText, setCsvText] = useState(csvContent ?? "");
  const [delimiter, setDelimiter] = useState(",");
  const [guessResult, setGuessResult] = useState<GuessResult | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [unmappedHeaders, setUnmappedHeaders] = useState<string[]>([]);
  const [sourceName, setSourceName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const guessMutation = trpc.integrations.guessCsvMapping.useMutation();
  const saveMutation = trpc.integrations.saveCsvMapping.useMutation();

  // ── Parse CSV & guess mapping ──

  const handleAnalyze = useCallback(async () => {
    if (!csvText.trim()) return;

    setIsLoading(true);
    try {
      // Detect delimiter
      const detectedDelimiter = detectDelimiter(csvText);

      const result = await guessMutation.mutateAsync({
        csvSample: csvText.slice(0, 10000),
        delimiter: detectedDelimiter,
      });

      setGuessResult(result);
      setMapping(result.guess);
      setSourceName(result.sourceName ?? "import");
      setDelimiter(detectedDelimiter);

      // Track unmapped headers
      const mappedHeaders = new Set(Object.values(result.guess));
      setUnmappedHeaders(result.headers.filter((h) => !mappedHeaders.has(h)));

      setStep("mapping");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to parse CSV",
      );
    } finally {
      setIsLoading(false);
    }
  }, [csvText, guessMutation]);

  // ── Update a field mapping ──

  const setFieldMapping = useCallback(
    (field: string, csvColumn: string) => {
      setMapping((prev) => {
        const next = { ...prev };

        // If this CSV column was mapped to another field, remove that mapping
        for (const [f, col] of Object.entries(next)) {
          if (col === csvColumn && f !== field) {
            delete next[f];
          }
        }

        if (csvColumn === "__unmapped__") {
          delete next[field];
        } else {
          next[field] = csvColumn;
        }

        // Recompute unmapped headers from the updated `next` mapping
        setUnmappedHeaders((prev) => {
          const mappedVals = new Set(Object.values(next));
          if (guessResult) {
            return guessResult.headers.filter((h) => !mappedVals.has(h));
          }
          return prev;
        });

        return next;
      });
    },
    [guessResult],
  );

  // ── Save mapping ──

  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      await saveMutation.mutateAsync({
        sourceName,
        sourceLabel: sourceName,
        delimiter,
        hasHeaderRow: true,
        fieldMapping: mapping,
      });

      toast.success("Column mapping saved for future imports!");
      setStep("done");

      onMappingComplete?.({
        sourceName,
        fieldMapping: mapping,
        delimiter,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save mapping",
      );
    } finally {
      setIsLoading(false);
    }
  }, [sourceName, delimiter, mapping, saveMutation, onMappingComplete]);

  // ── Reset ──

  const handleReset = useCallback(() => {
    setStep("upload");
    setCsvText("");
    setGuessResult(null);
    setMapping({});
    setUnmappedHeaders([]);
    setSourceName("");
  }, []);

  const handleClose = useCallback(() => {
    handleReset();
    onOpenChange(false);
  }, [handleReset, onOpenChange]);

  // ── Pick a file ──

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = evt.target?.result as string;
        setCsvText(text);
      };
      reader.readAsText(file);
    },
    [handleAnalyze],
  );

  // ── Render ──

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV/Excel Column Mapping Wizard
          </DialogTitle>
          <DialogDescription>
            Map your file columns to Xenboox accounting fields. Mappings are
            saved for future imports from the same source.
          </DialogDescription>
        </DialogHeader>

        {/* ── Step: Upload ── */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    setCsvText((evt.target?.result as string) ?? "");
                  };
                  reader.readAsText(file);
                }
              }}
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("csv-file-input")?.click()}
            >
              <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium">
                Drop your CSV or Excel file here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Or click to browse
              </p>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv,.tsv,.txt,.xlsx,.xls"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or paste CSV text
                </span>
              </div>
            </div>

            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="Paste your CSV content here..."
              rows={6}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm font-mono"
            />

            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">
                Delimiter:
              </label>
              {[",", ";", "\\t", "|"].map((d) => (
                <Button
                  key={d}
                  variant={delimiter === d ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDelimiter(d)}
                  className="text-xs"
                >
                  {d === "\\t" ? "Tab" : d}
                </Button>
              ))}
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!csvText.trim() || isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Analyze & Guess Columns
            </Button>
          </div>
        )}

        {/* ── Step: Mapping ── */}
        {step === "mapping" && guessResult && (
          <div className="space-y-4 py-2">
            {/* Validation warnings */}
            {guessResult.validation.warnings.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Validation Warnings
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {guessResult.validation.warnings.map((w, i) => (
                        <li key={i} className="text-xs text-amber-700">
                          {w}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Missing required fields */}
            {guessResult.validation.missingRequired.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Missing Required Fields
                    </p>
                    <p className="text-xs text-red-700 mt-1">
                      The following required fields have no column mapped:{" "}
                      {guessResult.validation.missingRequired.join(", ")}.
                      Please assign them below.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Source name */}
            <div>
              <label className="text-sm font-medium">Source Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="e.g., GTBank, Wave, Custom Import"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                This name is used to auto-apply the same mapping on future
                uploads.
              </p>
            </div>

            {/* Sample data preview */}
            <div>
              <p className="text-sm font-medium mb-2">Column Preview</p>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/50">
                      {guessResult.headers.map((h, i) => (
                        <th key={i} className="px-3 py-2 text-left font-mono">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {guessResult.sampleRows.map((row, ri) => (
                      <tr key={ri} className="border-t">
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-3 py-1.5 font-mono truncate max-w-[200px]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapping grid */}
            <div>
              <p className="text-sm font-medium mb-2">
                Field Mapping
                <span className="text-xs text-muted-foreground ml-2">
                  (Drag or select which column maps to each field)
                </span>
              </p>
              <div className="space-y-2">
                {Object.entries(STANDARD_FIELD_LABELS).map(([field, label]) => {
                  const mappedCol =
                    (mapping as Record<string, string>)[field] ?? "";
                  const isMapped = !!mappedCol;
                  const isRequired =
                    field === "date" ||
                    field === "description" ||
                    field === "amount" ||
                    field === "debit" ||
                    field === "credit";

                  return (
                    <div key={field}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-lg border p-3 transition-colors",
                          isMapped
                            ? "border-emerald-200 bg-emerald-50/50"
                            : isRequired
                              ? "border-red-200 bg-red-50/30"
                              : "border-muted",
                        )}
                      >
                        {/* Field label */}
                        <div className="w-36 shrink-0">
                          <p className="text-sm font-medium">
                            {label}
                            {isRequired && (
                              <span className="text-destructive ml-0.5">*</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {STANDARD_FIELD_HELP[field]}
                          </p>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

                        {/* Column selector */}
                        <select
                          value={mappedCol}
                          onChange={(e) =>
                            setFieldMapping(field, e.target.value)
                          }
                          className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
                        >
                          <option value="__unmapped__">-- Not mapped --</option>
                          {guessResult.headers.map((h) => (
                            <option key={h} value={h}>
                              {h}
                            </option>
                          ))}
                        </select>

                        {isMapped && (
                          <Badge
                            variant="secondary"
                            className="shrink-0 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Mapped
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Unmapped CSV columns */}
            {unmappedHeaders.length > 0 && (
              <div className="rounded-lg border border-muted p-3">
                <p className="text-sm text-muted-foreground">
                  Unmapped columns: {unmappedHeaders.join(", ") || "None"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  These columns won&apos;t be imported. To map them, use the
                  selectors above.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Start Over
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  isLoading || guessResult.validation.missingRequired.length > 0
                }
                className="flex-1"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                Save Mapping & Import
              </Button>
            </div>
          </div>
        )}

        {/* ── Step: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
            <p className="text-sm font-medium">
              Column mapping saved successfully!
            </p>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              Your mapping for <strong>{sourceName}</strong> has been saved.
              Future uploads from this source will be auto-mapped. The data is
              now being processed by the AI pipeline.
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Delimiter Detection ──────────────────────────────────────────────────

function detectDelimiter(content: string): string {
  const firstLine = content.split("\n")[0] ?? "";
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const pipeCount = (firstLine.match(/\|/g) ?? []).length;

  const max = Math.max(commaCount, semicolonCount, tabCount, pipeCount);
  if (max === commaCount) return ",";
  if (max === semicolonCount) return ";";
  if (max === tabCount) return "\t";
  if (max === pipeCount) return "|";
  return ",";
}
