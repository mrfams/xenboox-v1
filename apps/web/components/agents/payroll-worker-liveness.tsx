"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Activity,
  Calculator,
  Percent,
  Wallet,
  FileText,
  Route,
  User,
  ArrowRight,
  ListChecks,
  Sparkles,
  Building2,
  Eye,
  Layers,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────

export type PayrollState =
  | "STAFF_SELECTED"
  | "GROSS_CALCULATED"
  | "DEDUCTIONS_CALCULATED"
  | "NET_CALCULATED"
  | "PAYSLIP_DRAFTED"
  | "PAYSLIP_APPROVED"
  | "JOURNAL_HANDED_OFF"
  | "EXCEPTION_FLAGGED";

export type PayrollExceptionType =
  | "NEW_STARTER"
  | "LEAVER"
  | "SALARY_CHANGE"
  | "BONUS"
  | "RATE_TABLE_MISSING"
  | "NEGATIVE_NET"
  | "MISSING_BANK_DETAILS"
  | "INCOMPLETE_STAFF_RECORD";

export interface DeductionLine {
  id: string;
  label: string;
  amount: number;
  rate: string;
  why: string;
  ruleVersion: string;
}

export interface StaffRun {
  id: string;
  name: string;
  role: string;
  state: PayrollState;
  gross: number;
  basic: number;
  allowances: number;
  deductions: DeductionLine[];
  netPay: number;
  exceptionReason?: string;
  flag?: string;
}

export interface PayrollWorkerLivenessProps {
  className?: string;
  showEmptyState?: boolean;
  showException?: PayrollExceptionType | false;
}

// ─── Active Stage ──────────────────────────────────────────────────────
// Single source of truth for "which stage is live in the demo run". Used
// both to highlight the pipeline position and to auto-expand the staff at
// that stage (Spec §4: breakdown never collapsed by default).
const ACTIVE_STAFF_STATE: PayrollState = "DEDUCTIONS_CALCULATED";

// ─── Demo Data ─────────────────────────────────────────────────────────

const STAFF: StaffRun[] = [
  {
    id: "stf_01",
    name: "Awa Jallow",
    role: "Finance Officer",
    state: "DEDUCTIONS_CALCULATED",
    gross: 660.0,
    basic: 600.0,
    allowances: 60.0,
    deductions: [
      {
        id: "d1",
        label: "PAYE",
        amount: 84.2,
        rate: "Band 2 · 15%",
        why: "PAYE calculated as GMD 84.20 — Gambia band 2 (15%) applied to taxable income of GMD 561.33 after allowance deduction.",
        ruleVersion: "GRA-PAYE-2026.07",
      },
      {
        id: "d2",
        label: "SSHFC",
        amount: 33.0,
        rate: "5% employee rate (capped)",
        why: "SSHFC calculated as GMD 33.00 — 5% employee rate applied to gross GMD 660.00 (capped at ceiling).",
        ruleVersion: "SSHFC-RATES-2026.07",
      },
      {
        id: "d3",
        label: "Staff Loan",
        amount: 25.0,
        rate: "Fixed installment",
        why: "Staff loan installment GMD 25.00 this period — remaining balance GMD 150.00.",
        ruleVersion: "LOAN-AGR-1187",
      },
    ],
    netPay: 517.8,
  },
  {
    id: "stf_02",
    name: "Bakary Camara",
    role: "Operations Manager",
    state: "PAYSLIP_APPROVED",
    gross: 450.0,
    basic: 450.0,
    allowances: 0,
    deductions: [
      {
        id: "d4",
        label: "PAYE",
        amount: 67.5,
        rate: "Band 2 · 15%",
        why: "PAYE calculated as GMD 67.50 — Gambia band 2 (15%) applied to taxable income of GMD 450.00 after allowance deduction.",
        ruleVersion: "GRA-PAYE-2026.07",
      },
      {
        id: "d5",
        label: "SSHFC",
        amount: 22.5,
        rate: "5% combined (capped at ceiling)",
        why: "SSHFC calculated as GMD 22.50 — 5% employer/employee combined rate on gross GMD 450.00 (capped at ceiling).",
        ruleVersion: "SSHFC-RATES-2026.07",
      },
    ],
    netPay: 360.0,
  },
  {
    id: "stf_03",
    name: "Fatou Sowe",
    role: "Admin Assistant",
    state: "EXCEPTION_FLAGGED",
    gross: 0,
    basic: 0,
    allowances: 0,
    deductions: [],
    netPay: 0,
    exceptionReason:
      "New starter — no active contract on file. Incomplete staff record — missing: contract. Requires Payroll Manager Agent confirmation before calculation proceeds.",
  },
  {
    id: "stf_04",
    name: "Mariama Njie",
    role: "Receptionist",
    state: "PAYSLIP_DRAFTED",
    gross: 300.0,
    basic: 300.0,
    allowances: 0,
    deductions: [
      {
        id: "d6",
        label: "PAYE",
        amount: 30.0,
        rate: "Band 2 · 15%",
        why: "PAYE calculated as GMD 30.00 — Gambia band 2 (15%) applied to taxable income of GMD 200.00 after allowance deduction.",
        ruleVersion: "GRA-PAYE-2026.07",
      },
      {
        id: "d7",
        label: "SSHFC",
        amount: 15.0,
        rate: "5% employee rate (capped)",
        why: "SSHFC calculated as GMD 15.00 — 5% employee rate applied to gross GMD 300.00 (capped at ceiling).",
        ruleVersion: "SSHFC-RATES-2026.07",
      },
    ],
    netPay: 255.0,
    flag: "Missing bank details — payslip drafted but payment blocked",
  },
];

