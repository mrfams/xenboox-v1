"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  FileCheck,
  Inbox,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAttentionSignals } from "@/lib/hooks/use-attention-signals";

// ─── Attention Dock ──────────────────────────────────────────────────────────
//
// PRODUCT DECISION — PM Research Summary (Aug 2026)
//
// Research: 6 sources fanned out (Cursor, Devin, Claude/Anthropic, ChatGPT,
// Linear, Foundey/Eleken notification-UX studies).
//
// Findings:
// • Linear: Inbox is the notification center. No global banner. Bell + G+I
//   shortcut, snooze, grouping by file/issue. Banner = notification debt.
// • Cursor: silent macOS banners (visual-only) + in-app chime. Agent shows
//   "needs approval" as OS notification + terminal review, not destructive
//   strip. v1.5 changelog: "OS notifications when agent run finishes or
//   input is required."
// • ChatGPT: Activity view via sidebar bell, Work/Chat/Pinned filters,
//   floating pet states (Running/Needs input/Ready/Blocked). No banner.
// • Anthropic HITL guides: scoped approval gates before side effects,
//   async-friendly queues, evidence + control (not just Approve button),
//   interrupt_before on high-risk nodes, HMAC-locked payloads.
// • Foundey/Eleken: 3 types — Informational → quiet (badge/inbox), Action
//   required non-urgent → inbox entry, Action required urgent → modal/banner.
//   Using high-urgency banner for non-urgent trains users to ignore.
//   "Send only for events users care about. Match urgency to channel."
// • Heed: Slack/email bury approvals. Real systems use webhook → ack with
//   identity+timestamp+programmatic resume.
//
// Decision: RETIRE destructive global alert pattern. The Activity Hub IS the
// inbox (Linear: Inbox, ChatGPT: Activity view). The banner becomes a
// Cursor/Linear-inspired Attention Dock — a minimal, border-b, typographic
// strip, not a rounded destructive alert. It surfaces queue depth without
// interrupting every surface.
//
// Why this shape:
// • Devin/Cursor aesthetic: monochrome, editorial, flat, tabular-nums,
//   border-border/40, bg-muted/20 icon, tracking-tight titles.
// • Linear affordance: "Review" → Activity Hub (deep link via topSurface),
//   dismiss per session, re-show on new count (sessionStorage).
// • AI-native: AI proposes, human decides in dedicated queue. No banner debt.
//
// Success metrics: click-through to Activity Hub, dismiss rate, time-to-
// decision, not banner visibility.
// ────────────────────────────────────────────────────────────────────────────

type BannerTone = "action" | "info";

export function AttentionBanner() {
  const { byKey, totals } = useAttentionSignals();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const key = "attention-banner-dismissed";
    const val = sessionStorage.getItem(key);
    if (val === "true") setDismissed(true);
  }, []);

  useEffect(() => {
    if (totals.action > 0 || totals.new > 0) {
      setDismissed(false);
      sessionStorage.removeItem("attention-banner-dismissed");
    }
  }, [totals.action, totals.new]);

  const hasAction = totals.action > 0;
  const hasNew = totals.new > 0;
  if (!hasAction && !hasNew) return null;
  if (dismissed) return null;

  const tone: BannerTone = hasAction ? "action" : "info";
  const count = tone === "action" ? totals.action : totals.new;

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

  // Build compact meta — Cursor/Linear: tabular-nums, · separators, no pill spam
  const hubAction = byKey["activity-hub"];
  const opsAction = byKey["operations"];
  const details: { label: string; count: number; icon: typeof Bell }[] = [];

  if (totals.action > 0) {
    if (hubAction.count > 0) {
      details.push({
        label: hubAction.count === 1 ? "needs decision" : "need decisions",
        count: hubAction.count,
        icon: FileCheck,
      });
    }
    if (opsAction.count > 0) {
      details.push({
        label: opsAction.count === 1 ? "overdue" : "overdue",
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
      role="status"
      aria-live="polite"
      aria-label={
        tone === "action"
          ? `${count} items need attention`
          : `${count} new updates`
      }
      className="border-b border-border/40 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Left: icon + title + meta — Linear/Cursor dense row */}
        <div className="flex min-w-0 items-center gap-3">
          {/* Icon — editorial, not destructive. 28px rounded-md, muted */}
          <div
            className={cn(
              "hidden h-7 w-7 shrink-0 items-center justify-center rounded-md border sm:flex",
              tone === "action"
                ? "border-amber-500/20 bg-amber-500/[0.08] text-amber-600 dark:text-amber-500"
                : "border-border/50 bg-muted/30 text-muted-foreground",
            )}
            aria-hidden="true"
          >
            {tone === "action" ? (
              <Inbox className="h-3.5 w-3.5" />
            ) : (
              <Bell className="h-3.5 w-3.5" />
            )}
          </div>

          <div className="min-w-0">
            {/* Title + count badge */}
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-medium leading-none tracking-tight text-foreground">
                {tone === "action"
                  ? `${count} ${count === 1 ? "item needs" : "items need"} your attention`
                  : `${count} ${count === 1 ? "new update" : "new updates"}`}
              </p>
              <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums leading-none text-muted-foreground">
                {count}
              </span>
              <span className="hidden items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60 sm:inline-flex">
                <span
                  className="h-1 w-1 rounded-full bg-border"
                  aria-hidden="true"
                />
                {surfaceLabel}
              </span>
            </div>

            {/* Meta — tabular-nums, dot separators, Cursor/Linear style */}
            {details.length > 0 && (
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-none text-muted-foreground">
                {details.map((d, i) => (
                  <span
                    key={d.label}
                    className="inline-flex items-center gap-1"
                  >
                    {i > 0 && (
                      <span
                        className="h-1 w-1 rounded-full bg-border"
                        aria-hidden="true"
                      />
                    )}
                    <d.icon
                      className="h-3 w-3 text-muted-foreground/60"
                      aria-hidden="true"
                    />
                    <span className="font-mono text-[11px] tabular-nums text-foreground/80">
                      {d.count}
                    </span>
                    <span className="text-[11px]">{d.label}</span>
                  </span>
                ))}
                <span className="hidden items-center gap-2 sm:inline-flex">
                  <span
                    className="h-1 w-1 rounded-full bg-border"
                    aria-hidden="true"
                  />
                  <span className="text-[11px] text-muted-foreground">
                    in {surfaceLabel}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: actions — Devin/Cursor: primary filled + ghost, compact */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href={surfaceHref}
            className="inline-flex items-center gap-1 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium leading-none text-background shadow-sm transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Review
            <ChevronRight className="h-3 w-3 opacity-70" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
