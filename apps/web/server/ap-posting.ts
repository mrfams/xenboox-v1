// ─── AP → General Ledger posting orchestration ─────────────────────────────
//
// P4-B. Mirrors ar-posting.ts for payables (shared journal-posting-core):
//   bill created → Dr line expense/asset accounts / Cr AP  (`ap-inv-{id}`)
//   payment made → Dr AP / Cr receipt account               (`ap-pay-{id}`)
//   bill voided  → reversal of the bill JE                  (`ap-inv-rev-{id}`)
//
// Rules (same as AR): TrustGuard gate, reference idempotency, open-period
// only, deterministic account creation (2100 AP), integer cents.

import { eq, and, desc } from "drizzle-orm";
import {
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
  auditLog,
  invoicesAp,
  paymentsAp,
} from "@xenboox/db/schema";
import {
  resolveApPayableAccount,
  buildApInvoiceLines,
  buildApPaymentLines,
  resolvePaymentReceiptAccount,
} from "@xenboox/db";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { moneyToCents } from "./ar-validation";
import {
  createPostedJournal,
  ensureAccount,
} from "./journal-posting-core";

export type ApPostResult =
  | { posted: true; journalEntryId: string }
  | { posted: false; reason: string };

type CoaPick = {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
};

// ─── Bill posting ───────────────────────────────────────────────────────────

/**
 * Post the AP entry for a purchase bill: Dr line accounts / Cr AP. No-op when
 * already posted. Never throws — returns a result the caller logs; bill
 * creation must not fail because posting is temporarily impossible.
 */
export async function postApBillToLedger(
  billId: string,
  entityId: string,
  userId: string,
): Promise<ApPostResult> {
  try {
    const bill = await db.query.invoicesAp.findFirst({
      where: and(eq(invoicesAp.id, billId), eq(invoicesAp.entityId, entityId)),
      columns: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        journalEntryId: true,
        status: true,
      },
    });
    if (!bill) return { posted: false, reason: "bill_not_found" };
    if (bill.status === "voided") return { posted: false, reason: "voided" };
    if (bill.journalEntryId) {
      return { posted: true, journalEntryId: bill.journalEntryId };
    }

    const lines = await db.query.invoiceApLines.findMany({
      where: eq(invoiceApLines.invoiceApId, bill.id),
      columns: { accountId: true, amount: true, description: true },
    });
    if (lines.length === 0) return { posted: false, reason: "no_lines" };

    const coa = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.entityId, entityId),
      columns: { id: true, code: true, name: true, type: true, subtype: true },
    });
    if (coa.length === 0)
      return { posted: false, reason: "no_chart_of_accounts" };

    const ap = resolveApPayableAccount(coa as CoaPick[]);
    const apAccountId = ap.account
      ? ap.account.id
      : await ensureAccount(entityId, {
          code: ap.toCreate!.code,
          name: ap.toCreate!.name,
          type: "liability",
          subtype: ap.toCreate!.subtype,
        });
    if (!apAccountId) return { posted: false, reason: "no_ap_account" };

    // All-or-nothing: never redirect a missing line account to the AP account.
    const coaById = new Map(coa.map((a) => [a.id, a]));
    if (lines.some((l) => !coaById.has(l.accountId))) {
      return { posted: false, reason: "missing_line_account" };
    }
    const built = lines.map((l) => {
      const cents = moneyToCents(String(l.amount));
      return {
        accountId: l.accountId,
        cents: Number.isNaN(cents) ? 0 : cents,
        description: l.description || `Bill ${bill.invoiceNumber}`,
      };
    });
    if (built.some((l) => l.cents <= 0)) {
      return { posted: false, reason: "invalid_line_amount" };
    }

    const jeLines = buildApInvoiceLines(apAccountId, built);
    const reference = `ap-inv-${bill.id}`;
    const jeId = await createPostedJournal({
      entityId,
      userId,
      date: bill.invoiceDate,
      description: `Purchase bill ${bill.invoiceNumber}`,
      reference,
      source: "ap_bill",
      lines: jeLines,
      logPrefix: "[ap-posting]",
      linkInsideTx: async (tx, createdId) => {
        await tx
          .update(invoicesAp)
          .set({ journalEntryId: createdId })
          .where(
            and(eq(invoicesAp.id, bill.id), eq(invoicesAp.entityId, entityId)),
          );

        await tx.insert(auditLog).values({
          entityId,
          userId,
          action: "ap.postBill",
          entityType: "invoice_ap",
          entityIdRef: bill.id,
          newValues: { journalEntryId: createdId, reference },
        });
      },
    });
    if (!jeId) return { posted: false, reason: "journal_skipped" };

    return { posted: true, journalEntryId: jeId };
  } catch (error) {
    logger.error({ error, billId }, "[ap-posting] Bill posting failed");
    return { posted: false, reason: "error" };
  }
}

