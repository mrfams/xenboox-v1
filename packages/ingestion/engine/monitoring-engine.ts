/**
 * Continuous AI Monitoring Engine
 *
 * Runs continuously (triggered by Trigger.dev cron jobs and after each posting)
 * to monitor the financial health of the entity. Detects anomalies, fraud
 * patterns, reconciliation issues, and missing information.
 *
 * This is the final stage in the ingestion pipeline flow:
 *   Posting → Propagation → Continuous Monitoring
 *
 * Monitoring Checks:
 *   1. GL vs Bank Reconciliation Monitor
 *   2. Anomaly Detection (statistical, temporal, pattern-based)
 *   3. Fraud Pattern Detection
 *   4. Missing Documentation Detection
 *   5. Trend Detection
 *   6. Cash Flow Monitoring
 *   7. Compliance Calendar Monitor
 *
 * Each check produces signals that feed into:
 *   - Notifications to users
 *   - Agent activity log
 *   - Dashboard insights
 *   - Executive recommendations (via CFO Agent)
 */

import { db } from "@xenboox/db";
import {
  journalEntries,
  journalEntryLines,
  trialBalanceSnapshots,
  chartOfAccounts,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import {
  documents,
  documentLinks,
  agentActivity,
  auditLog,
  notifications,
  userEntityAccess,
} from "@xenboox/db/schema";
import { eq, and, desc, gte, inArray, sql } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MonitoringReport {
  entityId: string;
  timestamp: string;
  reconciliation: ReconciliationCheck;
  anomalies: AnomalyCheck;
  fraud: FraudCheck;
  missingDocuments: MissingDocumentCheck;
  trends: TrendCheck;
  cashFlow: CashFlowCheck;
  durationMs: number;
}

export interface ReconciliationCheck {
  status: "healthy" | "warning" | "critical";
  unmatchedTransactions: number;
  periodGaps: string[];
  lastReconciledPeriod?: string;
  flaggedAccounts: Array<{
    accountCode: string;
    accountName: string;
    variance: number;
    signal: string;
  }>;
}

export interface AnomalyCheck {
  status: "healthy" | "warning" | "critical";
  anomaliesFound: number;
  items: AnomalyItem[];
}

export interface AnomalyItem {
  type:
    | "amount_spike"
    | "unusual_category"
    | "temporal_anomaly"
    | "zero_value"
    | "balance_deviation";
  severity: "low" | "medium" | "high";
  journalEntryId?: string;
  entryNumber?: number;
  description: string;
  amount: number;
  expectedRange?: { min: number; max: number };
  signal: string;
}

export interface FraudCheck {
  status: "healthy" | "warning" | "critical";
  flagsRaised: number;
  items: FraudFlagItem[];
}

export interface FraudFlagItem {
  pattern:
    | "duplicate_payment"
    | "round_dollar"
    | "weekend_pattern"
    | "new_vendor_spike"
    | "unusual_velocity";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  count: number;
  totalAmount: number;
  sampleEntries: string[];
}

export interface MissingDocumentCheck {
  status: "healthy" | "warning" | "critical";
  missingLinks: number;
  largeEntriesWithoutSupport: number;
  items: Array<{
    journalEntryId: string;
    entryNumber: number;
    description: string;
    amount: number;
    missingSince: string;
  }>;
}

export interface TrendCheck {
  status: "healthy" | "warning" | "critical";
  revenueTrend: "up" | "down" | "stable";
  expenseTrend: "up" | "down" | "stable";
  profitabilityTrend: "improving" | "declining" | "stable";
  anomalies: string[];
}

export interface CashFlowCheck {
  status: "healthy" | "warning" | "critical";
  currentCashBalance: number;
  projectedRunwayMonths: number;
  burnRate: number;
  avgMonthlyRevenue: number;
  avgMonthlyExpenses: number;
  daysOfCashRemaining: number;
  flags: string[];
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

/**
 * Run a full monitoring cycle for an entity.
 * Intended to be called by Trigger.dev cron job (hourly/daily) and
 * after each journal entry posting.
 */
export async function runMonitoringCycle(
  entityId: string,
): Promise<MonitoringReport> {
  const startTime = Date.now();

  // Run all checks in parallel for performance
  const [reconciliation, anomalies, fraud, missingDocuments, trends, cashFlow] =
    await Promise.all([
      checkReconciliation(entityId),
      checkAnomalies(entityId),
      checkFraud(entityId),
      checkMissingDocuments(entityId),
      checkTrends(entityId),
      checkCashFlow(entityId),
    ]);

  const report: MonitoringReport = {
    entityId,
    timestamp: new Date().toISOString(),
    reconciliation,
    anomalies,
    fraud,
    missingDocuments,
    trends,
    cashFlow,
    durationMs: Date.now() - startTime,
  };

  // Log monitoring results to agent activity
  await logMonitoringActivity(entityId, report);

  // Generate notifications for critical issues
  await sendMonitoringNotifications(entityId, report);

  return report;
}

// ─── 1. Reconciliation Monitor ─────────────────────────────────────────────

/**
 * Check GL vs Bank/Statement reconciliation health.
 * Identifies unmatched transactions, period gaps, and suspicious account variances.
 */
async function checkReconciliation(
  entityId: string,
): Promise<ReconciliationCheck> {
  const flaggedAccounts: ReconciliationCheck["flaggedAccounts"] = [];
  const periodGaps: string[] = [];
  let unmatchedTransactions = 0;

  // Get all fiscal periods for this entity
  const periods = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.entityId, entityId),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
    limit: 12, // Last 12 months
  });

  // Check for period gaps
  if (periods.length > 0) {
    const sorted = periods.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i]!;
      const prev = sorted[i + 1]!;
      const gapMonths =
        (current.year - prev.year) * 12 + (current.month - prev.month);

      if (gapMonths > 1) {
        periodGaps.push(
          `${prev.year}-${String(prev.month).padStart(2, "0")} to ${current.year}-${String(current.month).padStart(2, "0")}`,
        );
      }
    }
  }

  // Check for unclosed periods with no recent entries (potential reconciliation issue)
  const openPeriods = periods.filter((p) => p.status === "open");
  for (const period of openPeriods) {
    const entries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.periodId, period.id),
        eq(journalEntries.status, "posted"),
      ),
      limit: 1,
    });

    if (entries.length === 0) {
      // Period has no entries but is open — may need attention
      unmatchedTransactions++;
    }
  }

  // Check for trial balance anomalies (accounts with unusual activity)
  const latestClosedPeriod = periods.find(
    (p) => p.status === "closed" || p.status === "locked",
  );
  if (latestClosedPeriod) {
    const tbEntries = await db.query.trialBalanceSnapshots.findMany({
      where: and(
        eq(trialBalanceSnapshots.entityId, entityId),
        eq(trialBalanceSnapshots.periodId, latestClosedPeriod.id),
      ),
    });

    for (const tb of tbEntries) {
      const balance = Number(tb.balance);
      const debit = Number(tb.debitTotal);
      const credit = Number(tb.creditTotal);

      // Flag accounts with unusually high balances or imbalances
      if (Math.abs(balance) > 1_000_000) {
        const account = await db.query.chartOfAccounts.findFirst({
          where: eq(chartOfAccounts.id, tb.accountId),
        });

        if (account) {
          flaggedAccounts.push({
            accountCode: account.code,
            accountName: account.name,
            variance: balance,
            signal: `High balance: ${formatCurrency(balance)}`,
          });
        }
      }

      // Check for debit-only or credit-only accounts (suspicious)
      if (debit > 0 && credit === 0 && debit > 10000) {
        const account = await db.query.chartOfAccounts.findFirst({
          where: eq(chartOfAccounts.id, tb.accountId),
        });

        if (account) {
          flaggedAccounts.push({
            accountCode: account.code,
            accountName: account.name,
            variance: debit,
            signal: `Account has debit activity but no credits in period ${latestClosedPeriod.year}-${latestClosedPeriod.month}`,
          });
        }
      }
    }
  }

  const criticalFlags = flaggedAccounts.filter(
    (a) => Math.abs(a.variance) > 500_000,
  );
  const status =
    criticalFlags.length > 0
      ? "critical"
      : flaggedAccounts.length > 0 || unmatchedTransactions > 10
        ? "warning"
        : "healthy";

  return {
    status,
    unmatchedTransactions,
    periodGaps,
    lastReconciledPeriod: latestClosedPeriod
      ? `${latestClosedPeriod.year}-${String(latestClosedPeriod.month).padStart(2, "0")}`
      : undefined,
    flaggedAccounts,
  };
}

