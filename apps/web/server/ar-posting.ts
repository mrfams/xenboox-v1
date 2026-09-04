// ─── AR → General Ledger posting orchestration ─────────────────────────────
//
// P3-B. Implements accrual posting for the AR module (mirrors banking's
// postToLedger conventions):
//   invoice created → Dr AR / Cr line accounts   (reference `ar-inv-{id}`)
//   payment received → Dr receipt acct / Cr AR   (reference `ar-pay-{id}`)
//   invoice voided   → reversal of the invoice JE (`ar-inv-rev-{id}`)
//
// Rules enforced (shared with AP via journal-posting-core):
//   - TrustGuard validates every entry before insert (validateJournalEntry)
//   - the JE reference is the idempotency key — the unique (entityId,
//     reference) index makes double-posting impossible
//   - the entry only posts into an OPEN fiscal period for its date
//   - AR / receipt accounts resolve deterministically (ar-ledger), creating
//     the canonical row (1100 AR / 1010 cash / 1020 bank) when absent
//   - money stays integer-cents end to end; entries always balance

import { eq, and, desc } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  auditLog,
  salesInvoices,
  paymentsAr,
} from "@xenboox/db/schema";
import {
  resolveArReceivableAccount,
  resolvePaymentReceiptAccount,
  buildArInvoiceLines,
  buildArPaymentLines,
} from "@xenboox/db";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { moneyToCents } from "./ar-validation";
import {
  createPostedJournal,
  cleanupJournal,
  ensureAccount,
} from "./journal-posting-core";

export type ArPostResult =
  | { posted: true; journalEntryId: string }
  | { posted: false; reason: string };

type CoaPick = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
};

// ─── Invoice posting ────────────────────────────────────────────────────────

/**
 * Post the revenue/AR entry for a sales invoice. No-op (posted) when the
 * invoice already has a journalEntryId. Never throws — returns a result the
 * caller can log; invoice creation must not fail because a posting is
 * temporarily impossible (closed period, missing account resolution).
 */
export async function postArInvoiceToLedger(
  invoiceId: string,
  entityId: string,
  userId: string,
): Promise<ArPostResult> {
  try {
    const invoice = await db.query.salesInvoices.findFirst({
      where: and(
        eq(salesInvoices.id, invoiceId),
        eq(salesInvoices.entityId, entityId),
      ),
      columns: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        journalEntryId: true,
        status: true,
      },
    });
    if (!invoice) return { posted: false, reason: "invoice_not_found" };
    if (invoice.status === "voided") return { posted: false, reason: "voided" };
    if (invoice.journalEntryId) {
      return { posted: true, journalEntryId: invoice.journalEntryId };
    }

    const lines = await db.query.salesInvoiceLines.findMany({
      where: eq(salesInvoiceLines.salesInvoiceId, invoice.id),
      columns: { accountId: true, amount: true, description: true },
    });
    if (lines.length === 0) return { posted: false, reason: "no_lines" };

    const coa = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.entityId, entityId),
      columns: { id: true, code: true, name: true, type: true, subtype: true },
    });
    if (coa.length === 0)
      return { posted: false, reason: "no_chart_of_accounts" };

    const ar = resolveArReceivableAccount(coa as CoaPick[]);
    const arAccountId = ar.account
      ? ar.account.id
      : await ensureAccount(entityId, {
          code: ar.toCreate!.code,
          name: ar.toCreate!.name,
          type: "asset",
          subtype: ar.toCreate!.subtype,
        });
    if (!arAccountId) return { posted: false, reason: "no_ar_account" };

    // Every line account must exist in the COA (validated in-entity at
    // creation; double-checked here because the ledger is the source of
    // truth). All-or-nothing: a missing account must never silently redirect
    // revenue to the AR account.
    const coaById = new Map(coa.map((a) => [a.id, a]));
    if (lines.some((l) => !coaById.has(l.accountId))) {
      return { posted: false, reason: "missing_line_account" };
    }
    const built = lines.map((l) => {
      const cents = moneyToCents(String(l.amount));
      return {
        accountId: l.accountId,
        cents: Number.isNaN(cents) ? 0 : cents,
        description: l.description || `Invoice ${invoice.invoiceNumber}`,
      };
    });
    if (built.some((l) => l.cents <= 0)) {
      return { posted: false, reason: "invalid_line_amount" };
    }

    const jeLines = buildArInvoiceLines(arAccountId, built);
    const reference = `ar-inv-${invoice.id}`;
    const jeId = await createPostedJournal({
      entityId,
      userId,
      date: invoice.invoiceDate,
      description: `Sales invoice ${invoice.invoiceNumber}`,
      reference,
      source: "ar_invoice",
      lines: jeLines,
      logPrefix: "[ar-posting]",
    });
    if (!jeId) return { posted: false, reason: "journal_skipped" };

    try {
      await db
        .update(salesInvoices)
        .set({ journalEntryId: jeId })
        .where(
          and(
            eq(salesInvoices.id, invoice.id),
            eq(salesInvoices.entityId, entityId),
          ),
        );

      await db.insert(auditLog).values({
        entityId,
        userId,
        action: "ar.postInvoice",
        entityType: "sales_invoice",
        entityIdRef: invoice.id,
        newValues: { journalEntryId: jeId, reference },
      });
    } catch (linkErr) {
      await cleanupJournal(jeId);
      throw linkErr;
    }

    return { posted: true, journalEntryId: jeId };
  } catch (error) {
    logger.error({ error, invoiceId }, "[ar-posting] Invoice posting failed");
    return { posted: false, reason: "error" };
  }
}

