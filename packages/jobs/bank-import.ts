/**
 * Bank Statement Import Job
 *
 * Triggered when a user uploads a CSV or PDF bank statement.
 * Parses the file, extracts transactions, and inserts them into bank_transactions.
 * Also creates/updates bank_accounts if not already linked.
 */

import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db, matchBankRules } from "@xenboox/db";
import {
  bankTransactions,
  bankAccounts,
  bankRules,
  documents,
  reconciliations,
  auditLog,
} from "@xenboox/db/schema";
import { eq, and, sql, asc, inArray } from "drizzle-orm";
import { parseBankCSV } from "./lib/bank-csv-parser";
import { parseBankStatementPDF } from "./lib/bank-statement-parser";
import { extractText } from "./lib/ocr";
import { downloadFromR2 } from "./lib/r2";

export const importBankStatement = task({
  id: "import-bank-statement",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 5,
  },

  onFailure: dlqOnFailure<{
    documentId: string;
    entityId: string;
    storagePath: string;
    mimeType: string;
    bankAccountId?: string;
  }>({
    task: "import-bank-statement",
    type: "data_validation",
    severity: "high",
    title: (p) => `Bank statement import failed: ${p.documentId}`,
    entityIdFrom: (p) => p.entityId,
  }),

  run: async (payload: {
    documentId: string;
    entityId: string;
    storagePath: string;
    mimeType: string;
    bankAccountId?: string;
  }) => {
    const { documentId, entityId, storagePath, mimeType, bankAccountId } =
      payload;

    logger.info("Starting bank statement import", {
      documentId,
      entityId,
      mimeType,
    });

    // 1. Download file from R2 (shared helper — validates config and
    // rejects empty paths instead of silently hitting a bad endpoint)
    const fileBuffer = await downloadFromR2(storagePath);
    if (!fileBuffer) {
      throw new Error("Failed to read file from R2");
    }

    // 2. Parse based on file type
    let parseResult;

    if (mimeType === "text/csv" || mimeType === "application/csv") {
      const content = new TextDecoder().decode(fileBuffer);
      parseResult = parseBankCSV(content);
    } else if (
      mimeType === "application/pdf" ||
      mimeType === "application/vnd.ms-excel"
    ) {
      // For PDFs, run OCR/text extraction first
      const ocrResult = await extractText(fileBuffer, mimeType, entityId);
      parseResult = parseBankStatementPDF(ocrResult.text);
    } else {
      throw new Error(`Unsupported bank statement format: ${mimeType}`);
    }

    logger.info("Parse completed", {
      documentId,
      transactionsFound: parseResult.rowCount,
      errors: parseResult.parseErrors.length,
    });

    // 3. Find or create bank account
    let resolvedBankAccountId = bankAccountId;

    if (!resolvedBankAccountId && parseResult.accountNumber) {
      const existingAccount = await db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.entityId, entityId),
          eq(bankAccounts.accountNumber, parseResult.accountNumber),
        ),
      });

      if (existingAccount) {
        resolvedBankAccountId = existingAccount.id;
      } else {
        const [newAccount] = await db
          .insert(bankAccounts)
          .values({
            entityId,
            name: `${parseResult.bankName ?? "Bank"} - ${parseResult.accountNumber}`,
            bankName: parseResult.bankName ?? "Unknown",
            accountNumber: parseResult.accountNumber ?? "",
            currency: parseResult.currency ?? "USD",
            currentBalance: String(parseResult.closingBalance ?? 0),
            openingBalance: String(parseResult.openingBalance ?? 0),
          })
          .returning();

        resolvedBankAccountId = newAccount!.id;

        logger.info("Created new bank account", {
          documentId,
          accountId: newAccount!.id,
          accountNumber: parseResult.accountNumber,
        });
      }
    }

    // 4. Insert transactions (with batched dedup by reference)
    const MAX_TRANSACTIONS = 10_000;
    let insertedCount = 0;
    let skippedCount = 0;

    // Cap transaction count to prevent memory/DB exhaustion
    const transactions = parseResult.transactions.slice(0, MAX_TRANSACTIONS);
    if (parseResult.transactions.length > MAX_TRANSACTIONS) {
      logger.warn("[bank-import] Transaction count capped", {
        documentId,
        total: parseResult.transactions.length,
        capped: MAX_TRANSACTIONS,
      });
    }

    // Batch dedup: collect all references, query once
    const references = transactions
      .filter((tx) => tx.reference)
      .map((tx) => tx.reference!);
    const existingRefs = new Set<string>();
    if (references.length > 0) {
      // Batch query in chunks of 500 to avoid IN clause limits
      const CHUNK_SIZE = 500;
      for (let i = 0; i < references.length; i += CHUNK_SIZE) {
        const chunk = references.slice(i, i + CHUNK_SIZE);
        const existing = await db.query.bankTransactions.findMany({
          where: and(
            eq(bankTransactions.entityId, entityId),
            inArray(bankTransactions.reference, chunk),
          ),
          columns: { reference: true },
        });
        for (const row of existing) {
          if (row.reference) existingRefs.add(row.reference);
        }
      }
    }

    // Load the entity's active rules once — rules outrank parser heuristics
    // so user intent wins over generic keyword matching at import time.
    const rules = await db.query.bankRules.findMany({
      where: and(
        eq(bankRules.entityId, entityId),
        eq(bankRules.isActive, true),
      ),
      orderBy: [asc(bankRules.priority)],
    });

    // Insert non-duplicate transactions in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      const values: Array<{
        entityId: string;
        bankAccountId: string;
        transactionDate: string;
        valueDate?: string;
        description: string;
        reference?: string;
        amount: string;
        type: "deposit" | "withdrawal";
        balance?: string;
        source: string;
        category: string;
        glAccountId?: string;
        categorizedBy?: string;
        categorizationConfidence?: string;
        metadata: Record<string, unknown>;
      }> = [];
      for (const tx of batch) {
        if (tx.reference && existingRefs.has(tx.reference)) {
          skippedCount++;
          continue;
        }

        // Categorize: user rules first, then the parser's shared-categorizer
        // match (canonical taxonomy, direction-aware, confidence >= 0.7).
        // Confident matches land in the category column immediately;
        // everything else stays "Uncategorized" for rule/human review.
        let category: string | undefined;
        let glAccountId: string | null | undefined;
        let categorizedBy: "rule" | "ai" | undefined;
        let categoryConfidence: string | undefined;

        const ruleMatch = matchBankRules(
          {
            description: tx.description,
            reference: tx.reference,
            amount: tx.amount,
            type: tx.type === "credit" ? "deposit" : "withdrawal",
          },
          rules.map((r) => ({
            matchType: r.matchType,
            matchValue: r.matchValue,
            category: r.category,
            glAccountId: r.glAccountId,
          })),
        );
        if (ruleMatch) {
          category = ruleMatch.category;
          glAccountId = ruleMatch.glAccountId ?? null;
          categorizedBy = "rule";
          categoryConfidence = String(ruleMatch.confidence);
        } else if (tx.category && (tx.categoryConfidence ?? 0) >= 0.7) {
          category = tx.category;
          categorizedBy = "ai";
          categoryConfidence = String(tx.categoryConfidence);
        }

        values.push({
          entityId,
          bankAccountId: resolvedBankAccountId!,
          transactionDate: tx.date,
          valueDate: tx.valueDate,
          description: tx.description,
          reference: tx.reference,
          amount: String(tx.amount),
          type: tx.type === "credit" ? "deposit" : "withdrawal",
          balance: tx.balance ? String(tx.balance) : undefined,
          source: "bank_statement",
          category: category ?? "Uncategorized",
          glAccountId: glAccountId ?? undefined,
          categorizedBy,
          categorizationConfidence: categoryConfidence,
          metadata: {
            documentId,
          },
        });
      }
      if (values.length > 0) {
        await db.insert(bankTransactions).values(values);
        insertedCount += values.length;
      }
    }

    // 5. Create reconciliation suggestion
    if (
      parseResult.openingBalance !== undefined &&
      parseResult.closingBalance !== undefined
    ) {
      const bankBalance = parseResult.closingBalance;
      const bookBalance = parseResult.closingBalance; // Initially same as bank
      const effectiveBankAccountId = resolvedBankAccountId as string;
      await db.insert(reconciliations).values({
        entityId,
        bankAccountId: effectiveBankAccountId,
        statementDate:
          parseResult.statementPeriod?.end ??
          new Date().toISOString().split("T")[0]!,
        statementBalance: String(bankBalance),
        bookBalance: String(bookBalance),
        difference: "0",
        status: "unmatched",
        notes: `Imported from ${parseResult.bankName ?? "bank statement"} PDF/CSV`,
      });
    }

    // 6. Update document status
    await db
      .update(documents)
      .set({
        status: "done",
        metadata: {
          processedAt: new Date().toISOString(),
          bankImport: {
            bankAccountId: resolvedBankAccountId!,
            transactionsFound: parseResult.rowCount,
            transactionsInserted: insertedCount,
            transactionsSkipped: skippedCount,
            totalCredits: parseResult.totalCredits,
            totalDebits: parseResult.totalDebits,
            bankName: parseResult.bankName,
            accountNumber: parseResult.accountNumber,
          },
        },
      })
      .where(eq(documents.id, documentId));

    // 7. Audit log
    await db.insert(auditLog).values({
      entityId,
      action: "bank_statement.import",
      entityType: "bank_account",
      entityIdRef: resolvedBankAccountId!,
      newValues: {
        documentId,
        insertedCount,
        skippedCount,
        totalCredits: parseResult.totalCredits,
        totalDebits: parseResult.totalDebits,
      },
    });

    logger.info("Bank statement import completed", {
      documentId,
      bankAccountId: resolvedBankAccountId!,
      inserted: insertedCount,
      skipped: skippedCount,
    });

    return {
      success: true,
      bankAccountId: resolvedBankAccountId!,
      transactionsInserted: insertedCount,
      transactionsSkipped: skippedCount,
      totalCredits: parseResult.totalCredits,
      totalDebits: parseResult.totalDebits,
    };
  },
});
