"use client";

// ─── MetricNarrative ──────────────────────────────────────────────────────
//
// A number is never shown alone. Every metric carries the one-line
// explanation of what it means — the AI's read, not just the figure.
//
// N49: money metrics pass `money` (rendered through the <Money> primitive —
// entity-correct formatting, tabular numerals, skeleton-when-undefined) and
// the `undefined` value renders "Measuring…" honestly instead of a zero.

import { ArrowDownRight, ArrowUpRight, Loader2 } from "lucide-react";

import { Money } from "@/components/ui/ledger-primitives";
import { cn } from "@/lib/utils";

export function MetricNarrative({
  label,
  value,
  money,
  narrative,
  delta,
  deltaLabel,
  loading,
  error,
  size = "md",
  className,
}: {
  label: string;
  /** Plain string value (non-money metrics). */
  value?: string;
  /** Money mode (N49) — rendered through the <Money> primitive. When set,
   * `value` is ignored and an undefined money value renders "Measuring…". */
  money?: {
    value?: number | string | null;
    currency?: string | null;
  };
  narrative?: string;
  /** Positive = good direction (up for cash, down for burn is caller's job) */
  delta?: number;
  deltaLabel?: string;
  loading?: boolean;
  /** N50: an error is NOT zero — renders the clay no-placeholder message. */
  error?: boolean | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const moneyLoading = money !== undefined && (money.value === undefined || money.value === null);

  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {label}
      </p>
      {error ? (
        <p className={"mt-0.5 text-xs text-error-clay"} role={"alert"}>
          {typeof error === "string"
            ? error
            : "Couldn't load this metric — nothing here is a placeholder value."}
        </p>
      ) : loading || moneyLoading ? (
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
            {money !== undefined ? (
              <Money value={money.value} currency={money.currency} size={size === "lg" ? "lg" : "md"} className="font-semibold" />
            ) : (
              value
            )}
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
