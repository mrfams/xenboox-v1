/**
 * General Ledger Service
 *
 * The authoritative source for account balances, transaction histories,
 * and period-level financial summaries. Complements the journal entry
 * posting system by providing read-side computation and aggregation.
 *
 * This service answers:
 *   - What is the balance of account X at period Y?
 *   - What transactions affected account X in period Y?
 *   - What is the trial balance for period Y?
 *   - What is the account balance trend over N periods?
 *   - What are the top-moving accounts this period?
 */

import { db } from "@xenboox/db";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  trialBalanceSnapshots,
  chartOfAccounts,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import { agentActivity } from "@xenboox/db/schema";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  subtype: string;
  periodId: string;
  periodLabel: string;
  totalDebits: number;
  totalCredits: number;
  netBalance: number;
  /** Positive for debit-balance accounts (assets, expenses), negative for credit-balance (liabilities, equity, revenue) */
  normalBalance: "debit" | "credit";
  entryCount: number;
}

export interface GLTransaction {
  journalEntryId: string;
  entryNumber: number;
  date: string;
  description: string;
  reference: string | null;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  lineDescription: string;
  postedAt: Date | null;
  source: string | null;
}

export interface AccountHistory {
  accountId: string;
  accountCode: string;
  accountName: string;
  periodBalances: Array<{
    periodId: string;
    periodLabel: string;
    totalDebits: number;
    totalCredits: number;
    netChange: number;
    runningBalance: number;
  }>;
}

export interface TopMovingAccount {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: string;
  currentPeriodChange: number;
  previousPeriodChange: number;
  variance: number;
  variancePercent: number;
  direction: "up" | "down" | "stable";
}

export interface JournalEntryDetail {
  id: string;
  entryNumber: number;
  description: string;
  reference: string | null;
  date: string;
  status: string;
  periodId: string;
  periodLabel: string;
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  postedBy: string | null;
  postedAt: Date | null;
  confidence: number | null;
  lines: Array<{
    accountId: string;
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description: string;
  }>;
}

// ─── 1. Get Account Balance ─────────────────────────────────────────────────

/**
 * Get the current balance for a specific account in a specific period.
 * Computed from all posted journal entries affecting that account.
 */
export async function getAccountBalance(
  entityId: string,
  accountId: string,
  periodId?: string,
): Promise<AccountBalance | null> {
  const account = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.id, accountId),
      eq(chartOfAccounts.entityId, entityId),
    ),
  });

  if (!account) return null;

  // Build the query conditions
  const conditions: SQL[] = [
    eq(journalEntryLines.accountId, accountId),
    eq(journalEntries.entityId, entityId),
    eq(journalEntries.status, "posted"),
  ];

  if (periodId) {
    conditions.push(eq(journalEntries.periodId, periodId));
  }

  // Query all lines for this account in the period(s)
  const lines = await db
    .select({
      debit: journalEntryLines.debit,
      credit: journalEntryLines.credit,
      journalEntryId: journalEntryLines.journalEntryId,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(and(...conditions));

  const totalDebits = lines.reduce((s, l) => s + Number(l.debit), 0);
  const totalCredits = lines.reduce((s, l) => s + Number(l.credit), 0);
  const normalBalance: "debit" | "credit" =
    account.type === "asset" || account.type === "expense" ? "debit" : "credit";
  const netBalance =
    normalBalance === "debit"
      ? totalDebits - totalCredits
      : totalCredits - totalDebits;

  let periodLabel = "All periods";
  if (periodId) {
    const period = await db.query.fiscalPeriods.findFirst({
      where: eq(fiscalPeriods.id, periodId),
    });
    if (period) {
      periodLabel = `${period.year}-${String(period.month).padStart(2, "0")}`;
    }
  }

  return {
    accountId: account.id,
    accountCode: account.code,
    accountName: account.name,
    accountType: account.type,
    subtype: account.subtype,
    periodId: periodId ?? "all",
    periodLabel,
    totalDebits,
    totalCredits,
    netBalance,
    normalBalance,
    entryCount: lines.length,
  };
}

// ─── 2. Get Account History ─────────────────────────────────────────────────

/**
 * Get the balance history for an account across multiple periods.
 * Useful for trend analysis and variance reporting.
 */
export async function getAccountHistory(
  entityId: string,
  accountId: string,
  periods: number = 6,
): Promise<AccountHistory | null> {
  const account = await db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.id, accountId),
      eq(chartOfAccounts.entityId, entityId),
    ),
  });

  if (!account) return null;

  // Get the N most recent periods
  const recentPeriods = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.entityId, entityId),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
    limit: periods,
  });

  if (recentPeriods.length === 0) {
    return {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      periodBalances: [],
    };
  }

  // Single GROUP BY query across all requested periods instead of
  // one query per period.
  const periodIds = recentPeriods.map((p) => p.id);
  const rows = await db
    .select({
      periodId: journalEntries.periodId,
      totalDebits: sql<string>`COALESCE(SUM(CAST(${journalEntryLines.debit} AS numeric)), 0)::text`,
      totalCredits: sql<string>`COALESCE(SUM(CAST(${journalEntryLines.credit} AS numeric)), 0)::text`,
    })
    .from(journalEntryLines)
    .innerJoin(
      journalEntries,
      eq(journalEntryLines.journalEntryId, journalEntries.id),
    )
    .where(
      and(
        eq(journalEntryLines.accountId, accountId),
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
        inArray(journalEntries.periodId, periodIds),
      ),
    )
    .groupBy(journalEntries.periodId);

  const rowMap = new Map(rows.map((r) => [r.periodId, r]));
  const normalBalance: "debit" | "credit" =
    account.type === "asset" || account.type === "expense" ? "debit" : "credit";

  const periodBalances: AccountHistory["periodBalances"] = [];
  let runningBalance = 0;

  // Process oldest to newest for running balance
  for (const period of recentPeriods.reverse()) {
    const row = rowMap.get(period.id);
    const totalDebits = Number(row?.totalDebits ?? 0);
    const totalCredits = Number(row?.totalCredits ?? 0);
    const netBalance =
      normalBalance === "debit"
        ? totalDebits - totalCredits
        : totalCredits - totalDebits;
    runningBalance += netBalance;
    periodBalances.push({
      periodId: period.id,
      periodLabel: `${period.year}-${String(period.month).padStart(2, "0")}`,
      totalDebits,
      totalCredits,
      netChange: netBalance,
      runningBalance,
    });
  }

  return {
    accountId: account.id,
    accountCode: account.code,
    accountName: account.name,
    periodBalances,
  };
}

