"use client";

import React from "react";
import { useState } from "react";
import {
  Radar,
  Search,
  Scale,
  Bell,
  Archive,
  Activity,
  ChevronDown,
  Eye,
  ListChecks,
  ArrowRight,
  Database,
  AlertTriangle,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type AnalyticsState =
  | "SCANNING"
  | "PATTERN_DETECTED"
  | "CLASSIFYING_SIGNIFICANCE"
  | "SURFACED"
  | "LOGGED_ONLY";

export interface StateTransition {
  state: AnalyticsState;
  timestamp: string;
  detail: string;
}

export interface AnalyticsLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showInsufficientData?: boolean;
  showFraudFlag?: boolean;
  showRunwayAlert?: boolean;
  showLoggedOnly?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: AnalyticsState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "SCANNING",
    label: "SCANNING",
    description:
      "Continuous background scan — monitoring transaction streams, trends, spending patterns",
    icon: Radar,
  },
  {
    id: "PATTERN_DETECTED",
    label: "PATTERN_DETECTED",
    description:
      "Statistically unusual pattern found — deviation from baseline",
    icon: Search,
  },
  {
    id: "CLASSIFYING_SIGNIFICANCE",
    label: "CLASSIFYING_SIGNIFICANCE",
    description:
      "Determining if worth surfacing — materiality, confidence, novelty",
    icon: Scale,
  },
  {
    id: "SURFACED",
    label: "SURFACED",
    description: "Insight card delivered proactively — not buried in a report",
    icon: Bell,
  },
  {
    id: "LOGGED_ONLY",
    label: "LOGGED_ONLY",
    description:
      "Fork — not significant enough to surface; recorded for trend history",
    icon: Archive,
  },
];

const TREND_DATA = [
  { month: "Feb", amount: "GMD 1,150.00" },
  { month: "Mar", amount: "GMD 1,180.00" },
  { month: "Apr", amount: "GMD 1,220.00" },
  { month: "May", amount: "GMD 1,245.00" },
  { month: "Jun", amount: "GMD 1,380.00" },
  { month: "Jul", amount: "GMD 1,680.00" },
];

const RUNWAY_BURN = [
  { month: "May", amount: "GMD 7,900.00" },
  { month: "Jun", amount: "GMD 8,100.00" },
  { month: "Jul", amount: "GMD 8,200.00" },
];

const AUDIT_TRAIL: StateTransition[] = [
  {
    state: "SCANNING",
    timestamp: "09:00:00.000",
    detail:
      "continuous scan started — monitoring transaction streams (entity Xenboox HQ)",
  },
  {
    state: "PATTERN_DETECTED",
    timestamp: "09:31:12.482",
    detail:
      "supplier spend Cloudline Ltd +40% vs 6-month baseline GMD 1,200.00 — deviation 87%",
  },
  {
    state: "CLASSIFYING_SIGNIFICANCE",
    timestamp: "09:31:12.510",
    detail: "materiality 40% > 25% threshold — significant → surface",
  },
  {
    state: "SURFACED",
    timestamp: "09:31:15.004",
    detail:
      "insight card surfaced to dashboard — timestamped, proactive, not batched",
  },
  {
    state: "LOGGED_ONLY",
    timestamp: "09:45:20.118",
    detail:
      "travel spend +9% — below 25% materiality — logged for trend history",
  },
  {
    state: "PATTERN_DETECTED",
    timestamp: "10:02:41.775",
    detail: "runway — burn GMD 8,200/mo, cash GMD 24,600 → ~3 months",
  },
  {
    state: "SURFACED",
    timestamp: "10:02:45.220",
    detail: "runway insight surfaced to dashboard — trajectory data cited",
  },
];

const STEPS = [
  {
    title: "Scan Continuously",
    detail:
      "Input: transaction stream + historical baseline. Output: candidate patterns. No confidence score — raw detection.",
  },
  {
    title: "Detect Deviation",
    detail:
      "Output: specific metric + how far from baseline. Confidence score attached — this is a statistical judgment.",
  },
  {
    title: "Classify Significance",
    detail:
      "Input: deviation size, materiality, confidence. Output: surface or log-only. No confidence score on the classification rule itself (deterministic threshold) — confidence inherited from detection.",
  },
  {
    title: "Surface with Specific Citation",
    detail:
      "Never a vague 'unusual activity detected' — always the specific number/pattern named, with its baseline cited.",
  },
];