const PIPELINE_STATES: Array<{
  id: PayrollState;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    id: "STAFF_SELECTED",
    label: "STAFF_SELECTED",
    description:
      "Staff record pulled: salary, allowances, jurisdiction, bank details",
    icon: User,
  },
  {
    id: "GROSS_CALCULATED",
    label: "GROSS_CALCULATED",
    description:
      "Base + allowances + any this-period bonus summed with line-item breakdown",
    icon: Calculator,
  },
  {
    id: "DEDUCTIONS_CALCULATED",
    label: "DEDUCTIONS_CALCULATED",
    description:
      "Each statutory deduction run separately — PAYE, SSHFC, loan — never blended",
    icon: Percent,
  },
  {
    id: "NET_CALCULATED",
    label: "NET_CALCULATED",
    description: "Gross minus total deductions",
    icon: Wallet,
  },
  {
    id: "PAYSLIP_DRAFTED",
    label: "PAYSLIP_DRAFTED",
    description: "Payslip document assembled with full breakdown",
    icon: FileText,
  },
  {
    id: "PAYSLIP_APPROVED",
    label: "PAYSLIP_APPROVED",
    description:
      "Payroll Manager Agent review passes — queued for journal posting",
    icon: CheckCircle2,
  },
  {
    id: "JOURNAL_HANDED_OFF",
    label: "JOURNAL_HANDED_OFF",
    description:
      "Handoff package sent to Ledger Agent via Controller / Payroll Manager",
    icon: ArrowRight,
  },
  {
    id: "EXCEPTION_FLAGGED",
    label: "EXCEPTION_FLAGGED",
    description:
      "Branch: exception requires Payroll Manager Agent sign-off before calc proceeds",
    icon: AlertTriangle,
  },
];

const ESCALATION_TRIGGERS = [
  {
    trigger: "New starter / leaver / salary change / bonus detected",
    to: "Payroll Manager Agent",
    effect:
      "Blocking for that individual only — explicit exception card before calc proceeds",
  },
  {
    trigger: "Jurisdiction rate/rule lookup fails or is missing",
    to: "Payroll Manager Agent → Compliance Agent",
    effect:
      "No rate table found for [jurisdiction] — cannot calculate. Run continues for others.",
  },
  {
    trigger: "Net pay is negative or implausible (deductions exceed gross)",
    to: "Payroll Manager Agent + human",
    effect:
      "Hard stop — net pay negative. Flagged explicitly, never silently clamped to zero.",
  },
];