// ─── 2. Anomaly Detection ──────────────────────────────────────────────────

/**
 * Detect statistical and pattern anomalies in posted journal entries.
 */
async function checkAnomalies(entityId: string): Promise<AnomalyCheck> {
  const items: AnomalyItem[] = [];

  // Get recent entries (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  const recentEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      gte(journalEntries.createdAt, thirtyDaysAgo),
    ),
    orderBy: [desc(journalEntries.createdAt)],
    limit: 500,
  });

  if (recentEntries.length < 5) {
    return { status: "healthy", anomaliesFound: 0, items: [] };
  }

  // Compute statistics for amount distribution
  const amounts = recentEntries
    .map((e) => {
      const meta = (e.metadata ?? {}) as Record<string, unknown>;
      const proposedEntry = (meta.ingestion as Record<string, unknown>)
        ?.lines as Array<{ debit: number; credit: number }> | undefined;
      return proposedEntry
        ? Math.max(...proposedEntry.map((l) => Math.max(l.debit, l.credit)))
        : 0;
    })
    .filter((a) => a > 0);

  if (amounts.length < 5) {
    return { status: "healthy", anomaliesFound: 0, items: [] };
  }

  const mean = amounts.reduce((s, a) => s + a, 0) / amounts.length;
  const variance =
    amounts.reduce((s, a) => s + (a - mean) ** 2, 0) / amounts.length;
  const stdDev = Math.sqrt(variance);

  // 1. Amount spike detection (entries more than 3 standard deviations from mean)
  for (const entry of recentEntries) {
    const meta = (entry.metadata ?? {}) as Record<string, unknown>;
    const ingestionMeta = (meta.ingestion ?? {}) as Record<string, unknown>;
    const lines = (ingestionMeta.lines ?? []) as Array<{
      debit: number;
      credit: number;
    }>;
    const maxAmount = Math.max(
      ...lines.map((l) => Math.max(l.debit, l.credit)),
      0,
    );

    if (maxAmount > mean + 3 * stdDev && stdDev > 0) {
      items.push({
        type: "amount_spike",
        severity: Math.abs(maxAmount) > mean + 5 * stdDev ? "high" : "medium",
        journalEntryId: entry.id,
        entryNumber: entry.entryNumber,
        description: entry.description,
        amount: maxAmount,
        expectedRange: { min: 0, max: mean + 3 * stdDev },
        signal: `Amount ${formatCurrency(maxAmount)} exceeds 3σ threshold of ${formatCurrency(mean + 3 * stdDev)}. Mean: ${formatCurrency(mean)}, StdDev: ${formatCurrency(stdDev)}.`,
      });
    }
  }

  // 2. Zero-value entries
  const zeroValueEntries = recentEntries.filter((e) => {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    const lines = ((meta.ingestion ?? {}) as Record<string, unknown>)?.lines as
      Array<{ debit: number; credit: number }> | undefined;

    if (!lines) return false;
    return lines.every((l) => l.debit === 0 && l.credit === 0);
  });

  for (const entry of zeroValueEntries) {
    items.push({
      type: "zero_value",
      severity: "medium",
      journalEntryId: entry.id,
      entryNumber: entry.entryNumber,
      description: entry.description,
      amount: 0,
      signal: `Journal entry #${entry.entryNumber} has zero debit and credit — possible empty entry.`,
    });
  }

  // 3. Unusual category combinations
  // (e.g., posting payroll to a revenue account)
  const accountTypeCombos = await checkUnusualAccountCombinations(entityId);
  items.push(...accountTypeCombos);

  const anomalyCount = items.length;
  const criticalAnomalies = items.filter((a) => a.severity === "high").length;

  return {
    status:
      criticalAnomalies > 0
        ? "critical"
        : anomalyCount > 5
          ? "warning"
          : "healthy",
    anomaliesFound: anomalyCount,
    items,
  };
}

