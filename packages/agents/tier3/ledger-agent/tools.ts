import { db } from "@xenboox/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
  fiscalPeriods,
} from "@xenboox/db/schema/accounting";
import { validateDoubleEntry as validateDoubleEntryRule } from "../../core/accounting-rules";
import type { PendingEntry, ConstraintLogEntry } from "./state";

// ─── Deterministic Validators ──────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  error?: string;
  constraint?: string;
}

/**
 * Validate double-entry balance using the centralized accounting rules engine.
 * Delegates to the core accounting-rules module for all deterministic checks.
 */
export async function validateDoubleEntry(
  entries: PendingEntry["entries"],
): Promise<ValidationResult> {
  const result = validateDoubleEntryRule(
    entries.map((e) => ({
      accountId: e.accountId,
      debit: String(e.debit),
      credit: String(e.credit),
    })),
  );

  // Convert centralized engine result to ledger-agent ValidationResult format
  if (result.errors.length > 0) {
    // Map specific errors to constraints
    if (result.lineCount < 2) {
      return {
        valid: false,
        error: result.errors[0],
        constraint: "min_lines",
      };
    }
    if (result.errors.some((e) => e.includes("negative"))) {
      return {
        valid: false,
        error: result.errors.find((e) => e.includes("negative"))!,
        constraint: "no_negative_amounts",
      };
    }
    if (result.errors.some((e) => e.includes("both debit"))) {
      return {
        valid: false,
        error: result.errors.find((e) => e.includes("both debit"))!,
        constraint: "no_mixed_lines",
      };
    }
    if (!result.balanced) {
      return {
        valid: false,
        error: result.errors.find((e) => e.includes("balanced"))!,
        constraint: "double_entry_balance",
      };
    }
    return {
      valid: false,
      error: result.errors[0],
      constraint: "validation_error",
    };
  }

  // Additional check: non-zero amounts (centralized engine checks negative but not zero)
  for (const e of entries) {
    if (e.debit === 0 && e.credit === 0) {
      return {
        valid: false,
        error: `Line (account ${e.accountCode}): must have a non-zero debit or credit`,
        constraint: "non_zero_amounts",
      };
    }
  }

  return { valid: true };
}

export async function validateAccountsExist(
  entries: PendingEntry["entries"],
  entityId: string,
): Promise<ValidationResult> {
  const accountIds = [...new Set(entries.map((e) => e.accountId))];
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      inArray(chartOfAccounts.id, accountIds),
    ),
  });
  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  for (const entry of entries) {
    const account = accountMap.get(entry.accountId);
    if (!account) {
      return {
        valid: false,
        error: `Account ${entry.accountCode} (${entry.accountId}) not found in chart of accounts`,
        constraint: "account_validity",
      };
    }
    if (!account.isActive) {
      return {
        valid: false,
        error: `Account ${entry.accountCode} (${account.name}) is inactive`,
        constraint: "account_active",
      };
    }
  }
  return { valid: true };
}

export async function validatePeriodOpen(
  periodId: string,
): Promise<ValidationResult> {
  const period = await db.query.fiscalPeriods.findFirst({
    where: eq(fiscalPeriods.id, periodId),
  });
  if (!period) {
    return {
      valid: false,
      error: `Period ${periodId} not found`,
      constraint: "period_exists",
    };
  }
  if (period.status === "closed" || period.status === "locked") {
    return {
      valid: false,
      error: `Period ${period.year}-${String(period.month).padStart(2, "0")} is ${period.status}`,
      constraint: "period_integrity",
    };
  }
  return { valid: true };
}

export async function validateEntityScope(
  entityId: string,
  entryEntityId: string | undefined,
): Promise<ValidationResult> {
  if (!entryEntityId) {
    return {
      valid: false,
      error: "Missing entityId on entry",
      constraint: "entity_scope",
    };
  }
  if (entryEntityId !== entityId) {
    return {
      valid: false,
      error: `Entity scope mismatch: expected ${entityId}, got ${entryEntityId}`,
      constraint: "entity_scope",
    };
  }
  return { valid: true };
}

export async function validateControllerApproval(
  approvedByController: boolean,
): Promise<ValidationResult> {
  if (!approvedByController) {
    return {
      valid: false,
      error: "Entry not approved by Controller Agent",
      constraint: "controller_approval",
    };
  }
  return { valid: true };
}

export async function validateNoDuplicate(
  reference: string | null,
  entityId: string,
): Promise<ValidationResult> {
  if (!reference) return { valid: true };

  const existing = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.entityId, entityId),
      eq(journalEntries.reference, reference),
      eq(journalEntries.status, "posted"),
    ),
  });
  if (existing) {
    return {
      valid: false,
      error: `Duplicate entry: reference "${reference}" already posted as JE-${existing.entryNumber}`,
      constraint: "no_duplicate",
    };
  }
  return { valid: true };
}

// ─── Run All Validations ───────────────────────────────────────────────────

export interface FullValidationResult {
  valid: boolean;
  constraintLog: ConstraintLogEntry[];
  errors: string[];
}

