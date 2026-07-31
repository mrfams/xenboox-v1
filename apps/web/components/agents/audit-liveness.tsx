"use client";

import React from "react";
import { useState } from "react";
import {
  Fingerprint,
  Scale,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ChevronDown,
  Building2,
  ArrowRight,
  Eye,
  ListChecks,
  ShieldAlert,
  ShieldQuestion,
  Package,
  Clock,
  FileSearch,
  LogOut,
  ScanSearch,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type AuditState =
  | "SAMPLING"
  | "COMPARING_AGAINST_GOLDEN_DATASET"
  | "LOGGED";

export type PackageState = "PACKAGE_REQUESTED" | "ASSEMBLING" | "DELIVERED";

export interface AuditLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showDeviation?: boolean;
  showFraud?: boolean;
  showLowCoverage?: boolean;
  showPackageDelivered?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const AUDIT_PIPELINE: Array<{
  id: AuditState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "SAMPLING",
    label: "SAMPLING",
    description: "Selecting transactions/agent decisions to sample this cycle",
    icon: ScanSearch,
  },
  {
    id: "COMPARING_AGAINST_GOLDEN_DATASET",
    label: "COMPARING_AGAINST_GOLDEN_DATASET",
    description: "Running comparison against known-correct cases",
    icon: Scale,
  },
  {
    id: "LOGGED",
    label: "LOGGED",
    description: "Result recorded — every clean or flagged outcome attributed",
    icon: LogOut,
  },
];

const PACKAGE_PIPELINE: Array<{
  id: PackageState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "PACKAGE_REQUESTED",
    label: "PACKAGE_REQUESTED",
    description: "External auditor / human requests package for a period",
    icon: Package,
  },
  {
    id: "ASSEMBLING",
    label: "ASSEMBLING",
    description: "Pulling schedules, vouchers, prior period comparisons",
    icon: FileSearch,
  },
  {
    id: "DELIVERED",
    label: "DELIVERED",
    description: "Package ready — auditor portal updated",
    icon: ShieldCheck,
  },
];

const STEPS = [
  {
    title: "Select Sample",
    detail:
      "Input: sampling rule (frequency, coverage target by module). Output: sample set. No confidence score — deterministic sampling policy.",
  },
  {
    title: "Compare Against Golden Dataset",
    detail:
      "Input: sample + golden dataset cases. Output: match/deviation per case, with the specific golden case cited. Confidence score on the comparison itself where the match isn't exact.",
  },
  {
    title: "Classify Deviation Severity",
    detail:
      "Output: informational / needs-review / material. No confidence score if rule-based severity bands, confidence if judged.",
  },
  {
    title: "Log Result",
    detail:
      "Every sample, comparison, and outcome logged with timestamp + golden dataset version. A clean result is still logged and attributable. No confidence score.",
  },
  {
    title: "Assemble Package",
    detail:
      "On demand: input period + auditor scope. Output: structured package with each section sourced and shown as pulled. No confidence score — structural assembly.",
  },
];

const CONSTRAINTS = [
  { label: "Clean Result Attributable", icon: LogOut },
  { label: "Golden Case Cited", icon: Scale },
  { label: "Read-Only Agent", icon: ShieldAlert },
  { label: "Honest Coverage", icon: ShieldQuestion },
];

const ESCALATIONS = [
  {
    condition: "Deviation found, material severity",
    to: "Compliance Agent, human",
    effect:
      "Explicit flag with golden case cited. Non-blocking to operations, blocking for that specific record's certainty.",
  },
  {
    condition: "Suspicious pattern suggesting fraud",
    to: "Compliance Agent, human, immediately",
    effect:
      "High-urgency flag, distinct visual treatment. Non-blocking but urgent.",
  },
  {
    condition: "External auditor requests package",
    to: "Compliance Agent (coordinates), auditor portal",
    effect: "Package assembly visible to requester. Non-blocking.",
  },
];

const AUDIT_TRAIL = [
  {
    sample: "AUD-2026-0182 · AP postings · 15 cases",
    result: "14 matched expected patterns",
    version: "v2.4",
  },
  {
    sample: "Deviation · invoice #4471",
    result: "Office Supplies vs golden case GD-0231 (IT Equipment)",
    version: "v2.4",
  },
  {
    sample: "Outcome",
    result: "DEVIATION_FLAGGED · flagged to Compliance Agent",
    version: "v2.4",
  },
  {
    sample: "Clean result",
    result: "logged + attributed to sample AUD-2026-0182",
    version: "v2.4",
  },
  {
    sample: "Package requested",
    result: "Q2 2026 · external auditor",
    version: "—",
  },
  {
    sample: "Package assembled",
    result: "Trial Balance · Vouchers · Prior Period Comparisons",
    version: "—",
  },
  { sample: "Delivered", result: "auditor portal updated", version: "—" },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: AuditState | PackageState): string {
  switch (state) {
    case "LOGGED":
    case "DELIVERED":
      return "text-balanced-green";
    case "SAMPLING":
    case "COMPARING_AGAINST_GOLDEN_DATASET":
    case "ASSEMBLING":
      return "text-signal-indigo";
    case "PACKAGE_REQUESTED":
      return "text-attention-amber";
  }
}

