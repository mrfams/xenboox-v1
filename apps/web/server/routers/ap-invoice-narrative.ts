import { and, eq, notLike } from "drizzle-orm";
import { invoicesAp, suppliers } from "@xenboox/db/schema";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { redactPii } from "@xenboox/agents/core/security/injection-defense";

/**
 * Generate an AI narrative after bill creation.
 * Includes supplier history, payment patterns, and context.
 */
export async function generateBillNarrative({
  entityId,
  entityName,
  currency,
  invoiceId,
  invoiceNumber,
  totalAmount,
  supplierId,
  dueDate,
}: {
  entityId: string;
  entityName: string;
  currency: string;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  supplierId: string;
  dueDate: string;
}): Promise<{
  summary: string;
  highlights: string[];
  concerns: string[];
  confidence: number;
} | null> {
  try {
    // Get supplier info
    const supplier = await db.query.suppliers.findFirst({
      where: and(
        eq(suppliers.id, supplierId),
        eq(suppliers.entityId, entityId),
      ),
    });

    if (!supplier) {
      logger.warn(
        { entityId, supplierId },
        "[bill-narrative] Supplier not found",
      );
      return null;
    }

    // Get supplier's invoice history
    const supplierInvoices = await db.query.invoicesAp.findMany({
      where: and(
        eq(invoicesAp.entityId, entityId),
        eq(invoicesAp.supplierId, supplierId),
        // E1 partition: this is a BILLS narrative — expense rows (EXP-) are
        // pay-now approvals with their own flow and must not inflate the
        // supplier's bill history/overdue counts.
        notLike(invoicesAp.invoiceNumber, "EXP-%"),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit: 10,
    });

    const paidCount = supplierInvoices.filter(
      (inv) => inv.status === "paid",
    ).length;
    const totalInvoices = supplierInvoices.length;
    const overdueInvoices = supplierInvoices.filter(
      (inv) =>
        inv.status === "pending" &&
        inv.dueDate &&
        new Date(inv.dueDate) < new Date(),
    );

    const safeEntityName = redactPii(entityName);
    const safeSupplierName = redactPii(supplier.name ?? "Unknown");

    const prompt = `Generate a concise bill narrative for this newly created bill.

Bill Details:
- Invoice Number: ${invoiceNumber}
- Supplier: ${safeSupplierName}
- Amount: ${currency} ${totalAmount.toLocaleString()}
- Due Date: ${dueDate}

Supplier History:
- Total Bills: ${totalInvoices}
- Paid: ${paidCount} (${totalInvoices > 0 ? Math.round((paidCount / totalInvoices) * 100) : 0}%)
- Overdue: ${overdueInvoices.length}

Write a 2-3 sentence narrative that:
1. Confirms the bill creation with key details
2. Provides context about the supplier relationship
3. Flags any concerns (overdue payments, high spend)

Keep it professional and factual.`;

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

    const highlights: string[] = [];
    const concerns: string[] = [];

    if (overdueInvoices.length > 0) {
      concerns.push(
        `${safeSupplierName} has ${overdueInvoices.length} overdue bill(s) — ensure timely payment`,
      );
    }
    if (totalInvoices === 0) {
      highlights.push(
        `First bill from ${safeSupplierName} — establish payment terms`,
      );
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
      "[bill-narrative] Generation failed",
    );
    return null;
  }
}