export async function runAllValidations(
  entry: PendingEntry,
  entityId: string,
): Promise<FullValidationResult> {
  const log: ConstraintLogEntry[] = [];
  const errors: string[] = [];
  const ts = new Date().toISOString();

  const checks = [
    {
      name: "controller_approval",
      fn: () => validateControllerApproval(entry.approvedByController),
    },
    { name: "double_entry", fn: () => validateDoubleEntry(entry.entries) },
    {
      name: "accounts_exist",
      fn: () => validateAccountsExist(entry.entries, entityId),
    },
    { name: "period_open", fn: () => validatePeriodOpen(entry.periodId) },
    {
      name: "entity_scope",
      fn: () => validateEntityScope(entityId, entry.id ? entityId : undefined),
    },
    {
      name: "no_duplicate",
      fn: () => validateNoDuplicate(entry.reference, entityId),
    },
  ];

  for (const check of checks) {
    const result = await check.fn();
    log.push({
      timestamp: ts,
      constraint: check.name,
      passed: result.valid,
      details: result.error || "passed",
      entryId: entry.id,
    });
    if (!result.valid && result.error) {
      errors.push(result.error);
    }
  }

  return { valid: errors.length === 0, constraintLog: log, errors };
}

// ─── Database Operations ───────────────────────────────────────────────────

export async function postEntry(entry: PendingEntry, entityId: string) {
  // Entry number is unique per entity; every writer computes max+1, so
  // concurrent postings collide on the (entityId, entryNumber) index. Retry
  // with a freshly-read max instead of aborting the post on a raw constraint.
  let journalEntry: typeof journalEntries.$inferSelect | null = null;
  for (let attempt = 0; attempt < 3 && !journalEntry; attempt++) {
    const lastEntry = await db.query.journalEntries.findFirst({
      where: eq(journalEntries.entityId, entityId),
      orderBy: [desc(journalEntries.entryNumber)],
    });
    const entryNumber = (lastEntry?.entryNumber ?? 0) + 1;
    try {
      const [created] = await db
        .insert(journalEntries)
        .values({
          entityId,
          entryNumber,
          description: entry.description,
          reference: entry.reference,
          date: entry.date,
          periodId: entry.periodId,
          status: "posted",
          postedBy: "ledger-agent",
          postedAt: new Date(),
          source: entry.sourceAgent,
          confidence: "0.95",
        })
        .returning();
      journalEntry = created ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCollision = /je_entity_entry_number|duplicate key value/.test(
        msg,
      );
      if (!isCollision || attempt === 2) throw err;
      // Concurrent post took the number — re-read the max and retry.
    }
  }
  if (!journalEntry) {
    throw new Error("Failed to allocate a journal entry number");
  }

  // Batch-insert all lines in one query. If they fail, compensate — never
  // leave a posted entry that records money without its lines.
  try {
    await db.insert(journalEntryLines).values(
      entry.entries.map((line) => ({
        journalEntryId: journalEntry.id,
        accountId: line.accountId,
        debit: String(line.debit),
        credit: String(line.credit),
      })),
    );
  } catch (err) {
    await db
      .delete(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, journalEntry.id))
      .catch(() => {});
    await db
      .delete(journalEntries)
      .where(eq(journalEntries.id, journalEntry.id))
      .catch(() => {});
    throw err;
  }

  return journalEntry;
}

export async function generateTrialBalance(entityId: string, periodId: string) {
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

  if (entries.length === 0) {
    return {
      periodId,
      periodLabel: period
        ? `${period.year}-${String(period.month).padStart(2, "0")}`
        : "Unknown",
      generatedAt: new Date().toISOString(),
      accounts: [],
      totalDebits: 0,
      totalCredits: 0,
      balanced: true,
    };
  }

  const entryIds = entries.map((e) => e.id);
  const allLines = await db.query.journalEntryLines.findMany({
    where: inArray(journalEntryLines.journalEntryId, entryIds),
  });

  const accountIds = [...new Set(allLines.map((l) => l.accountId))];
  const accountsData = await db.query.chartOfAccounts.findMany({
    where: inArray(chartOfAccounts.id, accountIds),
  });
  const accountMap = new Map(accountsData.map((a) => [a.id, a]));

  const accountTotals = new Map<
    string,
    { code: string; name: string; type: string; debit: number; credit: number }
  >();

  for (const line of allLines) {
    const existing = accountTotals.get(line.accountId);
    if (existing) {
      existing.debit += Number(line.debit);
      existing.credit += Number(line.credit);
    } else {
      const acc = accountMap.get(line.accountId);
      accountTotals.set(line.accountId, {
        code: acc?.code ?? "???",
        name: acc?.name ?? "Unknown",
        type: acc?.type ?? "asset",
        debit: Number(line.debit),
        credit: Number(line.credit),
      });
    }
  }

  const accounts = Array.from(accountTotals.entries()).map(
    ([accountId, data]) => ({
      accountId,
      accountCode: data.code,
      accountName: data.name,
      accountType: data.type as
        | "asset"
        | "liability"
        | "equity"
        | "revenue"
        | "expense",
      debitBalance: data.debit,
      creditBalance: data.credit,
      netBalance: data.debit - data.credit,
    }),
  );

  const totalDebits = accounts.reduce((sum, a) => sum + a.debitBalance, 0);
  const totalCredits = accounts.reduce((sum, a) => sum + a.creditBalance, 0);

  return {
    periodId,
    periodLabel: period
      ? `${period.year}-${String(period.month).padStart(2, "0")}`
      : "Unknown",
    generatedAt: new Date().toISOString(),
    accounts,
    totalDebits,
    totalCredits,
    balanced: Math.abs(totalDebits - totalCredits) < 0.01,
  };
}

// ─── Creation Tools ───────────────────────────────────────────────────────

import {
  parseCreationIntent,
  type CreationParseResult,
} from "../../core/creation-tools";

/**
 * Parse and validate a journal entry creation request from natural language.
 */
export async function parseJournalEntryCreation(
  userInput: string,
  entityContext: { currency: string; entityName: string },
): Promise<CreationParseResult> {
  return parseCreationIntent(userInput, "create_journal_entry", entityContext);
}
