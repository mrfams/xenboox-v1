"use client";

import React from "react";
import { useState } from "react";
import {
  Camera,
  FileText,
  ShieldCheck,
  UserCheck,
  CalendarDays,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  ChevronDown,
  Receipt,
  Building2,
  ArrowRight,
  Eye,
  ListChecks,
  ShieldAlert,
  Sparkles,
  Clock,
  Wallet,
  FileWarning,
  Banknote,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export type ExpenseState =
  | "RECEIPT_SUBMITTED"
  | "EXTRACTING"
  | "POLICY_CHECKING"
  | "ROUTING"
  | "APPROVED"
  | "REJECTED"
  | "ESCALATED"
  | "REIMBURSEMENT_SCHEDULED"
  | "PAID";

export interface OcrField {
  label: string;
  value: string;
  confidence: number;
}

export interface PolicyRule {
  name: string;
  detail: string;
  result: "pass" | "fail";
}

export interface ExpenseLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showEscalated?: boolean;
  showOcrFailure?: boolean;
  showRejected?: boolean;
  showPaid?: boolean;
}

// ─── Demo Data ─────────────────────────────────────────────────────────

const PIPELINE_STATES: Array<{
  id: ExpenseState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "RECEIPT_SUBMITTED",
    label: "RECEIPT_SUBMITTED",
    description: "Receiving image + claimed category/amount",
    icon: Camera,
  },
  {
    id: "EXTRACTING",
    label: "EXTRACTING",
    description: "OCR pulling vendor, amount, date from image",
    icon: FileText,
  },
  {
    id: "POLICY_CHECKING",
    label: "POLICY_CHECKING",
    description:
      "Checking against policy rules (category limit, receipt threshold, duplicate)",
    icon: ShieldCheck,
  },
  {
    id: "ROUTING",
    label: "ROUTING",
    description: "Determining correct approver based on org hierarchy/amount",
    icon: UserCheck,
  },
  {
    id: "REIMBURSEMENT_SCHEDULED",
    label: "REIMBURSEMENT_SCHEDULED",
    description: "Queuing for next payment run",
    icon: CalendarDays,
  },
  {
    id: "PAID",
    label: "PAID",
    description: "Reimbursed — terminal",
    icon: CheckCircle2,
  },
];

const OCR_FIELDS: OcrField[] = [
  { label: "Vendor", value: "Kairaba Restaurant", confidence: 0.94 },
  { label: "Amount", value: "GMD 28.00", confidence: 0.96 },
  { label: "Date", value: "June 12, 2026", confidence: 0.89 },
];

const POLICY_CHECKS: PolicyRule[] = [
  {
    name: "Receipt required above GMD 20",
    detail: "receipt attached",
    result: "pass",
  },
  {
    name: "Meal limit GMD 30",
    detail: "claimed GMD 28 — within limit ✓",
    result: "pass",
  },
  {
    name: "Duplicate submission",
    detail: "no prior match found",
    result: "pass",
  },
];

const STEPS = [
  {
    title: "Receive Claim",
    detail:
      "Input: receipt image + claimed category/amount from employee. Output: draft claim. No confidence score — direct submission, not inferred.",
  },
  {
    title: "OCR Extraction",
    detail:
      "Input: receipt image. Output: {vendor, amount, date} with per-field confidence shown against the image. This is the probabilistic layer — never guessed, always labeled.",
  },
  {
    title: "Policy Check",
    detail:
      "Input: category, amount, extracted receipt data. Output: pass/fail PER specific rule (category limit, receipt threshold, duplicate) — never one bundled 'policy ok' flag. Deterministic against configured limits.",
  },
  {
    title: "Duplicate Check",
    detail:
      "Input: employee, amount, date, vendor. Output: pass or flagged prior match. No confidence score if exact, confidence if fuzzy.",
  },
  {
    title: "Route to Approver",
    detail:
      "Input: org hierarchy, amount, department. Output: specific approver identified. No confidence score — deterministic routing rule.",
  },
  {
    title: "Schedule Reimbursement",
    detail:
      "Input: approved claim. Output: queued for next payment run, coordinating with Cash Agent. No confidence score.",
  },
];

