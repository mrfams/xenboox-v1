"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  FileCheck,
  Clock,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttentionSignals } from "@/lib/hooks/use-attention-signals";

// ─── Attention Banner ──────────────────────────────────────────────────────
//
// A prominent, dismissible banner that sits below the top nav and above
// page content. It makes it impossible to miss when something needs the
// user's attention — approvals, escalations, pending reviews.
//
// Two tones:
//   - "action" (destructive) — agent blocked on you, approval needed
//   - "info" (primary) — new results ready to view
//
// Dismissed per session via sessionStorage. Auto-hides when count is 0.

type BannerTone = "action" | "info";

export function AttentionBanner() {
  const { byKey, totals } = useAttentionSignals();
  const [dismissed, setDismissed] = useState(false);

  // Check sessionStorage on mount
  useEffect(() => {
    const key = "attention-banner-dismissed";
    const val = sessionStorage.getItem(key);
    if (val === "true") setDismissed(true);
  }, []);

  // Reset dismiss when counts change (new item arrives → show again)
  useEffect(() => {
    if (totals.action > 0 || totals.new > 0) {
      setDismissed(false);
      sessionStorage.removeItem("attention-banner-dismissed");
    }
  }, [totals.action, totals.new]);

  // Nothing pending → don't render
  const hasAction = totals.action > 0;
  const hasNew = totals.new > 0;
  if (!hasAction && !hasNew) return null;

  // Dismissed → don't render
  if (dismissed) return null;

  const tone: BannerTone = hasAction ? "action" : "info";
  const count = tone === "action" ? totals.action : totals.new;

  // Find the surface with the most items to link to
  const topSurface = Object.entries(byKey)
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => b[1].count - a[1].count)[0];

  const surfaceKey = topSurface?.[0] ?? "activity-hub";
  const surfaceHref =
    surfaceKey === "command-center"
      ? "/dashboard"
      : `/dashboard/${surfaceKey === "financial-pulse" ? "financial-pulse" : surfaceKey}`;

  const surfaceLabel =
    surfaceKey === "command-center"
      ? "Command Center"
      : surfaceKey === "financial-pulse"
        ? "Financial Pulse"
        : surfaceKey === "activity-hub"
          ? "Activity Hub"
          : surfaceKey === "operations"
            ? "Operations"
            : "Ledger";

  // Build detail items
  const details: { label: string; count: number; icon: typeof Bell }[] = [];

  if (totals.action > 0) {
    // Count activity-hub action items
    const hubAction = byKey["activity-hub"];
    if (hubAction.count > 0) {
      details.push({
        label:
          hubAction.count === 1 ? "needs your decision" : "need your decisions",
        count: hubAction.count,
        icon: FileCheck,
      });
    }

    // Count operations action items
    const opsAction = byKey["operations"];
    if (opsAction.count > 0) {
      details.push({
        label: opsAction.count === 1 ? "overdue item" : "overdue items",
        count: opsAction.count,
        icon: AlertTriangle,
      });
    }
  }

  if (totals.new > 0 && !hasAction) {
    const allNew = Object.values(byKey).filter(
      (v) => v.tone === "new" && v.count > 0,
    );
    const totalNew = allNew.reduce((s, v) => s + v.count, 0);
    if (totalNew > 0) {
      details.push({
        label: totalNew === 1 ? "new update" : "new updates",
        count: totalNew,
        icon: Bell,
      });
    }
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("attention-banner-dismissed", "true");
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "mx-3 mt-2 rounded-xl border px-4 py-3 sm:mx-4 sm:mt-3",
        tone === "action"
          ? "border-destructive/20 bg-destructive/5"
          : "border-primary/20 bg-primary/5",
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            tone === "action" ? "bg-destructive/10" : "bg-primary/10",
          )}
        >
          {tone === "action" ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Bell className="h-4 w-4 text-primary" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "text-sm font-semibold",
                tone === "action" ? "text-destructive" : "text-primary",
              )}
            >
              {tone === "action"
                ? `${count} item${count !== 1 ? "s" : ""} waiting for you`
                : `${count} new update${count !== 1 ? "s" : ""} ready`}
            </p>
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                tone === "action"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              {count}
            </span>
          </div>

          {/* Detail items */}
          {details.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
              {details.map((d) => (
                <span
                  key={d.label}
                  className="flex items-center gap-1 text-xs text-muted-foreground"
                >
                  <d.icon className="h-3 w-3" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{d.count}</span>{" "}
                  {d.label}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <Link
            href={surfaceHref}
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 text-xs font-medium transition-colors",
              tone === "action"
                ? "text-destructive hover:text-destructive/80"
                : "text-primary hover:text-primary/80",
            )}
          >
            Go to {surfaceLabel}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </Link>
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          className={cn(
            "shrink-0 rounded-lg p-1.5 transition-colors",
            tone === "action"
              ? "text-destructive/60 hover:bg-destructive/10 hover:text-destructive"
              : "text-primary/60 hover:bg-primary/10 hover:text-primary",
          )}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
