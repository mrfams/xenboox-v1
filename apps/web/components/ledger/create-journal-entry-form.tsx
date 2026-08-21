"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { cn, formatCurrency } from "@/lib/utils";

type Line = {
  accountId: string;
  debit: string;
  credit: string;
  description: string;
};

export function CreateJournalEntryForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated?: () => void;
}) {
  const { entityId } = useEntity();
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lines, setLines] = useState<Line[]>([
    { accountId: "", debit: "", credit: "", description: "" },
    { accountId: "", debit: "", credit: "", description: "" },
  ]);
  const [error, setError] = useState<string | null>(null);

  const { data: accounts } = trpc.coa.list.useQuery(undefined, {
    enabled: !!entityId,
  });

  const { data: currentPeriod } = trpc.fiscal.getCurrent.useQuery(undefined, {
    enabled: !!entityId,
  });

  const createEntry = trpc.journal.create.useMutation({
    onSuccess: () => {
      onCreated?.();
      onClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const totalDebit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.debit) || 0),
    0,
  );
  const totalCredit = lines.reduce(
    (sum, l) => sum + (parseFloat(l.credit) || 0),
    0,
  );
  const isBalanced =
    Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;
  const validLines = lines.filter(
    (l) => l.accountId && (parseFloat(l.debit) > 0 || parseFloat(l.credit) > 0),
  );

  const updateLine = useCallback(
    (index: number, field: keyof Line, value: string) => {
      setLines((prev) =>
        prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
      );
    },
    [],
  );

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      { accountId: "", debit: "", credit: "", description: "" },
    ]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLines((prev) =>
      prev.length > 2 ? prev.filter((_, i) => i !== index) : prev,
    );
  }, []);

  const handleSubmit = () => {
    setError(null);
    if (!description.trim()) {
      setError("Description is required");
      return;
    }
    if (!currentPeriod?.id) {
      setError("No active fiscal period");
      return;
    }
    if (validLines.length < 2) {
      setError("At least 2 lines required");
      return;
    }
    if (!isBalanced) {
      setError("Debits must equal credits");
      return;
    }

    createEntry.mutate({
      description: description.trim(),
      reference: reference.trim() || undefined,
      date,
      periodId: currentPeriod.id,
      lines: validLines.map((l) => ({
        accountId: l.accountId,
        debit: parseFloat(l.debit) || 0 ? l.debit : "0",
        credit: parseFloat(l.credit) || 0 ? l.credit : "0",
        description: l.description || undefined,
      })),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div className="h-full w-full max-w-lg bg-card border-l border-border shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-6 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Create Journal Entry
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Description */}
          <div>
            <label
              htmlFor="je-description"
              className="block text-xs font-medium text-muted-foreground mb-1"
            >
              Description <span className="text-red-500">*</span>
            </label>
            <input
              id="je-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Payment to GTBank for office supplies"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Date + Reference */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="je-date"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Date <span className="text-red-500">*</span>
              </label>
              <input
                id="je-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="je-reference"
                className="block text-xs font-medium text-muted-foreground mb-1"
              >
                Reference
              </label>
              <input
                id="je-reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">
                Entry Lines <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-background p-2 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <select
                      value={line.accountId}
                      onChange={(e) =>
                        updateLine(i, "accountId", e.target.value)
                      }
                      className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Select account...</option>
                      {accounts?.map(
                        (a: { id: string; name: string; code: string }) => (
                          <option key={a.id} value={a.id}>
                            {a.code} — {a.name}
                          </option>
                        ),
                      )}
                    </select>
                    {lines.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeLine(i)}
                        className="rounded p-1 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        aria-label={`Remove line ${i + 1}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground">
                        Debit
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit}
                        onChange={(e) => updateLine(i, "debit", e.target.value)}
                        placeholder="0"
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">
                        Credit
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(e) =>
                          updateLine(i, "credit", e.target.value)
                        }
                        placeholder="0"
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground tabular-nums focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">
                        Memo
                      </label>
                      <input
                        value={line.description}
                        onChange={(e) =>
                          updateLine(i, "description", e.target.value)
                        }
                        placeholder="Optional"
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balance Check */}
          <div
            className={cn(
              "flex items-center justify-between rounded-lg border p-3",
              isBalanced
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-amber-500/20 bg-amber-500/5",
            )}
          >
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
              <span
                className={cn(
                  "text-xs font-medium",
                  isBalanced ? "text-emerald-600" : "text-amber-600",
                )}
              >
                {isBalanced
                  ? "Balanced"
                  : `Out of balance by ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground tabular-nums">
              Dr {formatCurrency(totalDebit)} / Cr {formatCurrency(totalCredit)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur-sm px-6 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                createEntry.isPending || !isBalanced || !description.trim()
              }
              className={cn(
                "flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-colors",
                isBalanced && description.trim()
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed",
              )}
            >
              {createEntry.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {createEntry.isPending ? "Creating..." : "Create Entry"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