const CONSTRAINTS = [
  { label: "Itemized Policy Checks", icon: ShieldCheck },
  { label: "OCR Never Guesses", icon: FileText },
  { label: "Receipt Threshold Enforced", icon: Receipt },
  { label: "Duplicate Flagged", icon: Hash },
];

const ESCALATIONS = [
  {
    condition: "Any policy rule fails",
    to: "Department Manager / Finance",
    effect: "Itemized failure shown, requires explicit approval override",
  },
  {
    condition: "Possible duplicate submission",
    to: "Department Manager",
    effect: "Shown side-by-side with suspected original claim",
  },
  {
    condition: "Receipt unreadable",
    to: "Employee (resubmit) / Finance",
    effect: "Couldn't read this receipt — please resubmit or enter manually",
  },
];

const AUDIT_TRAIL = [
  { field: "OCR — Vendor", result: "Kairaba Restaurant", conf: "94%" },
  { field: "OCR — Amount", result: "GMD 28.00", conf: "96%" },
  { field: "OCR — Date", result: "June 12, 2026", conf: "89%" },
  { field: "Policy — receipt threshold", result: "pass ✓", conf: "—" },
  { field: "Policy — meal limit", result: "pass ✓", conf: "—" },
  { field: "Duplicate check", result: "no duplicate", conf: "—" },
  { field: "Routing", result: "Awa Sillah (Field Ops)", conf: "—" },
  { field: "Approver action", result: "Approved", conf: "2026-06-14 10:32" },
  {
    field: "Reimbursement",
    result: "scheduled 2026-06-20",
    conf: "Cash Agent",
  },
];

// ─── Helpers ───────────────────────────────────────────────────────────

function getStateColor(state: ExpenseState): string {
  switch (state) {
    case "APPROVED":
    case "PAID":
      return "text-balanced-green";
    case "REJECTED":
      return "text-error-clay";
    case "ESCALATED":
      return "text-attention-amber";
    default:
      return "text-signal-indigo";
  }
}

