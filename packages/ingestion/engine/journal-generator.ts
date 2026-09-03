import { db } from "@xenboox/db";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";
import { eq, and, desc } from "drizzle-orm";
import type {
  AccountingTreatment,
  CoaMapping,
  CoaLine,
  ProposedJournalEntry,
  IngestionValidation,
  TransactionSource,
  ValidationError,
  ValidationWarning,
} from "../core/types";

// ─── Journal Entry Generator ────────────────────────────────────────────────

/**
 * Generate a balanced double-entry journal entry from the accounting treatment
 * and COA mapping results. Validates balance before returning.
 *
 * @param entityId - Entity to scope the entry to
 * @param treatment - Accounting treatment with debit/credit accounts
 * @param mapping - Resolved COA account mappings
 * @param source - Source identifier for the entry
 * @param transactionDate - Optional transaction date (defaults to today).
 *        Should be the actual document date (invoice date, receipt date, etc.)
 *        to ensure correct fiscal period assignment.
 */
export async function generateJournalEntry(
  entityId: string,
  treatment: AccountingTreatment,
  mapping: CoaMapping,
  source: TransactionSource,
  transactionDate?: string,
): Promise<{
  entry: ProposedJournalEntry;
  validation: IngestionValidation;
}> {
  const allLines = [...mapping.debitLines, ...mapping.creditLines];
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Determine the entry date — prefer the provided transaction date
  const date = transactionDate ?? new Date().toISOString().split("T")[0]!;

  // Determine the fiscal period
  const periodId = await resolvePeriod(entityId, date);

  // Check if we have at least 2 lines
  if (allLines.length < 2) {
    errors.push({
      field: "lines",
      message: "Journal entry must have at least 2 lines (debit and credit)",
      severity: "error",
    });
  }

  // Build the lines
  const lines: ProposedJournalEntry["lines"] = [
    ...mapping.debitLines.map((l) => ({
      accountId: l.accountId,
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: l.amount,
      credit: 0,
      description: l.description,
      lineConfidence: l.confidence,
    })),
    ...mapping.creditLines.map((l) => ({
      accountId: l.accountId,
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: 0,
      credit: l.amount,
      description: l.description,
      lineConfidence: l.confidence,
    })),
  ];

  // Calculate totals
  let totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  let totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  let balanced = Math.abs(totalDebit - totalCredit) <= 0.01;

  if (!balanced) {
    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) > 0.01) {
      errors.push({
        field: "balance",
        message: `Journal entry not balanced: debits ${totalDebit.toFixed(2)} != credits ${totalCredit.toFixed(2)} (difference: ${diff.toFixed(2)})`,
        severity: "error",
      });

      // Auto-balance by adding a rounding adjustment if the difference is small.
      // Only when we have a real account to park the rounding on — otherwise the
      // balance error stands and the entry goes to review.
      const adjustmentSource = mapping.debitLines[0] ?? mapping.creditLines[0];
      if (Math.abs(diff) <= 0.05 && adjustmentSource) {
        lines.push({
          accountId: adjustmentSource.accountId,
          accountCode: adjustmentSource.accountCode,
          accountName: adjustmentSource.accountName,
          debit: diff < 0 ? Math.abs(diff) : 0,
          credit: diff > 0 ? diff : 0,
          description: "Rounding adjustment for balanced entry",
          lineConfidence: 0.5,
        });
        errors.pop(); // Remove the balance error since we fixed it
        warnings.push({
          field: "balance",
          message: `Auto-balanced with rounding adjustment of ${Math.abs(diff).toFixed(2)}`,
        });

        // Recompute totals and balance now that the rounding line was added
        totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
        totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
        balanced = Math.abs(totalDebit - totalCredit) <= 0.01;
      }
    }
  }

  // Validate amounts are non-negative
  const hasNegativeAmount = lines.some((l) => l.debit < 0 || l.credit < 0);
  if (hasNegativeAmount) {
    errors.push({
      field: "amounts",
      message: "Negative amounts detected in journal lines",
      severity: "error",
    });
  }

  // Validate no line has both debit and credit
  const hasBoth = lines.some((l) => l.debit > 0 && l.credit > 0);
  if (hasBoth) {
    errors.push({
      field: "lines",
      message: "A journal line cannot have both debit and credit",
      severity: "error",
    });
  }

  // Check for unmapped accounts
  if (mapping.unmapped.length > 0) {
    warnings.push({
      field: "accounts",
      message: `${mapping.unmapped.length} account(s) could not be mapped to the chart of accounts: ${mapping.unmapped.map((u) => u.label).join(", ")}`,
    });
  }

  // Generate reference number
  const reference = generateReference(
    treatment.workflow,
    treatment.description,
  );

  const entry: ProposedJournalEntry = {
    description: treatment.description,
    date,
    reference,
    lines,
    totalDebit,
    totalCredit,
    balanced,
    periodId: periodId ?? undefined,
    source,
    reasoning: treatment.reasoning,
  };

  const validation: IngestionValidation = {
    doubleEntryValid: balanced,
    accountsExist: mapping.unmapped.length === 0,
    periodOpen: !!periodId,
    noDuplicates: true, // Will be checked upstream
    amountsValid: !hasNegativeAmount && !hasBoth,
    taxValid: true, // Will be enhanced with tax validation
    errors,
    warnings,
  };

  return { entry, validation };
}

