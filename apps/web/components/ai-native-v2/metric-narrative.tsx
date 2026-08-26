"use client";

import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

// ─── MetricNarrative ──────────────────────────────────────────────────────
//
// A number is never shown alone. Every metric carries the one-line
// explanation of what it means — the AI's read, not just the figure.

export function MetricNarrative({
  label,
  value,
  narrative,
  delta,
  deltaLabel,
  loading,
  size = "md",
  className,
}: {
  label: string;
  value: string;
  narrative?: string;
  /** Positive = good direction (up for cash, down for burn is caller's job) */
  delta?: number;
  deltaLabel?: string;
  loading?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      {loading ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-muted-foreground/50"
            aria-hidden="true"
          />
          <span className="text-xs text-muted-foreground">Measuring…</span>
        </div>
      ) : (
        <>
          <p
            className={cn(
              "mt-0.5 truncate font-semibold tabular-nums tracking-tight text-foreground",
              size === "lg" && "text-2xl",
              size === "md" && "text-lg",
              size === "sm" && "text-sm",
            )}
          >
            {value}
          </p>
          {delta !== undefined && Number.isFinite(delta) && delta !== 0 && (
            <p
              className={cn(
                "mt-0.5 inline-flex items-center gap-0.5 font-mono text-[10px] tabular-nums",
                delta > 0 ? "text-emerald-500" : "text-red-500",
              )}
            >
              {delta > 0 ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              ) : (
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
              )}
              {Math.abs(delta).toFixed(1)}%
              {deltaLabel && (
                <span className="ml-0.5 font-sans text-muted-foreground">
                  {deltaLabel}
                </span>
              )}
            </p>
          )}
          {narrative && (
            <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-muted-foreground">
              {narrative}
            </p>
          )}
        </>
      )}
    </div>
  );
}
