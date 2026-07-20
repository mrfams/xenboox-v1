/**
 * Document Auto-Link Job
 *
 * After a document is processed (OCR + classification + extraction),
 * this job attempts to automatically link the extracted data to
 * the appropriate accounting records (AR invoices, AP invoices, journal entries).
 */

import { task, logger } from "@trigger.dev/sdk";
import { db } from "@xenboox/db";
import {
  documents,
  documentLinks,
  salesInvoices,
  invoicesAp,
  suppliers,
  customers,
  auditLog,
} from "@xenboox/db/schema";
import { eq, and, like, sql } from "drizzle-orm";

export const autoLinkDocument = task({
  id: "auto-link-document",
  maxDuration: 120,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 5_000,
  },

  run: async (payload: { documentId: string; entityId: string }) => {
    const { documentId, entityId } = payload;

    logger.info("Attempting auto-link for document", { documentId });

    // 1. Get the processed document
    const doc = await db.query.documents.findFirst({
      where: eq(documents.id, documentId),
    });

    if (
      !doc ||
      (doc.status !== "synced" && doc.status !== "agent_processing")
    ) {
      logger.info("Document not ready for linking", {
        documentId,
        status: doc?.status,
      });
      return { linked: false, reason: "not_ready" };
    }

    const metadata = doc.metadata as Record<string, unknown>;
    const extraction = metadata?.extraction as
      | {
          type?: string;
          confidence?: number;
          data?: Record<string, unknown>;
        }
      | undefined;

    if (!extraction?.data || (extraction.confidence ?? 0) < 0.6) {
      logger.info("Extraction confidence too low for auto-linking", {
        documentId,
        confidence: extraction?.confidence,
      });
      return { linked: false, reason: "low_confidence" };
    }

    const extractedData = extraction.data;

    // 2. Route based on document type
    switch (doc.type) {
      case "invoice":
        return await linkToAPInvoice(
          doc.id,
          entityId,
          extractedData,
          extraction.type,
        );
      case "receipt":
        return await linkToARInvoice(
          doc.id,
          entityId,
          extractedData,
          extraction.type,
        );
      case "bank_statement":
        // Bank statements are linked via the bank-import job
        return { linked: false, reason: "bank_statements_handled_separately" };
      default:
        return { linked: false, reason: `unsupported_type: ${doc.type}` };
    }
  },
});

// ─── Link to AP Invoice ──────────────────────────────────────────────────

async function linkToAPInvoice(
  documentId: string,
  entityId: string,
  data: Record<string, unknown>,
  extractionType: string | undefined,
) {
  const invoiceNumber = data.invoiceNumber as string | undefined;
  const supplierName = data.vendorName as string | undefined;
  const totalAmount = data.totalAmount as number | undefined;
  const invoiceDate = data.invoiceDate as string | undefined;

  if (!invoiceNumber && !supplierName) {
    logger.info("No invoice number or supplier to match against", {
      documentId,
    });
    return { linked: false, reason: "no_matchable_fields" };
  }

  // Try to find matching AP invoice
  let matchedInvoice: { id: string } | undefined;

  if (invoiceNumber) {
    matchedInvoice = await db.query.invoicesAp.findFirst({
      where: and(
        eq(invoicesAp.entityId, entityId),
        eq(invoicesAp.invoiceNumber, invoiceNumber),
      ),
    });
  }

  // If no match by number, try fuzzy match on supplier + amount
  if (!matchedInvoice && supplierName && totalAmount) {
    const matchingSuppliers = await db.query.suppliers.findMany({
      where: and(
        eq(suppliers.entityId, entityId),
        like(suppliers.name, `%${supplierName}%`),
      ),
    });

    if (matchingSuppliers.length > 0) {
      const supplier = matchingSuppliers[0]!;
      matchedInvoice = await db.query.invoicesAp.findFirst({
        where: and(
          eq(invoicesAp.entityId, entityId),
          eq(invoicesAp.supplierId, supplier.id),
          sql`ABS(CAST(${invoicesAp.totalAmount} AS numeric) - ${totalAmount}) < 1`,
        ),
      });
    }
  }

  if (matchedInvoice) {
    // Create document link
    const existingLink = await db.query.documentLinks.findFirst({
      where: and(
        eq(documentLinks.documentId, documentId),
        eq(documentLinks.entityType, "ap_invoice"),
        eq(documentLinks.entityId, matchedInvoice.id),
      ),
    });

    if (!existingLink) {
      await db.insert(documentLinks).values({
        documentId,
        entityType: "ap_invoice",
        entityId: matchedInvoice.id,
      });

      await db.insert(auditLog).values({
        entityId,
        action: "document.link",
        entityType: "document",
        entityIdRef: documentId,
        newValues: {
          linkedTo: "ap_invoice",
          linkedId: matchedInvoice.id,
          method: "auto",
        },
      });

      logger.info("Document linked to AP invoice", {
        documentId,
        invoiceId: matchedInvoice.id,
      });
      return {
        linked: true,
        linkedTo: "ap_invoice",
        linkedId: matchedInvoice.id,
      };
    }
  }

  return { linked: false, reason: "no_matching_invoice" };
}

// ─── Link to AR Invoice (for receipts) ──────────────────────────────────

async function linkToARInvoice(
  documentId: string,
  entityId: string,
  data: Record<string, unknown>,
  extractionType: string | undefined,
) {
  const invoiceNumber = data.invoiceNumber as string | undefined;
  const customerName = data.customerName as string | undefined;
  const totalAmount = data.totalAmount as number | undefined;

  if (!invoiceNumber && !customerName) {
    return { linked: false, reason: "no_matchable_fields" };
  }

  let matchedInvoice: { id: string } | undefined;

  if (invoiceNumber) {
    matchedInvoice = await db.query.salesInvoices.findFirst({
      where: and(
        eq(salesInvoices.entityId, entityId),
        eq(salesInvoices.invoiceNumber, invoiceNumber),
      ),
    });
  }

  if (!matchedInvoice && customerName && totalAmount) {
    const matchingCustomers = await db.query.customers.findMany({
      where: and(
        eq(customers.entityId, entityId),
        like(customers.name, `%${customerName}%`),
      ),
    });

    if (matchingCustomers.length > 0) {
      const customer = matchingCustomers[0]!;
      matchedInvoice = await db.query.salesInvoices.findFirst({
        where: and(
          eq(salesInvoices.entityId, entityId),
          eq(salesInvoices.customerId, customer.id),
          sql`ABS(CAST(${salesInvoices.totalAmount} AS numeric) - ${totalAmount}) < 1`,
        ),
      });
    }
  }

  if (matchedInvoice) {
    const existingLink = await db.query.documentLinks.findFirst({
      where: and(
        eq(documentLinks.documentId, documentId),
        eq(documentLinks.entityType, "ar_invoice"),
        eq(documentLinks.entityId, matchedInvoice.id),
      ),
    });

    if (!existingLink) {
      await db.insert(documentLinks).values({
        documentId,
        entityType: "ar_invoice",
        entityId: matchedInvoice.id,
      });

      await db.insert(auditLog).values({
        entityId,
        action: "document.link",
        entityType: "document",
        entityIdRef: documentId,
        newValues: {
          linkedTo: "ar_invoice",
          linkedId: matchedInvoice.id,
          method: "auto",
        },
      });

      logger.info("Document linked to AR invoice", {
        documentId,
        invoiceId: matchedInvoice.id,
      });
      return {
        linked: true,
        linkedTo: "ar_invoice",
        linkedId: matchedInvoice.id,
      };
    }
  }

  return { linked: false, reason: "no_matching_invoice" };
}
