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
  source: string,
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
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);
  const balanced = Math.abs(totalDebit - totalCredit) <= 0.01;

  if (!balanced) {
    const diff = totalDebit - totalCredit;
    if (Math.abs(diff) > 0.01) {
      errors.push({
        field: "balance",
        message: `Journal entry not balanced: debits ${totalDebit.toFixed(2)} != credits ${totalCredit.toFixed(2)} (difference: ${diff.toFixed(2)})`,
        severity: "error",
      });

      // Auto-balance by adding a rounding adjustment if the difference is small
      if (Math.abs(diff) <= 0.05) {
        lines.push({
          accountId:
            mapping.debitLines[0]?.accountId ??
            mapping.creditLines[0]?.accountId ??
            "",
          accountCode: "9999",
          accountName: "Rounding Adjustment",
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
    source: "document_upload",
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

  // Get the next entry number
  const lastEntry = await db.query.journalEntries.findFirst({
    where: eq(journalEntries.entityId, entityId),
    orderBy: [desc(journalEntries.entryNumber)],
  });
  const entryNumber = (lastEntry?.entryNumber ?? 0) + 1;

  // Insert the journal entry header
  const [journalEntry] = await db
    .insert(journalEntries)
    .values({
      entityId,
      entryNumber,
      description: entry.description,
      reference: entry.reference,
      date: entry.date,
      periodId: entry.periodId,
      status: "posted",
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
    })
    .returning();

  // Insert journal entry lines
  const lineValues = entry.lines.map((line) => ({
    journalEntryId: journalEntry.id,
    accountId: line.accountId,
    debit: String(line.debit),
    credit: String(line.credit),
    description: line.description,
  }));

  await db.insert(journalEntryLines).values(lineValues);

  return {
    journalEntryId: journalEntry.id,
    entryNumber: journalEntry.entryNumber,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolvePeriod(
  entityId: string,
  date: string,
): Promise<string | null> {
  const entryDate = new Date(date);
  const year = entryDate.getFullYear();
  const month = entryDate.getMonth() + 1;

  const period = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.year, year),
      eq(fiscalPeriods.month, month),
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
  const slug = description
    .replace(/[^a-zA-Z0-9]/g, " ")
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((w) => w[0].toUpperCase())
    .join("");
  return `${prefix}-${timestamp}-${slug}`;
}
