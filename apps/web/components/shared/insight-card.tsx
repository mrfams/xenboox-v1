"use client";

import { cn } from "@/lib/utils";
import { Brain, ArrowRight } from "lucide-react";

type InsightPriority = "high" | "medium" | "low" | "info";

interface InsightCardProps {
  icon?: string;
  title: string;
  description?: string;
  priority?: InsightPriority;
  confidence?: number;
  action?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const PRIORITY_STYLES: Record<
  InsightPriority,
  { border: string; bg: string; dot: string }
> = {
  high: {
    border: "border-l-error-clay",
    bg: "bg-error-clay/5",
    dot: "bg-error-clay",
  },
  medium: {
    border: "border-l-attention-amber",
    bg: "bg-attention-amber/5",
    dot: "bg-attention-amber",
  },
  low: {
    border: "border-l-signal-indigo",
    bg: "bg-signal-indigo/5",
    dot: "bg-signal-indigo",
  },
  info: {
    border: "border-l-balanced-green",
    bg: "bg-balanced-green/5",
    dot: "bg-balanced-green",
  },
};

export function InsightCard({
  icon = "💡",
  title,
  description,
  priority = "info",
  confidence,
  action,
  onAction,
  onDismiss,
  className,
}: InsightCardProps) {
  const styles = PRIORITY_STYLES[priority];

  return (
    <div
      className={cn(
        "group relative border-l-2 rounded-r-lg border bg-card px-3.5 py-3 transition-colors hover:bg-accent/30",
        styles.border,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <span className="text-base shrink-0 mt-0.5">{icon}</span>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
              <p className="text-xs font-medium text-foreground">{title}</p>
            </div>
            {description && (
              <p className="text-[11px] text-muted-foreground">{description}</p>
            )}
            {confidence !== undefined && (
              <div className="flex items-center gap-1.5">
                <Brain className="h-2.5 w-2.5 text-muted-foreground/60" />
                <span className="text-[9px] text-muted-foreground/60">
                  Confidence
                </span>
                <div className="h-1 w-12 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      confidence >= 90
                        ? "bg-balanced-green"
                        : confidence >= 75
                          ? "bg-attention-amber"
                          : "bg-error-clay",
                    )}
                    style={{ width: `${confidence}%` }}
                  />
                </div>
                <span className="text-[9px] font-bold tabular-nums">
                  {confidence}%
                </span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {action && onAction && (
            <button
              onClick={onAction}
              className="flex items-center gap-0.5 rounded-md px-1.5 py-1 text-[9px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-colors"
            >
              {action} <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100"
            >
              <span className="text-[9px]">✕</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecommendationCard({
  title,
  detail,
  priority = 3,
  impact,
  onAction,
  onDismiss,
  className,
}: {
  title: string;
  detail: string;
  priority?: number;
  impact?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card px-3.5 py-3 transition-colors hover:bg-accent/30",
        className,
      )}
    >
      {/* Priority stars */}
      <div className="flex shrink-0 gap-0.5 pt-0.5">
        {Array.from({ length: 5 }).map((_, idx) => (
          <span
            key={idx}
            className={cn(
              "text-[8px]",
              idx < priority
                ? "text-attention-amber"
                : "text-muted-foreground/20",
            )}
          >
            ★
          </span>
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>
        {impact && (
          <span className="mt-1 inline-block rounded bg-accent px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
            {impact}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onAction && (
          <button
            onClick={onAction}
            className="rounded-md px-1.5 py-1 text-[9px] font-medium text-signal-indigo hover:bg-signal-indigo/10 transition-colors"
          >
            Act <ArrowRight className="h-2.5 w-2.5 inline" />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-[9px] text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}

export function ApprovalCard({
  title,
  amount,
  recommendation,
  reason,
  confidence,
  onApprove,
  onReject,
  onReview,
  className,
}: {
  title: string;
  amount: string;
  recommendation: "approve" | "reject" | "review";
  reason: string;
  confidence: number;
  onApprove?: () => void;
  onReject?: () => void;
  onReview?: () => void;
  className?: string;
}) {
  const recStyles = {
    approve:
      "bg-balanced-green/10 text-balanced-green border-balanced-green/20",
    reject: "bg-error-clay/10 text-error-clay border-error-clay/20",
    review:
      "bg-attention-amber/10 text-attention-amber border-attention-amber/20",
  };

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-3.5 transition-colors hover:bg-accent/30",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{amount}</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-medium capitalize",
            recStyles[recommendation],
          )}
        >
          {recommendation}
        </span>
      </div>

      {/* Reason */}
      <div className="rounded-lg bg-accent/30 p-2.5 mb-2">
        <div className="flex items-start gap-2">
          <Brain className="h-3 w-3 text-signal-indigo mt-0.5 shrink-0" />
          <p className="text-[10px] text-muted-foreground">{reason}</p>
        </div>
      </div>

      {/* Confidence */}
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-[9px] text-muted-foreground">Confidence</span>
        <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[60px]">
          <div
            className={cn(
              "h-full rounded-full",
              confidence >= 95
                ? "bg-balanced-green"
                : confidence >= 85
                  ? "bg-attention-amber"
                  : "bg-error-clay",
            )}
            style={{ width: `${confidence}%` }}
          />
        </div>
        <span className="text-[9px] font-bold tabular-nums">{confidence}%</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {recommendation === "approve" && onApprove && (
          <button
            onClick={onApprove}
            className="rounded-lg bg-balanced-green/10 px-2.5 py-1 text-[10px] font-medium text-balanced-green hover:bg-balanced-green/20 transition-colors"
          >
            Approve
          </button>
        )}
        {recommendation === "reject" && onReject && (
          <button
            onClick={onReject}
            className="rounded-lg bg-error-clay/10 px-2.5 py-1 text-[10px] font-medium text-error-clay hover:bg-error-clay/20 transition-colors"
          >
            Reject
          </button>
        )}
        {recommendation === "review" && onReview && (
          <button
            onClick={onReview}
            className="rounded-lg bg-attention-amber/10 px-2.5 py-1 text-[10px] font-medium text-attention-amber hover:bg-attention-amber/20 transition-colors"
          >
            Review
          </button>
        )}
        {onReview && (
          <button
            onClick={onReview}
            className="flex items-center gap-0.5 text-[10px] font-medium text-signal-indigo hover:underline"
          >
            Details <ArrowRight className="h-2.5 w-2.5" />
          </button>
        )}
      </div>
    </div>
  );
}