// ─── Database Writers ───────────────────────────────────────────────────────

/**
 * Post a validated journal entry to the database.
 * This is the "commit" step — only call this when the posting decision is "auto_post".
 */
export async function postJournalEntry(
  entityId: string,
  entry: ProposedJournalEntry,
  confidence: number,
  sourceAgent: string = "ingestion-engine",
): Promise<{ journalEntryId: string; entryNumber: number }> {
  // Validate period exists before attempting to post
  if (!entry.periodId) {
    throw new Error(
      `Cannot post journal entry: no fiscal period found for date ${entry.date}. ` +
        "Ensure fiscal periods are created for the entity before posting.",
    );
  }

  // ── Defense-in-depth: never post an unbalanced or malformed entry ──
  // decidePosting already rejects critical validation errors; this guards
  // against any caller forcing a bad entry into the GL.
  if (!entry.balanced) {
    throw new Error(
      `Cannot post journal entry: entry is not balanced ` +
        `(debits ${entry.totalDebit.toFixed(2)} != credits ${entry.totalCredit.toFixed(2)}). ` +
        "Fix the entry or send it to review instead of posting.",
    );
  }
  const invalidLine = entry.lines.find((l) => !l.accountId);
  if (invalidLine) {
    throw new Error(
      `Cannot post journal entry: line "${invalidLine.description ?? invalidLine.accountName}" has no accountId. ` +
        "Resolve the account mapping before posting.",
    );
  }

  // ── Single transaction: header + lines post together or not at all ──
  // Uniqueness is enforced by the DB (je_entity_reference, je_entity_entry_number):
  //   - Concurrent retry with the same reference → onConflictDoNothing returns the
  //     existing entry (true atomic dedup, no TOCTOU window).
  //   - Concurrent posts racing for the same entryNumber → unique violation is
  //     caught and the number is re-allocated (bounded retry).
  return db.transaction(async (tx) => {
    if (entry.reference) {
      const lastEntry = await tx.query.journalEntries.findFirst({
        where: eq(journalEntries.entityId, entityId),
        orderBy: [desc(journalEntries.entryNumber)],
      });
      const entryNumber = (lastEntry?.entryNumber ?? 0) + 1;

      const [inserted] = await tx
        .insert(journalEntries)
        .values(
          headerValues(
            entry,
            entityId,
            entry.reference,
            entryNumber,
            confidence,
            sourceAgent,
          ),
        )
        .onConflictDoNothing({
          target: [journalEntries.entityId, journalEntries.reference],
        })
        .returning();

      if (inserted) {
        await insertLines(tx, inserted.id, entry.lines);
        return {
          journalEntryId: inserted.id,
          entryNumber: inserted.entryNumber,
        };
      }

      // Conflict — the reference was already posted (by this pipeline or a
      // concurrent one). Return the existing entry instead of double-posting.
      const existing = await tx.query.journalEntries.findFirst({
        where: and(
          eq(journalEntries.entityId, entityId),
          eq(journalEntries.reference, entry.reference),
        ),
      });
      if (existing) {
        return {
          journalEntryId: existing.id,
          entryNumber: existing.entryNumber,
        };
      }
    }

    // No reference (or unreachable conflict edge) — allocate the next entry
    // number with a bounded retry to survive concurrent races.
    for (let attempt = 0; attempt < 3; attempt++) {
      const lastEntry = await tx.query.journalEntries.findFirst({
        where: eq(journalEntries.entityId, entityId),
        orderBy: [desc(journalEntries.entryNumber)],
      });
      const entryNumber = (lastEntry?.entryNumber ?? 0) + 1;

      try {
        const [journalEntry] = await tx
          .insert(journalEntries)
          .values(
            headerValues(
              entry,
              entityId,
              entry.reference,
              entryNumber,
              confidence,
              sourceAgent,
            ),
          )
          .returning();

        await insertLines(tx, journalEntry.id, entry.lines);
        return {
          journalEntryId: journalEntry.id,
          entryNumber: journalEntry.entryNumber,
        };
      } catch (error) {
        // 23505 = unique_violation: another transaction claimed this entry
        // number first. Re-allocate and retry.
        if (
          typeof error === "object" &&
          error !== null &&
          (error as { code?: string }).code === "23505" &&
          attempt < 2
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      `Cannot post journal entry: could not allocate a unique entry number ` +
        `for entity ${entityId} after 3 attempts.`,
    );
  });
}

// ─── Posting Helpers ────────────────────────────────────────────────────────

function headerValues(
  entry: ProposedJournalEntry,
  entityId: string,
  reference: string | null,
  entryNumber: number,
  confidence: number,
  sourceAgent: string,
) {
  return {
    entityId,
    entryNumber,
    description: entry.description,
    reference,
    date: entry.date,
    periodId: entry.periodId!,
    status: "posted" as const,
    postedBy: sourceAgent,
    postedAt: new Date(),
    confidence: String(confidence),
    source: entry.source,
    metadata: {
      ingestionRef: entry.reference,
      reasoning: entry.reasoning,
      autoGenerated: true,
      postedAt: new Date().toISOString(),
    },
  };
}

async function insertLines(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  journalEntryId: string,
  lines: ProposedJournalEntry["lines"],
) {
  if (lines.length === 0) return;

  await tx.insert(journalEntryLines).values(
    lines.map((line) => ({
      journalEntryId,
      accountId: line.accountId,
      debit: String(line.debit),
      credit: String(line.credit),
      description: line.description,
    })),
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolvePeriod(
  entityId: string,
  date: string,
): Promise<string | null> {
  const entryDate = new Date(date);
  if (Number.isNaN(entryDate.getTime())) return null;
  const year = entryDate.getFullYear();
  const month = entryDate.getMonth() + 1;

  // Only resolve to an OPEN period — never post into closed/locked books.
  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.year, year),
      eq(fiscalPeriods.month, month),
      eq(fiscalPeriods.status, "open"),
    ),
  });

  return period?.id ?? null;
}

function generateReference(workflow: string, description: string): string {
  const prefix = workflow
    .split("_")
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  // Use random suffix for uniqueness (avoids collisions when two docs
  // are processed in the same millisecond)
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const slug = description
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");
  return `${prefix}-${timestamp}-${randomSuffix}-${slug}`;
}
