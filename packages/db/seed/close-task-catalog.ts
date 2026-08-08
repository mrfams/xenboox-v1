/**
 * Default month-end close task catalog.
 *
 * Pure data + pure helpers — NO database imports. Shared by:
 *   - packages/db/seed/close-tasks.ts  (seeds real rows per entity + period)
 *   - apps/web/server/routers/close-center.ts  (auto-bootstraps a period's
 *     checklist on first read, and groups rows into the UI shape)
 *
 * Phase identifiers mirror closeTaskPhaseEnum in schema/close.ts.
 */

export type CloseTaskPhase =
  | "pre_close"
  | "closing_entries"
  | "reconciliations"
  | "reviews_approvals"
  | "reporting_finalization";

export interface CloseTaskDefinition {
  /** Stable slug — unique per entity + period (idempotent seeding). */
  taskKey: string;
  name: string;
  description?: string;
  phase: CloseTaskPhase;
  phaseOrder: number;
  sortOrder: number;
  ownerAgent: string;
  ownerInitials: string;
  ownerColor: string;
  isAutoCompletable: boolean;
}

export interface ClosePhaseMeta {
  id: string;
  name: string;
  order: number;
}

export const CLOSE_PHASES: ClosePhaseMeta[] = [
  { id: "pre-close", name: "Pre-Close", order: 1 },
  { id: "closing-entries", name: "Closing Entries", order: 2 },
  { id: "reconciliations", name: "Reconciliations", order: 3 },
  { id: "reviews-approvals", name: "Reviews & Approvals", order: 4 },
  { id: "reporting-finalization", name: "Reporting & Finalization", order: 5 },
];

export const PHASE_ID_BY_ENUM: Record<CloseTaskPhase, string> = {
  pre_close: "pre-close",
  closing_entries: "closing-entries",
  reconciliations: "reconciliations",
  reviews_approvals: "reviews-approvals",
  reporting_finalization: "reporting-finalization",
};