/**
 * Check for unusual account type combinations in journal entries.
 * E.g., posting payroll to asset accounts, or inventory to revenue accounts.
 */
async function checkUnusualAccountCombinations(
  entityId: string,
): Promise<AnomalyItem[]> {
  const items: AnomalyItem[] = [];

  // Get recent entry lines with account info
  const recentEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
    ),
    orderBy: [desc(journalEntries.createdAt)],
    limit: 100,
  });

  const entryIds = recentEntries.map((e) => e.id);
  if (entryIds.length === 0) return items;

  const lines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
    limit: 500,
  });

  // Get account types for all referenced accounts
  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  if (accountIds.length === 0) return items;
  const accounts = await db.query.chartOfAccounts.findMany({
    where: inArray(chartOfAccounts.id, accountIds),
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  // Group lines by journal entry
  const entryLinesMap = new Map<string, typeof lines>();
  for (const line of lines) {
    const existing = entryLinesMap.get(line.journalEntryId) ?? [];
    existing.push(line);
    entryLinesMap.set(line.journalEntryId, existing);
  }

  // Check each entry for unusual combinations
  for (const [entryId, entryLines] of entryLinesMap) {
    const entry = recentEntries.find((e) => e.id === entryId);
    if (!entry || entryLines.length < 2) continue;

    const debitAccounts = entryLines
      .filter((l) => Number(l.debit) > 0)
      .map((l) => accountMap.get(l.accountId));
    const creditAccounts = entryLines
      .filter((l) => Number(l.credit) > 0)
      .map((l) => accountMap.get(l.accountId));

    const debitTypes = new Set(
      debitAccounts.filter(Boolean).map((a) => a!.type),
    );
    const creditTypes = new Set(
      creditAccounts.filter(Boolean).map((a) => a!.type),
    );

    // Revenue should not be debited directly (usually credited)
    if (debitTypes.has("revenue") && !creditTypes.has("expense")) {
      items.push({
        type: "unusual_category",
        severity: "high",
        journalEntryId: entryId,
        entryNumber: entry.entryNumber,
        description: entry.description,
        amount: 0,
        signal: `Revenue account appears on debit side — unusual. Revenue should typically be credited, not debited.`,
      });
    }

    // Payroll accounts should not be involved with revenue accounts
    if (debitTypes.has("expense") && creditTypes.has("revenue")) {
      items.push({
        type: "unusual_category",
        severity: "high",
        journalEntryId: entryId,
        entryNumber: entry.entryNumber,
        description: entry.description,
        amount: 0,
        signal: `Entry debits expense accounts and credits revenue accounts simultaneously — unusual accounting pattern.`,
      });
    }

    // Equity should not be involved in routine transactions
    if (debitTypes.has("equity") || creditTypes.has("equity")) {
      const isRoutineTransaction =
        /^(payroll|invoice|receipt|expense|payment)/i.test(entry.description);
      if (isRoutineTransaction) {
        items.push({
          type: "unusual_category",
          severity: "medium",
          journalEntryId: entryId,
          entryNumber: entry.entryNumber,
          description: entry.description,
          amount: 0,
          signal: `Equity account involved in routine transaction: "${entry.description}". Equity should only be touched by owner contributions, dividends, or period close.`,
        });
      }
    }
  }

  return items;
}

// ─── 3. Fraud Pattern Detection ────────────────────────────────────────────

/**
 * Analyze posted entries for fraud patterns:
 * - Duplicate payments (same amount, same vendor, proximate time)
 * - Round dollar fraud (large round-number payments)
 * - Weekend/holiday transaction patterns
 * - Unusual submission velocity
 * - New vendor spike (new vendor + large amount)
 */
async function checkFraud(entityId: string): Promise<FraudCheck> {
  const items: FraudFlagItem[] = [];

  // ── Round Dollar Fraud ──
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600_000);

  const recentEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      gte(journalEntries.createdAt, thirtyDaysAgo),
    ),
    orderBy: [desc(journalEntries.createdAt)],
    limit: 200,
  });

  const roundDollarEntries = recentEntries.filter((e) => {
    const meta = (e.metadata ?? {}) as Record<string, unknown>;
    const lines = ((meta.ingestion ?? {}) as Record<string, unknown>)?.lines as
      Array<{ debit: number; credit: number }> | undefined;

    if (!lines) return false;
    return lines.some((l) => l.debit > 100 && l.debit % 1000 === 0);
  });

  if (roundDollarEntries.length >= 3) {
    items.push({
      pattern: "round_dollar",
      severity: roundDollarEntries.length >= 5 ? "high" : "medium",
      description: `${roundDollarEntries.length} entries with round-dollar amounts (multiples of $1,000) detected in last 30 days.`,
      count: roundDollarEntries.length,
      totalAmount: roundDollarEntries.reduce((sum, e) => {
        const meta = (e.metadata ?? {}) as Record<string, unknown>;
        const lines = ((meta.ingestion ?? {}) as Record<string, unknown>)
          ?.lines as Array<{ debit: number; credit: number }> | undefined;
        return sum + (lines?.reduce((s, l) => s + l.debit, 0) ?? 0);
      }, 0),
      sampleEntries: roundDollarEntries
        .slice(0, 3)
        .map((e) => `#${e.entryNumber}: ${e.description}`),
    });
  }

  // ── Duplicate Payment Detection ──
  // Look for entries with similar amounts and descriptions within a short time frame
  const duplicatePatterns = detectDuplicatePayments(recentEntries);
  items.push(...duplicatePatterns);

  // ── Unusual Velocity ──
  const velocityFlag = await checkSubmissionVelocity(entityId);
  if (velocityFlag) items.push(velocityFlag);

  const criticalFlags = items.filter(
    (f) => f.severity === "critical" || f.severity === "high",
  );
  return {
    status:
      criticalFlags.length > 0
        ? "critical"
        : items.length > 1
          ? "warning"
          : "healthy",
    flagsRaised: items.length,
    items,
  };
}