function getStateBg(state: ExpenseState): string {
  switch (state) {
    case "APPROVED":
    case "PAID":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "REJECTED":
      return "bg-error-clay/5 border-error-clay/20";
    case "ESCALATED":
      return "bg-attention-amber/5 border-attention-amber/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: ExpenseState }) {
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

export function ExpenseLiveness({
  className,
  showEmptyState = false,
  showEscalated = false,
  showOcrFailure = false,
  showRejected = false,
  showPaid = false,
}: ExpenseLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const header = (
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/10">
          <Receipt className="h-4 w-4 text-signal-indigo" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">Expense Agent</h2>
          <p className="text-[10px] text-muted-foreground">
            Expense claims — receipt to reimbursement
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="flex items-center gap-1 rounded-md border border-signal-indigo/20 bg-signal-indigo/5 px-1.5 py-0.5 text-[9px] font-medium text-signal-indigo">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-signal-indigo" />
          Live
        </span>
        <span className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
          EXP-2026-0142 · Meals
        </span>
      </div>
    </div>
  );

  const footer = (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/50 pt-2">
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-balanced-green" />
        Layer 1 — deterministic: intake, policy rules, routing, arithmetic
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-attention-amber" />
        Layer 2 — probabilistic: OCR extraction, fuzzy duplicate
      </span>
      <span className="flex items-center gap-1 text-[9px] text-muted-foreground/60">
        <Sparkles className="h-3 w-3" />
        Policy checks are itemized, never a single badge
      </span>
    </div>
  );

  // ── Empty State ──────────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-6 text-center">
          <Receipt className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            No claim being processed
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/60">
            Submitted receipts will appear here with per-field OCR confidence
            and itemized policy checks.
          </p>
        </div>
      </div>
    );
  }

  // ── Escalated Branch (Spec §6 — policy limit exceeded) ───────────────
  if (showEscalated) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Escalated — Policy Limit Exceeded
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Claimed GMD 45 for Meals — exceeds GMD 30 category limit by GMD
                15. Itemized failure shown. Routed to Department Manager for
                exception approval, not auto-approved.
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-attention-amber">
                Blocking — requires explicit approval override before this claim
                proceeds.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── OCR Failure Branch (Spec §7 — never guesses) ─────────────────────
  if (showOcrFailure) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-attention-amber/40 bg-attention-amber/5 p-3">
            <FileWarning className="mt-0.5 h-4 w-4 shrink-0 text-attention-amber" />
            <div>
              <p className="text-xs font-semibold text-attention-amber">
                Receipt Unreadable
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Couldn&apos;t read this receipt — please resubmit or enter
                manually. The agent never guesses an amount — always routes to
                manual entry or resubmission.
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-attention-amber">
                Blocking — this claim stays in EXTRACTING until resolved.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Rejected Branch (Spec §7 — hard policy fail) ─────────────────────
  if (showRejected) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-error-clay/30 bg-error-clay/5 p-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-clay" />
            <div>
              <p className="text-xs font-semibold text-error-clay">
                Rejected — Policy Hard Fail
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Missing receipt above the GMD 20 threshold — hard policy fail,
                not silently waived. Claim returned to employee.
              </p>
              <p className="mt-1.5 text-[10px] font-medium text-error-clay">
                Blocking — cannot proceed without the required receipt.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Terminal State: PAID ─────────────────────────────────────────────
  if (showPaid) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="p-4">{header}</div>
        <div className="border-t p-4">
          <div className="flex items-start gap-2 rounded-lg border border-balanced-green/30 bg-balanced-green/5 p-3">
            <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-balanced-green" />
            <div>
              <p className="text-xs font-semibold text-balanced-green">
                Reimbursed
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                EXP-2026-0142 — GMD 28.00 reimbursed via Cash Agent on June 20,
                2026. Handed to Ledger Agent for posting.
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 pb-4">{footer}</div>
      </div>
    );
  }

  // ── Main Active View ─────────────────────────────────────────────────
  const activeIdx = 2; // POLICY_CHECKING

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
            <StateBadge state="POLICY_CHECKING" />
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
              Claim
            </p>
            <p className="text-[10px] font-semibold">
              EXP-2026-0142 · GMD 28.00
            </p>
          </div>
          <div className="rounded-lg border bg-muted/30 p-2">
            <p className="text-[9px] font-medium text-muted-foreground/60">
              Source
            </p>
            <p className="flex items-center gap-1 text-[10px] font-semibold">
              <Wallet className="h-3 w-3 text-muted-foreground" />
              Mobile submission
            </p>
          </div>
        </div>

        {/* State Machine Pipeline */}
        <div
          role="region"
          aria-label="Expense State Machine"
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

          {/* Approval Outcomes Branch */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[9px] font-medium text-muted-foreground/60">
              Outcomes:
            </span>
            {(
              [
                { state: "APPROVED" as ExpenseState },
                { state: "REJECTED" as ExpenseState },
                { state: "ESCALATED" as ExpenseState },
              ] as const
            ).map(({ state }) => (
              <span
                key={state}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-semibold tracking-wide",
                  getStateColor(state),
                  getStateBg(state),
                )}
              >
                {state}
              </span>
            ))}
          </div>
        </div>

        {/* Receipt + Claim */}
        <div
          role="region"
          aria-label="Receipt and Claim"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Receipt &amp; Claim
          </p>
          <div className="rounded-lg border border-dashed bg-muted/20 p-2.5">
            <p className="text-[10px] font-semibold text-muted-foreground">
              Receipt received — GMD 28.00 claimed for Meals
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-[9px] text-muted-foreground/70">
              <Clock className="h-3 w-3" />
              Submitted June 12, 2026 · employee Fatou Njie · Field Operations
            </p>
          </div>
        </div>

        {/* OCR Extraction — probabilistic layer */}
        <div role="region" aria-label="OCR Extraction" className="space-y-1.5">
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <FileText className="h-3 w-3" />
            OCR Extraction — per-field confidence (Layer 2)
          </p>
          <div className="space-y-1.5">
            {OCR_FIELDS.map((field) => (
              <div
                key={field.label}
                className="flex items-center gap-2 rounded-lg border bg-muted/20 px-2.5 py-1.5"
              >
                <span className="w-16 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                  {field.label}
                </span>
                <span className="text-[10px] font-semibold">{field.value}</span>
                <span
                  role="meter"
                  aria-label={`OCR ${field.label.toLowerCase()} confidence`}
                  aria-valuenow={Math.round(field.confidence * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="ml-auto inline-flex items-center gap-1 rounded-md bg-signal-indigo/10 px-1.5 py-0.5 text-[9px] font-bold text-signal-indigo"
                >
                  {Math.round(field.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Policy Checks — ITEMIZED (critical rule) */}
        <div
          role="region"
          aria-label="Policy Checks"
          className="space-y-1.5"
          data-policy-checklist="true"
        >
          <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            <ShieldCheck className="h-3 w-3" />
            Policy Checks — itemized, never a single badge (Layer 1)
          </p>
          <div className="space-y-1.5">
            {POLICY_CHECKS.map((rule) => (
              <div
                key={rule.name}
                data-policy-result={rule.result}
                className={cn(
                  "flex items-start gap-2 rounded-lg border px-2.5 py-2",
                  rule.result === "pass"
                    ? "border-balanced-green/20 bg-balanced-green/5"
                    : "border-error-clay/20 bg-error-clay/5",
                )}
              >
                {rule.result === "pass" ? (
                  <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-balanced-green" />
                ) : (
                  <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-error-clay" />
                )}
                <span className="text-[10px] font-medium text-muted-foreground">
                  {rule.name}
                </span>
                <span className="ml-auto text-[9px] text-muted-foreground/70">
                  {rule.detail}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold",
                    rule.result === "pass"
                      ? "text-balanced-green"
                      : "text-error-clay",
                  )}
                >
                  {rule.result === "pass" ? "✓" : "✗"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Duplicate Check */}
        <div
          data-step="duplicate"
          role="region"
          aria-label="Duplicate Check"
          className="rounded-lg border bg-muted/20 px-2.5 py-2"
        >
          <p className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
            <Hash className="h-3 w-3 text-balanced-green" />
            Duplicate Check
          </p>
          <p className="mt-1 text-[9px] leading-relaxed text-muted-foreground">
            Checked against 340 prior expense claims — No duplicate found. Exact
            match criteria — no confidence score (deterministic).
          </p>
        </div>

        {/* Routing + Reimbursement */}
        <div
          data-step="routing"
          role="region"
          aria-label="Routing and Reimbursement"
          className="space-y-1.5"
        >
          <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Routing &amp; Reimbursement
          </p>
          <div className="rounded-lg border bg-muted/20 px-2.5 py-2">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
              <UserCheck className="h-3 w-3 text-signal-indigo" />
              Routed to Awa Sillah (Field Ops Manager) for approval
            </p>
            <p className="mt-1 text-[9px] text-muted-foreground/70">
              Org hierarchy lookup — deterministic, no confidence score.
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border bg-muted/20 px-2.5 py-2">
            <CalendarDays className="h-3 w-3 text-balanced-green" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Scheduled for reimbursement June 20, 2026 — coordinates with Cash
              Agent
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
                    → {esc.to}. {esc.effect}. Blocking.
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
              Audit Trail — Every Claim
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
                      Check / Rule / Field
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Result
                    </th>
                    <th className="px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      Confidence / Note
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
                        {row.field}
                      </td>
                      <td className="px-2.5 py-1.5 text-[9px] text-muted-foreground">
                        {row.result}
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
              Document Agent (receipt classification/OCR)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              This agent
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Controller Agent (journal review)
            </span>
            <ArrowRight className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[9px] font-medium text-muted-foreground">
              Ledger Agent (posting)
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground/70">
            Reimbursement scheduling coordinates with Cash Agent for the payment
            run.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4">{footer}</div>
    </div>
  );
}
