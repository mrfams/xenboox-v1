"use client";

// ─── Ledger Design System — money + async primitives (§6.1, N48) ────────────
//
// The two patterns every surface needs, standardized once:
//
//   <Money />       — money is NEVER a bare number: entity-correct currency
//                     formatting (via useFormatCurrency), tabular numerals,
//                     semantic sign coloring, and a skeleton when the value
//                     hasn't loaded (undefined ≠ zero — the §6.3 rule).
//   <AsyncBlock />  — one honest async state machine: skeleton → content,
//                     explicit error with retry, explicit empty. Surfaces stop
//                     hand-rolling loading/error branches per block.

import { type ReactNode } from "react";

import { useFormatCurrency } from "@/lib/hooks/use-currency";
import { cn } from "@/lib/utils";

// ─── Money ──────────────────────────────────────────────────────────────────

export interface MoneyProps {
  /** Major-unit amount. `undefined`/`null` renders the loading skeleton —
   * pass 0 only when zero is a REAL loaded value. */
  value?: number | string | null;
  /** Currency override; defaults to the entity's currency. */
  currency?: string | null;
  /** Semantic sign coloring: positive green / negative clay (or inverted). */
  tone?: "neutral" | "signed" | "inverse";
  size?: "sm" | "md" | "lg";
  align?: "left" | "right";
  className?: string;
  skeletonWidth?: string;
}

const sizeClass: Record<NonNullable<MoneyProps["size"]>, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl font-semibold tracking-tight",
};

export function Money({
  value,
  currency,
  tone = "neutral",
  size = "md",
  align = "left",
  className,
  skeletonWidth = "w-24",
}: MoneyProps) {
  const { format } = useFormatCurrency();

  // §6.3: a number that hasn't loaded is NOT zero.
  if (value === undefined || value === null) {
    return (
      <span
        aria-busy="true"
        className={cn(
          "inline-block animate-pulse rounded bg-muted",
          skeletonWidth,
          className,
        )}
      />
    );
  }

  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  const toneClass =
    tone !== "neutral" && Number.isFinite(numeric) && numeric !== 0
      ? (numeric > 0) === (tone === "signed")
        ? "text-balanced-green"
        : "text-error-clay"
      : "";

  return (
    <span
      className={cn(
        "tabular-nums",
        sizeClass[size],
        align === "right" && "text-right",
        toneClass,
        className,
      )}
    >
      {Number.isFinite(numeric)
        ? format(numeric, currency ?? undefined)
        : "—"}
    </span>
  );
}

// ─── AsyncBlock ─────────────────────────────────────────────────────────────

export interface AsyncBlockProps {
  /** "loading" | "error" | "empty" | "ready". */
  state: "loading" | "error" | "empty" | "ready";
  /** Rendered when ready. */
  children?: ReactNode;
  /** Rendered when empty (defaults to a muted nothing-here line). */
  empty?: ReactNode;
  /** Error line (defaults to an honest retry prompt). */
  error?: ReactNode;
  onRetry?: () => void;
  label?: string;
  skeleton?: ReactNode;
  className?: string;
}

export function AsyncBlock({
  state,
  children,
  empty,
  error,
  onRetry,
  label = "This section",
  skeleton,
  className,
}: AsyncBlockProps) {
  if (state === "loading") {
    return (
      <div className={cn("p-4", className)} aria-busy="true">
        {skeleton ?? (
          <div className="space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted/70" />
          </div>
        )}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={cn("p-4", className)} role="alert">
        <p className="text-xs text-error-clay">
          {error ??
            `Couldn't load ${label.toLowerCase()} — nothing here is a placeholder value.`}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-[11px] font-medium text-primary hover:text-primary/80"
          >
            Retry →
          </button>
        )}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className={cn("p-4", className)}>
        {empty ?? (
          <p className="text-xs text-muted-foreground">
            Nothing here yet — it will appear as soon as there&apos;s data.
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
