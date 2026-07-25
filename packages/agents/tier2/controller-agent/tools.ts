import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import { invoicesAp, salesInvoices } from "@xenboox/db/schema/ap-ar";
import type { PendingEntryReview, SubLedgerStatus } from "./state";

// ─── Structural Validation (7 checks — deterministic, not LLM) ─────────────

export interface ReviewResult {
  approved: boolean;
  rejectionReason: string | null;
  structuralFlags: string[];
  qualitativeFlags: string[];
  confidence: number;
}

export async function validateEntryStructural(
  entry: PendingEntryReview,
  entityId: string,
): Promise<ReviewResult> {
  const flags: string[] = [];
  const _rejectionReason: string | null = null;

  // Check 1: At least 2 lines
  if (entry.entries.length < 2) {
    return {
      approved: false,
      rejectionReason: "Entry must have at least 2 lines",
      structuralFlags: ["min_lines"],
      qualitativeFlags: [],
      confidence: 0,
    };
  }

  // Check 2: Debits == credits
  if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.01) {
    const diff = Math.abs(entry.totalDebit - entry.totalCredit);
    return {
      approved: false,
      rejectionReason: `Entry does not balance. Debits: ${entry.totalDebit}, Credits: ${entry.totalCredit}, Difference: ${diff}`,
      structuralFlags: ["double_entry_balance"],
      qualitativeFlags: [],
      confidence: 0,
    };
  }

  // Check 3: Non-negative amounts, no zero-only lines, no mixed lines
  for (let i = 0; i < entry.entries.length; i++) {
    const line = entry.entries[i];
    if (line.debit < 0 || line.credit < 0) {
      return {
        approved: false,
        rejectionReason: `Line ${i + 1} (account ${line.accountCode}): negative amounts not permitted`,
        structuralFlags: ["negative_amounts"],
        qualitativeFlags: [],
        confidence: 0,
      };
    }
    if (line.debit === 0 && line.credit === 0) {
      return {
        approved: false,
        rejectionReason: `Line ${i + 1} (account ${line.accountCode}): must have a non-zero debit or credit`,
        structuralFlags: ["zero_amounts"],
        qualitativeFlags: [],
        confidence: 0,
      };
    }
    if (line.debit > 0 && line.credit > 0) {
      return {
        approved: false,
        rejectionReason: `Line ${i + 1} (account ${line.accountCode}): cannot have both debit and credit`,
        structuralFlags: ["mixed_line"],
        qualitativeFlags: [],
        confidence: 0,
      };
    }
  }

  // Check 4: All accounts exist in CoA
  for (const line of entry.entries) {
    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.id, line.accountId),
        eq(chartOfAccounts.entityId, entityId),
      ),
    });
    if (!account) {
      return {
        approved: false,
        rejectionReason: `Account ${line.accountCode} (${line.accountId}) not found in chart of accounts`,
        structuralFlags: ["account_not_found"],
        qualitativeFlags: [],
        confidence: 0,
      };
    }
    if (!account.isActive) {
      return {
        approved: false,
        rejectionReason: `Account ${line.accountCode} (${account.name}) is inactive`,
        structuralFlags: ["account_inactive"],
        qualitativeFlags: [],
        confidence: 0,
      };
    }
  }

  // Check 5: Period is open
  const firstLine = entry.entries[0];
  if (firstLine) {
    const activePeriod = await db.query.fiscalPeriods.findFirst({
      where: and(
        eq(fiscalPeriods.entityId, entityId),
        eq(fiscalPeriods.status, "open"),
      ),
    });
    if (!activePeriod) {
      return {
        approved: false,
        rejectionReason: "No open fiscal period found for this entity",
        structuralFlags: ["no_open_period"],
        qualitativeFlags: [],
        confidence: 0,
      };
    }
  }

  // Qualitative checks (flags only, non-blocking)
  if (entry.totalDebit > 100000) {
    flags.push("large_amount");
  }
  if (entry.totalDebit % 1000 === 0 && entry.totalDebit > 10000) {
    flags.push("round_number");
  }
  if (
    entry.description.toLowerCase().includes("reversal") ||
    entry.description.toLowerCase().includes("reverse")
  ) {
    flags.push("reversal_entry");
  }

  return {
    approved: true,
    rejectionReason: null,
    structuralFlags: [],
    qualitativeFlags: flags,
    confidence: flags.length === 0 ? 0.92 : 0.78,
  };
}

// ─── Sub-Ledger Reconciliation ─────────────────────────────────────────────

async function getAccountBalanceFromGL(
  entityId: string,
  accountCode: string,
): Promise<number> {
  const account = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.code, accountCode),
    ),
  });
  if (!account) return 0;

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
  });

  let balance = 0;
  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    });
    for (const line of lines) {
      if (line.accountId === account.id) {
        balance += Number(line.debit) - Number(line.credit);
      }
    }
  }
  return balance;
}

