import { and, eq, sql, inArray } from "drizzle-orm";
import {
  salesInvoices,
  customers,
  journalEntries,
  journalEntryLines,
  chartOfAccounts,
} from "@xenboox/db/schema";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { redactPii } from "@xenboox/agents/core/security/injection-defense";

/**
 * Generate an AI narrative after invoice creation.
 * Includes customer history, payment patterns, and context.
 */
export async function generateInvoiceNarrative({
  entityId,
  entityName,
  currency,
  invoiceId,
  invoiceNumber,
  totalAmount,
  customerId,
  dueDate,
}: {
  entityId: string;
  entityName: string;
  currency: string;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  customerId: string;
  dueDate: string;
}): Promise<{
  summary: string;
  highlights: string[];
  concerns: string[];
  confidence: number;
} | null> {
  try {
    // Get customer info and history
    const customer = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, customerId),
        eq(customers.entityId, entityId),
      ),
    });

    if (!customer) {
      logger.warn(
        { entityId, customerId },
        "[invoice-narrative] Customer not found",
      );
      return null;
    }

    // Get customer's invoice history
    const customerInvoices = await db.query.salesInvoices.findMany({
      where: and(
        eq(salesInvoices.entityId, entityId),
        eq(salesInvoices.customerId, customerId),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 10,
    });

    // Calculate payment history stats
    const paidInvoices = customerInvoices.filter((inv) => inv.status === "paid");
    const totalInvoices = customerInvoices.length;
    const paidCount = paidInvoices.length;
    const totalBilled = customerInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount ?? "0"),
      0,
    );
    const totalCollected = paidInvoices.reduce(
      (sum, inv) => sum + parseFloat(inv.totalAmount ?? "0"),
      0,
    );
    const overdueInvoices = customerInvoices.filter(
      (inv) =>
        inv.status === "pending" &&
        inv.dueDate &&
        new Date(inv.dueDate) < new Date(),
    );

    // Build context for LLM
    const safeEntityName = redactPii(entityName);
    const safeCustomerName = redactPii(customer.name ?? "Unknown");

    const prompt = `Generate a concise invoice narrative for this newly created invoice.

Invoice Details:
- Invoice Number: ${invoiceNumber}
- Customer: ${safeCustomerName}
- Amount: ${currency} ${totalAmount.toLocaleString()}
- Due Date: ${dueDate}
- Created: ${new Date().toISOString().split("T")[0]}

Customer History:
- Total Invoices: ${totalInvoices}
- Paid: ${paidCount} (${totalInvoices > 0 ? Math.round((paidCount / totalInvoices) * 100) : 0}%)
- Total Billed: ${currency} ${totalBilled.toLocaleString()}
- Total Collected: ${currency} ${totalCollected.toLocaleString()}
- Overdue: ${overdueInvoices.length}
${customer.paymentTerms ? `- Payment Terms: ${customer.paymentTerms}` : ""}
${customer.email ? `- Customer Email: [REDACTED]` : ""}

Write a 2-3 sentence narrative that:
1. Confirms the invoice creation with key details
2. Provides context about the customer's payment history
3. Flags any concerns (overdue invoices, declining payment rate)

Keep it professional and factual. Use specific numbers.`;

    // Call LLM
    const { getLLMRegistry } = await import(
      "@xenboox/agents/core/llm/registry"
    );
    const registry = getLLMRegistry();
    const { model } = await registry.getModel("fast");

    const result = await model.invoke(prompt);
    const text =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);

    // Extract highlights and concerns
    const highlights: string[] = [];
    const concerns: string[] = [];

    if (totalInvoices > 0 && paidCount / totalInvoices > 0.8) {
      highlights.push(
        `${safeCustomerName} has a strong payment history (${Math.round((paidCount / totalInvoices) * 100)}% on time)`,
      );
    }
    if (overdueInvoices.length > 0) {
      concerns.push(
        `${safeCustomerName} has ${overdueInvoices.length} overdue invoice(s) — monitor payment`,
      );
    }
    if (totalInvoices === 0) {
      highlights.push(`First invoice for ${safeCustomerName} — establish payment expectations`);
    }

    return {
      summary: redactPii(text.substring(0, 500)),
      highlights,
      concerns,
      confidence: 0.85,
    };
  } catch (error) {
    logger.error(
      { err: error, entityId, invoiceId },
      "[invoice-narrative] Generation failed",
    );
    return null;
  }
}