export const DEFAULT_CLOSE_TASKS: CloseTaskDefinition[] = [
  // ── Phase 1: Pre-Close ─────────────────────────────────────────────
  {
    taskKey: "review_bank_feeds",
    name: "Review bank feeds & categorize",
    description:
      "Review imported bank transactions and categorize unmatched items.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 1,
    ownerAgent: "Bank Reconciler Agent",
    ownerInitials: "BR",
    ownerColor: "bg-indigo-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "reconcile_bank_accounts",
    name: "Reconcile all bank accounts",
    description:
      "Every bank account reconciled to its statement with no unresolved items.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 2,
    ownerAgent: "Bank Reconciler Agent",
    ownerInitials: "BR",
    ownerColor: "bg-indigo-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "review_ap_aging",
    name: "Review accounts payable aging",
    description:
      "AP aging reviewed; overdue and disputed invoices resolved or flagged.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 3,
    ownerAgent: "AP Agent",
    ownerInitials: "AP",
    ownerColor: "bg-emerald-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "review_ar_aging",
    name: "Review accounts receivable aging",
    description:
      "AR aging reviewed; overdue invoices followed up or provisioned.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 4,
    ownerAgent: "AR Agent",
    ownerInitials: "AR",
    ownerColor: "bg-blue-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "verify_payroll",
    name: "Verify payroll for the month",
    description:
      "Payroll run reviewed: gross, deductions, net, and employer costs.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 5,
    ownerAgent: "Payroll Agent",
    ownerInitials: "PA",
    ownerColor: "bg-amber-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "review_accruals",
    name: "Review open items & accruals",
    description:
      "Open purchase orders, un-invoiced receipts, and recurring accruals reviewed.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 6,
    ownerAgent: "Journal Agent",
    ownerInitials: "JA",
    ownerColor: "bg-purple-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "verify_fixed_assets",
    name: "Verify fixed asset depreciation",
    description:
      "Asset register reconciled; disposals and additions posted for the period.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 7,
    ownerAgent: "Asset Agent",
    ownerInitials: "AS",
    ownerColor: "bg-cyan-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "verify_inventory",
    name: "Verify inventory counts & valuation",
    description:
      "Inventory movements reconciled and valuation adjusted to the policy.",
    phase: "pre_close",
    phaseOrder: 1,
    sortOrder: 8,
    ownerAgent: "Inventory Agent",
    ownerInitials: "IN",
    ownerColor: "bg-rose-500",
    isAutoCompletable: true,
  },

  // ── Phase 2: Closing Entries ────────────────────────────────────────
  {
    taskKey: "post_accruals",
    name: "Post month-end accruals",
    description:
      "Accrued expenses and deferred revenue entries posted for the period.",
    phase: "closing_entries",
    phaseOrder: 2,
    sortOrder: 9,
    ownerAgent: "Journal Agent",
    ownerInitials: "JA",
    ownerColor: "bg-purple-500",
    isAutoCompletable: false,
  },
  {
    taskKey: "post_depreciation",
    name: "Post depreciation entries",
    description:
      "Depreciation for the period posted against accumulated depreciation.",
    phase: "closing_entries",
    phaseOrder: 2,
    sortOrder: 10,
    ownerAgent: "Asset Agent",
    ownerInitials: "AS",
    ownerColor: "bg-cyan-500",
    isAutoCompletable: false,
  },
  {
    taskKey: "post_fx_revaluation",
    name: "Post FX revaluations",
    description: "Foreign currency balances revalued at period-end rates.",
    phase: "closing_entries",
    phaseOrder: 2,
    sortOrder: 11,
    ownerAgent: "Treasury Agent",
    ownerInitials: "TR",
    ownerColor: "bg-teal-500",
    isAutoCompletable: false,
  },
  {
    taskKey: "post_amortization",
    name: "Post prepaid amortization",
    description: "Prepaid expenses amortized to the correct expense accounts.",
    phase: "closing_entries",
    phaseOrder: 2,
    sortOrder: 12,
    ownerAgent: "Journal Agent",
    ownerInitials: "JA",
    ownerColor: "bg-purple-500",
    isAutoCompletable: false,
  },
  {
    taskKey: "post_adjustments",
    name: "Post review adjustments",
    description: "Adjustments from the pre-close review posted and approved.",
    phase: "closing_entries",
    phaseOrder: 2,
    sortOrder: 13,
    ownerAgent: "Controller Agent",
    ownerInitials: "CT",
    ownerColor: "bg-slate-700",
    isAutoCompletable: false,
  },

  // ── Phase 3: Reconciliations ────────────────────────────────────────
  {
    taskKey: "reconcile_cash",
    name: "Reconcile cash accounts",
    description: "Petty cash and imprest floats reconciled to GL balances.",
    phase: "reconciliations",
    phaseOrder: 3,
    sortOrder: 14,
    ownerAgent: "Cash Agent",
    ownerInitials: "CA",
    ownerColor: "bg-emerald-600",
    isAutoCompletable: true,
  },
  {
    taskKey: "reconcile_mobile_money",
    name: "Reconcile mobile money",
    description: "Mobile money wallets reconciled against provider statements.",
    phase: "reconciliations",
    phaseOrder: 3,
    sortOrder: 15,
    ownerAgent: "Mobile Money Agent",
    ownerInitials: "MM",
    ownerColor: "bg-orange-500",
    isAutoCompletable: true,
  },
  {
    taskKey: "reconcile_intercompany",
    name: "Reconcile intercompany accounts",
    description: "Intercompany balances net to zero across all entities.",
    phase: "reconciliations",
    phaseOrder: 3,
    sortOrder: 16,
    ownerAgent: "Controller Agent",
    ownerInitials: "CT",
    ownerColor: "bg-slate-700",
    isAutoCompletable: false,
  },
  {
    taskKey: "reconcile_subledgers",
    name: "Reconcile GL to sub-ledgers",
    description:
      "AP, AR, fixed asset, and inventory sub-ledgers agree to the GL.",
    phase: "reconciliations",
    phaseOrder: 3,
    sortOrder: 17,
    ownerAgent: "Ledger Agent",
    ownerInitials: "LG",
    ownerColor: "bg-sky-600",
    isAutoCompletable: false,
  },
  {
    taskKey: "verify_trial_balance",
    name: "Verify trial balance balances",
    description: "Debits equal credits after all closing entries are posted.",
    phase: "reconciliations",
    phaseOrder: 3,
    sortOrder: 18,
    ownerAgent: "Controller Agent",
    ownerInitials: "CT",
    ownerColor: "bg-slate-700",
    isAutoCompletable: false,
  },

  // ── Phase 4: Reviews & Approvals ────────────────────────────────────
  {
    taskKey: "controller_review",
    name: "Controller review of all postings",
    description:
      "All period postings reviewed and confirmed by the Controller Agent.",
    phase: "reviews_approvals",
    phaseOrder: 4,
    sortOrder: 19,
    ownerAgent: "Controller Agent",
    ownerInitials: "CT",
    ownerColor: "bg-slate-700",
    isAutoCompletable: false,
  },
  {
    taskKey: "treasury_review",
    name: "Treasury review of cash position",
    description:
      "Bank, cash, and mobile money reconciliations confirmed clean.",
    phase: "reviews_approvals",
    phaseOrder: 4,
    sortOrder: 20,
    ownerAgent: "Treasury Agent",
    ownerInitials: "TR",
    ownerColor: "bg-teal-500",
    isAutoCompletable: false,
  },
  {
    taskKey: "compliance_review",
    name: "Compliance review (VAT / PAYE / deadlines)",
    description:
      "VAT and payroll taxes calculated; no missed filing deadlines.",
    phase: "reviews_approvals",
    phaseOrder: 4,
    sortOrder: 21,
    ownerAgent: "Compliance Agent",
    ownerInitials: "CO",
    ownerColor: "bg-red-500",
    isAutoCompletable: false,
  },
  {
    taskKey: "cfo_signoff",
    name: "CFO sign-off on close package",
    description: "CFO Agent confirms the close package before finalization.",
    phase: "reviews_approvals",
    phaseOrder: 4,
    sortOrder: 22,
    ownerAgent: "CFO Agent",
    ownerInitials: "CFO",
    ownerColor: "bg-indigo-700",
    isAutoCompletable: false,
  },

  // ── Phase 5: Reporting & Finalization ───────────────────────────────
  {
    taskKey: "generate_financials",
    name: "Generate P&L, Balance Sheet & Cash Flow",
    description:
      "Final period reports generated and archived to the artifact store.",
    phase: "reporting_finalization",
    phaseOrder: 5,
    sortOrder: 23,
    ownerAgent: "Reporting Agent",
    ownerInitials: "RE",
    ownerColor: "bg-fuchsia-600",
    isAutoCompletable: false,
  },
  {
    taskKey: "notify_owner",
    name: "Notify owner with close package",
    description:
      "Owner notified with the close summary — the legal acknowledgment moment.",
    phase: "reporting_finalization",
    phaseOrder: 5,
    sortOrder: 24,
    ownerAgent: "CFO Agent",
    ownerInitials: "CFO",
    ownerColor: "bg-indigo-700",
    isAutoCompletable: false,
  },
  {
    taskKey: "lock_period",
    name: "Lock the fiscal period",
    description:
      "Period locked so no further postings are accepted without a reopen.",
    phase: "reporting_finalization",
    phaseOrder: 5,
    sortOrder: 25,
    ownerAgent: "Ledger Agent",
    ownerInitials: "LG",
    ownerColor: "bg-sky-600",
    isAutoCompletable: false,
  },
];