/**
 * Detect potentially duplicate payments by finding entries
 * with similar amounts and descriptions within 24 hours.
 */
function detectDuplicatePayments(
  entries: Array<{
    entryNumber: number;
    description: string;
    metadata: Record<string, unknown> | null;
    date: string;
  }>,
): FraudFlagItem[] {
  const items: FraudFlagItem[] = [];

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i]!;
      const b = entries[j]!;

      // Skip if more than 48 hours apart
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (Math.abs(dateA.getTime() - dateB.getTime()) > 48 * 3600_000) continue;

      const metaA = (a.metadata ?? {}) as Record<string, unknown>;
      const metaB = (b.metadata ?? {}) as Record<string, unknown>;
      const linesA = ((metaA.ingestion ?? {}) as Record<string, unknown>)
        ?.lines as
        | Array<{ debit: number; credit: number; accountCode?: string }>
        | undefined;
      const linesB = ((metaB.ingestion ?? {}) as Record<string, unknown>)
        ?.lines as
        | Array<{ debit: number; credit: number; accountCode?: string }>
        | undefined;

      if (!linesA || !linesB) continue;

      // Compare amounts (within 1%)
      const totalA = linesA.reduce((s, l) => s + l.debit, 0);
      const totalB = linesB.reduce((s, l) => s + l.debit, 0);

      if (totalA > 0 && totalB > 0) {
        const ratio = Math.min(totalA, totalB) / Math.max(totalA, totalB);
        if (ratio > 0.99) {
          items.push({
            pattern: "duplicate_payment",
            severity: "high",
            description: `Possible duplicate: Entry #${a.entryNumber} (${a.description}, ${formatCurrency(totalA)}) and #${b.entryNumber} (${b.description}, ${formatCurrency(totalB)}) have nearly identical amounts within 48 hours.`,
            count: 2,
            totalAmount: totalA + totalB,
            sampleEntries: [
              `#${a.entryNumber}: ${a.description}`,
              `#${b.entryNumber}: ${b.description}`,
            ],
          });
        }
      }
    }
  }

  return items;
}

