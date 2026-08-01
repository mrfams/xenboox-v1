"use client";

import React from "react";
import { useState } from "react";
import {
  Network,
  PlayCircle,
  Landmark,
  Link2,
  Shuffle,
  Globe,
  BarChart3,
  CheckCircle2,
  Activity,
  Building2,
  AlertTriangle,
  ChevronDown,
  ListChecks,
  CalendarDays,
  FolderOpen,
  Layers,
  Lock,
  FileSearch,
  XCircle,
  Scale,
  ShieldCheck,
  Timer,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type ConsolidationState =
  | "CONSOLIDATION_REQUESTED"
  | "PULLING_SUBSIDIARY_FINANCIALS"
  | "IDENTIFYING_INTERCOMPANY_TXNS"
  | "ELIMINATING"
  | "CONVERTING_CURRENCY"
  | "AGGREGATING"
  | "CONSOLIDATED_REPORT_READY";

export type ConsolidationFlag =
  | "NOT_CLOSED"
  | "UNMATCHED_IC"
  | "MISMATCHED_AMOUNT";

export interface ConsolidationTransition {
  state: string;
  timestamp: string;
  detail: string;
}

export interface ConsolidationLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showFlag?: ConsolidationFlag | false;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: ConsolidationState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "CONSOLIDATION_REQUESTED",
    label: "CONSOLIDATION_REQUESTED",
    description: "Building consolidated view — Controller Agent initiates",
    icon: PlayCircle,
  },
  {
    id: "PULLING_SUBSIDIARY_FINANCIALS",
    label: "PULLING_SUBSIDIARY_FINANCIALS",
    description: "Fatima Logistics Ltd — pulled ✓",
    icon: Landmark,
  },
  {
    id: "IDENTIFYING_INTERCOMPANY_TXNS",
    label: "IDENTIFYING_INTERCOMPANY_TXNS",
    description: "Found 2 inter-company transactions",
    icon: Link2,
  },
  {
    id: "ELIMINATING",
    label: "ELIMINATING",
    description:
      "Eliminated: $5,000 inter-company loan, Fatima Holdings → Fatima Logistics",
    icon: Shuffle,
  },
  {
    id: "CONVERTING_CURRENCY",
    label: "CONVERTING_CURRENCY",
    description: "Fatima Logistics Ltd: 3,350,000 GMD → $61,000 USD @ 54.85",
    icon: Globe,
  },
  {
    id: "AGGREGATING",
    label: "AGGREGATING",
    description: "Group total builds from visible subsidiary components",
    icon: BarChart3,
  },
  {
    id: "CONSOLIDATED_REPORT_READY",
    label: "CONSOLIDATED_REPORT_READY",
    description:
      "P&L, balance sheet, cash flow — each line traceable to subsidiary source",
    icon: CheckCircle2,
  },
];

const SUBSIDIARIES = [
  { name: "Fatima Holdings Ltd", meta: "GMD · 100% owned · full" },
  { name: "Fatima Logistics Ltd", meta: "GMD · 100% owned · full" },
  { name: "Fatima Foods Ltd", meta: "GMD · 60% owned · full · minority" },
];

const IC_MATCHES = [
  {
    ref: "IC-1",
    desc: "$5,000 management fee — Fatima Holdings ↔ Fatima Logistics",
    type: "Exact Reference — no score",
  },
  {
    ref: "IC-2",
    desc: "$2,400 inter-company loan — Fatima Holdings ↔ Fatima Logistics",
    type: "Fuzzy — confirm basis",
  },
];

const ELIMINATIONS = [
  {
    id: "elim-1",
    title:
      "Eliminated: $5,000 inter-company management fee, Fatima Holdings → Fatima Logistics",
    type: "ic_revenue_expense",
    sources: [
      "Fatima Holdings expense #JE-IC-101",
      "Fatima Logistics revenue #JE-IC-102",
    ],
  },
  {
    id: "elim-2",
    title:
      "Eliminated: $2,400 inter-company loan, Fatima Holdings → Fatima Logistics",
    type: "ic_receivable_payable",
    sources: [
      "Fatima Holdings receivable #JE-IC-203",
      "Fatima Logistics payable #JE-IC-204",
    ],
  },
];

