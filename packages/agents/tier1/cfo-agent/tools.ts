import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import type {
  DepartmentConfirmation,
  EscalationItem,
  SourceRef,
  DepartmentResponse,
  EscalationFrame,
} from "./state";

// ─── Instruction Classification ────────────────────────────────────────────

export type InstructionType =
  | "question"
  | "instruction"
  | "close_trigger"
  | "close_flag"
  | "approval"
  | "clarification";

export function classifyInstruction(text: string): InstructionType {
  const lower = text.toLowerCase().trim();

  if (
    /^(close|month.end|period.end)/.test(lower) &&
    /close|run|process/.test(lower)
  ) {
    return "close_trigger";
  }
  if (/^(yes|no|approve|reject|confirmed|go ahead|proceed)/.test(lower)) {
    return "approval";
  }
  if (
    /what|how|when|show|give me|tell me|list|report|summary/.test(lower) &&
    !/close|post|enter|create|record/.test(lower)
  ) {
    return "question";
  }
  if (/wrong|error|mistake|fix|reopen|incorrect|issue/.test(lower)) {
    return "close_flag";
  }
  return "instruction";
}

// ─── Department Routing (Multi-Department — Liveness Spec §3) ─────────────

export type Department =
  | "controller"
  | "treasury"
  | "payroll_manager"
  | "compliance";

export const ALL_DEPARTMENT_NAMES: Department[] = [
  "controller",
  "treasury",
  "payroll_manager",
  "compliance",
];

export function getDepartmentDisplayName(dept: Department): string {
  const map: Record<Department, string> = {
    controller: "Controller",
    treasury: "Treasury",
    payroll_manager: "Payroll Manager",
    compliance: "Compliance",
  };
  return map[dept];
}

/** Returns all departments relevant to an instruction (may be more than one). */
export function routeToDepartments(instruction: string): Department[] {
  const lower = instruction.toLowerCase();
  const matched: Department[] = [];

  if (/payroll|salary|wage|benefit|employee pay|staff pay/.test(lower)) {
    matched.push("payroll_manager");
  }
  if (/cash|bank|reconcil|payment|mobile money|expense|treasury/.test(lower)) {
    matched.push("treasury");
  }
  if (/tax|filing|compliance|audit|regulatory|vat/.test(lower)) {
    matched.push("compliance");
  }
  if (
    /journal|entry|trial balance|ap|ar|asset|inventory|gl|ledger|account|invoice|supplier|customer|coa/.test(
      lower,
    )
  ) {
    matched.push("controller");
  }

  // If nothing matched, default to controller
  if (matched.length === 0) matched.push("controller");

  // Deduplicate
  return [...new Set(matched)];
}

/** Single-department route — backward-compatible wrapper */
export function routeToDepartment(instruction: string): Department {
  return routeToDepartments(instruction)[0];
}

// ─── Source Ref Helpers (§9) ───────────────────────────────────────────────

export function createSourceRef(params: {
  claim: string;
  sourceDepartment: string;
  sourceSummaryExcerpt: string;
  confidence: number;
}): SourceRef {
  return {
    claim: params.claim,
    sourceDepartment: params.sourceDepartment,
    sourceSummaryExcerpt: params.sourceSummaryExcerpt,
    confidence: params.confidence,
  };
}

export function extractSourceRefsFromResponses(
  responses: DepartmentResponse[],
): SourceRef[] {
  return responses.flatMap((r) => r.sourceRefs);
}

// ─── Response Synthesis (§3 step 4 — composition only, no new facts) ──────

export function synthesizeResponse(params: {
  departmentResponses: DepartmentResponse[];
  originalInstruction: string;
}): { answer: string; sourceRefs: SourceRef[] } {
  const { departmentResponses, originalInstruction } = params;
  const received = departmentResponses.filter(
    (r) => r.status === "received" && r.summary,
  );
  const pending = departmentResponses.filter((r) => r.status === "pending");
  const errored = departmentResponses.filter(
    (r) => r.status === "error" || r.status === "timed_out",
  );

  const parts: string[] = [];
  const allRefs: SourceRef[] = [];

  for (const dept of received) {
    if (dept.summary) {
      parts.push(
        `From ${getDepartmentDisplayName(dept.department as Department)}: ${dept.summary}`,
      );
      allRefs.push(...dept.sourceRefs);
    }
  }

  if (pending.length > 0) {
    const names = pending
      .map((r) => getDepartmentDisplayName(r.department as Department))
      .join(", ");
    parts.push(`Still waiting on ${names}.`);
  }

  if (errored.length > 0) {
    for (const dept of errored) {
      parts.push(
        `${getDepartmentDisplayName(dept.department as Department)} encountered an issue and could not provide data.`,
      );
    }
  }

  const answer = parts.join("\n\n");

  return { answer, sourceRefs: allRefs };
}

