/**
 * Data Import/Export Router — Bulk CSV import/export for financial data.
 *
 * Provides:
 * - exportTransactions: Export bank transactions to CSV
 * - exportJournalEntries: Export journal entries to CSV
 * - exportInvoices: Export invoices (AP + AR) to CSV
 * - exportCustomers: Export customers to CSV
 * - exportSuppliers: Export suppliers to CSV
 * - importTransactions: Import bank transactions from CSV with validation
 * - importJournalEntries: Import journal entries from CSV with validation
 * - importCustomers: Import customers from CSV with validation
 * - importSuppliers: Import suppliers from CSV with validation
 * - getImportTemplate: Download CSV template for a data type
 * - validateImport: Preview and validate CSV data before import
 */

import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";

import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { auditLog } from "@xenboox/db/schema/documents";
import {
  journalEntries,
  customers,
  suppliers,
  bankTransactions,
  accounts,
  invoicesAp,
  salesInvoices,
} from "@xenboox/db/schema";

// ─── CSV Helpers ──────────────────────────────────────────────────────────

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(fields: unknown[]): string {
  return fields.map(escapeCsvField).join(",");
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}

function parseCsv(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => parseCsvLine(l));
  return { headers, rows };
}

// ─── Template Definitions ─────────────────────────────────────────────────

const TEMPLATES = {
  transactions: {
    headers: [
      "date",
      "description",
      "amount",
      "type",
      "account_code",
      "counterparty",
      "reference",
      "notes",
    ],
    description:
      "Import bank/financial transactions. Date format: YYYY-MM-DD. Type: debit or credit. Amount: positive number in minor units (e.g., 15000 for GMD 150.00).",
    example:
      "2026-01-15,Office supplies,5000,debit,6100,Super Mart,INV-001,Paper and pens",
  },
  journal_entries: {
    headers: ["date", "description", "reference", "status"],
    description:
      "Import journal entry headers. Journal entry lines (debit/credit) are created separately. Status: draft, pending_review, posted.",
    example: "2026-01-15,Office supplies purchase,JE-001,posted",
  },
  invoices_ap: {
    headers: [
      "supplier_name",
      "invoice_number",
      "invoice_date",
      "due_date",
      "total_amount",
      "tax_amount",
      "description",
      "status",
    ],
    description:
      "Import accounts payable invoices. Status: draft, pending, approved, paid, overdue.",
    example:
      "Super Mart,INV-001,2026-01-15,2026-02-15,5000,750,Office supplies,pending",
  },
  invoices_ar: {
    headers: [
      "customer_name",
      "invoice_number",
      "invoice_date",
      "due_date",
      "total_amount",
      "tax_amount",
      "description",
      "status",
    ],
    description:
      "Import accounts receivable invoices (sales invoices). Status: draft, pending, sent, paid, overdue.",
    example:
      "Acme Corp,SI-001,2026-01-15,2026-02-15,25000,3750,Consulting services,pending",
  },
  customers: {
    headers: [
      "name",
      "contact_email",
      "contact_phone",
      "address",
      "tax_id",
      "payment_terms",
      "credit_limit",
    ],
    description:
      "Import customer records. Name is required. contact_email is used for deduplication (existing emails are skipped).",
    example:
      "Acme Corp,info@acme.com,+22012345678,Banjul Road,123456789,net30,500000",
  },
  suppliers: {
    headers: [
      "name",
      "contact_email",
      "contact_phone",
      "address",
      "tax_id",
      "payment_terms",
    ],
    description:
      "Import supplier records. Name is required. contact_email is used for deduplication.",
    example:
      "Super Mart,orders@supermart.com,+22098765432,Kerewan Road,987654321,net30",
  },
} as const;

type ImportDataType = keyof typeof TEMPLATES;

// ─── Router ───────────────────────────────────────────────────────────────