// ─── Payment posting ────────────────────────────────────────────────────────

/**
 * Post the payment entry for an AP payment: Dr AP / Cr receipt account.
 * THROWS when posting is impossible — callers roll the payment back so money
 * can never leave without hitting the ledger.
 */
export async function postApPaymentToLedger(
  paymentId: string,
  entityId: string,
  userId: string,
): Promise<string> {
  const payment = await db.query.paymentsAp.findFirst({
    where: and(eq(paymentsAp.id, paymentId), eq(paymentsAp.entityId, entityId)),
    columns: {
      id: true,
      invoiceApId: true,
      amount: true,
      paymentDate: true,
      method: true,
      journalEntryId: true,
    },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.journalEntryId) return payment.journalEntryId;

  const bill = await db.query.invoicesAp.findFirst({
    where: and(
      eq(invoicesAp.id, payment.invoiceApId),
      eq(invoicesAp.entityId, entityId),
    ),
    columns: { id: true, invoiceNumber: true, journalEntryId: true },
  });
  if (!bill) throw new Error("Bill not found");
  if (!bill.journalEntryId) {
    throw new Error(
      "Bill is not posted to the ledger — post the bill before recording payments",
    );
  }

  const coa = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
    columns: { id: true, code: true, name: true, type: true, subtype: true },
  });
  const ap = resolveApPayableAccount(coa as CoaPick[]);
  if (!ap.account) {
    throw new Error(
      "Accounts Payable account is missing from the chart of accounts",
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

  const reference = `ap-pay-${payment.id}`;
  const jeLines = buildApPaymentLines(
    ap.account.id,
    receiptAccountId,
    cents,
    `Payment ${payment.method} — bill ${bill.invoiceNumber}`,
  );
  const jeId = await createPostedJournal({
    entityId,
    userId,
    date: payment.paymentDate,
    description: `Payment on bill ${bill.invoiceNumber}`,
    reference,
    source: "ap_payment",
    lines: jeLines,
    logPrefix: "[ap-posting]",
    linkInsideTx: async (tx, createdId) => {
      await tx
        .update(paymentsAp)
        .set({ journalEntryId: createdId })
        .where(
          and(eq(paymentsAp.id, payment.id), eq(paymentsAp.entityId, entityId)),
        );

      await tx.insert(auditLog).values({
        entityId,
        userId,
        action: "ap.postPayment",
        entityType: "payment_ap",
        entityIdRef: payment.id,
        newValues: { journalEntryId: createdId, reference },
      });
    },
  });
  if (!jeId) {
    throw new Error(
      "Payment could not be posted — the payment date's accounting period is closed or the entry failed validation",
    );
  }

  return jeId;
}

// ─── Void reversal ──────────────────────────────────────────────────────────

/**
 * Reverse the bill's posted JE when the bill is voided. Safe to call when
 * nothing was posted (no-op) or already reversed.
 */
export async function reverseApBillJournal(
  billId: string,
  entityId: string,
  userId: string,
  reason: string,
): Promise<ApPostResult> {
  const bill = await db.query.invoicesAp.findFirst({
    where: and(eq(invoicesAp.id, billId), eq(invoicesAp.entityId, entityId)),
    columns: { id: true, invoiceNumber: true, journalEntryId: true },
  });
  if (!bill) return { posted: false, reason: "bill_not_found" };
  if (!bill.journalEntryId) {
    // Never posted — nothing to reverse.
    return { posted: true, journalEntryId: "" };
  }

  const original = await db.query.journalEntries.findFirst({
    where: and(
      eq(journalEntries.id, bill.journalEntryId),
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

  const reference = `ap-inv-rev-${bill.id}`;
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
          description: `Reversal of bill ${bill.invoiceNumber}${reason ? `: ${reason}` : ""}`,
          reference,
          date: new Date().toISOString().slice(0, 10),
          periodId: original.periodId,
          status: "posted",
          reversedBy: original.id,
          postedBy: userId,
          postedAt: new Date(),
          source: "ap_bill_void",
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

  // Batch 3 / N26 — lines + original-status flip commit together with the
  // reversal header (single transaction).
  await db.transaction(async (tx) => {
    await tx.insert(journalEntryLines).values(
      originalLines.map((line) => ({
        journalEntryId: reversal.id,
        accountId: line.accountId,
        debit: line.credit,
        credit: line.debit,
        description: `Reversal: ${line.description}`,
      })),
    );

    await tx
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
  });

  return { posted: true, journalEntryId: reversal.id };
}