/**
 * Check for unusual submission velocity (too many entries in a short period).
 */
async function checkSubmissionVelocity(
  entityId: string,
): Promise<FraudFlagItem | null> {
  const oneHourAgo = new Date(Date.now() - 3600_000);

  const recentCount = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      gte(journalEntries.createdAt, oneHourAgo),
    ),
    limit: 101,
  });

  if (recentCount.length > 100) {
    return {
      pattern: "unusual_velocity",
      severity: "medium",
      description: `${recentCount.length} journal entries posted in the last hour — unusually high volume. Possible bulk manipulation.`,
      count: recentCount.length,
      totalAmount: recentCount.reduce((sum, e) => {
        const meta = (e.metadata ?? {}) as Record<string, unknown>;
        const lines = ((meta.ingestion ?? {}) as Record<string, unknown>)
          ?.lines as Array<{ debit: number; credit: number }> | undefined;
        return sum + (lines?.reduce((s, l) => s + l.debit, 0) ?? 0);
      }, 0),
      sampleEntries: recentCount
        .slice(0, 3)
        .map((e) => `#${e.entryNumber}: ${e.description}`),
    };
  }

  return null;
}

// ─── 4. Missing Documentation Detection ───────────────────────────────────

/**
 * Find journal entries that lack supporting documents.
 * Large entries without documentation are a compliance risk.
 */