const CONSTRAINTS = [
  { label: "Insights Cite Baselines", icon: Database },
  { label: "Never Vague", icon: Eye },
  { label: "Fraud Routed Immediately", icon: AlertTriangle },
  { label: "Deterministic Classification", icon: Scale },
  { label: "Read-Only Agent", icon: ShieldCheck },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateIcon(state: AnalyticsState): React.ElementType {
  switch (state) {
    case "SCANNING":
      return Radar;
    case "PATTERN_DETECTED":
      return Search;
    case "CLASSIFYING_SIGNIFICANCE":
      return Scale;
    case "SURFACED":
      return Bell;
    case "LOGGED_ONLY":
      return Archive;
  }
}

function getStateColor(state: AnalyticsState): string {
  switch (state) {
    case "SCANNING":
      return "text-muted-foreground/70";
    case "PATTERN_DETECTED":
      return "text-signal-indigo";
    case "CLASSIFYING_SIGNIFICANCE":
      return "text-signal-indigo";
    case "SURFACED":
      return "text-balanced-green";
    case "LOGGED_ONLY":
      return "text-muted-foreground/50";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function LayerTag({ layer, label }: { layer: "1" | "2"; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold",
        layer === "1"
          ? "bg-balanced-green/10 text-balanced-green"
          : "bg-signal-indigo/10 text-signal-indigo",
      )}
    >
      Layer {layer} — {label}
    </span>
  );
}

function BranchCard({
  icon: Icon,
  title,
  tone,
  children,
}: {
  icon: React.ElementType;
  title: string;
  tone: "amber" | "red" | "green";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-attention-amber/30 bg-attention-amber/5"
      : tone === "red"
        ? "border-error-clay/30 bg-error-clay/5"
        : "border-balanced-green/30 bg-balanced-green/5";
  const iconClasses =
    tone === "amber"
      ? "bg-attention-amber/10 text-attention-amber"
      : tone === "red"
        ? "bg-error-clay/10 text-error-clay"
        : "bg-balanced-green/10 text-balanced-green";
  return (
    <div className={cn("rounded-xl border p-4", toneClasses)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconClasses,
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs font-semibold">{title}</p>
        </div>
      </div>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function AnalyticsLiveness({
  className,
  showEmptyState,
  showInsufficientData,
  showFraudFlag,
  showRunwayAlert,
  showLoggedOnly,
}: AnalyticsLivenessProps) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [trendOpen, setTrendOpen] = useState(false);

  // ── Empty state ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card p-6", className)}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Radar className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No insights in history</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Analytics Agent scans continuously in the background — surfaced
            insights and logged-only patterns will appear here as they&apos;re
            found. Nothing noticed yet.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Insufficient history (Spec §7) ───────────────────────────
  if (showInsufficientData) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Database className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Not Enough History Yet</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — explicit, never a low-confidence insight as certain
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            No reliable baseline
          </span>
        </div>
        <BranchCard
          icon={Database}
          title="Insufficient historical data for a meaningful baseline"
          tone="amber"
        >
          <p>
            There is not enough history yet to detect trends reliably. This is
            stated explicitly rather than producing a low-confidence insight
            that would be presented as certain.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Detection continues — insights will surface once a meaningful
            baseline exists. Never guessed, never presented as certain.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Fraud pattern flag (Spec §6) ─────────────────────────────
  if (showFraudFlag) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <AlertTriangle className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Fraud Pattern Flagged</h2>
              <p className="text-[10px] text-muted-foreground">
                High Urgency — distinct from routine insight
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            HIGH URGENCY
          </span>
        </div>
        <BranchCard
          icon={AlertTriangle}
          title="Pattern: 3 identical withdrawals from 'Cash Ops' in 48 hours"
          tone="red"
        >
          <p>
            Deviation crosses the fraud-pattern threshold — surfaced with a
            distinct, higher-urgency visual treatment, never mixed in with
            routine insights. The specific pattern and its deviation from
            baseline are named, never a vague &quot;unusual activity
            detected.&quot;
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <ShieldCheck className="h-3 w-3 text-error-clay" />
            Routed simultaneously to Compliance Agent and human — immediately.
            Non-blocking but urgent.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Runway alert (Spec §6) ───────────────────────────────────
  if (showRunwayAlert) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <TrendingUp className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Cash Runway Alert</h2>
              <p className="text-[10px] text-muted-foreground">
                Non-blocking but urgent — proactive
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Below threshold
          </span>
        </div>
        <BranchCard
          icon={TrendingUp}
          title="Cash runway has fallen below the configured threshold"
          tone="amber"
        >
          <p>
            At current trajectory (avg burn GMD 8,200/month, cash on hand GMD
            24,600), runway has dropped below the 3-month configured threshold.
            Proactive alert — not buried in a report.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Escalated to CFO Agent and human — immediately. Non-blocking but
            urgent.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Browsing analytics history (logged-only view) ────────────
  if (showLoggedOnly) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              <Archive className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Analytics History</h2>
              <p className="text-[10px] text-muted-foreground">
                Logged-only patterns — visible only when you explicitly browse
              </p>
            </div>
          </div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
            Not pushed
          </span>
        </div>
        <BranchCard
          icon={Archive}
          title="Travel spend up 9% vs 6-month average"
          tone="green"
        >
          <p>
            Below the 25% materiality threshold — recorded for trend history,
            not pushed. Visible only when you explicitly browse analytics
            history. No confidence meter — the classification rule is
            deterministic.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <Archive className="h-3 w-3 text-muted-foreground" />
            Logged for trend history — surfaced if it crosses materiality in a
            future period.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: AnalyticsState = "SURFACED";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
            <Radar className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">Analytics Agent</h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Proactive — baseline-cited
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              This agent&apos;s value is proactively surfacing things nobody
              asked about — &quot;the AI noticed something.&quot; If the
              noticing happened silently in a batch job, the proactive insight
              differentiator would be invisible.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[10px] font-semibold text-balanced-green">
            <Activity className="h-3 w-3 animate-pulse" />
            Monitoring
          </span>
          <span className="text-[9px] text-muted-foreground">
            Entity: Xenboox HQ
          </span>
        </div>
      </div>

      {/* Live status */}
      <div
        role="status"
        data-live-status
        className="flex items-center gap-2 rounded-lg border bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground"
      >
        <Activity className="h-3 w-3 text-balanced-green animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">SURFACED</span> — I
        noticed: supplier spend up 40% vs 6-month average
      </div>

      {/* Pipeline */}
      <section
        aria-label="Analytics State Machine"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Analytics State Machine
          </h3>
          <LayerTag layer="1" label="deterministic lifecycle" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isFork = stage.id === "LOGGED_ONLY";
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  isActive
                    ? "border-balanced-green/30 bg-balanced-green/5"
                    : isComplete
                      ? "border-border/60 bg-muted/30"
                      : "border-border/40 bg-card opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-balanced-green/15"
                      : isComplete
                        ? "bg-balanced-green/10"
                        : "bg-muted",
                  )}
                >
                  {isActive ? (
                    <Activity
                      className={cn(
                        "h-3 w-3 animate-pulse",
                        getStateColor(stage.id),
                      )}
                    />
                  ) : (
                    <Icon className={cn("h-3 w-3", getStateColor(stage.id))} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold tabular-nums">
                      {stage.label}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        ACTIVE
                      </span>
                    )}
                    {isComplete && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        COMPLETE
                      </span>
                    )}
                    {isFork && (
                      <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
                        FORK
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Surfaced Insights — proactive cards */}
      <section
        aria-label="Surfaced Insights"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Surfaced Insights
          </h3>
          <LayerTag layer="2" label="deviation confidence" />
        </div>
        <p className="mb-3 text-[10px] text-muted-foreground">
          Insight cards appear proactively on dashboard/chat as they&apos;re
          found — timestamped, not batched only into month-end.
        </p>

        {/* Supplier spend deviation insight */}
        <div className="rounded-lg border border-balanced-green/30 bg-balanced-green/5 px-3 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Bell className="h-3.5 w-3.5 text-balanced-green" />
              <p className="text-[11px] font-semibold">I noticed:</p>
              <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                SURFACED
              </span>
            </div>
            <span className="text-[9px] text-muted-foreground">
              Surfaced 09:31 today — proactive, not batched
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Supplier spend with Cloudline Ltd is up 40% vs your 6-month average
            (GMD 1,200 → GMD 1,680) — flagged because it crosses your 25%
            materiality threshold.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <div
              role="meter"
              aria-label="Deviation detection confidence"
              aria-valuenow={87}
              aria-valuemin={0}
              aria-valuemax={100}
              className="flex h-5 w-24 items-center rounded-full bg-muted px-1"
            >
              <div
                className="h-3 rounded-full bg-signal-indigo"
                style={{ width: "87%" }}
              />
            </div>
            <span className="text-[9px] font-semibold text-signal-indigo">
              87% deviation detection confidence
            </span>
            <span className="text-[9px] text-muted-foreground">
              — statistical judgment, not certainty
            </span>
          </div>
          <button
            onClick={() => setTrendOpen((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-card px-2.5 py-1 text-[9px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Database className="h-2.5 w-2.5" />
            Show underlying trend data
            <ChevronDown
              className={cn(
                "h-2.5 w-2.5 transition-transform",
                trendOpen && "rotate-180",
              )}
            />
          </button>
          {trendOpen && (
            <div className="mt-2 space-y-1">
              {TREND_DATA.map((t) => (
                <div
                  key={t.month}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-[9px]"
                >
                  <span className="text-muted-foreground">{t.month}</span>
                  <span className="font-mono text-muted-foreground">
                    {t.amount}
                  </span>
                </div>
              ))}
              <div className="rounded-lg border border-border/50 bg-accent/10 px-2.5 py-1.5 text-[9px] text-muted-foreground">
                Baseline: 6-month average GMD 1,200.00 · ref BL-2026-07
              </div>
            </div>
          )}
        </div>

        {/* Runway insight */}
        <div
          role="region"
          aria-label="Runway Insight"
          className="mt-2 rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5 text-signal-indigo" />
            <p className="text-[11px] font-semibold">
              Runway: approximately 3 months
            </p>
            <span className="rounded-full bg-signal-indigo/10 px-1.5 py-0.5 text-[8px] font-semibold text-signal-indigo">
              SURFACED
            </span>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            At current trajectory (avg burn GMD 8,200/month, cash on hand GMD
            24,600), you have approximately 3 months of runway. Trajectory data
            below — the conclusion is never asserted without it.
          </p>
          <div className="mt-2 space-y-1">
            {RUNWAY_BURN.map((m) => (
              <div
                key={m.month}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-[9px]"
              >
                <span className="text-muted-foreground">Burn {m.month}</span>
                <span className="font-mono text-muted-foreground">
                  {m.amount}
                </span>
              </div>
            ))}
            <div className="rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-[9px]">
              <span className="text-muted-foreground">
                Cash on hand GMD 24,600.00 — runway = cash on hand ÷ avg burn —
                arithmetic, not inferred
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Logged-only insight */}
      <section
        aria-label="Logged-Only Insight"
        className="rounded-xl border bg-card p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Logged-Only Insight
          </h3>
          <LayerTag layer="1" label="recorded, not pushed" />
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5 opacity-75">
          <Archive className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">
              Travel spend up 9% vs 6-month average
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Below the 25% materiality threshold — recorded for trend history,
              not pushed. Visible only when you explicitly browse analytics
              history.
            </p>
          </div>
        </div>
      </section>

      {/* Status grid */}
      <section
        aria-label="Analytics Metadata"
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {[
          { label: "Status", value: "SURFACED" },
          { label: "Period", value: "Q2 2026" },
          { label: "Materiality Threshold", value: "25%" },
          { label: "Logged-Only", value: "1" },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border bg-card px-3 py-2">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/50">
              {item.label}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold">{item.value}</p>
          </div>
        ))}
      </section>

      {/* Escalation & Human-in-the-Loop */}
      <section
        aria-label="Escalation & Human-in-the-Loop"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Escalation &amp; Human-in-the-Loop
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b text-muted-foreground/60">
                <th className="py-1.5 pr-2 font-medium">Condition</th>
                <th className="py-1.5 pr-2 font-medium">Escalates to</th>
                <th className="py-1.5 pr-2 font-medium">What user sees</th>
                <th className="py-1.5 font-medium">Blocking?</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  condition: "Anomaly crosses fraud-pattern threshold",
                  esc: "Compliance Agent, human — immediately",
                  note: "High-urgency flag, distinct from routine insight",
                  blocking: "Non-blocking but urgent",
                },
                {
                  condition: "Cash runway falls below configured threshold",
                  esc: "CFO Agent, human",
                  note: "Proactive alert, not buried in report",
                  blocking: "Non-blocking but urgent",
                },
              ].map((row) => (
                <tr
                  key={row.condition}
                  className="border-b border-border/40 last:border-0"
                >
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.condition}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.esc}
                  </td>
                  <td className="py-1.5 pr-2 text-muted-foreground">
                    {row.note}
                  </td>
                  <td className="py-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-medium text-attention-amber">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {row.blocking}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How It Works */}
      <section aria-label="How It Works" className="rounded-xl border bg-card">
        <button
          onClick={() => setHowItWorksOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold">
            <Eye className="h-3.5 w-3.5 text-signal-indigo" />
            How It Works — Step-by-Step
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              howItWorksOpen && "rotate-180",
            )}
          />
        </button>
        {howItWorksOpen && (
          <div className="space-y-2 border-t px-4 py-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="flex gap-3 rounded-lg bg-muted/20 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-signal-indigo/10 text-[9px] font-bold text-signal-indigo">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[11px] font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Constraint Enforcement */}
      <section
        aria-label="Constraint Enforcement"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Constraint Enforcement
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {CONSTRAINTS.map((c) => (
            <span
              key={c.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] font-medium"
            >
              <c.icon className="h-3 w-3 text-balanced-green" />
              {c.label}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          The critical rule: every surfaced insight must cite its metric and
          baseline — never a vague &quot;unusual activity detected.&quot; Always
          the specific number/pattern named, with its baseline cited.
        </p>
      </section>

      {/* Audit Trail */}
      <section aria-label="Audit Trail" className="rounded-xl border bg-card">
        <button
          onClick={() => setAuditOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold">
            <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
            Audit Trail — Every Pattern Detected
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground transition-transform",
              auditOpen && "rotate-180",
            )}
          />
        </button>
        {auditOpen && (
          <div className="border-t">
            <table className="w-full text-left text-[10px]">
              <thead>
                <tr className="border-b text-muted-foreground/60">
                  <th className="px-4 py-2 font-medium">Timestamp</th>
                  <th className="px-4 py-2 font-medium">State</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {AUDIT_TRAIL.map((entry, i) => {
                  const Icon = getStateIcon(entry.state);
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground/70">
                        {entry.timestamp}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                            entry.state === "SURFACED"
                              ? "bg-balanced-green/10 text-balanced-green"
                              : entry.state === "LOGGED_ONLY"
                                ? "bg-muted text-muted-foreground"
                                : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-2.5 w-2.5" />
                          {entry.state}
                        </span>
                      </td>
                      <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground">
                        {entry.detail}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cross-Agent Dependencies */}
      <section
        aria-label="Cross-Agent Chain"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Cross-Agent Chain
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {[
            "All Modules",
            "Analytics Agent",
            "CFO Agent",
            "Compliance Agent",
            "Reporting Agent",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  agent === "Analytics Agent"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {agent}
              </span>
              {i < 4 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Reads across all modules — read-only — no write path to ledger (PRD
          §6.7 Layer 2). Feeds CFO Agent (strategic flags), Compliance Agent
          (fraud), Reporting Agent (FX/trend summaries).
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: scanning, classification threshold, surface
          routing
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Activity className="h-3 w-3 text-signal-indigo" />
          Layer 2 — probabilistic: deviation detection confidence (statistical
          judgment)
        </span>
      </div>
    </div>
  );
}
