import { db } from "@xenboox/db";
import { eq, and, lte, gte, desc, sql } from "drizzle-orm";
import { chartOfAccounts } from "@xenboox/db/schema/accounting";
import {
  filingDeadlines,
  complianceDeadlines,
  ruleChangeProposals,
} from "@xenboox/db/schema/tax-compliance";

export interface FilingStatus {
  vat: "current" | "overdue" | "not_applicable";
  incomeTax: "current" | "overdue";
  payroll: "current" | "overdue";
}

export interface DeadlineItem {
  id: string;
  name: string;
  jurisdiction: string;
  filingType: string;
  dueDate: string;
  daysUntilDue: number;
  urgency: "normal" | "approaching" | "critical" | "overdue";
  status: string;
  packageReady: boolean;
  taxAgentReviewStatus: string;
  regulatoryStatus: string;
}

export interface RuleChangeProposal {
  id: string;
  jurisdiction: string;
  ruleType: string;
  ruleName: string;
  detectedAt: string;
  sourceCitation: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  effectiveDate: string | null;
  status: string;
  sourceConfidence: number | null;
}

export async function reviewTaxPosition(entityId: string): Promise<{
  hasTaxEntries: boolean;
  taxAccounts: Array<{ code: string; name: string; balance: number }>;
}> {
  const taxAccounts = await db.query.chartOfAccounts.findMany({
    where: and(eq(chartOfAccounts.entityId, entityId)),
  });

  const taxRelated = taxAccounts.filter(
    (a) =>
      a.subtype === "tax_liability" ||
      a.subtype === "tax_expense" ||
      a.code?.startsWith("24") ||
      a.code?.startsWith("52"),
  );

  return {
    hasTaxEntries: taxRelated.length > 0,
    taxAccounts: taxRelated.map((a) => ({
      code: a.code ?? "",
      name: a.name,
      balance: 0,
    })),
  };
}

export async function checkFilingStatus(
  entityId: string,
): Promise<FilingStatus> {
  const now = new Date().toISOString();

  const overdues = await db.query.filingDeadlines.findMany({
    where: and(
      eq(filingDeadlines.entityId, entityId),
      eq(filingDeadlines.status, "overdue"),
    ),
  });

  const vatOverdue = overdues.some((d) => d.filingType === "vat");
  const incomeTaxOverdue = overdues.some(
    (d) => d.filingType === "corporate_tax" || d.filingType === "income_tax",
  );
  const payrollOverdue = overdues.some(
    (d) => d.filingType === "paye" || d.filingType === "payroll",
  );

  return {
    vat: vatOverdue ? "overdue" : "current",
    incomeTax: incomeTaxOverdue ? "overdue" : "current",
    payroll: payrollOverdue ? "overdue" : "current",
  };
}

export async function monitorDeadlines(entityId: string): Promise<{
  deadlines: DeadlineItem[];
  approachingDeadlines: DeadlineItem[];
  criticalDeadlines: DeadlineItem[];
  overdueDeadlines: DeadlineItem[];
  monitoringState: {
    status: "monitoring" | "deadline_approaching";
    threshold: number | null;
    escalatedDeadlines: string[];
  };
}> {
  const rows = await db.query.complianceDeadlines.findMany({
    where: eq(complianceDeadlines.entityId, entityId),
    orderBy: [complianceDeadlines.dueDate],
  });

  const now = new Date();
  const deadlines: DeadlineItem[] = rows.map((r) => {
    const due = new Date(r.dueDate);
    const daysUntilDue = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    let urgency: DeadlineItem["urgency"] = "normal";
    if (daysUntilDue <= 0) urgency = "overdue";
    else if (daysUntilDue <= 7) urgency = "critical";
    else if (daysUntilDue <= 14) urgency = "approaching";
    return {
      id: r.id,
      name: r.name,
      jurisdiction: r.jurisdiction,
      filingType: r.filingType,
      dueDate: r.dueDate.toISOString(),
      daysUntilDue,
      urgency,
      status: r.status,
      packageReady: r.packageReady,
      taxAgentReviewStatus: r.taxAgentReviewStatus ?? "pending",
      regulatoryStatus: r.regulatoryStatus ?? "clean",
    };
  });

  const approaching = deadlines.filter(
    (d) => d.urgency === "approaching" || d.urgency === "critical",
  );
  const critical = deadlines.filter((d) => d.urgency === "critical");
  const overdue = deadlines.filter((d) => d.urgency === "overdue");

  const anyUrgent = approaching.length > 0 || overdue.length > 0;

  return {
    deadlines,
    approachingDeadlines: approaching,
    criticalDeadlines: critical,
    overdueDeadlines: overdue,
    monitoringState: {
      status: anyUrgent ? "deadline_approaching" : "monitoring",
      threshold: critical.length > 0 ? 7 : approaching.length > 0 ? 14 : null,
      escalatedDeadlines: [
        ...critical.map((d) => d.id),
        ...overdue.map((d) => d.id),
      ],
    },
  };
}