// ─── Escalation Framing (§3 step 5, §6) ────────────────────────────────────

export function frameEscalation(params: {
  triggeringAgent: string;
  triggeringDataRef: string;
  originalInput: string;
  departmentAssessment: string;
  recommendation: string;
  timeSensitivity?: string | null;
}): EscalationFrame {
  return {
    id: crypto.randomUUID(),
    triggeringAgent: params.triggeringAgent,
    triggeringDataRef: params.triggeringDataRef,
    originalInput: params.originalInput,
    departmentAssessment: params.departmentAssessment,
    recommendation: params.recommendation,
    timeSensitivity: params.timeSensitivity ?? null,
    presentedAt: null,
    resolvedAt: null,
    resolution: null,
  };
}

// ─── Department Waiting Status ─────────────────────────────────────────────

export function isWaitingOnDepartments(responses: DepartmentResponse[]): {
  waiting: boolean;
  waitingOn: string[];
  received: string[];
  timedOut: string[];
} {
  const waitingOn = responses
    .filter((r) => r.status === "pending")
    .map((r) => getDepartmentDisplayName(r.department as Department));
  const received = responses
    .filter((r) => r.status === "received")
    .map((r) => getDepartmentDisplayName(r.department as Department));
  const timedOut = responses
    .filter((r) => r.status === "timed_out")
    .map((r) => getDepartmentDisplayName(r.department as Department));

  return {
    waiting: waitingOn.length > 0,
    waitingOn,
    received,
    timedOut,
  };
}

// ─── Close Readiness Check ─────────────────────────────────────────────────

export function evaluateCloseReadiness(departments: {
  controller: DepartmentConfirmation;
  treasury: DepartmentConfirmation;
  payrollManager: DepartmentConfirmation;
  compliance: DepartmentConfirmation;
}): { ready: boolean; blockers: string[]; overallConfidence: number } {
  const blockers: string[] = [];
  const confidences: number[] = [];

  const checks: Array<{ name: string; dept: DepartmentConfirmation }> = [
    { name: "Controller", dept: departments.controller },
    { name: "Treasury", dept: departments.treasury },
    { name: "Payroll Manager", dept: departments.payrollManager },
    { name: "Compliance", dept: departments.compliance },
  ];

  for (const check of checks) {
    if (!check.dept.confirmed) {
      blockers.push(`${check.name} has not confirmed`);
    }
    if (check.dept.confidence !== null && check.dept.confidence < 0.8) {
      blockers.push(
        `${check.name} confidence ${check.dept.confidence} below 0.8 threshold`,
      );
    }
    if (check.dept.confidence !== null) {
      confidences.push(check.dept.confidence);
    }
  }

  const overallConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  return {
    ready: blockers.length === 0,
    blockers,
    overallConfidence,
  };
}

// ─── Escalation Helpers ────────────────────────────────────────────────────

export function createEscalation(params: {
  fromAgent: string;
  severity: "info" | "warning" | "critical";
  description: string;
  context: string;
}): EscalationItem {
  return {
    id: crypto.randomUUID(),
    ...params,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
  };
}

// ─── Financial Summary Query ───────────────────────────────────────────────

export async function getEntityFinancialSummary(entityId: string) {
  // Get current open period
  const openPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "open"),
    ),
  });

  if (!openPeriod) {
    return { period: null, accountCount: 0, totalActivity: 0 };
  }

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, openPeriod.id),
      eq(journalEntries.status, "posted"),
    ),
  });

  let totalActivity = 0;
  const accountIds = new Set<string>();

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    });
    for (const line of lines) {
      totalActivity += Number(line.debit) + Number(line.credit);
      accountIds.add(line.accountId);
    }
  }

  return {
    period: `${openPeriod.year}-${String(openPeriod.month).padStart(2, "0")}`,
    accountCount: accountIds.size,
    totalActivity,
    entryCount: entries.length,
  };
}