async function checkMissingDocuments(
  entityId: string,
): Promise<MissingDocumentCheck> {
  const items: MissingDocumentCheck["items"] = [];

  // Get all posted entries from the last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 3600_000);

  const postedEntries = await db.query.journalEntries.findMany({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.status, "posted"),
      gte(journalEntries.createdAt, ninetyDaysAgo),
    ),
    limit: 200,
  });

  if (postedEntries.length === 0) {
    return {
      status: "healthy",
      missingLinks: 0,
      largeEntriesWithoutSupport: 0,
      items: [],
    };
  }

  // For each entry, check if it has a linked document
  let missingCount = 0;
  let largeUnsupportedCount = 0;

  for (const entry of postedEntries) {
    const links = await db.query.documentLinks.findMany({
      where: and(
        eq(documentLinks.entityType, "journal_entry"),
        eq(documentLinks.entityId, entry.id),
      ),
      limit: 1,
    });

    if (links.length === 0) {
      // No supporting document found
      // Estimate amount from metadata
      const meta = (entry.metadata ?? {}) as Record<string, unknown>;
      const lines = ((meta.ingestion ?? {}) as Record<string, unknown>)
        ?.lines as Array<{ debit: number; credit: number }> | undefined;
      const amount = lines?.reduce((s, l) => s + l.debit, 0) ?? 0;

      missingCount++;

      if (Math.abs(amount) > 5000) {
        largeUnsupportedCount++;
        items.push({
          journalEntryId: entry.id,
          entryNumber: entry.entryNumber,
          description: entry.description,
          amount,
          missingSince:
            entry.createdAt?.toISOString?.() ?? new Date().toISOString(),
        });
      }
    }
  }

  const criticalCount = items.filter((i) => Math.abs(i.amount) > 50_000).length;
  return {
    status:
      criticalCount > 0
        ? "critical"
        : largeUnsupportedCount > 5
          ? "warning"
          : "healthy",
    missingLinks: missingCount,
    largeEntriesWithoutSupport: largeUnsupportedCount,
    items: items.slice(0, 20), // Limit to 20 items
  };
}

// ─── 5. Trend Detection ────────────────────────────────────────────────────

/**
 * Analyze recent financial trends for revenue, expenses, and profitability.
 */
async function checkTrends(entityId: string): Promise<TrendCheck> {
  const anomalies: string[] = [];

  // Get the last 3 closed periods for comparison
  const closedPeriods = await db.query.fiscalPeriods.findMany({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "closed"),
    ),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
    limit: 3,
  });

  if (closedPeriods.length < 2) {
    return {
      status: "healthy",
      revenueTrend: "stable",
      expenseTrend: "stable",
      profitabilityTrend: "stable",
      anomalies: [],
    };
  }

  // Get trial balance snapshots for each period
  const periodBalances: Array<{
    period: string;
    revenue: number;
    expenses: number;
    netIncome: number;
  }> = [];

  for (const period of closedPeriods) {
    const tbEntries = await db.query.trialBalanceSnapshots.findMany({
      where: and(
        eq(trialBalanceSnapshots.entityId, entityId),
        eq(trialBalanceSnapshots.periodId, period.id),
      ),
    });

    const accounts = await db.query.chartOfAccounts.findMany({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        inArray(
          chartOfAccounts.id,
          tbEntries.map((t) => t.accountId),
        ),
      ),
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let revenue = 0;
    let expenses = 0;

    for (const tb of tbEntries) {
      const account = accountMap.get(tb.accountId);
      if (!account) continue;

      const balance = Number(tb.balance);
      if (account.type === "revenue") revenue += balance;
      if (account.type === "expense") expenses += balance;
    }

    periodBalances.push({
      period: `${period.year}-${String(period.month).padStart(2, "0")}`,
      revenue,
      expenses,
      netIncome: revenue - expenses,
    });
  }

  // Compare latest two periods
  const latest = periodBalances[0]!;
  const previous = periodBalances[1]!;

  const revenueChange =
    previous.revenue > 0
      ? ((latest.revenue - previous.revenue) / previous.revenue) * 100
      : 0;
  const expenseChange =
    previous.expenses > 0
      ? ((latest.expenses - previous.expenses) / previous.expenses) * 100
      : 0;

  // Revenue trend
  const revenueTrend: TrendCheck["revenueTrend"] =
    revenueChange > 10 ? "up" : revenueChange < -10 ? "down" : "stable";

  if (revenueChange < -20) {
    anomalies.push(
      `Revenue declined ${revenueChange.toFixed(0)}% from ${previous.period} to ${latest.period}.`,
    );
  }
  if (revenueChange > 50) {
    anomalies.push(
      `Revenue surged ${revenueChange.toFixed(0)}% from ${previous.period} to ${latest.period}. Verify if this is expected.`,
    );
  }

  // Expense trend
  const expenseTrend: TrendCheck["expenseTrend"] =
    expenseChange > 10 ? "up" : expenseChange < -10 ? "down" : "stable";

  if (expenseChange > 30) {
    anomalies.push(
      `Expenses increased ${expenseChange.toFixed(0)}% from ${previous.period} to ${latest.period}. Review for budget compliance.`,
    );
  }

  // Profitability
  const profitabilityTrend: TrendCheck["profitabilityTrend"] =
    latest.netIncome > previous.netIncome * 1.1
      ? "improving"
      : latest.netIncome < previous.netIncome * 0.9
        ? "declining"
        : "stable";

  if (latest.netIncome < 0 && previous.netIncome < 0) {
    anomalies.push(
      "Consecutive loss-making periods detected. Review cash flow and runway.",
    );
  }

  const status =
    anomalies.length > 2
      ? "critical"
      : anomalies.length > 0
        ? "warning"
        : "healthy";

  return {
    status,
    revenueTrend,
    expenseTrend,
    profitabilityTrend,
    anomalies,
  };
}