// ─── Payment posting ────────────────────────────────────────────────────────

/**
 * Post the receipt entry for an AR payment: Dr receipt account / Cr AR.
 * THROWS when posting is impossible (closed period etc.) — callers roll the
 * payment back so money can never be recorded without hitting the ledger.
 */
export async function postArPaymentToLedger(
  paymentId: string,
  entityId: string,
  userId: string,
): Promise<string> {
  const payment = await db.query.paymentsAr.findFirst({
    where: and(eq(paymentsAr.id, paymentId), eq(paymentsAr.entityId, entityId)),
    columns: {
      id: true,
      salesInvoiceId: true,
      amount: true,
      paymentDate: true,
      method: true,
      journalEntryId: true,
    },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.journalEntryId) return payment.journalEntryId;

  const invoice = await db.query.salesInvoices.findFirst({
    where: and(
      eq(salesInvoices.id, payment.salesInvoiceId),
      eq(salesInvoices.entityId, entityId),
    ),
    columns: { id: true, invoiceNumber: true, journalEntryId: true },
  });
  if (!invoice) throw new Error("Invoice not found");
  if (!invoice.journalEntryId) {
    throw new Error(
      "Invoice is not posted to the ledger — post the invoice before recording payments",
    );
  }

  const coa = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
    columns: { id: true, code: true, name: true, type: true, subtype: true },
  });
  const ar = resolveArReceivableAccount(coa as CoaPick[]);
  if (!ar.account) {
    throw new Error(
      "Accounts Receivable account is missing from the chart of accounts",
    );
  }
  const receipt = resolvePaymentReceiptAccount(
    coa as CoaPick[],
    payment.method,
  );
  const receiptAccountId = receipt.account
    ? receipt.account.id
    : await ensureAccount(entityId, {
        code: receipt.toCreate!.code,
        name: receipt.toCreate!.name,
        type: "asset",
        subtype: receipt.toCreate!.subtype,
      });
  if (!receiptAccountId) {
    throw new Error("Could not resolve a receipt account for this payment");
  }

  const cents = moneyToCents(String(payment.amount));
  if (Number.isNaN(cents) || cents <= 0) {
    throw new Error("Payment amount is invalid");
  }

  const reference = `ar-pay-${payment.id}`;
  const jeLines = buildArPaymentLines(
    receiptAccountId,
    ar.account.id,
    cents,
    `Payment ${payment.method} — invoice ${invoice.invoiceNumber}`,
  );
  const jeId = await createPostedJournal({
    entityId,
    userId,
    date: payment.paymentDate,
    description: `Payment on invoice ${invoice.invoiceNumber}`,
    reference,
    source: "ar_payment",
    lines: jeLines,
    logPrefix: "[ar-posting]",
  });
  if (!jeId) {
    throw new Error(
      "Payment could not be posted — the payment date's accounting period is closed or the entry failed validation",
    );
  }

  try {
    await db
      .update(paymentsAr)
      .set({ journalEntryId: jeId })
      .where(
        and(eq(paymentsAr.id, payment.id), eq(paymentsAr.entityId, entityId)),
      );

    await db.insert(auditLog).values({
      entityId,
      userId,
      action: "ar.postPayment",
      entityType: "payment_ar",
      entityIdRef: payment.id,
      newValues: { journalEntryId: jeId, reference },
    });
  } catch (linkErr) {
    await cleanupJournal(jeId);
    throw linkErr;
  }

  return jeId;
}

