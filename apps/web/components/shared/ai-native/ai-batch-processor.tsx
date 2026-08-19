"use client";

import { useState } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Zap,
  FileText,
  Camera,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AI Batch Processor ───────────────────────────────────────────────────
//
// Shows batch AI processing status for operations like:
// - Processing multiple receipts
// - Categorizing transactions
// - Generating invoices
// - Reconciling accounts

type BatchItem = {
  id: string;
  name: string;
  status: "pending" | "processing" | "complete" | "review" | "error";
  confidence?: number;
  error?: string;
};

type BatchCategory = {
  label: string;
  icon: LucideIcon;
  count: number;
  status: "auto" | "review" | "manual";
};

type AiBatchProcessorProps = {
  title: string;
  description?: string;
  items: BatchItem[];
  categories?: BatchCategory[];
  onProcessAll?: () => void;
  onProcessReview?: () => void;
  onCancel?: () => void;
  isProcessing?: boolean;
  className?: string;
};

export function AiBatchProcessor({
  title,
  description,
  items,
  categories,
  onProcessAll,
  onProcessReview,
  onCancel,
  isProcessing,
  className,
}: AiBatchProcessorProps) {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const completedCount = items.filter((i) => i.status === "complete").length;
  const reviewCount = items.filter((i) => i.status === "review").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const pendingCount = items.filter((i) => i.status === "pending").length;
  const progress =
    items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card overflow-hidden",
        className,
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isProcessing && (
              <Loader2 className="h-4 w-4 text-primary animate-spin" aria-hidden="true" />
            )}
            <span className="text-xs text-muted-foreground">
              {completedCount}/{items.length}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted mt-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      {categories && categories.length > 0 && (
        <div className="p-4 border-b border-border/50">
          <div className="grid grid-cols-3 gap-3">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg p-3 text-center",
                    cat.status === "auto" && "bg-emerald-50",
                    cat.status === "review" && "bg-amber-50",
                    cat.status === "manual" && "bg-muted",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 mx-auto mb-1",
                      cat.status === "auto" && "text-emerald-600",
                      cat.status === "review" && "text-amber-600",
                      cat.status === "manual" && "text-muted-foreground",
                    )}
                    aria-hidden="true"
                  />
                  <p className="text-lg font-bold text-foreground">{cat.count}</p>
                  <p className="text-[10px] text-muted-foreground">{cat.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Items list */}
      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-3 transition-all",
              item.status === "complete" && "border-emerald-200 bg-emerald-50/50",
              item.status === "review" && "border-amber-200 bg-amber-50/50",
              item.status === "error" && "border-red-200 bg-red-50/50",
              item.status === "pending" && "border-border/50",
              item.status === "processing" && "border-primary/30 bg-primary/5",
            )}
          >
            <div className="shrink-0">
              {item.status === "complete" && (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden="true" />
              )}
              {item.status === "processing" && (
                <Loader2 className="h-4 w-4 text-primary animate-spin" aria-hidden="true" />
              )}
              {item.status === "review" && (
                <Eye className="h-4 w-4 text-amber-500" aria-hidden="true" />
              )}
              {item.status === "error" && (
                <AlertTriangle className="h-4 w-4 text-red-500" aria-hidden="true" />
              )}
              {item.status === "pending" && (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
              {item.error && (
                <p className="text-[10px] text-red-600 mt-0.5">{item.error}</p>
              )}
            </div>
            {item.confidence !== undefined && (
              <span
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                  item.confidence >= 80 && "bg-emerald-100 text-emerald-700",
                  item.confidence >= 60 &&
                    item.confidence < 80 &&
                    "bg-amber-100 text-amber-700",
                  item.confidence < 60 && "bg-red-100 text-red-700",
                )}
              >
                {item.confidence}%
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border/50 flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {reviewCount > 0 && onProcessReview && (
            <button
              type="button"
              onClick={onProcessReview}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              Review {reviewCount}
            </button>
          )}
          {pendingCount > 0 && onProcessAll && (
            <button
              type="button"
              onClick={onProcessAll}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Zap className="h-3.5 w-3.5" aria-hidden="true" />
              Process All ({pendingCount})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