export const dataImportExportRouter = router({
  /**
   * Get CSV template for a data type.
   */
  getImportTemplate: protectedProcedure
    .input(
      z.object({
        dataType: z.enum([
          "transactions",
          "journal_entries",
          "invoices_ap",
          "invoices_ar",
          "customers",
          "suppliers",
        ]),
      }),
    )
    .query(({ input }) => {
      const template = TEMPLATES[input.dataType];
      const csvContent = [template.headers.join(","), template.example].join(
        "\n",
      );
      return {
        csv: csvContent,
        headers: template.headers,
        description: template.description,
        example: template.example,
      };
    }),

  /**
   * Export bank transactions to CSV.
   */
  exportTransactions: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        limit: z.number().max(10000).default(5000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await db.query.bankTransactions.findMany({
        where: eq(bankTransactions.entityId, input.entityId),
        orderBy: [desc(bankTransactions.createdAt)],
        limit: input.limit,
      });

      const headers = [
        "id",
        "transaction_date",
        "description",
        "amount",
        "type",
        "balance",
        "reference",
        "is_reconciled",
        "created_at",
      ];

      const csvLines = [headers.join(",")];
      for (const row of rows) {
        csvLines.push(
          toCsvRow([
            row.id,
            row.transactionDate,
            row.description,
            row.amount,
            row.type,
            row.balance,
            row.reference,
            row.isReconciled,
            row.createdAt,
          ]),
        );
      }

      logger.info(
        { entityId: input.entityId, count: rows.length },
        "[data-export] transactions exported",
      );

      return {
        csv: csvLines.join("\n"),
        count: rows.length,
        filename: `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }),

  /**
   * Export journal entries to CSV.
   */
  exportJournalEntries: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        limit: z.number().max(10000).default(5000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await db.query.journalEntries.findMany({
        where: eq(journalEntries.entityId, input.entityId),
        orderBy: [desc(journalEntries.createdAt)],
        limit: input.limit,
      });

      const headers = [
        "id",
        "entry_number",
        "date",
        "description",
        "reference",
        "status",
        "posted_by",
        "source",
        "created_at",
      ];

      const csvLines = [headers.join(",")];
      for (const row of rows) {
        csvLines.push(
          toCsvRow([
            row.id,
            row.entryNumber,
            row.date,
            row.description,
            row.reference,
            row.status,
            row.postedBy,
            row.source,
            row.createdAt,
          ]),
        );
      }

      return {
        csv: csvLines.join("\n"),
        count: rows.length,
        filename: `journal-entries-${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }),

  /**
   * Export invoices (AP or AR) to CSV.
   */
  exportInvoices: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        type: z.enum(["ap", "ar"]),
        limit: z.number().max(10000).default(5000),
      }),
    )
    .query(async ({ ctx, input }) => {
      let rows: any[];
      let headers: string[];

      if (input.type === "ap") {
        rows = await db.query.invoicesAp.findMany({
          where: eq(invoicesAp.entityId, input.entityId),
          orderBy: [desc(invoicesAp.createdAt)],
          limit: input.limit,
        });
        headers = [
          "id",
          "supplier_id",
          "invoice_number",
          "invoice_date",
          "due_date",
          "total_amount",
          "tax_amount",
          "status",
          "description",
          "created_at",
        ];
      } else {
        rows = await db.query.salesInvoices.findMany({
          where: eq(salesInvoices.entityId, input.entityId),
          orderBy: [desc(salesInvoices.createdAt)],
          limit: input.limit,
        });
        headers = [
          "id",
          "customer_id",
          "invoice_number",
          "invoice_date",
          "due_date",
          "total_amount",
          "tax_amount",
          "status",
          "description",
          "created_at",
        ];
      }

      const csvLines = [headers.join(",")];
      for (const row of rows) {
        csvLines.push(toCsvRow(Object.values(row)));
      }

      return {
        csv: csvLines.join("\n"),
        count: rows.length,
        filename: `${input.type}-invoices-${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }),

  /**
   * Export customers to CSV.
   */
  exportCustomers: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        limit: z.number().max(10000).default(5000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await db.query.customers.findMany({
        where: eq(customers.entityId, input.entityId),
        orderBy: [desc(customers.createdAt)],
        limit: input.limit,
      });

      const headers = [
        "id",
        "name",
        "contact_email",
        "contact_phone",
        "address",
        "tax_id",
        "payment_terms",
        "credit_limit",
        "is_donor",
        "is_active",
        "created_at",
      ];

      const csvLines = [headers.join(",")];
      for (const row of rows) {
        csvLines.push(toCsvRow(Object.values(row)));
      }

      return {
        csv: csvLines.join("\n"),
        count: rows.length,
        filename: `customers-${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }),

  /**
   * Export suppliers to CSV.
   */
  exportSuppliers: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        limit: z.number().max(10000).default(5000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await db.query.suppliers.findMany({
        where: eq(suppliers.entityId, input.entityId),
        orderBy: [desc(suppliers.createdAt)],
        limit: input.limit,
      });

      const headers = [
        "id",
        "name",
        "contact_email",
        "contact_phone",
        "address",
        "tax_id",
        "payment_terms",
        "is_active",
        "is_1099",
        "created_at",
      ];

      const csvLines = [headers.join(",")];
      for (const row of rows) {
        csvLines.push(toCsvRow(Object.values(row)));
      }

      return {
        csv: csvLines.join("\n"),
        count: rows.length,
        filename: `suppliers-${new Date().toISOString().slice(0, 10)}.csv`,
      };
    }),

  /**
   * Validate CSV data before import — preview rows and errors.
   */
  validateImport: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        dataType: z.enum([
          "transactions",
          "journal_entries",
          "invoices_ap",
          "invoices_ar",
          "customers",
          "suppliers",
        ]),
        csvContent: z.string().max(5_000_000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = TEMPLATES[input.dataType];
      const { headers, rows } = parseCsv(input.csvContent);

      const missingHeaders = template.headers.filter(
        (h) => !headers.includes(h),
      );
      const templateHeaderSet = new Set(template.headers);
      const extraHeaders = headers.filter(
        (h) => !templateHeaderSet.has(h as any),
      );

      const errors: { row: number; column: string; message: string }[] = [];
      const preview: Record<string, string>[] = [];

      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const row = rows[i];
        const record: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          record[headers[j]] = row[j] ?? "";
        }
        preview.push(record);

        for (const h of template.headers) {
          if (!headers.includes(h)) continue;
          const val = record[h];
          if (!val || val.trim() === "") {
            errors.push({ row: i + 2, column: h, message: `${h} is required` });
          }
        }

        const numericFields = [
          "amount",
          "total_amount",
          "tax_amount",
          "credit_limit",
        ];
        for (const nf of numericFields) {
          if (record[nf] && isNaN(Number(record[nf]))) {
            errors.push({
              row: i + 2,
              column: nf,
              message: `${nf} must be a number`,
            });
          }
        }

        const dateFields = ["date", "invoice_date", "due_date"];
        for (const df of dateFields) {
          if (record[df] && isNaN(Date.parse(record[df]))) {
            errors.push({
              row: i + 2,
              column: df,
              message: `${df} must be a valid date (YYYY-MM-DD)`,
            });
          }
        }
      }

      return {
        totalRows: rows.length,
        preview,
        errors,
        missingHeaders,
        extraHeaders,
        isValid: errors.length === 0 && missingHeaders.length === 0,
      };
    }),

  /**
   * Import customers from validated CSV.
   */
  importCustomers: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        csvContent: z.string().max(5_000_000),
        skipDuplicates: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { headers, rows } = parseCsv(input.csvContent);
      const headerIdx = Object.fromEntries(headers.map((h, i) => [h, i]));

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row[headerIdx["name"]]?.trim();
        const email = row[headerIdx["contact_email"]]?.trim();

        if (!name) {
          errors.push({ row: i + 2, message: "Missing name" });
          continue;
        }

        if (input.skipDuplicates && email) {
          const existing = await db.query.customers.findFirst({
            where: and(
              eq(customers.entityId, input.entityId),
              eq(customers.contactEmail, email),
            ),
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        try {
          await db.insert(customers).values({
            entityId: input.entityId,
            name,
            contactEmail: email || null,
            contactPhone: row[headerIdx["contact_phone"]]?.trim() || null,
            address: row[headerIdx["address"]]?.trim() || null,
            taxId: row[headerIdx["tax_id"]]?.trim() || null,
            paymentTerms: row[headerIdx["payment_terms"]]?.trim() || "net30",
            creditLimit: row[headerIdx["credit_limit"]]
              ? String(row[headerIdx["credit_limit"]])
              : null,
          });
          imported++;
        } catch (err) {
          errors.push({
            row: i + 2,
            message: err instanceof Error ? err.message : "Insert failed",
          });
        }
      }

      await db.insert(auditLog).values({
        entityId: input.entityId,
        userId: ctx.session!.user!.id!,
        action: "data_import.customers",
        entityType: "customer",
        newValues: { imported, skipped, errors: errors.length },
      });

      return { imported, skipped, errors };
    }),

  /**
   * Import suppliers from validated CSV.
   */
  importSuppliers: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        csvContent: z.string().max(5_000_000),
        skipDuplicates: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { headers, rows } = parseCsv(input.csvContent);
      const headerIdx = Object.fromEntries(headers.map((h, i) => [h, i]));

      let imported = 0;
      let skipped = 0;
      const errors: { row: number; message: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const name = row[headerIdx["name"]]?.trim();
        const email = row[headerIdx["contact_email"]]?.trim();

        if (!name) {
          errors.push({ row: i + 2, message: "Missing name" });
          continue;
        }

        if (input.skipDuplicates && email) {
          const existing = await db.query.suppliers.findFirst({
            where: and(
              eq(suppliers.entityId, input.entityId),
              eq(suppliers.contactEmail, email),
            ),
          });
          if (existing) {
            skipped++;
            continue;
          }
        }

        try {
          await db.insert(suppliers).values({
            entityId: input.entityId,
            name,
            contactEmail: email || null,
            contactPhone: row[headerIdx["contact_phone"]]?.trim() || null,
            address: row[headerIdx["address"]]?.trim() || null,
            taxId: row[headerIdx["tax_id"]]?.trim() || null,
            paymentTerms: row[headerIdx["payment_terms"]]?.trim() || "net30",
          });
          imported++;
        } catch (err) {
          errors.push({
            row: i + 2,
            message: err instanceof Error ? err.message : "Insert failed",
          });
        }
      }

      await db.insert(auditLog).values({
        entityId: input.entityId,
        userId: ctx.session!.user!.id!,
        action: "data_import.suppliers",
        entityType: "supplier",
        newValues: { imported, skipped, errors: errors.length },
      });

      return { imported, skipped, errors };
    }),

  /**
   * Import journal entries from CSV.
   */
  importJournalEntries: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        csvContent: z.string().max(5_000_000),
        periodId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { headers, rows } = parseCsv(input.csvContent);
      const headerIdx = Object.fromEntries(headers.map((h, i) => [h, i]));

      let imported = 0;
      const errors: { row: number; message: string }[] = [];

      // Get next entry number
      const lastEntry = await db.query.journalEntries.findFirst({
        where: eq(journalEntries.entityId, input.entityId),
        orderBy: [desc(journalEntries.entryNumber)],
      });
      let nextEntryNumber = (lastEntry?.entryNumber ?? 0) + 1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const date = row[headerIdx["date"]]?.trim();
        const description = row[headerIdx["description"]]?.trim();

        if (!date || !description) {
          errors.push({
            row: i + 2,
            message: "Missing required fields: date, description",
          });
          continue;
        }

        try {
          await db.insert(journalEntries).values({
            entityId: input.entityId,
            entryNumber: nextEntryNumber++,
            date,
            description,
            reference: row[headerIdx["reference"]]?.trim() || null,
            status: (row[headerIdx["status"]]?.trim() ||
              "draft") as typeof journalEntries.$inferInsert.status,
            periodId: input.periodId,
          });
          imported++;
        } catch (err) {
          errors.push({
            row: i + 2,
            message: err instanceof Error ? err.message : "Insert failed",
          });
        }
      }

      await db.insert(auditLog).values({
        entityId: input.entityId,
        userId: ctx.session!.user!.id!,
        action: "data_import.journal_entries",
        entityType: "journal_entry",
        newValues: { imported, errors: errors.length },
      });

      return { imported, errors };
    }),
});
