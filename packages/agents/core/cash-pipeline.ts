// ─── Autonomous Cash & Imprest Pipeline ──────────────────────────────────
//
// Pipeline 4 of 6: feeds into the Treasury Agent (Tier 2).
//
// Pipeline Steps:
//   1. Daily Cash Position  — Get current cash balances across all accounts
//   2. Imprest Scan         — Scan for overdue/expiring imprest floats
//   3. Discrepancy Check    — Compare ledger vs actual balances
//   4. Summary Generation   — Build consolidated cash health summary
//   5. Confidence Gate      — Check overall health against threshold
//   6a. Auto-Close          — Proceed if healthy
//   6b. Escalate to Human   — Push anomalies to approval queue

import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  cashAccounts,
  imprestFloats,
  imprestReceipts,
  pettyCashLedger,
} from "@xenboox/db/schema/cash";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CashPosition {
  accountId: string;
  accountName: string;
  currency: string;
  currentBalance: number;
  isActive: boolean;
}

export interface ImprestStatus {
  floatId: string;
  cashAccountId: string;
  assigneeName: string;
  amount: number;
  remainingBalance: number;
  status: "active" | "settled" | "expired" | "cancelled";
  issuedDate: string;
  settleByDate: string | null;
  daysOutstanding: number;
  receiptsCount: number;
  totalReceiptsAmount: number;
}

export interface DiscrepancyItem {
  location: string;
  expected: number;
  actual: number;
  difference: number;
  severity: "minor" | "moderate" | "material" | "critical";
}

