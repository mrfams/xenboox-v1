"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  Loader2,
  Tag,
  Link2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/use-currency";
import { trpc } from "@/lib/trpc/client";

type Transaction = {
  id: string;
  date: string;
  description: string;
  reference: string | null;
  type: "deposit" | "withdrawal" | "transfer" | "fee" | "interest";
  amount: number;
  balance: number | null;
  isReconciled: boolean;
  accountName: string;
  bankName: string;
  currency: string;
  category?: string | null;
  glAccountId?: string | null;
  // listTransactions parseFloat()s this — but other flows (batchCategorize
  // undo state) may surface it as a string, so convert defensively.
  categorizationConfidence?: number | null;
  categorizedBy?: string | null;
};

const CATEGORY_COLORS: Record<string, string> = {
  Uncategorized: "bg-muted/50 text-muted-foreground",
  "Office Supplies": "bg-blue-500/10 text-blue-600",
  "Travel & Transport": "bg-purple-500/10 text-purple-600",
  "Meals & Entertainment": "bg-orange-500/10 text-orange-600",
  "Software & Subscriptions": "bg-cyan-500/10 text-cyan-600",
  "Professional Services": "bg-indigo-500/10 text-indigo-600",
  Utilities: "bg-amber-500/10 text-amber-600",
  Revenue: "bg-emerald-500/10 text-emerald-600",
  Payroll: "bg-rose-500/10 text-rose-600",
  "Bank Fees": "bg-red-500/10 text-red-600",
  Marketing: "bg-pink-500/10 text-pink-600",
  "Rent & Lease": "bg-teal-500/10 text-teal-600",
  Insurance: "bg-violet-500/10 text-violet-600",
  Taxes: "bg-red-500/10 text-red-600",
  "Cost of Goods Sold": "bg-amber-500/10 text-amber-600",
};

const COMMON_CATEGORIES = [
  "Office Supplies",
  "Travel & Transport",
  "Meals & Entertainment",
  "Software & Subscriptions",
  "Professional Services",
  "Utilities",
  "Revenue",
  "Payroll",
  "Bank Fees",
  "Marketing",
  "Rent & Lease",
  "Insurance",
  "Taxes",
  "Cost of Goods Sold",
];

