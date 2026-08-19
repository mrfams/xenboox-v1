"use client";

import { Sparkles, Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── AI Auto-Fill Indicator ───────────────────────────────────────────────
//
// Shows when a form field has been auto-filled by AI.
// Indicates the source and confidence of the auto-fill.
// User can accept, edit, or revert the auto-fill.

type AiAutofillIndicatorProps = {
  source: string; // e.g., "AI extracted from receipt", "Learned from past entries"
  confidence?: number; // 0-100
  onAccept?: () => void;
  onRevert?: () => void;
  className?: string;
};

export function AiAutofillIndicator({
  source,
  confidence,
  onAccept,
  onRevert,
  className,
}: AiAutofillIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md bg-primary/5 border border-primary/10",
        className,
      )}
    >
      <Sparkles className="h-3 w-3 text-primary" aria-hidden="true" />
      <span className="text-[10px] text-primary font-medium">AI filled</span>
      <span className="text-[10px] text-muted-foreground">· {source}</span>
      {confidence !== undefined && (
        <span className="text-[10px] text-muted-foreground">· {confidence}%</span>
      )}
      <div className="flex items-center gap-1 ml-auto">
        {onAccept && (
          <button
            type="button"
            onClick={onAccept}
            className="rounded p-0.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
            aria-label="Accept AI suggestion"
          >
            <Check className="h-3 w-3" />
          </button>
        )}
        {onRevert && (
          <button
            type="button"
            onClick={onRevert}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Revert AI suggestion"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── AI Auto-Fill Badge ───────────────────────────────────────────────────

type AiAutofillBadgeProps = {
  className?: string;
};

export function AiAutofillBadge({ className }: AiAutofillBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary",
        className,
      )}
    >
      <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
      AI
    </span>
  );
}

// ─── AI Confidence Field Wrapper ──────────────────────────────────────────
//
// Wraps a form field and shows the AI confidence level when the value
// was AI-suggested. Useful for invoice forms, bill entry, etc.

type AiConfidenceFieldProps = {
  confidence: number;
  children: React.ReactNode;
  className?: string;
};

export function AiConfidenceField({
  confidence,
  children,
  className,
}: AiConfidenceFieldProps) {
  const level =
    confidence >= 80 ? "high" : confidence >= 60 ? "medium" : "low";

  return (
    <div className={cn("relative", className)}>
      {children}
      <div className="absolute -right-1 -top-1">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-1 py-0.5 text-[8px] font-bold",
            level === "high" && "bg-emerald-100 text-emerald-700",
            level === "medium" && "bg-amber-100 text-amber-700",
            level === "low" && "bg-red-100 text-red-700",
          )}
        >
          {confidence}%
        </span>
      </div>
    </div>
  );
}