export async function reviewTaxAgentOutput(
  entityId: string,
  deadlineId: string,
): Promise<{
  passed: boolean;
  reason: string | null;
}> {
  const deadline = await db.query.complianceDeadlines.findFirst({
    where: and(
      eq(complianceDeadlines.id, deadlineId),
      eq(complianceDeadlines.entityId, entityId),
    ),
  });

  if (!deadline) {
    return { passed: false, reason: "Deadline not found" };
  }

  const packageReady = deadline.packageReady;
  const reviewPassed =
    packageReady && deadline.taxAgentReviewStatus !== "kicked_back";

  if (reviewPassed) {
    await db
      .update(complianceDeadlines)
      .set({ taxAgentReviewStatus: "passed", lastCheckedAt: new Date() })
      .where(eq(complianceDeadlines.id, deadlineId));
    return { passed: true, reason: null };
  }

  await db
    .update(complianceDeadlines)
    .set({ taxAgentReviewStatus: "kicked_back", lastCheckedAt: new Date() })
    .where(eq(complianceDeadlines.id, deadlineId));

  return {
    passed: false,
    reason: packageReady
      ? "Tax Agent output requires revision"
      : "Submission package not ready for review",
  };
}

export async function detectRuleChanges(entityId: string): Promise<{
  proposals: RuleChangeProposal[];
  hasPendingProposals: boolean;
}> {
  const rows = await db.query.ruleChangeProposals.findMany({
    where: and(
      eq(ruleChangeProposals.entityId, entityId),
      eq(ruleChangeProposals.status, "pending"),
    ),
    orderBy: [desc(ruleChangeProposals.detectedAt)],
  });

  const proposals: RuleChangeProposal[] = rows.map((r) => ({
    id: r.id,
    jurisdiction: r.jurisdiction,
    ruleType: r.ruleType,
    ruleName: r.ruleName,
    detectedAt: r.detectedAt.toISOString(),
    sourceCitation: r.sourceCitation,
    oldValue: r.oldValue,
    newValue: r.newValue,
    effectiveDate: r.effectiveDate?.toISOString() ?? null,
    status: r.status,
    sourceConfidence: r.sourceConfidence ? Number(r.sourceConfidence) : null,
  }));

  return { proposals, hasPendingProposals: proposals.length > 0 };
}

export async function confirmRuleUpdate(
  proposalId: string,
  confirmedBy: string,
): Promise<{
  success: boolean;
}> {
  await db
    .update(ruleChangeProposals)
    .set({
      status: "confirmed",
      confirmedBy,
      confirmedAt: new Date(),
    })
    .where(eq(ruleChangeProposals.id, proposalId));

  return { success: true };
}

export async function reportRegulatoryStatus(entityId: string): Promise<{
  status: "clean" | "items_pending" | "risk_detected";
  summary: string;
  pendingItems: number;
}> {
  const deadlineRows = await db.query.complianceDeadlines.findMany({
    where: eq(complianceDeadlines.entityId, entityId),
  });

  const overdue = deadlineRows.filter((d) => d.status === "overdue");
  const pending = deadlineRows.filter(
    (d) => d.status === "pending" && d.regulatoryStatus !== "clean",
  );
  const riskDetected = deadlineRows.filter(
    (d) => d.regulatoryStatus === "risk_detected",
  );

  let status: "clean" | "items_pending" | "risk_detected";
  let summary: string;

  if (riskDetected.length > 0) {
    status = "risk_detected";
    summary = `${riskDetected.length} regulatory risk(s) detected — immediate attention required`;
  } else if (overdue.length > 0) {
    status = "items_pending";
    summary = `${overdue.length} filing(s) overdue`;
  } else if (pending.length > 0) {
    status = "items_pending";
    summary = `${pending.length} item(s) require attention`;
  } else {
    status = "clean";
    summary = "All compliance items current";
  }

  return {
    status,
    summary,
    pendingItems: overdue.length + pending.length + riskDetected.length,
  };
}