/**
 * Deterministic display due date for a task in a period.
 * Spreads due dates across the last third of the month (20th onward),
 * clamped to the last day of the period.
 */
export function dueDateForPeriod(
  period: string, // "YYYY-MM"
  sortOrder: number,
): string {
  const [year, month] = period.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const day = Math.min(20 + Math.floor((sortOrder - 1) / 3), lastDay);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Deterministic seed status mix — by catalog index (0-based). */
export function seedStatusForIndex(index: number): {
  status: "pending" | "in_review" | "completed";
  autoCompleted: boolean;
} {
  if (index < 4) return { status: "completed", autoCompleted: true };
  if (index === 4) return { status: "in_review", autoCompleted: false };
  return { status: "pending", autoCompleted: false };
}

/** Deterministic confidence for completed tasks (percent, e.g. 98 → 0.98). */
export function seedConfidenceForIndex(index: number): string | null {
  const percents = [98, 95, 97, 92];
  if (index < percents.length) return (percents[index] / 100).toFixed(4);
  return null;
}

/**
 * Build the Close Center checklist shape from close_tasks rows.
 * Pure — no DB access — so it is unit-testable and shared with the router.
 *
 * Rows must include: id, name, ownerAgent, ownerInitials, ownerColor,
 * status, confidence, dueDate, phase, phaseOrder, sortOrder.
 */
export interface ChecklistTaskRow {
  id: string;
  name: string;
  ownerAgent: string;
  ownerInitials: string | null;
  ownerColor: string | null;
  status: string;
  confidence: string | null;
  dueDate: string | null;
  phase: CloseTaskPhase;
  phaseOrder: number;
  sortOrder: number;
}

export function buildChecklistShape(rows: ChecklistTaskRow[]): {
  phases: Array<{
    id: string;
    name: string;
    order: number;
    tasks?: Array<{
      id: string;
      name: string;
      owner: string;
      ownerInitials: string;
      ownerColor: string;
      status: string;
      confidence: number | null;
      dueDate: string;
      phase: string;
      sortOrder: number;
    }>;
    taskCount?: number;
    isExpanded?: boolean;
  }>;
  totalTasks: number;
  completedTasks: number;
} {
  const phases = CLOSE_PHASES.map((p) => {
    const phaseRows = rows
      .filter((r) => PHASE_ID_BY_ENUM[r.phase] === p.id)
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return {
      id: p.id,
      name: p.name,
      order: p.order,
      ...(phaseRows.length > 0
        ? {
            tasks: phaseRows.map((r) => ({
              id: r.id,
              name: r.name,
              owner: r.ownerAgent,
              ownerInitials: r.ownerInitials ?? r.ownerAgent.slice(0, 2),
              ownerColor: r.ownerColor ?? "bg-slate-500",
              status: r.status,
              confidence: r.confidence
                ? Math.round(parseFloat(r.confidence) * 100)
                : null,
              dueDate: r.dueDate ?? "—",
              phase: r.phase,
              sortOrder: r.sortOrder,
            })),
            isExpanded: p.id === "pre-close",
          }
        : {
            taskCount: 0,
            isExpanded: false,
          }),
    };
  });

  return {
    phases,
    totalTasks: rows.length,
    completedTasks: rows.filter((r) => r.status === "completed").length,
  };
}
