/**
 * Dunning & Collections Engine
 *
 * Enterprise-grade collections management:
 * - Aging buckets (Current, 1-30, 31-60, 61-90, 90+)
 * - Escalation levels (friendly → firm → final → legal)
 * - Automated dunning letter generation
 * - Promise-to-pay tracking
 * - Bad debt write-off with journal entry creation
 * - AI collection priority scoring
 *
 * All operations are entity-scoped.
 */

import { and, eq, sql, desc } from "drizzle-orm";
import {
  salesInvoices,
  customers,
  paymentsAr,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────

export type AgingBucket = {
  label: string;
  range: string;
  amount: number;
  count: number;
  invoices: AgingInvoice[];
};

export type AgingInvoice = {
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  balance: number;
  currency?: string;
  dueDate: string;
  daysOverdue: number;
  agingBucket: string;
  lastPaymentDate: string | null;
  paymentHistory: PaymentRecord[];
};

export type PaymentRecord = {
  date: string;
  amount: number;
  method: string;
};

export type DunningLetter = {
  level: "friendly" | "firm" | "final" | "legal";
  subject: string;
  body: string;
  daysOverdue: number;
};

export type CollectionPriority = {
  customerId: string;
  customerName: string;
  totalOwed: number;
  oldestDaysOverdue: number;
  invoiceCount: number;
  riskScore: number; // 0-100, higher = more urgent
  recommendedAction: string;
  agingBreakdown: {
    current: number;
    days1to30: number;
    days31to60: number;
    days61to90: number;
    days90plus: number;
  };
};

export type DunningConfig = {
  /** Days after due date to send friendly reminder */
  friendlyDays: number;
  /** Days after due date to send firm reminder */
  firmDays: number;
  /** Days after due date to send final notice */
  finalDays: number;
  /** Days after due date to escalate to legal/collections */
  legalDays: number;
  /** Maximum days before bad debt write-off consideration */
  writeOffDays: number;
};

// ─── Default Configuration ──────────────────────────────────────────────

const DEFAULT_DUNNING_CONFIG: DunningConfig = {
  friendlyDays: 7,
  firmDays: 30,
  finalDays: 60,
  legalDays: 90,
  writeOffDays: 180,
};

// ─── Aging Report ───────────────────────────────────────────────────────

/**
 * Generate AR aging report with 5 buckets.
 * Buckets: Current (not due), 1-30 days overdue, 31-60, 61-90, 90+
 */
export async function generateARAgingReport(
  entityId: string,
): Promise<AgingBucket[]> {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  // Get all unpaid invoices
  const invoices = await db.query.salesInvoices.findMany({
    where: and(
      eq(salesInvoices.entityId, entityId),
      sql`${salesInvoices.status} IN ('pending', 'partial', 'overdue')`,
    ),
  });

  // Get customer names
  const customerIds = [...new Set(invoices.map((i) => i.customerId))];
  const customersList =
    customerIds.length > 0
      ? await db.query.customers.findMany({
          where: sql`${customers.id} IN ${customerIds}`,
          columns: { id: true, name: true },
        })
      : [];
  const customerMap = new Map(customersList.map((c) => [c.id, c.name]));

  // Get recent payments for each invoice
  const invoiceIds = invoices.map((i) => i.id);
  const recentPayments =
    invoiceIds.length > 0
      ? await db.query.paymentsAr.findMany({
          where: sql`${paymentsAr.salesInvoiceId} IN ${invoiceIds}`,
          orderBy: [desc(paymentsAr.paymentDate)],
          columns: {
            salesInvoiceId: true,
            paymentDate: true,
            amount: true,
            method: true,
          },
        })
      : [];

  // Group payments by invoice
  const paymentsByInvoice = new Map<string, PaymentRecord[]>();
  for (const p of recentPayments) {
    const existing = paymentsByInvoice.get(p.salesInvoiceId) ?? [];
    existing.push({
      date: p.paymentDate,
      amount: parseFloat(p.amount),
      method: p.method,
    });
    paymentsByInvoice.set(p.salesInvoiceId, existing);
  }

  // Categorize into aging buckets
  const buckets: AgingBucket[] = [
    {
      label: "Current",
      range: "Not yet due",
      amount: 0,
      count: 0,
      invoices: [],
    },
    {
      label: "1-30 Days",
      range: "1 to 30 days overdue",
      amount: 0,
      count: 0,
      invoices: [],
    },
    {
      label: "31-60 Days",
      range: "31 to 60 days overdue",
      amount: 0,
      count: 0,
      invoices: [],
    },
    {
      label: "61-90 Days",
      range: "61 to 90 days overdue",
      amount: 0,
      count: 0,
      invoices: [],
    },
    {
      label: "90+ Days",
      range: "Over 90 days overdue",
      amount: 0,
      count: 0,
      invoices: [],
    },
  ];

  for (const inv of invoices) {
    const dueDate = new Date(inv.dueDate);
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const balance = parseFloat(inv.balance);

    let bucketIndex: number;
    if (daysOverdue <= 0) {
      bucketIndex = 0; // Current
    } else if (daysOverdue <= 30) {
      bucketIndex = 1;
    } else if (daysOverdue <= 60) {
      bucketIndex = 2;
    } else if (daysOverdue <= 90) {
      bucketIndex = 3;
    } else {
      bucketIndex = 4;
    }

    const lastPayments = paymentsByInvoice.get(inv.id) ?? [];
    const lastPaymentDate =
      lastPayments.length > 0 ? lastPayments[0].date : null;

    const agingInvoice: AgingInvoice = {
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerId: inv.customerId,
      customerName: customerMap.get(inv.customerId) ?? "Unknown",
      totalAmount: parseFloat(inv.totalAmount),
      balance,
      dueDate: inv.dueDate,
      daysOverdue: Math.max(0, daysOverdue),
      agingBucket: buckets[bucketIndex].label,
      lastPaymentDate,
      paymentHistory: lastPayments.slice(0, 5),
    };

    buckets[bucketIndex].amount += balance;
    buckets[bucketIndex].count += 1;
    buckets[bucketIndex].invoices.push(agingInvoice);
  }

  return buckets;
}

// ─── Collection Priority Scoring ────────────────────────────────────────

/**
 * Calculate collection priority for each customer with overdue invoices.
 * Risk score considers: amount owed, days overdue, invoice count, payment history.
 */
export async function calculateCollectionPriorities(
  entityId: string,
): Promise<CollectionPriority[]> {
  const agingBuckets = await generateARAgingReport(entityId);

  // Flatten all overdue invoices
  const overdueInvoices = agingBuckets
    .slice(1) // Skip "Current" bucket
    .flatMap((b) => b.invoices);

  // Group by customer
  const customerData = new Map<
    string,
    {
      name: string;
      totalOwed: number;
      oldestDaysOverdue: number;
      invoiceCount: number;
      agingBreakdown: CollectionPriority["agingBreakdown"];
    }
  >();

  for (const inv of overdueInvoices) {
    const existing = customerData.get(inv.customerId) ?? {
      name: inv.customerName,
      totalOwed: 0,
      oldestDaysOverdue: 0,
      invoiceCount: 0,
      agingBreakdown: {
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        days90plus: 0,
      },
    };

    existing.totalOwed += inv.balance;
    existing.oldestDaysOverdue = Math.max(
      existing.oldestDaysOverdue,
      inv.daysOverdue,
    );
    existing.invoiceCount += 1;

    if (inv.daysOverdue <= 30) {
      existing.agingBreakdown.days1to30 += inv.balance;
    } else if (inv.daysOverdue <= 60) {
      existing.agingBreakdown.days31to60 += inv.balance;
    } else if (inv.daysOverdue <= 90) {
      existing.agingBreakdown.days61to90 += inv.balance;
    } else {
      existing.agingBreakdown.days90plus += inv.balance;
    }

    customerData.set(inv.customerId, existing);
  }

  // Calculate risk scores
  const priorities: CollectionPriority[] = [];

  for (const [customerId, data] of customerData) {
    // Risk score calculation:
    // - Amount factor: higher amount = higher risk (0-40 points)
    // - Days factor: more days overdue = higher risk (0-30 points)
    // - Invoice count: more invoices = higher risk (0-15 points)
    // - Concentration: 90+ days proportion (0-15 points)

    const amountScore = Math.min(40, (data.totalOwed / 10000) * 40);
    const daysScore = Math.min(30, (data.oldestDaysOverdue / 90) * 30);
    const countScore = Math.min(15, data.invoiceCount * 3);
    const concentrationScore =
      data.totalOwed > 0
        ? (data.agingBreakdown.days90plus / data.totalOwed) * 15
        : 0;

    const riskScore = Math.round(
      amountScore + daysScore + countScore + concentrationScore,
    );

    // Determine recommended action
    let recommendedAction: string;
    if (data.oldestDaysOverdue <= 7) {
      recommendedAction = "Send friendly payment reminder";
    } else if (data.oldestDaysOverdue <= 30) {
      recommendedAction = "Send firm payment reminder with deadline";
    } else if (data.oldestDaysOverdue <= 60) {
      recommendedAction = "Escalate to final notice; consider payment plan";
    } else if (data.oldestDaysOverdue <= 90) {
      recommendedAction = "Final demand letter; prepare for collections";
    } else {
      recommendedAction = "Escalate to collections or consider write-off";
    }

    priorities.push({
      customerId,
      customerName: data.name,
      totalOwed: data.totalOwed,
      oldestDaysOverdue: data.oldestDaysOverdue,
      invoiceCount: data.invoiceCount,
      riskScore,
      recommendedAction,
      agingBreakdown: data.agingBreakdown,
    });
  }

  // Sort by risk score descending
  priorities.sort((a, b) => b.riskScore - a.riskScore);

  return priorities;
}

// ─── Dunning Letter Templates ──────────────────────────────────────────

/**
 * Generate a dunning letter based on escalation level.
 * Returns HTML content ready for email sending.
 */
export function generateDunningLetter(
  customerName: string,
  invoices: AgingInvoice[],
  level: DunningLetter["level"],
  config: DunningConfig = DEFAULT_DUNNING_CONFIG,
): DunningLetter {
  const totalOwed = invoices.reduce((sum, i) => sum + i.balance, 0);
  const oldestDays = Math.max(...invoices.map((i) => i.daysOverdue));
  const currency = invoices[0]?.currency ?? "USD";
  const formatAmount = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  const invoiceListHtml = invoices
    .map(
      (i) =>
        `<tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.invoiceNumber}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${i.dueDate}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${formatAmount(i.balance)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right;">${i.daysOverdue} days</td>
        </tr>`,
    )
    .join("");

  let subject: string;
  let body: string;

  switch (level) {
    case "friendly":
      subject = `Friendly Reminder: Payment Due for ${invoices.length} Invoice(s)`;
      body = `
        <h2 style="color: #0f172a;">Payment Reminder</h2>
        <p style="color: #334155;">Dear ${customerName},</p>
        <p style="color: #334155;">This is a friendly reminder that the following invoice(s) are now past their due date:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #f8fafc;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Invoice</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e2e8f0;">Due Date</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Amount</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e2e8f0;">Days Overdue</th>
            </tr>
          </thead>
          <tbody>${invoiceListHtml}</tbody>
        </table>
        <p style="color: #334155;"><strong>Total Outstanding: ${formatAmount(totalOwed)}</strong></p>
        <p style="color: #334155;">Please arrange payment at your earliest convenience. If you have already made this payment, please disregard this notice.</p>
        <p style="color: #64748b;">Thank you for your business.</p>
      `;
      break;

    case "firm":
      subject = `Action Required: Overdue Payment of ${formatAmount(totalOwed)}`;
      body = `
        <h2 style="color: #b45309;">Overdue Payment Notice</h2>
        <p style="color: #334155;">Dear ${customerName},</p>
        <p style="color: #334155;">Despite our earlier reminder, the following invoice(s) remain unpaid and are now significantly overdue:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #fffbeb;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fde68a;">Invoice</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fde68a;">Due Date</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fde68a;">Amount</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fde68a;">Days Overdue</th>
            </tr>
          </thead>
          <tbody>${invoiceListHtml}</tbody>
        </table>
        <p style="color: #334155;"><strong>Total Outstanding: ${formatAmount(totalOwed)}</strong></p>
        <p style="color: #b45309;"><strong>Please remit payment within 7 days to avoid further escalation.</strong></p>
        <p style="color: #334155;">If you are experiencing difficulties, please contact us to discuss a payment arrangement.</p>
      `;
      break;

    case "final":
      subject = `Final Notice: Immediate Payment Required — ${formatAmount(totalOwed)}`;
      body = `
        <h2 style="color: #dc2626;">Final Payment Demand</h2>
        <p style="color: #334155;">Dear ${customerName},</p>
        <p style="color: #334155;">This is our <strong>final notice</strong> regarding the following overdue invoice(s):</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #fef2f2;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fecaca;">Invoice</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #fecaca;">Due Date</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fecaca;">Amount</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #fecaca;">Days Overdue</th>
            </tr>
          </thead>
          <tbody>${invoiceListHtml}</tbody>
        </table>
        <p style="color: #334155;"><strong>Total Outstanding: ${formatAmount(totalOwed)}</strong></p>
        <p style="color: #dc2626;"><strong>Payment must be received within 14 days. Failure to pay may result in:</strong></p>
        <ul style="color: #334155;">
          <li>Referral to a collections agency</li>
          <li>Suspension of future credit terms</li>
          <li>Interest charges on overdue amounts</li>
          <li>Legal action to recover the debt</li>
        </ul>
      `;
      break;

    case "legal":
      subject = `Urgent: Debt Recovery — ${formatAmount(totalOwed)}`;
      body = `
        <h2 style="color: #7f1d1d;">DEBT RECOVERY NOTICE</h2>
        <p style="color: #334155;">Dear ${customerName},</p>
        <p style="color: #334155;">Despite multiple attempts to resolve this matter, the following amounts remain outstanding:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <thead>
            <tr style="background: #7f1d1d;">
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #991b1b; color: white;">Invoice</th>
              <th style="padding: 8px; text-align: left; border-bottom: 2px solid #991b1b; color: white;">Due Date</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #991b1b; color: white;">Amount</th>
              <th style="padding: 8px; text-align: right; border-bottom: 2px solid #991b1b; color: white;">Days Overdue</th>
            </tr>
          </thead>
          <tbody>${invoiceListHtml}</tbody>
        </table>
        <p style="color: #334155;"><strong>Total Outstanding: ${formatAmount(totalOwed)}</strong></p>
        <p style="color: #7f1d1d;"><strong>This matter has been escalated for formal debt recovery proceedings.</strong></p>
        <p style="color: #334155;">We strongly recommend immediate payment or contact with our office to resolve this matter before further action is taken.</p>
      `;
      break;
  }

  return { level, subject, body, daysOverdue: oldestDays };
}

// ─── Bad Debt Write-Off ────────────────────────────────────────────────

/**
 * Write off an invoice as bad debt.
 * Creates a journal entry: debit Bad Debt Expense, credit Accounts Receivable.
 */
export async function writeOffBadDebt(
  entityId: string,
  invoiceId: string,
  userId: string,
): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  try {
    // Get the invoice
    const invoice = await db.query.salesInvoices.findFirst({
      where: and(
        eq(salesInvoices.id, invoiceId),
        eq(salesInvoices.entityId, entityId),
      ),
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    const balance = parseFloat(invoice.balance);
    if (balance <= 0) {
      return { success: false, error: "Invoice has no outstanding balance" };
    }

    // Find or create Bad Debt Expense account
    let badDebtAccount = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, "6600"),
      ),
    });

    if (!badDebtAccount) {
      const [created] = await db
        .insert(chartOfAccounts)
        .values({
          entityId,
          code: "6600",
          name: "Bad Debt Expense",
          type: "expense",
          subtype: "other_expense",
          description: "Write-off of uncollectible receivables",
        })
        .returning();
      badDebtAccount = created;
    }

    // Find the AR GL account (typically 1200)
    const arAccount = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, "1200"),
      ),
    });

    if (!arAccount) {
      return {
        success: false,
        error: "Accounts Receivable GL account not found (code 1200)",
      };
    }

    // Create journal entry
    const [journalEntry] = await db
      .insert(journalEntries)
      .values({
        entityId,
        entryNumber: Date.now(), // Simple unique number
        description: `Bad debt write-off: ${invoice.invoiceNumber}`,
        reference: invoice.invoiceNumber,
        date: new Date().toISOString().split("T")[0],
        periodId: "", // Will be set by the system
        status: "posted",
        postedBy: userId,
        postedAt: new Date(),
        confidence: 1.0, // Human-initiated
        source: "dunning_engine",
        metadata: {
          type: "bad_debt_write_off",
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
        },
      })
      .returning();

    // Debit Bad Debt Expense
    await db.insert(journalEntryLines).values({
      journalEntryId: journalEntry.id,
      accountId: badDebtAccount.id,
      debit: String(balance),
      credit: "0",
      description: `Write-off: ${invoice.invoiceNumber}`,
    });

    // Credit Accounts Receivable
    await db.insert(journalEntryLines).values({
      journalEntryId: journalEntry.id,
      accountId: arAccount.id,
      debit: "0",
      credit: String(balance),
      description: `Write-off: ${invoice.invoiceNumber}`,
    });

    // Update invoice status
    await db
      .update(salesInvoices)
      .set({
        status: "voided",
        notes: `${invoice.notes ?? ""}\n[Write-off] Written off as bad debt on ${new Date().toISOString().split("T")[0]}. JE: ${journalEntry.id}`,
      })
      .where(eq(salesInvoices.id, invoiceId));

    logger.info(
      {
        entityId,
        invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        amount: balance,
        journalEntryId: journalEntry.id,
      },
      "Bad debt write-off completed",
    );

    return { success: true, journalEntryId: journalEntry.id };
  } catch (error) {
    logger.error({ entityId, invoiceId, error }, "Bad debt write-off failed");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Dunning Dashboard Summary ─────────────────────────────────────────

export type DunningSummary = {
  totalOverdue: number;
  totalOverdueCount: number;
  agingBuckets: AgingBucket[];
  priorities: CollectionPriority[];
  needsAttention: {
    friendly: number;
    firm: number;
    final: number;
    legal: number;
  };
};

export async function getDunningSummary(
  entityId: string,
): Promise<DunningSummary> {
  const agingBuckets = await generateARAgingReport(entityId);
  const priorities = await calculateCollectionPriorities(entityId);

  const totalOverdue = agingBuckets
    .slice(1)
    .reduce((sum, b) => sum + b.amount, 0);
  const totalOverdueCount = agingBuckets
    .slice(1)
    .reduce((sum, b) => sum + b.count, 0);

  // Count invoices needing each level of attention
  const config = DEFAULT_DUNNING_CONFIG;
  const allOverdueInvoices = agingBuckets.slice(1).flatMap((b) => b.invoices);

  const needsAttention = {
    friendly: allOverdueInvoices.filter(
      (i) =>
        i.daysOverdue >= config.friendlyDays && i.daysOverdue < config.firmDays,
    ).length,
    firm: allOverdueInvoices.filter(
      (i) =>
        i.daysOverdue >= config.firmDays && i.daysOverdue < config.finalDays,
    ).length,
    final: allOverdueInvoices.filter(
      (i) =>
        i.daysOverdue >= config.finalDays && i.daysOverdue < config.legalDays,
    ).length,
    legal: allOverdueInvoices.filter((i) => i.daysOverdue >= config.legalDays)
      .length,
  };

  return {
    totalOverdue,
    totalOverdueCount,
    agingBuckets,
    priorities,
    needsAttention,
  };
}
