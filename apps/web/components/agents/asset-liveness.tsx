"use client";

import React from "react";
import { useState } from "react";
import {
  Boxes,
  Package,
  Tag,
  CalendarDays,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  Activity,
  ChevronDown,
  Building2,
  ArrowRight,
  Eye,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Wallet,
  FileWarning,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type AssetState =
  | "ASSET_REGISTERED"
  | "CLASSIFIED"
  | "DEPRECIATION_SCHEDULE_SET"
  | "DEPRECIATION_CALCULATED"
  | "POSTED"
  | "VERIFICATION_DUE_CHECK"
  | "DISPOSAL_FLAGGED";

export interface ScheduleRow {
  period: string;
  amount: number;
  balance: number;
  current?: boolean;
}

export interface AssetLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showDisposal?: boolean;
  showAmbiguousClass?: boolean;
  showIncomplete?: boolean;
  showPosted?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: AssetState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "ASSET_REGISTERED",
    label: "ASSET_REGISTERED",
    description: "Recording cost, location, responsible person",
    icon: Package,
  },
  {
    id: "CLASSIFIED",
    label: "CLASSIFIED",
    description: "Assigning asset class, useful life, method",
    icon: Tag,
  },
  {
    id: "DEPRECIATION_SCHEDULE_SET",
    label: "DEPRECIATION_SCHEDULE_SET",
    description: "Computing full schedule across useful life",
    icon: CalendarDays,
  },
  {
    id: "DEPRECIATION_CALCULATED",
    label: "DEPRECIATION_CALCULATED",
    description: "Running this period's calculation — formula shown",
    icon: Calculator,
  },
  {
    id: "POSTED",
    label: "POSTED",
    description: "Handed to Ledger Agent",
    icon: CheckCircle2,
  },
  {
    id: "VERIFICATION_DUE_CHECK",
    label: "VERIFICATION_DUE_CHECK",
    description: "Checking against verification schedule",
    icon: ClipboardCheck,
  },
];

const COST = 12000;
const SALVAGE = 1200;
const USEFUL_LIFE_YEARS = 5;
const ANNUAL_DEPRECIATION = (COST - SALVAGE) / USEFUL_LIFE_YEARS; // 2160
const MONTHLY_DEPRECIATION = ANNUAL_DEPRECIATION / 12; // 180

const SCHEDULE: ScheduleRow[] = [
  { period: "Q1 2026", amount: 540, balance: 540 },
  { period: "Q2 2026", amount: 540, balance: 1080, current: true },
  { period: "Q3 2026", amount: 540, balance: 1620 },
  { period: "Q4 2026", amount: 540, balance: 2160 },
  { period: "Q1 2027", amount: 540, balance: 2700 },
  { period: "Q2 2027", amount: 540, balance: 3240 },
  { period: "Q3 2027", amount: 540, balance: 3780 },
  { period: "Q4 2027", amount: 540, balance: 4320 },
];

const STEPS = [
  {
    title: "Register Asset",
    detail:
      "Input: cost, date, location, responsible person. Output: asset record. No confidence score — direct entry, not inferred.",
  },
  {
    title: "Classify Asset",
    detail:
      "Input: description/category. Output: asset class, useful life, method. Confidence score IF auto-classified from description; none if user-selected.",
  },
  {
    title: "Build Depreciation Schedule",
    detail:
      "Input: cost, salvage value, useful life, method. Output: full period-by-period schedule. No confidence score — deterministic formula.",
  },
  {
    title: "Calculate This Period's Depreciation",
    detail:
      "Input: schedule + current period. Output: this period's amount WITH the formula shown explicitly. No confidence score — arithmetic, not judgment.",
  },
  {
    title: "Post to Ledger Agent",
    detail:
      "Structural handoff — depreciation journal entry handed to Ledger Agent each period. No confidence score.",
  },
  {
    title: "Check Verification Due Date",
    detail:
      "Input: verification schedule. Output: due/not due. No confidence score — deterministic lookup against the schedule.",
  },
  {
    title: "Flag Disposal Candidates",
    detail:
      "Fully depreciated or failed verification → explicit flag for review. Never auto-disposed — requires a human decision.",
  },
];