export interface CashPipelineResult {
  success: boolean;
  accounts: CashPosition[];
  totalBalance: number;
  activeImprestFloats: number;
  totalOutstandingImprest: number;
  overdueImprestFloats: number;
  discrepancyCount: number;
  criticalDiscrepancies: number;
  overallScore: number; // 0-1 health score
  healthStatus: "healthy" | "warning" | "critical";
  escalated: boolean;
  escalationReason?: string;
  auditEntries: AuditEntry[];
  durationMs: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const HEALTHY_THRESHOLD = 0.85;
const OVERDUE_IMPREST_DAYS = 30;

// ─── Step 1: Get Daily Cash Position ─────────────────────────────────────

async function getCashPositions(entityId: string): Promise<{
  accounts: CashPosition[];
  totalBalance: number;
  imprestFloats: ImprestStatus[];
  activeImprestCount: number;
  totalOutstandingImprest: number;
}> {
  const accounts = await db.query.cashAccounts.findMany({
    where: and(
      eq(cashAccounts.entityId, entityId),
      eq(cashAccounts.isActive, true),
    ),
  });

  const positions: CashPosition[] = accounts.map((a) => ({
    accountId: a.id,
    accountName: a.name,
    currency: a.currency,
    currentBalance: Number(a.currentBalance),
    isActive: a.isActive,
  }));

  const totalBalance = positions.reduce((s, a) => s + a.currentBalance, 0);

  // Get all imprest floats (active + recently settled)
  const floats = await db.query.imprestFloats.findMany({
    where: eq(imprestFloats.entityId, entityId),
    orderBy: [desc(imprestFloats.createdAt)],
  });

  const now = new Date();
  const imprestStatuses: ImprestStatus[] = [];

  // Batch-fetch all receipts for all floats in a single query (N+1 fix)
  const floatIds = floats.map((f) => f.id);
  const allReceipts =
    floatIds.length > 0
      ? await db.query.imprestReceipts.findMany({
          where: inArray(
            imprestReceipts.imprestFloatId,
            floatIds as [string, ...string[]],
          ),
        })
      : [];

  const receiptsByFloatId = new Map<string, typeof allReceipts>();
  for (const receipt of allReceipts) {
    const existing = receiptsByFloatId.get(receipt.imprestFloatId) ?? [];
    existing.push(receipt);
    receiptsByFloatId.set(receipt.imprestFloatId, existing);
  }

  for (const float of floats) {
    const receipts = receiptsByFloatId.get(float.id) ?? [];
    const totalReceiptsAmount = receipts.reduce(
      (s, r) => s + Number(r.amount),
      0,
    );
    const daysOutstanding = float.issuedDate
      ? Math.floor(
          (now.getTime() - new Date(float.issuedDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    imprestStatuses.push({
      floatId: float.id,
      cashAccountId: float.cashAccountId,
      assigneeName: float.assigneeName,
      amount: Number(float.amount),
      remainingBalance: Number(float.remainingBalance),
      status: float.status as ImprestStatus["status"],
      issuedDate: float.issuedDate,
      settleByDate: float.settleByDate,
      daysOutstanding,
      receiptsCount: receipts.length,
      totalReceiptsAmount,
    });
  }

  const activeImprestFloats = imprestStatuses.filter(
    (f) => f.status === "active",
  );
  const activeImprestCount = activeImprestFloats.length;
  const totalOutstandingImprest = activeImprestFloats.reduce(
    (s, f) => s + f.remainingBalance,
    0,
  );

  return {
    accounts: positions,
    totalBalance,
    imprestFloats: imprestStatuses,
    activeImprestCount,
    totalOutstandingImprest,
  };
}

// ─── Step 2: Scan for Overdue Imprest ────────────────────────────────────

function scanOverdueImprest(imprestFloats: ImprestStatus[]): {
  overdue: ImprestStatus[];
  expiringSoon: ImprestStatus[];
  count: number;
} {
  const now = new Date();
  const overdue: ImprestStatus[] = [];
  const expiringSoon: ImprestStatus[] = [];

  for (const float of imprestFloats) {
    if (float.status !== "active") continue;

    if (float.daysOutstanding > OVERDUE_IMPREST_DAYS) {
      overdue.push(float);
    } else if (float.settleByDate) {
      const settleBy = new Date(float.settleByDate);
      const daysUntilDue = Math.floor(
        (settleBy.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        expiringSoon.push(float);
      }
    }
  }

  return {
    overdue,
    expiringSoon,
    count: overdue.length + expiringSoon.length,
  };
}

// ─── Step 3: Check Discrepancies ─────────────────────────────────────────

async function checkDiscrepancies(entityId: string): Promise<{
  discrepancies: DiscrepancyItem[];
  count: number;
  criticalCount: number;
}> {
  const accounts = await db.query.cashAccounts.findMany({
    where: and(
      eq(cashAccounts.entityId, entityId),
      eq(cashAccounts.isActive, true),
    ),
  });

  const items: DiscrepancyItem[] = [];
  const accountIds = accounts.map((a) => a.id);

  const allLedgers =
    accountIds.length > 0
      ? await db.query.pettyCashLedger.findMany({
          where: inArray(
            pettyCashLedger.cashAccountId,
            accountIds as [string, ...string[]],
          ),
          orderBy: [desc(pettyCashLedger.createdAt)],
        })
      : [];

  // De-duplicate to latest per account
  const latestByAccount = new Map<string, (typeof allLedgers)[0]>();
  for (const ledger of allLedgers) {
    if (!latestByAccount.has(ledger.cashAccountId)) {
      latestByAccount.set(ledger.cashAccountId, ledger);
    }
  }

  for (const account of accounts) {
    const latestLedger = latestByAccount.get(account.id);
    if (!latestLedger) continue;

    const recordedBalance = Number(account.currentBalance);
    const ledgerBalance = Number(latestLedger.balance);
    const difference = ledgerBalance - recordedBalance;

    if (Math.abs(difference) > 0.01) {
      const base = recordedBalance > 0 ? recordedBalance : 1;
      const pct = (Math.abs(difference) / base) * 100;

      let severity: DiscrepancyItem["severity"] = "minor";
      if (pct >= 10) severity = "critical";
      else if (pct >= 5) severity = "material";
      else if (pct >= 1) severity = "moderate";

      items.push({
        location: account.name,
        expected: recordedBalance,
        actual: ledgerBalance,
        difference,
        severity,
      });
    }
  }

  return {
    discrepancies: items,
    count: items.length,
    criticalCount: items.filter(
      (d) => d.severity === "critical" || d.severity === "material",
    ).length,
  };
}

// ─── Step 4: Build Health Score ──────────────────────────────────────────

function calculateHealthScore(params: {
  totalBalance: number;
  overdueImprestCount: number;
  totalActiveFloats: number;
  discrepancyCount: number;
  criticalCount: number;
}): number {
  let score = 1.0;

  // Penalties for overdue imprests
  if (params.totalActiveFloats > 0) {
    const overdueRatio = params.overdueImprestCount / params.totalActiveFloats;
    score -= overdueRatio * 0.3;
  }

  // Penalties for discrepancies
  if (params.discrepancyCount > 0) {
    const criticalPenalty = params.criticalCount * 0.15;
    const minorPenalty =
      (params.discrepancyCount - params.criticalCount) * 0.05;
    score -= Math.min(criticalPenalty + minorPenalty, 0.5);
  }

  // No cash is a problem
  if (params.totalBalance <= 0) {
    score -= 0.2;
  }

  return Math.max(0, Math.min(1, score));
}

// ─── Main Pipeline Entry Point ───────────────────────────────────────────

export async function runCashPipeline(
  entityId: string,
): Promise<CashPipelineResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "cash-pipeline",
    metadata: { entityId },
  });

  const auditEntries: AuditEntry[] = [];

  try {
    // Step 1: Get positions
    const {
      accounts,
      totalBalance,
      imprestFloats,
      activeImprestCount,
      totalOutstandingImprest,
    } = await getCashPositions(entityId);

    // Step 2: Scan imprests
    const {
      overdue,
      expiringSoon,
      count: overdueCount,
    } = scanOverdueImprest(imprestFloats);

    // Step 3: Check discrepancies
    const {
      discrepancies,
      count: discrepancyCount,
      criticalCount,
    } = await checkDiscrepancies(entityId);

    // Step 4: Calculate health
    const overallScore = calculateHealthScore({
      totalBalance,
      overdueImprestCount: overdueCount,
      totalActiveFloats: activeImprestCount,
      discrepancyCount,
      criticalCount,
    });

    const healthStatus: CashPipelineResult["healthStatus"] =
      overallScore >= HEALTHY_THRESHOLD
        ? "healthy"
        : overallScore >= 0.6
          ? "warning"
          : "critical";

    // Step 5-6: Gate
    const escalated = healthStatus !== "healthy";
    const escalationReason = escalated
      ? [
          overdue.length > 0
            ? `${overdue.length} overdue imprest float(s)`
            : null,
          expiringSoon.length > 0
            ? `${expiringSoon.length} imprest(s) expiring soon`
            : null,
          criticalCount > 0
            ? `${criticalCount} critical discrepancy(ies)`
            : null,
        ]
          .filter(Boolean)
          .join("; ")
      : undefined;

    const audit = createAuditEntry({
      agentId: "cash-pipeline",
      action: escalated ? "cash_pipeline_escalated" : "cash_pipeline_healthy",
      details: {
        totalBalance,
        activeImprestCount,
        totalOutstandingImprest,
        overdueCount,
        discrepancyCount,
        criticalCount,
        overallScore,
        healthStatus,
      },
      confidence: overallScore,
    });
    auditEntries.push(audit);

    await trace.update({
      output: {
        totalBalance,
        overallScore,
        healthStatus,
        escalated,
        overdueCount,
        discrepancyCount,
      },
    });

    langfuse.event({
      name: "cash-pipeline-complete",
      metadata: {
        entityId,
        overallScore,
        healthStatus,
        escalated,
        overdueCount,
        discrepancyCount,
      },
    });

    return {
      success: true,
      accounts,
      totalBalance,
      activeImprestFloats: activeImprestCount,
      totalOutstandingImprest,
      overdueImprestFloats: overdueCount,
      discrepancyCount,
      criticalDiscrepancies: criticalCount,
      overallScore,
      healthStatus,
      escalated,
      escalationReason,
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const errorAudit = createAuditEntry({
      agentId: "cash-pipeline",
      action: "pipeline_failed",
      details: { entityId, error: msg },
      confidence: 0,
    });
    auditEntries.push(errorAudit);

    await trace.update({ output: { status: "error", error: msg } });

    return {
      success: false,
      accounts: [],
      totalBalance: 0,
      activeImprestFloats: 0,
      totalOutstandingImprest: 0,
      overdueImprestFloats: 0,
      discrepancyCount: 0,
      criticalDiscrepancies: 0,
      overallScore: 0,
      healthStatus: "critical",
      escalated: true,
      escalationReason: msg,
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  }
}