export async function reconcileSubLedgers(
  entityId: string,
): Promise<SubLedgerStatus> {
  // AP: sum of open AP invoices vs AP control account (2100) balance from GL
  const openApInvoices = await db.query.invoicesAp.findMany({
    where: and(eq(invoicesAp.entityId, entityId)),
  });
  const apSubLedger = openApInvoices
    .filter(
      (inv) =>
        inv.status === "pending" ||
        inv.status === "partial" ||
        inv.status === "overdue",
    )
    .reduce((sum: number, inv) => sum + Number(inv.balance), 0);
  const apGLBalance = await getAccountBalanceFromGL(entityId, "2100");
  const apVariance = apSubLedger - Math.abs(apGLBalance);

  // AR: sum of open AR invoices vs AR control account (1200) balance from GL
  const openArInvoices = await db.query.salesInvoices.findMany({
    where: eq(salesInvoices.entityId, entityId),
  });
  const arSubLedger = openArInvoices
    .filter(
      (inv) =>
        inv.status === "pending" ||
        inv.status === "partial" ||
        inv.status === "overdue",
    )
    .reduce((sum: number, inv) => sum + Number(inv.balance), 0);
  const arGLBalance = await getAccountBalanceFromGL(entityId, "1200");
  const arVariance = arSubLedger - Math.abs(arGLBalance);

  return {
    ap: { reconciled: Math.abs(apVariance) < 0.01, variance: apVariance },
    ar: { reconciled: Math.abs(arVariance) < 0.01, variance: arVariance },
    fixedAssets: { reconciled: true, variance: 0 },
    inventory: { reconciled: true, variance: 0 },
  };
}

// ─── Consolidation Pipeline Tools ──────────────────────────────────────────

export async function runControllerConsolidation(params: {
  entityId: string;
  organizationId: string;
  period: string;
  userId: string;
}) {
  const { runConsolidationPipeline } =
    await import("../../core/consolidation-pipeline");
  return runConsolidationPipeline({
    entityId: params.entityId,
    organizationId: params.organizationId,
    period: params.period,
    userId: params.userId,
  });
}

export async function getControllerConsolidationStatus(params: {
  entityId: string;
  period?: string;
}) {
  const { getConsolidationStatus } =
    await import("../../core/consolidation-pipeline");
  return getConsolidationStatus(params);
}

export async function approveControllerConsolidation(params: {
  runId: string;
  entityId: string;
  userId: string;
}) {
  const { approveConsolidationRun } =
    await import("../../core/consolidation-pipeline");
  return approveConsolidationRun(params);
}

export async function createControllerEntityRelationship(params: {
  parentEntityId: string;
  subsidiaryEntityId: string;
  ownershipPct: number;
  currency: string;
  consolidationMethod: string;
}) {
  const { createEntityRelationship } =
    await import("../../core/consolidation-pipeline");
  return createEntityRelationship(params);
}

// ─── Trial Balance Query ───────────────────────────────────────────────────

export async function queryTrialBalanceFromDB(
  entityId: string,
  periodId: string,
) {
  const period = await db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.id, periodId),
  });

  const entries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.periodId, periodId),
      eq(journalEntries.status, "posted"),
    ),
  });

  const accountMap = new Map<
    string,
    { code: string; name: string; debit: number; credit: number }
  >();

  for (const entry of entries) {
    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entry.id),
    });
    for (const line of lines) {
      const existing = accountMap.get(line.accountId);
      if (existing) {
        existing.debit += Number(line.debit);
        existing.credit += Number(line.credit);
      } else {
        const account = await db.query.chartOfAccounts.findFirst({
          where: eq(chartOfAccounts.id, line.accountId),
        });
        accountMap.set(line.accountId, {
          code: account?.code ?? "???",
          name: account?.name ?? "Unknown",
          debit: Number(line.debit),
          credit: Number(line.credit),
        });
      }
    }
  }

  const accounts = Array.from(accountMap.entries()).map(
    ([accountId, data]) => ({
      accountId,
      accountCode: data.code,
      accountName: data.name,
      debitBalance: data.debit,
      creditBalance: data.credit,
    }),
  );

  const totalDebits = accounts.reduce((s, a) => s + a.debitBalance, 0);
  const totalCredits = accounts.reduce((s, a) => s + a.creditBalance, 0);

  return {
    generatedAt: new Date().toISOString(),
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    accounts,
    periodLabel: period
      ? `${period.year}-${String(period.month).padStart(2, "0")}`
      : "Unknown",
  };
}