const FX_CONVERSIONS = [
  {
    name: "Fatima Holdings Ltd",
    line: "Fatima Holdings Ltd — GMD (parent currency) · no conversion",
    rate: undefined as string | undefined,
  },
  {
    name: "Fatima Logistics Ltd",
    line: "Fatima Logistics Ltd — 3,350,000 GMD → $61,000 USD @ 54.85",
    rate: "rate date: Jun 30, 2026",
  },
  {
    name: "Fatima Foods Ltd",
    line: "Fatima Foods Ltd — 1,708,000 GMD → $31,200 USD @ 54.85",
    rate: "rate date: Jun 30, 2026",
  },
];

const REVENUE_BREAKDOWN = [
  { label: "Group Total", value: "$184,200", total: true },
  { label: "Fatima Holdings Ltd — $92,000", value: null, total: false },
  {
    label:
      "Fatima Logistics Ltd — $61,000 (converted from 3,350,000 GMD @ 54.85)",
    value: null,
    total: false,
  },
  {
    label: "Fatima Foods Ltd — $31,200 (converted from 1,708,000 GMD @ 54.85)",
    value: null,
    total: false,
  },
];

const AUDIT_TRAIL: ConsolidationTransition[] = [
  {
    state: "SUBSIDIARY_PULL",
    timestamp: "09:41:02.118",
    detail: "Fatima Holdings Ltd — trial balance pulled, period Q2 2026 closed",
  },
  {
    state: "SUBSIDIARY_PULL",
    timestamp: "09:41:05.402",
    detail:
      "Fatima Logistics Ltd — trial balance pulled, period Q2 2026 closed",
  },
  {
    state: "SUBSIDIARY_PULL",
    timestamp: "09:41:08.231",
    detail: "Fatima Foods Ltd — trial balance pulled, period Q2 2026 closed",
  },
  {
    state: "IC_IDENTIFICATION",
    timestamp: "09:41:12.050",
    detail: "2 IC transactions: IC-1 exact reference, IC-2 fuzzy (88%)",
  },
  {
    state: "ELIMINATION",
    timestamp: "09:41:15.876",
    detail: "$5,000 management fee — sources JE-IC-101 ↔ JE-IC-102",
  },
  {
    state: "ELIMINATION",
    timestamp: "09:41:17.310",
    detail: "$2,400 loan — sources JE-IC-203 ↔ JE-IC-204",
  },
  {
    state: "FX_CONVERSION",
    timestamp: "09:41:20.944",
    detail: "3,350,000 GMD @ 54.85 (Jun 30, 2026) → $61,000",
  },
  {
    state: "FX_CONVERSION",
    timestamp: "09:41:23.501",
    detail: "1,708,000 GMD @ 54.85 (Jun 30, 2026) → $31,200",
  },
  {
    state: "AGGREGATION",
    timestamp: "09:41:26.113",
    detail: "Group revenue $184,200 — 3 subsidiaries, 2 eliminations",
  },
];

const STEPS = [
  {
    title: "Pull Each Subsidiary's Trial Balance",
    detail:
      "Input: entity_id per subsidiary. Output: per-entity trial balance from each subsidiary's Ledger Agent data. No confidence score — direct pull, not inferred.",
  },
  {
    title: "Identify Inter-Company Transactions",
    detail:
      "Input: subsidiary financials. Output: matched pairs — a payable in one entity matching a receivable in another. Confidence only on fuzzy matches; exact reference matches carry none.",
  },
  {
    title: "Eliminate Each Identified Pair",
    detail:
      "Input: confirmed pairs. Output: elimination entry per pair with both source transactions cited. No confidence score once identification is confirmed — never a bulk 'eliminations: $X' figure.",
  },
  {
    title: "Convert Each Subsidiary's Currency",
    detail:
      "Input: subsidiary currency, parent currency, rate date. Output: converted figure + exact rate used shown. No confidence score — same auditable FX mechanism as PRD §12.",
  },
  {
    title: "Aggregate",
    detail:
      "Input: eliminated, converted subsidiary figures. Output: consolidated totals summed from visible subsidiary components. No confidence score — arithmetic.",
  },
];