// ─── Void reversal ──────────────────────────────────────────────────────────

/**
 * Reverse the invoice's posted JE when the invoice is voided. Mirrors the
 * journal reversal convention (swapped debit/credit lines, status reversed).
 * Safe to call when nothing was posted (no-op) or already reversed.
 */
export async function reverseArInvoiceJournal(
  invoiceId: string,
  entityId: string,
  userId: string,
  reason: string,
): Promise<ArPostResult> {
  const invoice = await db.query.salesInvoices.findFirst({
    where: and(
      eq(salesInvoices.id, invoiceId),
      eq(salesInvoices.entityId, entityId),
    ),
    columns: { id: true, invoiceNumber: true, journalEntryId: true },
  });
  if (!invoice) return { posted: false, reason: "invoice_not_found" };
  if (!invoice.journalEntryId) {
    // Never posted — nothing to reverse.
    return { posted: true, journalEntryId: "" };
  }

  const original = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.id, invoice.journalEntryId),
      eq(journalEntries.entityId, entityId),
    ),
    columns: { id: true, status: true, entryNumber: true, periodId: true },
  });
  if (!original) return { posted: false, reason: "journal_not_found" };
  if (original.status === "reversed") {
    return { posted: true, journalEntryId: original.id };
  }

  const originalLines = await db.query.journalEntryLines.findMany({
    where: eq(journalEntryLines.journalEntryId, original.id),
  });

  const reference = `ar-inv-rev-${invoice.id}`;
  // Reversals allocate a unique entry number like every other writer; a
  // concurrent posting could take the computed max — retry on the collision.
  let reversal: { id: string } | null = null;
  for (let attempt = 0; attempt < 3 && !reversal; attempt++) {
    const [last] = await db
      .select({ n: journalEntries.entryNumber })
      .from(journalEntries)
      .where(eq(journalEntries.entityId, entityId))
      .orderBy(desc(journalEntries.entryNumber))
      .limit(1);
    try {
      const [created] = await db
        .insert(journalEntries)
        .values({
          entityId,
          entryNumber: (last?.n ?? 0) + 1,
          description: `Reversal of invoice ${invoice.invoiceNumber}${reason ? `: ${reason}` : ""}`,
          reference,
          date: new Date().toISOString().slice(0, 10),
          periodId: original.periodId,
          status: "posted",
          reversedBy: original.id,
          postedBy: userId,
          postedAt: new Date(),
          source: "ar_invoice_void",
        })
        .returning({ id: journalEntries.id });
      reversal = created ?? null;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCollision = /je_entity_entry_number|duplicate key value/.test(
        msg,
      );
      if (!isCollision || attempt === 2) throw err;
    }
  }
  if (!reversal) return { posted: false, reason: "reversal_insert_failed" };

  try {
    await db.insert(journalEntryLines).values(
      originalLines.map((line) => ({
        journalEntryId: reversal.id,
        accountId: line.accountId,
        debit: line.credit,
        credit: line.debit,
        description: `Reversal: ${line.description}`,
      })),
    );
  } catch (err) {
    await cleanupJournal(reversal.id);
    throw err;
  }

  try {
    await db
      .update(journalEntries)
      .set({
        status: "reversed",
        reversedBy: reversal.id,
        reversedAt: new Date(),
      })
      .where(
        and(
          eq(journalEntries.id, original.id),
          eq(journalEntries.entityId, entityId),
        ),
      );
  } catch (err) {
    // Never leave a reversal entry whose original is still "posted".
    await cleanupJournal(reversal.id);
    throw err;
  }

  return { posted: true, journalEntryId: reversal.id };
}