export function TransactionRow({
  transaction,
  onUpdate,
  selected,
  onSelect,
}: {
  transaction: Transaction;
  onUpdate: () => void;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const utils = trpc.useUtils();
  const { format } = useFormatCurrency();

  const updateCategoryMutation =
    trpc.banking.updateTransactionCategory.useMutation({
      onSuccess: () => {
        utils.banking.listTransactions.invalidate();
        onUpdate();
      },
    });

  const tx = transaction;
  // Amounts are stored as magnitudes (P2-B convention) — direction comes
  // from `type`, never from the sign of the number.
  const isDeposit = tx.type === "deposit";
  const confidence = tx.categorizationConfidence
    ? Number(tx.categorizationConfidence)
    : null;
  const confidencePct =
    confidence != null ? Math.round(confidence * 100) : null;

  const categoryColor =
    CATEGORY_COLORS[tx.category ?? "Uncategorized"] ??
    "bg-muted/50 text-muted-foreground";

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 hover:bg-accent/30 transition-colors">
      {/* Selection Checkbox */}
      <input
        type="checkbox"
        checked={selected ?? false}
        onChange={() => onSelect?.()}
        className="h-4 w-4 shrink-0 rounded border-border text-primary focus:ring-primary/30"
      />

      {/* Direction Icon — derived from the transaction type (magnitude
          convention: amount is always positive, direction lives in `type`) */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          isDeposit ? "bg-emerald-500/10" : "bg-red-500/10",
        )}
      >
        {isDeposit ? (
          <ArrowDownRight className="h-4 w-4 text-emerald-500" />
        ) : (
          <ArrowUpRight className="h-4 w-4 text-red-500" />
        )}
      </div>

      {/* Description & Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-xs font-medium text-foreground truncate">
            {tx.description || "Transaction"}
          </p>
          {tx.reference && (
            <span className="text-[10px] text-muted-foreground/50 hidden sm:inline">
              #{tx.reference}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[10px] text-muted-foreground">
            {new Date(tx.date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
          <span className="text-[10px] text-muted-foreground/50">·</span>
          <span className="text-[10px] text-muted-foreground">
            {tx.accountName}
          </span>
          {!tx.isReconciled && (
            <>
              <span className="text-[10px] text-muted-foreground/50">·</span>
              <span className="text-[10px] text-amber-500 font-medium">
                Unreconciled
              </span>
            </>
          )}
        </div>
      </div>

      {/* Category */}
      <div className="relative">
        <button
          onClick={() => setShowCategoryPicker(!showCategoryPicker)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors hover:opacity-80",
            categoryColor,
          )}
        >
          {tx.categorizedBy === "ai" && (
            <Sparkles className="h-2.5 w-2.5" aria-label="AI categorized" />
          )}
          {tx.categorizedBy === "rule" && (
            <Zap className="h-2.5 w-2.5" aria-label="Rule matched" />
          )}
          {tx.category || "Uncategorized"}
          {confidencePct != null && confidencePct > 0 && (
            <span
              className={cn(
                "ml-1 inline-flex items-center rounded px-1 py-0 text-[8px] font-bold",
                confidencePct >= 90
                  ? "bg-emerald-500/10 text-emerald-600"
                  : confidencePct >= 70
                    ? "bg-amber-500/10 text-amber-600"
                    : "bg-red-500/10 text-red-600",
              )}
              title={`Confidence: ${confidencePct}%`}
            >
              {confidencePct}%
            </span>
          )}
          <ChevronDown className="h-2.5 w-2.5" />
        </button>

        {/* Category Picker Dropdown */}
        {showCategoryPicker && (
          <CategoryPicker
            currentCategory={tx.category ?? null}
            onSelect={(category) => {
              updateCategoryMutation.mutate({
                transactionId: tx.id,
                category,
              });
              setShowCategoryPicker(false);
            }}
            onClose={() => setShowCategoryPicker(false)}
          />
        )}
      </div>

      {/* Confidence Indicator */}
      {confidencePct !== null && (
        <div
          className={cn(
            "h-1.5 w-8 rounded-full overflow-hidden hidden sm:block",
            "bg-muted/30",
          )}
          title={`AI confidence: ${confidencePct}%`}
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              confidencePct >= 80
                ? "bg-emerald-500"
                : confidencePct >= 60
                  ? "bg-amber-500"
                  : "bg-red-500",
            )}
            style={{ width: `${Math.min(confidencePct, 100)}%` }}
          />
        </div>
      )}

      {/* Amount — magnitude + direction sign, formatted with the
          transaction's own currency symbol */}
      <span
        className={cn(
          "text-xs font-semibold tabular-nums shrink-0",
          isDeposit ? "text-emerald-500" : "text-foreground",
        )}
      >
        {isDeposit ? "+" : "−"}
        {format(tx.amount, tx.currency)}
      </span>

      {/* Balance */}
      {tx.balance !== null && (
        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0 hidden md:block">
          {format(tx.balance, tx.currency)}
        </span>
      )}
    </div>
  );
}

// ─── Category Picker ───────────────────────────────────────────────────────

function CategoryPicker({
  currentCategory,
  onSelect,
  onClose,
}: {
  currentCategory: string | null;
  onSelect: (category: string) => void;
  onClose: () => void;
}) {
  const [customCategory, setCustomCategory] = useState("");

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Dropdown */}
      <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl border border-border/50 bg-card shadow-lg">
        <div className="p-2">
          <p className="px-2 py-1 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Categories
          </p>
          <div className="mt-1 max-h-48 overflow-y-auto">
            {COMMON_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => onSelect(cat)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                  currentCategory === cat
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-2 w-2 rounded-full",
                    CATEGORY_COLORS[cat]?.split(" ")[0] ?? "bg-muted",
                  )}
                />
                {cat}
                {currentCategory === cat && (
                  <CheckCircle2 className="ml-auto h-3 w-3 text-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Custom Category */}
          <div className="mt-2 border-t border-border/30 pt-2">
            <div className="flex gap-1">
              <input
                type="text"
                placeholder="Custom category..."
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && customCategory.trim()) {
                    onSelect(customCategory.trim());
                    setCustomCategory("");
                  }
                }}
                className="flex-1 rounded-lg border border-border/50 bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={() => {
                  if (customCategory.trim()) {
                    onSelect(customCategory.trim());
                    setCustomCategory("");
                  }
                }}
                disabled={!customCategory.trim()}
                className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/15 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