// ─── 3. Trial Balance ───────────────────────────────────────────────────────

/**
 * Generate a complete trial balance for a period or across all periods.
 * Uses the stored trial balance snapshots when available for performance,
 * falling back to real-time computation.
 */
export async function getTrialBalance(
  entityId: string,
  periodId?: string,
): Promise<{
  accounts: AccountBalance[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
  periodLabel: string;
}> {
  let accounts: AccountBalance[] = [];
  const allAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  // Try to use pre-computed snapshot for performance
  if (periodId) {
    const snapshots = await db.query.trialBalanceSnapshots.findMany({
      where: and(
        eq(trialBalanceSnapshots.entityId, entityId),
        eq(trialBalanceSnapshots.periodId, periodId),
      ),
    });

    const snapshotMap = new Map(snapshots.map((s) => [s.accountId, s]));

    for (const account of allAccounts) {
      const snapshot = snapshotMap.get(account.id);
      if (snapshot) {
        accounts.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          subtype: account.subtype,
          periodId,
          periodLabel: "",
          totalDebits: Number(snapshot.debitTotal),
          totalCredits: Number(snapshot.creditTotal),
          netBalance: Number(snapshot.balance),
          normalBalance:
            account.type === "asset" || account.type === "expense"
              ? "debit"
              : "credit",
          entryCount: 0,
        });
      } else {
        // Account has no activity this period — balance is 0
        accounts.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          accountType: account.type,
          subtype: account.subtype,
          periodId,
          periodLabel: "",
          totalDebits: 0,
          totalCredits: 0,
          netBalance: 0,
          normalBalance:
            account.type === "asset" || account.type === "expense"
              ? "debit"
              : "credit",
          entryCount: 0,
        });
      }
    }
  } else {
    // Real-time computation across all periods — single GROUP BY query
    // instead of N per-account queries.
    const rows = await db
      .select({
        accountId: journalEntryLines.accountId,
        totalDebits: sql<string>`COALESCE(SUM(CAST(${journalEntryLines.debit} AS numeric)), 0)::text`,
        totalCredits: sql<string>`COALESCE(SUM(CAST(${journalEntryLines.credit} AS numeric)), 0)::text`,
        entryCount: sql<number>`COUNT(*)::int`,
      })
      .from(journalEntryLines)
      .innerJoin(
        journalEntries,
        eq(journalEntryLines.journalEntryId, journalEntries.id),
      )
      .where(
        and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.status, "posted"),
        ),
      )
      .groupBy(journalEntryLines.accountId);

    const balanceMap = new Map(rows.map((r) => [r.accountId, r]));

    for (const account of allAccounts) {
      const row = balanceMap.get(account.id);
      const totalDebits = Number(row?.totalDebits ?? 0);
      const totalCredits = Number(row?.totalCredits ?? 0);
      const normalBalance: "debit" | "credit" =
        account.type === "asset" || account.type === "expense"
          ? "debit"
          : "credit";
      const netBalance =
        normalBalance === "debit"
          ? totalDebits - totalCredits
          : totalCredits - totalDebits;

      accounts.push({
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        subtype: account.subtype,
        periodId: "all",
        periodLabel: "All periods",
        totalDebits,
        totalCredits,
        netBalance,
        normalBalance,
        entryCount: Number(row?.entryCount ?? 0),
      });
    }
  }

  let totalDebits = 0;
  let totalCredits = 0;

  for (const acc of accounts) {
    if (acc.normalBalance === "debit") {
      totalDebits += acc.netBalance >= 0 ? acc.netBalance : 0;
      totalCredits += acc.netBalance < 0 ? Math.abs(acc.netBalance) : 0;
    } else {
      totalCredits += acc.netBalance >= 0 ? acc.netBalance : 0;
      totalDebits += acc.netBalance < 0 ? Math.abs(acc.netBalance) : 0;
    }
  }

  const isBalanced = Math.abs(totalDebits - totalCredits) <= 0.01;

  let periodLabel = "All periods";
  if (periodId) {
    const period = await db.query.fiscalPeriods.findFirst({
      where: eq(fiscalPeriods.id, periodId),
    });
    if (period) {
      periodLabel = `${period.year}-${String(period.month).padStart(2, "0")}`;
    }
  }

  return {
    accounts,
    totalDebits,
    totalCredits,
    isBalanced,
    periodLabel,
  };
}