function getStateBg(state: AuditState | PackageState): string {
  switch (state) {
    case "LOGGED":
    case "DELIVERED":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "SAMPLING":
    case "COMPARING_AGAINST_GOLDEN_DATASET":
    case "ASSEMBLING":
      return "bg-signal-indigo/5 border-signal-indigo/20";
    case "PACKAGE_REQUESTED":
      return "bg-attention-amber/5 border-attention-amber/20";
  }
}

function StateBadge({ state }: { state: AuditState | PackageState }) {
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

export function AuditLiveness({
  className,
  showEmptyState = false,
  showDeviation = false,
  showFraud = false,
  showLowCoverage = false,
  showPackageDelivered = false,
}: AuditLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
          <Fingerprint className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Audit Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Audit — sampling to delivery
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-md border border-signal-indigo/20 bg-signal-indigo/5 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
          24/7
        </span>
        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          v2.4 · Q2 2026
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2">
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
        Layer 1 — deterministic: sampling policy, logging, package assembly
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-attention-amber" />
        Layer 2 — probabilistic: fuzzy comparison confidence
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
        <ShieldCheck className="h-3 w-3" />A clean result means it was actually
        checked
      </span>
    </div>
  );

  // ── Empty State ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-6 text-center">
          <Fingerprint className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            No audit cycle in progress
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Continuous sampling runs in the background; every sample and
            comparison is logged and attributable.
          </p>
        </div>
      </div>
    );
  }

  // ── Deviation Branch (Spec §2/§6 — golden case cited, material) ──────
  if (showDeviation) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Deviation Found — Material
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                AP Agent's decision on invoice #4471 (categorized 'Office
                Supplies') doesn't match golden dataset case #GD-0231 (suggests
                'IT Equipment' for similar vendor/amount pattern). Material
                severity — flagged to Compliance Agent. Non-blocking to
                operations, blocking for that record's certainty.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Fraud Pattern Branch (Spec §6 — high urgency) ────────────────────
  if (showFraud) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Suspicious Pattern — High Urgency
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Repeated same-vendor, same-amount AP postings at period close
                detected in sample AUD-2026-0182. Escalated to Compliance Agent
                and human immediately — distinct visual treatment, never folded
                into a routine deviation.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Low Coverage Branch (Spec §7 — honest surfacing) ─────────────────
  if (showLowCoverage) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Limited Golden Dataset Coverage
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Comparison on cross-border payments ran against fewer synthetic
                golden cases than the coverage floor — lower confidence in this
                comparison. Surfaced honestly, never hidden: dataset version
                v2.4 cited so the gap is traceable.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Package Delivered Branch (Spec §2 — terminal) ────────────────────
  if (showPackageDelivered) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-balanced-green/30 bg-balanced-green/5 p-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-balanced-green" />
            <div>
              <p className="text-xs font-semibold text-balanced-green">
                Audit Package Delivered
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Q2 2026 package (trial balance, vouchers, prior period
                comparisons) delivered — auditor portal updated. Terminal for
                this request.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Main Active View ─────────────────────────────────────────────────
  const activeIdx = 1; // COMPARING_AGAINST_GOLDEN_DATASET

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
            <StateBadge state="COMPARING_AGAINST_GOLDEN_DATASET" />
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
              Dataset
            </p>
            <p className="text-[10px] font-semibold">Golden v2.4</p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Sample
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Clock className="h-3 w-3 text-muted-foreground" />
              AUD-2026-0182
            </p>
          </div>
        </div>

        {/* Continuous Audit State Machine */}
        <div
          role="region"
          aria-label="Continuous Audit State Machine"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Continuous Audit
          </p>
          <ol className="space-y-1.5">
            {AUDIT_PIPELINE.map((s, idx) => {
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
                    <ShieldCheck className="h-3 w-3 text-balanced-green" />
                  )}
                </li>
              );
            })}
          </ol>
          {/* Outcome badges */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[9px] font-medium text-muted-foreground/60">
              Outcome:
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-balanced-green/20 bg-balanced-green/5 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-balanced-green">
              CLEAN
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-attention-amber/20 bg-attention-amber/5 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-attention-amber">
              DEVIATION_FLAGGED
            </span>
          </div>
        </div>

        {/* Package State Machine (on demand) */}
        <div
          role="region"
          aria-label="Package State Machine"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Audit Package (on demand)
          </p>
          <ol className="space-y-1.5">
            {PACKAGE_PIPELINE.map((s, idx) => {
              const Icon = s.icon;
              const isActive = idx === 1;
              const isDone = idx < 1;
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
                    <ShieldCheck className="h-3 w-3 text-balanced-green" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>

        {/* Sampling */}
        <div
          data-step="sampling"
          role="region"
          aria-label="Sampling"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Sampling — persistent, low-key
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
            <ScanSearch className="h-3.5 w-3.5 text-signal-indigo" />
            <span className="text-[10px] font-medium">
              Audit Agent sampling AP postings — viewable on demand
            </span>
            <span className="ml-auto text-[9px] text-muted-foreground/70">
              Deterministic sampling policy — no confidence score
            </span>
          </div>
        </div>

        {/* Comparison — golden case cited */}
        <div
          data-step="compare"
          role="region"
          aria-label="Golden Dataset Comparison"
          className="rounded-lg border border-signal-indigo/20 bg-signal-indigo/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-signal-indigo">
            <Scale className="h-3 w-3" />
            Golden Dataset Comparison — every deviation cites its case
          </p>
          <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
            Sampled 15 AP postings from June. 14 matched expected patterns. 1
            deviation: AP Agent's decision on invoice #4471 categorized as
            'Office Supplies' — golden dataset case #GD-0231 suggests 'IT
            Equipment' for similar vendor/amount pattern. Flagged to Compliance
            Agent. Compared against golden dataset v2.4.
          </p>
          <div className="mt-2 flex items-center gap-2 rounded-md border border-border/50 bg-card/60 px-2 py-1">
            <span className="text-[9px] font-medium text-muted-foreground">
              Fuzzy comparison confidence (non-exact match)
            </span>
            <span
              role="meter"
              aria-label="Fuzzy comparison confidence"
              aria-valuenow={82}
              aria-valuemin={0}
              aria-valuemax={100}
              className="ml-auto inline-flex items-center gap-1 rounded-md bg-attention-amber/10 px-1.5 py-0.5 text-[9px] font-bold text-attention-amber"
            >
              82%
            </span>
          </div>
        </div>

        {/* Clean Result — logged + attributable (critical rule) */}
        <div
          data-step="clean"
          role="region"
          aria-label="Clean Result Logged"
          className="rounded-lg border border-balanced-green/20 bg-balanced-green/5 p-3"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-balanced-green">
            <ShieldCheck className="h-3 w-3" />
            Clean Result — Logged &amp; Attributable
          </p>
          <p className="mt-1.5 text-[9px] leading-relaxed text-muted-foreground">
            Clean result logged — attributed to sample AUD-2026-0182. Nothing
            wrong found is not nothing was checked — 15 cases actually checked
            against golden dataset v2.4.
          </p>
        </div>

        {/* Package Assembly — visible checklist */}
        <div
          role="region"
          aria-label="Package Assembly"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Package Assembly — visible checklist, not a spinner
          </p>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-2">
            <Package className="h-3.5 w-3.5 text-signal-indigo" />
            <span className="text-[10px] font-medium">
              Assembling audit package for Q2 2026...
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5">
              <ShieldCheck className="h-3 w-3 text-balanced-green" />
              <span className="text-[9px] font-medium text-muted-foreground">
                Trial Balance
              </span>
              <span className="ml-auto text-[9px] text-muted-foreground/60">
                sourced · ledger v2.4
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5">
              <ShieldCheck className="h-3 w-3 text-balanced-green" />
              <span className="text-[9px] font-medium text-muted-foreground">
                Vouchers
              </span>
              <span className="ml-auto text-[9px] text-muted-foreground/60">
                sourced · document store
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/20 px-2.5 py-1.5 opacity-70">
              <Activity className="h-3 w-3 text-signal-indigo" />
              <span className="text-[9px] font-medium text-muted-foreground">
                Prior Period Comparisons
              </span>
              <span className="ml-auto text-[9px] text-muted-foreground/60">
                pulling...
              </span>
            </div>
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
              Audit Trail — Every Sample &amp; Comparison
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
                      Sample / Case
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Result
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Dataset Version
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
                        {row.sample}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.result}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.version}
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
              Worker agents (Ledger, AP, AR, Payroll) — read-only
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              This agent (no write path to ledger)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Compliance Agent (escalation)
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">{footer}</div>
    </div>
  );
}