const STEPS = [
  {
    title: "Pull Staff Record",
    detail:
      "Input: staff_id, period. Output: {base_salary, allowances[], jurisdiction, bank_details, active_loans[]}. No confidence score — deterministic lookup.",
  },
  {
    title: "Calculate Gross",
    detail:
      "Input: base + allowances + this-period bonus/overtime if flagged. Output: gross figure with line-item breakdown. No confidence score.",
  },
  {
    title: "Calculate PAYE",
    detail:
      "Input: gross, jurisdiction tax bands. Output: PAYE amount + which band/rate applied, shown explicitly. No confidence score — statutory formula, not judgment.",
  },
  {
    title: "Calculate Social Security",
    detail:
      "Input: gross, jurisdiction rate (SSHFC / FIRS / NHIF / SSNIT as applicable). Output: amount + rate applied. No confidence score.",
  },
  {
    title: "Calculate Loan Deduction",
    detail:
      "Input: loan schedule. Output: this-period installment + remaining balance. No confidence score.",
  },
  {
    title: "Sum Net",
    detail:
      "Input: gross + all deduction line items. Output: net pay. No confidence score.",
  },
  {
    title: "Draft Payslip",
    detail:
      "Input: all above. Output: structured payslip document. No confidence score.",
  },
  {
    title: "Flag Exceptions",
    detail:
      "New starter / leaver / salary change / bonus — never silently folded into the standard calc. Each is its own explicit sub-flow requiring Payroll Manager Agent sign-off.",
  },
];

const CONSTRAINTS = [
  { label: "Statutory Formula", icon: Calculator },
  { label: "Rate Table Versioned", icon: Layers },
  { label: "Jurisdiction Scoped", icon: Building2 },
  { label: "Exception Never Silent", icon: AlertTriangle },
  { label: "Breakdown Expandable", icon: ChevronDown },
  { label: "Never Estimated", icon: Percent },
];

const AUDIT_TRAIL = [
  {
    staff: "Awa Jallow",
    state: "GROSS_CALCULATED",
    ts: "09:00:01.104",
    detail: "gross: 660.00 (basic 600.00 + allowances 60.00)",
  },
  {
    staff: "Awa Jallow",
    state: "DEDUCTIONS_CALCULATED",
    ts: "09:00:02.512",
    detail:
      "PAYE: 84.20 @ band 2 (15%), rule: GRA-PAYE-2026.07, jurisdiction: GM",
  },
  {
    staff: "Awa Jallow",
    state: "DEDUCTIONS_CALCULATED",
    ts: "09:00:02.891",
    detail: "SSHFC: 33.00 @ 5%, rule: SSHFC-RATES-2026.07, jurisdiction: GM",
  },
  {
    staff: "Awa Jallow",
    state: "DEDUCTIONS_CALCULATED",
    ts: "09:00:03.120",
    detail: "LOAN: 25.00 installment, balance 150.00, rule: LOAN-AGR-1187",
  },
  {
    staff: "Bakary Camara",
    state: "PAYSLIP_APPROVED",
    ts: "09:12:47.003",
    detail: "approved by: Payroll Manager Agent, approvedAt: Jul 28, 2026",
  },
  {
    staff: "Mariama Njie",
    state: "PAYSLIP_DRAFTED",
    ts: "09:15:02.740",
    detail: "draft complete — payment blocked: bank details missing",
  },
];

const EXCEPTION_DETAILS: Record<
  PayrollExceptionType,
  { explanation: string; route: string }