const CONSTRAINTS = [
  { label: "Per-Subsidiary Decomposition", icon: Layers },
  { label: "Eliminations Per-Pair", icon: Shuffle },
  { label: "FX Rate Cited", icon: Globe },
  { label: "No Silent Netting", icon: Scale },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: ConsolidationState): string {
  switch (state) {
    case "CONSOLIDATION_REQUESTED":
    case "PULLING_SUBSIDIARY_FINANCIALS":
    case "IDENTIFYING_INTERCOMPANY_TXNS":
    case "ELIMINATING":
    case "CONVERTING_CURRENCY":
    case "AGGREGATING":
      return "text-signal-indigo";
    case "CONSOLIDATED_REPORT_READY":
      return "text-balanced-green";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function LayerTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-2 py-0.5 text-[9px] font-semibold text-balanced-green">
      Layer 1 — {label}
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
  tone: "amber" | "red" | "green" | "indigo";
  children: React.ReactNode;
}) {
  const toneClasses =
    tone === "amber"
      ? "border-attention-amber/30 bg-attention-amber/5"
      : tone === "red"
        ? "border-error-clay/30 bg-error-clay/5"
        : tone === "green"
          ? "border-balanced-green/30 bg-balanced-green/5"
          : "border-signal-indigo/30 bg-signal-indigo/5";
  const iconClasses =
    tone === "amber"
      ? "bg-attention-amber/10 text-attention-amber"
      : tone === "red"
        ? "bg-error-clay/10 text-error-clay"
        : tone === "green"
          ? "bg-balanced-green/10 text-balanced-green"
          : "bg-signal-indigo/10 text-signal-indigo";
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
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <div className="mt-3 space-y-2 text-xs text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function ConsolidationLiveness({
  className,
  showEmptyState,
  showFlag,
}: ConsolidationLivenessProps) {
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Empty state ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card p-6", className)}>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <FolderOpen className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No consolidation in progress</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Consolidation shows the roll-up per subsidiary — eliminations, FX
            conversion, and aggregation are never collapsed into a single opaque
            group total. Nothing to show right now.
          </p>
        </div>
      </div>
    );
  }

  // ── Branch: Subsidiary period not closed (Spec §2/§6) ────────────────
  if (showFlag === "NOT_CLOSED") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <Lock className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Consolidation Held</h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §2/§6 — a subsidiary&apos;s period is not closed — shown as
                partial/draft, labeled explicitly
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Blocking
          </span>
        </div>
        <BranchCard
          icon={Lock}
          title="Fatima Foods Ltd — period Q2 2026 not yet closed"
          tone="amber"
        >
          <p>
            Shown as partial/draft, labeled explicitly — never silently
            completed as if the subsidiary were included. The pull step stops at
            the first subsidiary whose period isn&apos;t closed.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Blocking for full consolidated close — held until the
            subsidiary&apos;s period is closed.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Unmatched inter-company transaction (Spec §6) ────────────
  if (showFlag === "UNMATCHED_IC") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-error-clay/10">
              <FileSearch className="h-4 w-4 text-error-clay" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Unmatched Inter-Company Transaction
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §6 — flagged for Controller Agent, never guessed
              </p>
            </div>
          </div>
          <span className="rounded-full bg-error-clay/10 px-2 py-0.5 text-[9px] font-semibold text-error-clay">
            Blocking for that pair
          </span>
        </div>
        <BranchCard
          icon={FileSearch}
          title="An inter-company transaction has no counterpart in the other entity"
          tone="red"
        >
          <p>
            Inter-company transaction #IC-7 ($820, Fatima Foods → Fatima
            Holdings) has no counterpart in the other entity. Flagged for
            Controller Agent — not silently excluded, not eliminated on a guess.
            The pair stays visible until a counterpart is confirmed.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-error-clay" />
            Flagged to Controller Agent — blocking for that pair only.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Branch: Mismatched inter-company amounts (Spec §7) ───────────────
  if (showFlag === "MISMATCHED_AMOUNT") {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10">
              <XCircle className="h-4 w-4 text-attention-amber" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">
                Mismatched Inter-Company Amounts
              </h2>
              <p className="text-[10px] text-muted-foreground">
                Spec §7 — discrepancy requiring investigation, shown explicitly
              </p>
            </div>
          </div>
          <span className="rounded-full bg-attention-amber/10 px-2 py-0.5 text-[9px] font-semibold text-attention-amber">
            Flagged
          </span>
        </div>
        <BranchCard
          icon={XCircle}
          title="Inter-company amounts don't match across entities"
          tone="amber"
        >
          <p>
            One entity records $5,000, the other records $4,950 — $50 delta.
            Flagged as a discrepancy requiring investigation — never silently
            netted into a single number.
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[10px]">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            Flagged to Controller Agent — the delta is shown explicitly, never
            absorbed.
          </div>
        </BranchCard>
      </div>
    );
  }

  // ── Main view ────────────────────────────────────────────────────────

  const activeState: ConsolidationState = "ELIMINATING";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 rounded-xl border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-slate-700 to-indigo-600">
            <Network className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">
                Multi-Entity Consolidation
              </h2>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                Cross-cutting consolidation flow
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Consolidation is where errors are hardest to spot after the fact —
              an inter-company elimination silently applied wrong, or an FX
              conversion using the wrong rate, produces a plausible-looking but
              incorrect consolidated number. Every step of the roll-up is shown
              per subsidiary, not just the final group total.
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-attention-amber/10 px-2 py-0.5 text-[10px] font-semibold text-attention-amber">
            <Activity className="h-3 w-3 animate-pulse" />
            Consolidating — eliminating inter-company pairs
          </span>
          <span className="text-[9px] text-muted-foreground">
            Group: Xenboox Group
          </span>
        </div>
      </div>

      {/* Live status */}
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-lg border bg-accent/20 px-3 py-2 text-[10px] text-muted-foreground"
      >
        <Activity className="h-3 w-3 text-attention-amber animate-pulse" />
        Currently:{" "}
        <span className="font-semibold text-foreground">ELIMINATING</span> —
        Eliminated: $5,000 inter-company loan, Fatima Holdings → Fatima
        Logistics
      </div>

      {/* Pipeline */}
      <section
        aria-label="Consolidation Pipeline"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Consolidation State Machine
          </h3>
          <LayerTag label="deterministic roll-up" />
        </div>
        <ol className="space-y-1.5">
          {PIPELINE_STATES.map((stage, i) => {
            const isActive = stage.id === activeState;
            const isComplete =
              i < PIPELINE_STATES.findIndex((s) => s.id === activeState);
            const Icon = stage.icon;
            return (
              <li
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg border px-3 py-2",
                  isActive
                    ? "border-attention-amber/30 bg-attention-amber/5"
                    : isComplete
                      ? "border-border/60 bg-muted/30"
                      : "border-border/40 bg-card opacity-60",
                )}
              >
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    isActive
                      ? "bg-attention-amber/15"
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
                      <span className="rounded-full bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-semibold text-attention-amber">
                        ACTIVE
                      </span>
                    )}
                    {isComplete && (
                      <span className="rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[8px] font-semibold text-balanced-green">
                        COMPLETE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {stage.description}
                  </p>
                </div>
                {isComplete && (
                  <span className="text-[9px] text-muted-foreground/60">✓</span>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Subsidiary Financials (Spec §2/§3 step 1) */}
      <section
        aria-label="Subsidiary Financials"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Subsidiary Financials
          </h3>
          <LayerTag label="per-entity pulls" />
        </div>
        <div className="space-y-1.5">
          {SUBSIDIARIES.map((sub) => (
            <div
              key={sub.name}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-accent/10 px-3 py-2"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-[11px] font-semibold">{sub.name}</p>
                <p className="text-[10px] text-muted-foreground">{sub.meta}</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-balanced-green/10 px-1.5 py-0.5 text-[9px] font-semibold text-balanced-green">
                <CheckCircle2 className="h-2.5 w-2.5" />
                pulled ✓
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          No confidence score — direct pull from each subsidiary&apos;s own
          entity&apos;s Ledger Agent data. A subsidiary whose period isn&apos;t
          closed is flagged, not silently included.
        </p>
      </section>

      {/* Inter-Company Identification (Spec §3 step 2 — the one probabilistic step) */}
      <section
        aria-label="Inter-Company Identification"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Inter-Company Identification
          </h3>
          <span className="inline-flex items-center gap-1 rounded-full bg-signal-indigo/10 px-2 py-0.5 text-[9px] font-semibold text-signal-indigo">
            Layer 2 — one confidence score
          </span>
        </div>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5 text-signal-indigo" />
            <p className="text-[11px] font-semibold">
              Found 2 inter-company transactions
            </p>
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Confidence applies only to fuzzy matches (Spec §3 step 2) — exact
            reference matches carry none.
          </p>
        </div>
        <div className="mt-2 space-y-1.5">
          {IC_MATCHES.map((m) => (
            <div
              key={m.ref}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <Link2 className="h-3 w-3 shrink-0 text-signal-indigo" />
                <p className="text-[10px] font-medium">{m.desc}</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground">
                {m.type}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] font-medium text-muted-foreground">
              Inter-company match confidence
            </span>
            <span
              role="meter"
              aria-label="Inter-company match confidence"
              aria-valuenow={88}
              aria-valuemin={0}
              aria-valuemax={100}
              className="text-[10px] font-semibold text-signal-indigo"
            >
              88%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-signal-indigo"
              style={{ width: "88%" }}
            />
          </div>
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            Aggregate match confidence — 1 of 2 matches was fuzzy (loan IC-2).
            Exact reference matches carry no confidence score (Spec §3 step 2).
          </p>
        </div>
      </section>

      {/* Elimination Entries (Spec §3 step 3 — per pair, both sources) */}
      <section
        aria-label="Elimination Entries"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Elimination Entries
          </h3>
          <LayerTag label="per-pair eliminations" />
        </div>
        <div className="space-y-2">
          {ELIMINATIONS.map((e) => (
            <div
              key={e.id}
              className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shuffle className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                  <p className="text-[11px] font-semibold">{e.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-purple-500/10 px-1.5 py-0.5 font-mono text-[8px] font-semibold text-purple-500">
                  {e.type}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {e.sources.map((src) => (
                  <span
                    key={src}
                    className="rounded-md border border-border/40 bg-card px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground"
                  >
                    {src}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Each elimination shown per pair with both underlying transactions —
          never a single bulk &apos;eliminations: $X&apos; figure (Spec §3 step
          3).
        </p>
      </section>

      {/* Currency Conversion (Spec §3 step 4 — per subsidiary, rate + date) */}
      <section
        aria-label="Currency Conversion"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Currency Conversion
          </h3>
          <LayerTag label="exact rate + date" />
        </div>
        <div className="space-y-1.5">
          {FX_CONVERSIONS.map((fx) => (
            <div
              key={fx.name}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
            >
              <Globe className="h-3.5 w-3.5 shrink-0 text-signal-indigo" />
              <div className="flex-1">
                <p className="text-[11px] font-semibold">{fx.line}</p>
                {fx.rate && (
                  <p className="text-[10px] text-muted-foreground">{fx.rate}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Same auditable FX mechanism as PRD §12 — exact rate and date shown per
          subsidiary.
        </p>
      </section>

      {/* Consolidated Revenue Breakdown (Spec §4 — group total + per-subsidiary) */}
      <section
        aria-label="Consolidated Revenue"
        className="rounded-xl border bg-card p-4"
      >
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Consolidated Revenue
          </h3>
          <LayerTag label="decomposable total" />
        </div>
        <div className="space-y-1.5">
          {REVENUE_BREAKDOWN.map((row) => (
            <div
              key={row.label}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2",
                row.total
                  ? "border-primary/20 bg-primary/5"
                  : "border-border/50 bg-muted/20",
              )}
            >
              <p
                className={cn(
                  "text-[11px]",
                  row.total ? "font-semibold" : "font-medium",
                )}
              >
                {row.label}
              </p>
              {row.value && (
                <p className="text-sm font-bold text-foreground">{row.value}</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Group total builds from visible subsidiary components — each line
          traceable to its subsidiary source.
        </p>
      </section>

      {/* Transparency Rule (Spec §3 critical rule) */}
      <section
        aria-label="Transparency Rule"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Transparency Rule
        </h3>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5 text-[10px] text-muted-foreground">
          <p>
            Eliminations and currency conversions must always be shown per
            subsidiary, never collapsed into the final consolidated number with
            no visible path back to source.
          </p>
          <p className="mt-1.5">
            A group total that can&apos;t be decomposed back into its subsidiary
            components isn&apos;t verifiable — which defeats the purpose of
            showing this as agent work at all.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
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
      </section>

      {/* Why */}
      <section aria-label="Why" className="rounded-xl border bg-card p-4">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Why
        </h3>
        <div className="rounded-lg border border-border/50 bg-accent/10 px-3 py-2.5 text-[10px] text-muted-foreground">
          <p>
            Consolidated revenue: $184,200. Fatima Holdings Ltd $92,000 + Fatima
            Logistics Ltd $61,000 (converted from 3,350,000 GMD @ 54.85) +
            Fatima Foods Ltd $31,200. Eliminated: $5,000 inter-company
            management fee between Holdings and Logistics.
          </p>
        </div>
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
                  condition: "A subsidiary's period not yet closed",
                  esc: "Controller Agent, human",
                  note: "Consolidation held or shown as partial/draft, labeled explicitly",
                  blocking: "Blocking for full consolidated close",
                },
                {
                  condition:
                    "Inter-company transaction can't be matched to a counterpart in the other entity",
                  esc: "Controller Agent",
                  note: "Flagged, not silently excluded or silently eliminated on a guess",
                  blocking: "Blocking for that pair",
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
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium",
                        row.blocking.startsWith("Blocking")
                          ? "bg-error-clay/10 text-error-clay"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
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
            <CalendarDays className="h-3.5 w-3.5 text-signal-indigo" />
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

      {/* Audit Trail */}
      <section aria-label="Audit Trail" className="rounded-xl border bg-card">
        <button
          onClick={() => setAuditOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-[11px] font-semibold">
            <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
            Audit Trail — Every Step
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
                {AUDIT_TRAIL.map((entry, i) => (
                  <tr
                    key={i}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground/70">
                      {entry.timestamp}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                        {entry.state}
                      </span>
                    </td>
                    <td className="px-4 py-2 font-mono text-[9px] text-muted-foreground">
                      {entry.detail}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Cross-Agent Chain */}
      <section
        aria-label="Cross-Agent Chain"
        className="rounded-xl border bg-card p-4"
      >
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          Cross-Agent Chain
        </h3>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
          {[
            "Controller Agent",
            "Ledger Agent (per subsidiary)",
            "Reporting Agent",
          ].map((agent, i) => (
            <span key={agent} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "rounded-full px-2 py-1",
                  agent === "Controller Agent"
                    ? "bg-primary/10 font-semibold text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {agent}
              </span>
              {i < 2 && (
                <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
              )}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Controller Agent orchestrates the consolidation — pulling each
          subsidiary&apos;s trial balance from its own entity&apos;s Ledger
          Agent data, then feeding the consolidated report delivery.
          Eliminations live only in the consolidation layer — never written to
          any subsidiary&apos;s entity-level ledger.
        </p>
      </section>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border/40 bg-accent/10 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <ShieldCheck className="h-3 w-3 text-balanced-green" />
          Layer 1 — deterministic: subsidiary pulls, per-pair eliminations, FX
          conversions, aggregation — arithmetic and structural, never judgment
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground/70">
          <Timer className="h-3 w-3 text-signal-indigo" />
          Layer 2 — one probabilistic score: inter-company match confidence
          (88%) — exact reference matches carry no confidence score
        </span>
      </div>
    </div>
  );
}