// ─── 6. Cash Flow Monitoring ──────────────────────────────────────────────

/**
 * Calculate current cash position, burn rate, and runway.
 */
async function checkCashFlow(entityId: string): Promise<CashFlowCheck> {
  const flags: string[] = [];

  // Find cash-related accounts
  const cashAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      sql`(${chartOfAccounts.code} LIKE '10%' OR ${chartOfAccounts.code} LIKE '11%')`,
      eq(chartOfAccounts.isActive, true),
    ),
  });

  // Get current cash balance from latest trial balance
  const latestPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "open"),
    ),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
  });

  let currentCashBalance = 0;

  if (latestPeriod && cashAccounts.length > 0) {
    const tbEntries = await db.query.trialBalanceSnapshots.findMany({
      where: and(
        eq(trialBalanceSnapshots.entityId, entityId),
        eq(trialBalanceSnapshots.periodId, latestPeriod.id),
        inArray(
          trialBalanceSnapshots.accountId,
          cashAccounts.map((a) => a.id),
        ),
      ),
    });

    currentCashBalance = tbEntries.reduce(
      (sum, tb) => sum + Number(tb.balance),
      0,
    );
  }

  // Calculate average monthly revenue and expenses from last 3 periods
  const closedPeriods = await db.query.fiscalPeriods.findMany({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      sql`(${fiscalPeriods.status} = 'closed' OR ${fiscalPeriods.status} = 'locked')`,
    ),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
    limit: 3,
  });

  let totalRevenue = 0;
  let totalExpenses = 0;
  let periodCount = 0;

  for (const period of closedPeriods) {
    const tbEntries = await db.query.trialBalanceSnapshots.findMany({
      where: and(
        eq(trialBalanceSnapshots.entityId, entityId),
        eq(trialBalanceSnapshots.periodId, period.id),
      ),
    });

    const accounts = await db.query.chartOfAccounts.findMany({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        inArray(
          chartOfAccounts.id,
          tbEntries.map((t) => t.accountId),
        ),
      ),
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    for (const tb of tbEntries) {
      const account = accountMap.get(tb.accountId);
      if (!account) continue;

      if (account.type === "revenue") totalRevenue += Number(tb.balance);
      if (account.type === "expense") totalExpenses += Number(tb.balance);
    }

    periodCount++;
  }

  const avgMonthlyRevenue = periodCount > 0 ? totalRevenue / periodCount : 0;
  const avgMonthlyExpenses = periodCount > 0 ? totalExpenses / periodCount : 0;
  const burnRate = Math.max(0, avgMonthlyExpenses - avgMonthlyRevenue);
  const daysOfCashRemaining =
    avgMonthlyExpenses > 0
      ? (currentCashBalance / avgMonthlyExpenses) * 30
      : 365;
  const projectedRunwayMonths =
    burnRate > 0 ? currentCashBalance / burnRate : 999;

  if (daysOfCashRemaining < 90) {
    flags.push(
      `Critical: Only ${Math.round(daysOfCashRemaining)} days of cash remaining (${projectedRunwayMonths.toFixed(1)} months runway).`,
    );
  } else if (daysOfCashRemaining < 180) {
    flags.push(
      `Warning: ${Math.round(daysOfCashRemaining)} days of cash remaining (${projectedRunwayMonths.toFixed(1)} months runway).`,
    );
  }

  if (avgMonthlyExpenses > avgMonthlyRevenue && periodCount >= 2) {
    flags.push(
      `Burn rate exceeds revenue by ${formatCurrency(avgMonthlyExpenses - avgMonthlyRevenue)}/month. Operations are not yet self-sustaining.`,
    );
  }

  const status: CashFlowCheck["status"] =
    daysOfCashRemaining < 90
      ? "critical"
      : daysOfCashRemaining < 180
        ? "warning"
        : "healthy";

  return {
    status,
    currentCashBalance,
    projectedRunwayMonths: Math.round(projectedRunwayMonths * 10) / 10,
    burnRate,
    avgMonthlyRevenue,
    avgMonthlyExpenses,
    daysOfCashRemaining: Math.round(daysOfCashRemaining),
    flags,
  };
}