> = {
  NEW_STARTER: {
    explanation:
      "New starter detected — Fatou Sowe has no active contract on file for July 2026. Requires Payroll Manager Agent confirmation before calculation proceeds. Blocking for this individual only — run continues for other staff.",
    route: "Escalated to Payroll Manager Agent",
  },
  LEAVER: {
    explanation:
      "Leaver detected — termination date within July 2026. Final settlement calculation requires Payroll Manager Agent confirmation before any payout.",
    route: "Escalated to Payroll Manager Agent",
  },
  SALARY_CHANGE: {
    explanation:
      "Salary change detected — new basic rate effective mid-period. Payroll Manager Agent confirmation before calculation proceeds.",
    route: "Escalated to Payroll Manager Agent",
  },
  BONUS: {
    explanation:
      "Bonus flagged this period — must be calculated as its own explicit sub-flow, never silently folded into the standard calculation. Payroll Manager Agent sign-off required.",
    route: "Escalated to Payroll Manager Agent",
  },
  RATE_TABLE_MISSING: {
    explanation:
      "No rate table found for jurisdiction GM — cannot calculate. Escalated to Compliance Agent for rate table update.",
    route: "Escalated to Compliance Agent",
  },
  NEGATIVE_NET: {
    explanation:
      "Hard stop — net pay negative: deductions (GMD 700.00) exceed gross (GMD 660.00). Never silently clamped to zero. Human review required.",
    route: "Escalated to Payroll Manager Agent + human",
  },
  MISSING_BANK_DETAILS: {
    explanation:
      "Missing bank details — payslip drafted but payment step blocked. Shown distinctly from a calculation error.",
    route: "Payment blocked until bank details added",
  },
  INCOMPLETE_STAFF_RECORD: {
    explanation:
      "Incomplete staff record — missing field: contract. Staff member parked in EXCEPTION_FLAGGED. Run continues for other staff.",
    route: "Escalated to Payroll Manager Agent",
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return `GMD ${amount.toLocaleString("en-GM", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getStateColor(state: PayrollState): string {
  switch (state) {
    case "STAFF_SELECTED":
    case "GROSS_CALCULATED":
    case "DEDUCTIONS_CALCULATED":
    case "NET_CALCULATED":
    case "PAYSLIP_DRAFTED":
      return "text-signal-indigo";
    case "PAYSLIP_APPROVED":
    case "JOURNAL_HANDED_OFF":
      return "text-balanced-green";
    case "EXCEPTION_FLAGGED":
      return "text-attention-amber";
  }
}

function getStateBg(state: PayrollState): string {
  switch (state) {
    case "PAYSLIP_APPROVED":
    case "JOURNAL_HANDED_OFF":
      return "bg-balanced-green/5 border-balanced-green/20";
    case "EXCEPTION_FLAGGED":
      return "bg-attention-amber/5 border-attention-amber/20";
    default:
      return "bg-signal-indigo/5 border-signal-indigo/20";
  }
}

// ─── Sub-components ────────────────────────────────────────────────────

function StateBadge({ state }: { state: PayrollState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9px] font-semibold",
        getStateColor(state),
        getStateBg(state),
      )}
    >
      {state === "EXCEPTION_FLAGGED" && (
        <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
      )}
      {state === "DEDUCTIONS_CALCULATED" && (
        <Activity className="h-2.5 w-2.5 animate-pulse shrink-0" />
      )}
      {state}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────

export function PayrollWorkerLiveness({
  className,
  showEmptyState = false,
  showException = false,
}: PayrollWorkerLivenessProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  // Spec §4: the deduction breakdown is NEVER collapsed by default into a
  // single number — the staff member currently being processed (the active
  // stage, see ACTIVE_STAFF_STATE) starts expanded so their PAYE / SSHFC /
  // loan lines are visible without a click.
  const [expandedStaff, setExpandedStaff] = useState<Set<string>>(
    () =>
      new Set(
        STAFF.filter((s) => s.state === ACTIVE_STAFF_STATE).map((s) => s.id),
      ),
  );

  function toggleStaff(id: string) {
    setExpandedStaff((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── Empty State ───────────────────────────────────────────────────
  if (showEmptyState) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Payroll Worker Agent</h2>
              <p className="text-[10px] text-muted-foreground">
                Payroll — Staff Processing
              </p>
            </div>
          </div>
        </div>
        <div className="p-8 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No payroll run in progress
          </p>
          <p className="mx-auto mt-1 max-w-md text-[10px] text-muted-foreground/60">
            The Payroll Worker Agent is idle, waiting for a payroll run to be
            triggered by the Payroll Manager Agent. Per-staff state machines and
            deduction breakdowns appear here the moment a run starts.
          </p>
        </div>
      </div>
    );
  }

  // ── Exception-Focused State ──────────────────────────────────────
  if (showException) {
    const exception = EXCEPTION_DETAILS[showException];
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        {/* Header */}
        <div className="border-b bg-gradient-to-r from-accent/50 to-transparent px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">Payroll Worker Agent</h2>
              <p className="text-[10px] text-muted-foreground">
                Payroll — Staff Processing
              </p>
            </div>
          </div>
        </div>

        {/* Needs Attention Strip */}
        <div className="border-b-2 border-attention-amber/30 bg-attention-amber/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-attention-amber/10 shrink-0">
              <AlertTriangle className="h-4 w-4 text-attention-amber" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-attention-amber">
                  Needs Attention
                </span>
                <span className="rounded-full border border-attention-amber/20 bg-attention-amber/10 px-1.5 py-0.5 text-[8px] font-medium text-attention-amber">
                  {showException}
                </span>
              </div>
              <p className="mt-1 text-[10px] text-foreground">
                {exception.explanation}
              </p>
              <div className="mt-1.5 flex items-center gap-1">
                <ArrowRight className="h-2.5 w-2.5 text-attention-amber/60" />
                <span className="text-[9px] font-medium text-attention-amber/80">
                  {exception.route}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* State feed */}
        <div className="space-y-3 p-4">
          <div role="region" aria-label="Per-Staff State Machine">
            <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Per-Staff State Machine
            </h3>
            <div className="space-y-1.5">
              {PIPELINE_STATES.map((state) => {
                const isExceptionBranch = state.id === "EXCEPTION_FLAGGED";
                return (
                  <div
                    key={state.id}
                    role="listitem"
                    className={cn(
                      "flex items-center gap-3 rounded-lg border p-3",
                      isExceptionBranch
                        ? "bg-attention-amber/5 border-attention-amber/20"
                        : "bg-muted/30 border-border/50 opacity-50",
                    )}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                        isExceptionBranch
                          ? "text-attention-amber"
                          : "text-muted-foreground/40",
                      )}
                    >
                      {isExceptionBranch ? (
                        <AlertTriangle className="h-4 w-4" />
                      ) : (
                        <Route className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span
                        className={cn(
                          "text-[10px] font-mono font-semibold",
                          isExceptionBranch
                            ? "text-attention-amber"
                            : "text-muted-foreground/40",
                        )}
                      >
                        {state.label}
                      </span>
                      {isExceptionBranch && (
                        <p className="mt-0.5 text-[9px] text-attention-amber/80">
                          Blocked — Payroll Manager Agent sign-off required
                          before calc proceeds for this individual
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Liveness footer */}
          <div
            className="rounded-lg border border-dashed bg-muted/20 p-2.5"
            role="region"
            aria-label="Liveness Transparency"
          >
            <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
              <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
              <span>
                <strong className="text-muted-foreground/80">
                  Layer 1 — Deterministic:
                </strong>{" "}
                The Payroll Worker Agent carries{" "}
                <strong className="text-muted-foreground/80">
                  zero confidence scores of its own
                </strong>
                . Statutory figures come from stored rate tables, never AI
                estimates. Exceptions are never silently folded into the
                standard calc.
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal Active Run State ──────────────────────────────────────
  const activeStateIdx = PIPELINE_STATES.findIndex(
    (s) => s.id === ACTIVE_STAFF_STATE,
  );

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-accent/50 via-accent/30 to-transparent px-4 py-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-sm">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold">Payroll Worker Agent</h2>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-medium text-emerald-600 dark:border-emerald-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Layer 1 — Deterministic
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Payroll — Staff Processing
              </p>
            </div>
          </div>

          {/* Run attribution */}
          <div className="hidden text-right sm:block">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Run
            </p>
            <p className="text-xs font-medium font-mono">#PR-2026-07</p>
            <p className="text-[9px] text-muted-foreground/60">
              triggered by Payroll Manager Agent
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4" role="region" aria-label="Agent Status">
        {/* Status Info Grid */}
        <div
          className="grid grid-cols-2 gap-2 sm:grid-cols-4"
          role="region"
          aria-label="Status Information"
        >
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Status
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-signal-indigo animate-pulse" />
              <span className="text-xs font-medium text-signal-indigo">
                DEDUCTIONS_CALCULATED
              </span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Payroll Period
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <CalendarDays className="h-3 w-3 text-balanced-green" />
              <span className="text-xs font-medium">July 2026</span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Entity
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Building2 className="h-3 w-3 text-signal-indigo" />
              <span className="truncate text-xs font-medium">Xenboox HQ</span>
            </div>
          </div>
          <div className="rounded-lg border bg-accent/20 p-2.5">
            <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
              Run
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Route className="h-3 w-3 text-signal-indigo" />
              <span className="font-mono text-xs font-medium">#PR-2026-07</span>
            </div>
          </div>
        </div>

        {/* Cross-Agent Handoff */}
        <div className="rounded-lg border bg-accent/20 p-2.5">
          <p className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
            Cross-Agent Handoff Chain
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
            <span className="font-medium">Payroll Worker Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Payroll Manager Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Controller Agent</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-medium">Ledger Agent</span>
            <span className="ml-1 text-muted-foreground/70">
              — approved payslips queued: Handed to Ledger Agent for posting
            </span>
          </div>
        </div>

        {/* Per-Staff Processing List */}
        <div role="region" aria-label="Staff Processing">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Staff Processing — top to bottom · Deduction Breakdown
            </h3>
            <span className="text-[8px] text-muted-foreground/60">
              {STAFF.length} staff · run #PR-2026-07
            </span>
          </div>

          <div className="space-y-1.5">
            {STAFF.map((staff) => {
              const isExpanded = expandedStaff.has(staff.id);
              const isException = staff.state === "EXCEPTION_FLAGGED";
              return (
                <div
                  key={staff.id}
                  role="listitem"
                  className={cn(
                    "rounded-lg border transition-colors",
                    isException
                      ? "border-attention-amber/30 bg-attention-amber/5"
                      : "border-border/60 bg-accent/20 hover:bg-accent/40",
                  )}
                >
                  {/* Staff header (clickable) */}
                  <button
                    onClick={() => toggleStaff(staff.id)}
                    className="flex w-full items-center gap-3 p-2.5 text-left"
                    aria-expanded={isExpanded}
                  >
                    <div
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        isException
                          ? "bg-attention-amber/10 text-attention-amber"
                          : "bg-signal-indigo/10 text-signal-indigo",
                      )}
                    >
                      <User className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-xs font-medium">
                          {staff.name}
                        </span>
                        <span className="hidden text-[9px] text-muted-foreground/70 sm:inline">
                          {staff.role}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[9px] text-muted-foreground/70">
                        {isException
                          ? "Exception flagged — requires Payroll Manager Agent sign-off"
                          : `Gross: ${formatCurrency(staff.gross)} → Net pay: ${formatCurrency(staff.netPay)}`}
                      </p>
                    </div>
                    <StateBadge state={staff.state} />
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200",
                        isExpanded && "rotate-180",
                      )}
                    />
                  </button>

                  {/* Exception card */}
                  {isException && staff.exceptionReason && (
                    <div className="border-t border-attention-amber/20 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                        <div>
                          <p className="text-[9px] font-semibold uppercase tracking-wider text-attention-amber">
                            Exception — requires sign-off
                          </p>
                          <p className="mt-0.5 text-[9px] text-foreground">
                            {staff.exceptionReason}
                          </p>
                          <div className="mt-1 flex items-center gap-1">
                            <ArrowRight className="h-2 w-2 text-attention-amber/60" />
                            <span className="text-[8px] font-medium text-attention-amber/80">
                              Escalated to Payroll Manager Agent
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank details flag */}
                  {staff.flag && (
                    <div className="border-t border-border/60 px-3 py-2">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                        <div>
                          <p className="text-[9px] font-medium text-attention-amber">
                            {staff.flag}
                          </p>
                          <p className="mt-0.5 text-[8px] text-muted-foreground/70">
                            Shown distinctly from a calculation error — this is
                            a payment blocker, not a math failure.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expanded deduction breakdown */}
                  {isExpanded && staff.deductions.length > 0 && (
                    <div className="border-t border-border/60 px-3 py-2.5">
                      <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Deduction Breakdown — each on its own line, never
                        blended
                      </p>
                      <div className="space-y-1.5">
                        {staff.deductions.map((ded) => (
                          <div
                            key={ded.id}
                            className="rounded-md border border-border/50 bg-card p-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5">
                                <Percent className="h-3 w-3 shrink-0 text-signal-indigo" />
                                <span className="text-[10px] font-medium">
                                  {ded.label}
                                </span>
                                <span className="rounded-full border border-signal-indigo/20 bg-signal-indigo/10 px-1.5 py-0.5 text-[8px] font-medium text-signal-indigo">
                                  {ded.rate}
                                </span>
                              </div>
                              <span className="font-mono text-[9px] text-muted-foreground/60">
                                {ded.ruleVersion}
                              </span>
                            </div>
                            <p className="mt-1 text-[9px] text-muted-foreground">
                              <span className="font-medium text-foreground">
                                Why:
                              </span>{" "}
                              {ded.why}
                            </p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2 text-[9px]">
                        <span className="text-muted-foreground">
                          Total deductions:{" "}
                          {formatCurrency(
                            staff.deductions.reduce(
                              (sum, d) => sum + d.amount,
                              0,
                            ),
                          )}
                        </span>
                        <span className="font-medium">
                          Net pay: {formatCurrency(staff.netPay)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Per-Staff State Machine Pipeline */}
        <div role="region" aria-label="Per-Staff State Machine Pipeline">
          <h3 className="mb-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Per-Staff State Machine — one pass per staff member
          </h3>
          <div className="space-y-1.5">
            {PIPELINE_STATES.map((state, idx) => (
              <div
                key={state.id}
                role="listitem"
                className={cn(
                  "flex items-center gap-3 rounded-lg border p-3 transition-all duration-300",
                  idx === activeStateIdx &&
                    "bg-signal-indigo/5 border-signal-indigo/30 shadow-sm",
                  idx < activeStateIdx &&
                    "bg-balanced-green/5 border-balanced-green/20",
                  idx > activeStateIdx &&
                    "bg-muted/30 border-border/50 opacity-60",
                  state.id === "EXCEPTION_FLAGGED" &&
                    "bg-attention-amber/5 border-attention-amber/20",
                )}
              >
                <div
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-md shrink-0",
                    idx === activeStateIdx && "text-signal-indigo",
                    idx < activeStateIdx && "text-balanced-green",
                    idx > activeStateIdx && "text-muted-foreground/40",
                    state.id === "EXCEPTION_FLAGGED" && "text-attention-amber",
                  )}
                >
                  {idx === activeStateIdx ? (
                    <Activity className="h-4 w-4 animate-pulse" />
                  ) : idx < activeStateIdx ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <state.icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={cn(
                        "text-[10px] font-mono font-semibold tracking-tight",
                        idx === activeStateIdx && "text-signal-indigo",
                        idx < activeStateIdx && "text-balanced-green",
                        idx > activeStateIdx && "text-muted-foreground/40",
                        state.id === "EXCEPTION_FLAGGED" &&
                          "text-attention-amber",
                      )}
                    >
                      {state.label}
                    </span>
                    {idx < activeStateIdx && (
                      <CheckCircle2 className="h-2.5 w-2.5 shrink-0 text-balanced-green" />
                    )}
                    {idx === activeStateIdx && (
                      <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-signal-indigo" />
                    )}
                    {state.id === "EXCEPTION_FLAGGED" && (
                      <AlertTriangle className="h-2.5 w-2.5 shrink-0 text-attention-amber" />
                    )}
                  </div>
                  <p
                    className={cn(
                      "truncate text-[9px]",
                      idx <= activeStateIdx
                        ? "text-muted-foreground/80"
                        : "text-muted-foreground/40",
                    )}
                  >
                    {state.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Escalation & Human-in-the-Loop Triggers */}
        <div
          className="rounded-lg border bg-accent/20"
          role="region"
          aria-label="Escalation Triggers"
        >
          <div className="flex items-center gap-1.5 border-b bg-accent/30 px-3 py-2">
            <AlertTriangle className="h-3 w-3 text-attention-amber" />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              Escalation &amp; Human-in-the-Loop Triggers
            </span>
          </div>
          <div className="space-y-1 px-3 py-2">
            {ESCALATION_TRIGGERS.map((t, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 rounded-md border border-border/50 bg-card p-2 text-[9px]"
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-attention-amber" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{t.trigger}</p>
                  <p className="mt-0.5 text-signal-indigo">
                    Escalates to: {t.to}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{t.effect}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* How It Works Toggle */}
        <div className="overflow-hidden rounded-lg border bg-accent/20">
          <button
            onClick={() => setShowSteps(!showSteps)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                How It Works — Step-by-Step Decomposition
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showSteps && "rotate-180",
              )}
            />
          </button>

          {showSteps && (
            <div className="space-y-2.5 border-t px-3 py-3">
              {STEPS.map((step, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-signal-indigo/10 text-[8px] font-bold text-signal-indigo">
                      {idx + 1}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="w-px flex-1 bg-border" />
                    )}
                  </div>
                  <div className="pb-3">
                    <p className="text-[10px] font-medium text-foreground">
                      {step.title}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-relaxed text-muted-foreground">
                      {step.detail}
                    </p>
                  </div>
                </div>
              ))}
              <div className="rounded-md border border-attention-amber/30 bg-attention-amber/5 p-2">
                <p className="text-[9px] leading-relaxed text-attention-amber">
                  Critical rule: steps 3, 4, and 5 are NEVER combined into a
                  single &apos;deductions&apos; call. Each is a separate
                  deterministic calculation against its own stored rate table.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Constraint Enforcement Badges */}
        <div role="region" aria-label="Constraint Enforcement">
          <h3 className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
            Deterministic Constraints Enforced
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {CONSTRAINTS.map((c) => {
              const Icon = c.icon;
              return (
                <span
                  key={c.label}
                  className="inline-flex items-center gap-1 rounded-full border bg-balanced-green/10 px-2 py-0.5 text-[9px] font-medium text-balanced-green border-balanced-green/20"
                >
                  <CheckCircle2 className="h-2.5 w-2.5" />
                  {c.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Audit Trail Toggle */}
        <div className="overflow-hidden rounded-lg border bg-accent/20">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-accent/50"
          >
            <div className="flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-signal-indigo" />
              <span className="text-xs font-medium">
                Audit Trail — Every Deduction Line Logged
              </span>
            </div>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform duration-200",
                showAudit && "rotate-180",
              )}
            />
          </button>

          {showAudit && (
            <div className="border-t">
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]" role="table">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Staff
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        State
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Timestamp
                      </th>
                      <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                        Detail
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIT_TRAIL.map((entry, idx) => (
                      <tr
                        key={idx}
                        className="border-b last:border-b-0 transition-colors hover:bg-accent/30"
                        role="row"
                      >
                        <td className="px-3 py-1.5 font-medium">
                          {entry.staff}
                        </td>
                        <td className="px-3 py-1.5">
                          <span
                            className={cn(
                              "font-mono font-semibold",
                              getStateColor(entry.state as PayrollState),
                            )}
                          >
                            {entry.state}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 font-mono text-muted-foreground/60 tabular-nums">
                          {entry.ts}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground/80">
                          {entry.detail}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t bg-muted/20 px-3 py-1.5 text-[8px] text-muted-foreground/60">
                run: PR-2026-07 · entity: ent_2f8a1c · actor: Payroll Worker
                Agent · rate table dependency: Compliance Agent
              </div>
            </div>
          )}
        </div>

        {/* Liveness Footer */}
        <div
          className="rounded-lg border border-dashed bg-muted/20 p-2.5"
          role="region"
          aria-label="Liveness Transparency"
        >
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground/60">
            <Sparkles className="h-3 w-3 shrink-0 text-signal-indigo" />
            <span>
              <strong className="text-muted-foreground/80">
                Layer 1 — Deterministic:
              </strong>{" "}
              The Payroll Worker Agent carries{" "}
              <strong className="text-muted-foreground/80">
                zero confidence scores of its own
              </strong>
              . PAYE, SSHFC, and loan deductions are statutory formulas against
              stored rate tables — never AI estimates. Exceptions are never
              silently folded into the standard calc.{" "}
              <strong className="text-muted-foreground/80">
                Rate table last updated Jul 28, 2026
              </strong>{" "}
              (Compliance Agent dependency — staleness is visible, never assumed
              current).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