// ─── 4. Get Journal Entry Detail ────────────────────────────────────────────

/**
 * Get full detail of a journal entry including all lines with account info.
 */
export async function getJournalEntryDetail(
  entityId: string,
  journalEntryId: string,
): Promise<JournalEntryDetail | null> {
  const entry = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.id, journalEntryId),
      eq(journalEntries.entityId, entityId),
    ),
  });

  if (!entry) return null;

  const lines = await db.query.journalEntryLines.findMany({
    where: eq(journalEntryLines.journalEntryId, entry.id),
  });

  // Get account info for each line
  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const accounts = await db.query.chartOfAccounts.findMany({
    where: inArray(chartOfAccounts.id, accountIds),
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const lineDetails = lines.map((line) => {
    const account = accountMap.get(line.accountId);
    return {
      accountId: line.accountId,
      accountCode: account?.code ?? "???",
      accountName: account?.name ?? "Unknown Account",
      debit: Number(line.debit),
      credit: Number(line.credit),
      description: line.description ?? entry.description,
    };
  });

  const totalDebit = lineDetails.reduce((s, l) => s + l.debit, 0);
  const totalCredit = lineDetails.reduce((s, l) => s + l.credit, 0);

  // Get period label
  let periodLabel = "";
  if (entry.periodId) {
    const period = await db.query.fiscalPeriods.findFirst({
      where: eq(fiscalPeriods.id, entry.periodId),
    });
    if (period) {
      periodLabel = `${period.year}-${String(period.month).padStart(2, "0")}`;
    }
  }

  return {
    id: entry.id,
    entryNumber: entry.entryNumber,
    description: entry.description,
    reference: entry.reference,
    date: entry.date,
    status: entry.status,
    periodId: entry.periodId,
    periodLabel,
    totalDebit,
    totalCredit,
    isBalanced: Math.abs(totalDebit - totalCredit) <= 0.01,
    postedBy: entry.postedBy,
    postedAt: entry.postedAt,
    confidence: entry.confidence ? Number(entry.confidence) : null,
    lines: lineDetails,
  };
}

// ─── 5. Top Moving Accounts ──────────────────────────────────────────────

/**
 * Find the accounts with the largest balance changes between two periods.
 * Useful for variance analysis and anomaly detection.
 */
export async function getTopMovingAccounts(
  entityId: string,
  currentPeriodId: string,
  previousPeriodId: string,
  limit: number = 10,
): Promise<TopMovingAccount[]> {
  const currentTb = await getTrialBalance(entityId, currentPeriodId);
  const previousTb = await getTrialBalance(entityId, previousPeriodId);

  const previousMap = new Map(previousTb.accounts.map((a) => [a.accountId, a]));

  const movers: TopMovingAccount[] = [];

  for (const current of currentTb.accounts) {
    const previous = previousMap.get(current.accountId);
    const prevChange = previous?.netBalance ?? 0;
    const currentChange = current.netBalance;
    const variance = currentChange - prevChange;

    let direction: "up" | "down" | "stable" = "stable";
    if (Math.abs(variance) > 0.01) {
      direction = variance > 0 ? "up" : "down";
    }

    const variancePercent =
      prevChange !== 0
        ? (variance / Math.abs(prevChange)) * 100
        : currentChange !== 0
          ? 100
          : 0;

    movers.push({
      accountId: current.accountId,
      accountCode: current.accountCode,
      accountName: current.accountName,
      accountType: current.accountType,
      currentPeriodChange: currentChange,
      previousPeriodChange: prevChange,
      variance,
      variancePercent: Math.round(variancePercent * 10) / 10,
      direction,
    });
  }

  // Sort by absolute variance (largest changes first)
  movers.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

  return movers.slice(0, limit);
}

// ─── 6. List Journal Entries ────────────────────────────────────────────────

/**
 * List journal entries for a period with optional filtering.
 */
export async function listJournalEntries(
  entityId: string,
  options: {
    periodId?: string;
    status?: "draft" | "pending_review" | "posted" | "reversed" | "voided";
    limit?: number;
    offset?: number;
    fromDate?: string;
    toDate?: string;
  } = {},
): Promise<{ entries: JournalEntryDetail[]; total: number }> {
  const conditions: SQL[] = [eq(journalEntries.entityId, entityId)];

  if (options.periodId)
    conditions.push(eq(journalEntries.periodId, options.periodId));
  if (options.status)
    conditions.push(eq(journalEntries.status, options.status));
  if (options.fromDate)
    conditions.push(sql`${journalEntries.date} >= ${options.fromDate}`);
  if (options.toDate)
    conditions.push(sql`${journalEntries.date} <= ${options.toDate}`);

  // Get total count first (COUNT — not loading full rows)
  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(journalEntries)
    .where(and(...conditions));
  const total = Number(countRow?.count ?? 0);

  // Get paginated results
  const entries = await db.query.journalEntries.findMany({
    where: and(...conditions),
    orderBy: [desc(journalEntries.entryNumber)],
    limit: options.limit ?? 50,
    offset: options.offset ?? 0,
  });

  if (entries.length === 0) {
    return { entries: [], total };
  }

  // ── Batch detail composition (3 queries total, not 3 per entry) ──
  const entryIds = entries.map((e) => e.id);

  const allLines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
  });
  const linesByEntry = new Map<string, (typeof allLines)[number][]>();
  for (const line of allLines) {
    const bucket = linesByEntry.get(line.journalEntryId) ?? [];
    bucket.push(line);
    linesByEntry.set(line.journalEntryId, bucket);
  }

  const accountIds = [...new Set(allLines.map((l) => l.accountId))];
  const accounts =
    accountIds.length > 0
      ? await db.query.chartOfAccounts.findMany({
          where: inArray(chartOfAccounts.id, accountIds),
        })
      : [];
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const periodIds = [
    ...new Set(
      entries.filter((e) => e.periodId).map((e) => e.periodId as string),
    ),
  ];
  const periods =
    periodIds.length > 0
      ? await db.query.fiscalPeriods.findMany({
          where: inArray(fiscalPeriods.id, periodIds),
        })
      : [];
  const periodMap = new Map(periods.map((p) => [p.id, p]));

  const details: JournalEntryDetail[] = entries.map((entry) => {
    const lines = linesByEntry.get(entry.id) ?? [];
    const lineDetails = lines.map((line) => {
      const account = accountMap.get(line.accountId);
      return {
        accountId: line.accountId,
        accountCode: account?.code ?? "???",
        accountName: account?.name ?? "Unknown Account",
        debit: Number(line.debit),
        credit: Number(line.credit),
        description: line.description ?? entry.description,
      };
    });

    const totalDebit = lineDetails.reduce((s, l) => s + l.debit, 0);
    const totalCredit = lineDetails.reduce((s, l) => s + l.credit, 0);
    const period = entry.periodId ? periodMap.get(entry.periodId) : undefined;

    return {
      id: entry.id,
      entryNumber: entry.entryNumber,
      description: entry.description,
      reference: entry.reference,
      date: entry.date,
      status: entry.status,
      periodId: entry.periodId,
      periodLabel: period
        ? `${period.year}-${String(period.month).padStart(2, "0")}`
        : "",
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) <= 0.01,
      postedBy: entry.postedBy,
      postedAt: entry.postedAt,
      confidence: entry.confidence ? Number(entry.confidence) : null,
      lines: lineDetails,
    };
  });

  return { entries: details, total };
}