const CONSTRAINTS = [
  { label: "Formula Always Shown", icon: Calculator },
  { label: "Schedule Per-Period", icon: CalendarDays },
  { label: "Never Auto-Disposed", icon: AlertTriangle },
  { label: "Verification Tracked", icon: ClipboardCheck },
];

const ESCALATIONS = [
  {
    condition: "Asset classification ambiguous",
    to: "Controller Agent / human",
    effect: "Which asset class — confirm. Blocking for that asset.",
  },
  {
    condition: "Fully depreciated, still in use",
    to: "Controller Agent",
    effect: "Disposal review flag. Non-blocking.",
  },
  {
    condition: "Verification overdue",
    to: "Controller Agent, responsible person",
    effect: "Reminder escalates in urgency over time. Non-blocking.",
  },
];

const AUDIT_TRAIL = [
  {
    event: "Asset registered",
    detail: "Delivery Van FG-14 · GMD 12,000 · Field Office",
    conf: "—",
  },
  {
    event: "Classification",
    detail: "Motor Vehicles · straight-line · 5-year life",
    conf: "88% auto",
  },
  {
    event: "Schedule set",
    detail: "20 periods computed · Q1 2026 – Q4 2030",
    conf: "—",
  },
  {
    event: "Depreciation Q2 2026",
    detail: "GMD 540.00 · formula (12,000 − 1,200) ÷ 5",
    conf: "—",
  },
  { event: "Posted to Ledger", detail: "JE-2026-0341 · Q2 2026", conf: "—" },
  {
    event: "Verification check",
    detail: "due Jul 15 2026 · not yet due",
    conf: "—",
  },
  { event: "Disposal flag", detail: "not triggered", conf: "—" },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GMD ${amount.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getStateColor(state: AssetState): string {
  switch (state) {
    case "POSTED":
      return "text-balanced-green";
    case "DISPOSAL_FLAGGED":
      return "text-attention-amber";
    default:
      return "text-signal-indigo";
  }
}

function getStateBg(state: AssetState): string {
  switch (state) {
    case "POSTED":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "DISPOSAL_FLAGGED":
      return "bg-attention-amber/5 border-attention-amber/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: AssetState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
        getStateColor(state),
        getStateBg(state),
      )}
    >
      {state}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function AssetLiveness({
  className,
  showEmptyState = false,
  showDisposal = false,
  showAmbiguousClass = false,
  showIncomplete = false,
  showPosted = false,
}: AssetLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
          <Boxes className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Asset Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Depreciation — register to disposal
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-md border border-signal-indigo/20 bg-signal-indigo/5 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
          Live
        </span>
        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          FG-14 · Q2 2026
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2">
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
        Layer 1 — deterministic: register, schedule formula, posting,
        verification
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-attention-amber" />
        Layer 2 — probabilistic: auto-classification from description
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
        <Sparkles className="h-3 w-3" />
        Formula always shown — never a bare number
      </span>
    </div>
  );

  // ── Empty State ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-6 text-center">
          <Boxes className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            No asset being processed
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Registered assets appear here with their depreciation formula and
            per-period schedule shown explicitly.
          </p>
        </div>
      </div>
    );
  }

  // ── Disposal Flagged Branch (Spec §3/§6 — never auto-disposed) ───────
  if (showDisposal) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Fully depreciated — review for disposal?
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Delivery Van FG-14 has reached the end of its 5-year useful
                life. Never auto-disposed — requires an explicit review decision
                before the asset record can close.
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-attention-amber">
                Non-blocking — escalated to Controller Agent for disposal
                review.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Ambiguous Classification Branch (Spec §6 — blocking) ─────────────
  if (showAmbiguousClass) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <Tag className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Which asset class — confirm
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                &quot;Delivery Van FG-14&quot; matched two classes (Motor
                Vehicles vs. Light Transport) at similar confidence. Escalated
                to Controller Agent. Blocking for that asset until confirmed.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Incomplete Record Branch (Spec §7) ───────────────────────────────
  if (showIncomplete) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Incomplete Asset Record
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Missing salvage value or useful life — cannot proceed to
                schedule-set. Flagged as incomplete record until the missing
                field is provided.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Posted State (terminal handoff) ──────────────────────────────────
  if (showPosted) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-balanced-green/30 bg-balanced-green/5 p-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-balanced-green" />
            <div>
              <p className="text-xs font-semibold text-balanced-green">
                Posted to Ledger Agent
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Q2 2026 depreciation (GMD 540.00) handed to Ledger Agent —
                awaiting Controller Agent review before month-end close
                confirmation.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Main Active View ─────────────────────────────────────────────────
  const activeIdx = 3; // DEPRECIATION_CALCULATED

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      <div className="p-4">{header}</div>

      <div className="border-t p-4 space-y-4">
        {/* Status Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              State
            </p>
            <StateBadge state="DEPRECIATION_CALCULATED" />
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Entity
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Building2 className="h-3 w-3 text-muted-foreground" />
              Xenboox HQ
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Asset
            </p>
            <p className="text-[10px] font-semibold">FG-14 · GMD 12,000</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Source
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Wallet className="h-3 w-3 text-muted-foreground" />
              Asset register
            </p>
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div
          role="region"
          aria-label="Asset State Machine"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            State Machine
          </p>
          <ol className="space-y-1.5">
            {PIPELINE_STATES.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === activeIdx;
              const isDone = idx < activeIdx;
              return (
                <li
                  key={s.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                    isActive
                      ? "border-signal-indigo/30 bg-signal-indigo/5"
                      : isDone
                        ? "border-balanced-green/20 bg-balanced-green/5"
                        : "border-border/50 bg-muted/20 opacity-70",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive
                        ? "text-signal-indigo"
                        : isDone
                          ? "text-balanced-green"
                          : "text-muted-foreground/50",
                    )}
                  />
                  <span
                    className={cn(
                      "text-[10px] font-semibold tracking-wide",
                      isActive
                        ? "text-signal-indigo"
                        : isDone
                          ? "text-balanced-green"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {s.label}
                  </span>
                  <span className="ml-auto text-[9px] text-muted-foreground/70">
                    {s.description}
                  </span>
                  {isActive && (
                    <Activity className="h-3 w-3 animate-pulse text-signal-indigo" />
                  )}
                  {isDone && (
                    <CheckCircle2 className="h-3 w-3 text-balanced-green" />
                  )}
                </li>
              );
            })}
          </ol>

          {/* Disposal Outcome Badge */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[9px] font-medium text-muted-foreground/60">
              Outcome:
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
                getStateColor("DISPOSAL_FLAGGED"),
                getStateBg("DISPOSAL_FLAGGED"),
              )}
            >
              DISPOSAL_FLAGGED
            </span>
          </div>
        </div>

        {/* Asset Register */}
        <div role="region" aria-label="Asset Register" className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Asset Register
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Asset
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Cost
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Depreciation
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2.5 py-1.5 text-[9px] font-medium">
                    Delivery Van FG-14
                  </td>
                  <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                    GMD 12,000.00
                  </td>
                  <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                    GMD 180/month
                  </td>
                  <td className="px-2.5 py-1.5 text-[9px] text-balanced-green">
                    Active
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Classification */}
        <div role="region" aria-label="Classification" className="space-y-1.5">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Classification
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
            <Tag className="h-3.5 w-3.5 text-signal-indigo" />
            <span className="text-[10px] font-semibold">
              Classified as Motor Vehicles — straight-line, 5-year life
            </span>
            <span
              role="meter"
              aria-label="Auto-classification confidence"
              aria-valuenow={88}
              aria-valuemin={0}
              aria-valuemax={100}
              className="ml-auto inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-1.5 py-0.5 text-[9px] font-bold text-signal-indigo"
            >
              88%
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/70">
            Auto-classified from description — confidence shown. User-selected
            classifications carry no score.
          </p>
        </div>

        {/* Depreciation Formula — the critical rule */}
        <div
          data-step="formula"
          role="region"
          aria-label="Depreciation Formula"
          className="rounded-lg border border-signal-indigo/20 bg-signal-indigo/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-signal-indigo">
            <Calculator className="h-3 w-3" />
            Current Period Depreciation — formula shown, never a bare number
          </p>
          <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
            Depreciation this period: (GMD 12,000 cost − GMD 1,200 salvage) ÷ 5
            years = GMD 2,160/year → GMD 180 this month. Straight-line method,
            per Motor Vehicles policy.
          </p>
          <p className="mt-1 text-[9px] text-muted-foreground/70">
            Deterministic arithmetic — no confidence score. The formula is the
            answer.
          </p>
        </div>

        {/* Depreciation Schedule — per-period */}
        <div
          role="region"
          aria-label="Depreciation Schedule"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Depreciation Schedule — one row per period, not a single computed
            field
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Period
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Depreciation
                  </th>
                  <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {SCHEDULE.map((row) => (
                  <tr
                    key={row.period}
                    className={cn(row.current && "bg-signal-indigo/10")}
                  >
                    <td
                      className={cn(
                        "px-2.5 py-1.5 text-[9px] font-medium",
                        row.current && "text-signal-indigo font-bold",
                      )}
                    >
                      {row.period}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                      {formatCurrency(row.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Verification Task List */}
        <div
          role="region"
          aria-label="Upcoming Verification"
          className="space-y-1.5"
        >
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <ClipboardCheck className="h-3 w-3" />
            Upcoming Verification
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
            <Clock className="h-3 w-3 text-attention-amber" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Physical verification due July 15, 2026 — responsible person: Awa
              Sillah
            </span>
          </div>
        </div>

        {/* Escalation & Human-in-the-Loop */}
        <div
          role="region"
          aria-label="Escalation & Human-in-the-Loop"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Escalation &amp; Human-in-the-Loop
          </p>
          <div className="overflow-hidden rounded-lg border">
            {ESCALATIONS.map((esc, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 px-2.5 py-2",
                  idx > 0 && "border-t border-border/50",
                )}
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                <div className="flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground">
                    {esc.condition}
                  </p>
                  <p className="text-[9px] text-muted-foreground/70">
                    → {esc.to}. {esc.effect}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works */}
        <div role="region" aria-label="How It Works" className="space-y-1.5">
          <button
            onClick={() => setShowSteps((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <Eye className="h-3 w-3 text-signal-indigo" />
              How It Works — Step-by-Step
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                showSteps && "rotate-180",
              )}
            />
          </button>
          {showSteps && (
            <div className="space-y-1.5">
              {STEPS.map((s, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2"
                >
                  <p className="text-[10px] font-semibold text-signal-indigo">
                    Step {idx + 1} — {s.title}
                  </p>
                  <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                    {s.detail}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Constraint Enforcement */}
        <div
          role="region"
          aria-label="Constraint Enforcement"
          className="space-y-1.5"
        >
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <ShieldAlert className="h-3 w-3" />
            Constraint Enforcement
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINTS.map((c) => (
              <span
                key={c.label}
                className="flex items-center gap-1 rounded-md border border-balanced-green/20 bg-balanced-green/5 px-1.5 py-0.5 text-[9px] font-medium text-balanced-green"
              >
                <c.icon className="h-3 w-3" />
                {c.label}
              </span>
            ))}
          </div>
        </div>

        {/* Audit Trail */}
        <div role="region" aria-label="Audit Trail" className="space-y-1.5">
          <button
            onClick={() => setShowAudit((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border bg-muted/30 px-2.5 py-2 text-left"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold">
              <ListChecks className="h-3 w-3 text-signal-indigo" />
              Audit Trail — Every Asset Event
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 text-muted-foreground transition-transform",
                showAudit && "rotate-180",
              )}
            />
          </button>
          {showAudit && (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Event
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Detail
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Confidence
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {AUDIT_TRAIL.map((row, idx) => (
                    <tr
                      key={idx}
                      className={cn(idx > 0 && "border-t border-border/50")}
                    >
                      <td className="px-2.5 py-1.5 text-[9px] font-medium">
                        {row.event}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.detail}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.conf}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cross-Agent Chain */}
        <div
          role="region"
          aria-label="Cross-Agent Chain"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Cross-Agent Chain
          </p>
          <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/20 px-2.5 py-2">
            <span className="text-[9px] font-medium text-muted-foreground">
              This agent (per period)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Ledger Agent (posting)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Controller Agent (review before month-end close)
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">{footer}</div>
    </div>
  );
}