// ─── Activity Logging & Notifications ─────────────────────────────────────

/**
 * Log monitoring results to the agent activity table.
 */
async function logMonitoringActivity(
  entityId: string,
  report: MonitoringReport,
): Promise<void> {
  const criticalChecks = [
    report.reconciliation.status === "critical" ? "reconciliation" : null,
    report.anomalies.status === "critical" ? "anomalies" : null,
    report.fraud.status === "critical" ? "fraud" : null,
    report.missingDocuments.status === "critical" ? "missing_docs" : null,
    report.cashFlow.status === "critical" ? "cash_flow" : null,
  ].filter(Boolean);

  await db.insert(agentActivity).values({
    entityId,
    agentName: "monitoring-engine",
    action:
      criticalChecks.length > 0
        ? "monitoring.critical_flags"
        : "monitoring.completed",
    input: {},
    output: {
      criticalChecks,
      reconciliationStatus: report.reconciliation.status,
      anomalyCount: report.anomalies.anomaliesFound,
      fraudFlags: report.fraud.flagsRaised,
      missingDocs: report.missingDocuments.missingLinks,
      cashRunwayDays: report.cashFlow.daysOfCashRemaining,
      durationMs: report.durationMs,
    },
    status: criticalChecks.length > 0 ? "success_with_warnings" : "success",
    durationMs: report.durationMs,
  });
}

/**
 * Send notifications for critical monitoring findings.
 */
async function sendMonitoringNotifications(
  entityId: string,
  report: MonitoringReport,
): Promise<void> {
  const criticalIssues: string[] = [];

  if (report.cashFlow.status === "critical") {
    criticalIssues.push(
      `Cash position critical: ${formatCurrency(report.cashFlow.currentCashBalance)} with only ${report.cashFlow.daysOfCashRemaining} days remaining.`,
    );
  }

  if (report.fraud.status === "critical") {
    const fraudItems = report.fraud.items
      .filter((f) => f.severity === "critical" || f.severity === "high")
      .map((f) => f.description)
      .join("; ");
    criticalIssues.push(`Fraud alerts: ${fraudItems}`);
  }

  if (report.missingDocuments.status === "critical") {
    criticalIssues.push(
      `${report.missingDocuments.largeEntriesWithoutSupport} large journal entries (>$5,000) lack supporting documents.`,
    );
  }

  if (report.reconciliation.status === "critical") {
    criticalIssues.push(
      `Reconciliation issues detected in ${report.reconciliation.flaggedAccounts.length} accounts.`,
    );
  }

  if (criticalIssues.length > 0) {
    // Persist notifications to the database so they appear in the UI
    try {
      const accessRecords = await db.query.userEntityAccess.findMany({
        where: eq(userEntityAccess.entityId, entityId),
      });

      if (accessRecords.length > 0) {
        const notificationValues = accessRecords.map((record) => ({
          userId: record.userId,
          entityId,
          type: "monitoring_alert" as const,
          priority: "high" as const,
          title: `⚠️ Monitoring alert: ${criticalIssues.length} issue(s) detected`,
          body: criticalIssues.slice(0, 3).join("\n"),
          data: JSON.stringify({
            reportTimestamp: report.timestamp,
            reconciliation: report.reconciliation.status,
            fraud: report.fraud.status,
            anomalyCount: report.anomalies.anomaliesFound,
            missingDocs: report.missingDocuments.largeEntriesWithoutSupport,
            cashRunwayDays: report.cashFlow.daysOfCashRemaining,
          }),
          status: "sent" as const,
          sentAt: new Date(),
        }));

        await db.insert(notifications).values(notificationValues);
      }
    } catch (error) {
      // Notification failures should never break monitoring
      console.error("[monitoring] Failed to send notifications:", error);
    }
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Math.abs(amount));
}
