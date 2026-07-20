/**
 * Integrations Router
 *
 * Manages bank connections (Mono API), email forwarding rules,
 * and connected account status.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  bankConnections,
  emailForwardingRules,
  inboundEmails,
  csvMappings,
} from "@xenboox/db/schema/integrations";
import { entities } from "@xenboox/db/schema/organization";
import { triggerClient } from "@/lib/trigger";

// ─── CSV Mapping Helpers ───────────────────────────────────────────────────

/**
 * Parse a single CSV line respecting quoted values.
 */
function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i]!;
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Standard column names that the accounting system expects.
 */
const STANDARD_FIELDS = [
  "date",
  "description",
  "amount",
  "debit",
  "credit",
  "balance",
  "reference",
  "value_date",
  "type",
  "category",
  "counterparty",
  "notes",
] as const;

type StandardField = (typeof STANDARD_FIELDS)[number];

/**
 * Heuristics to auto-guess which CSV columns map to which standard fields.
 */
function autoGuessMapping(
  headers: string[],
  sampleRows: string[][],
): Record<string, string> {
  const mapping: Record<string, string> = {};

  // Keyword patterns for each standard field
  const patterns: Record<StandardField, string[]> = {
    date: [
      "date",
      "transaction date",
      "value date",
      "posting date",
      "txn date",
      "entry date",
    ],
    description: [
      "description",
      "narration",
      "particulars",
      "details",
      "memo",
      "transaction details",
      "notes",
    ],
    amount: ["amount", "transaction amount", "txn amount", "sum", "value"],
    debit: [
      "debit",
      "debit amount",
      "dr",
      "withdrawal",
      "withdrawals",
      "payment",
      "debit(ghs)",
      "debit(gmd)",
    ],
    credit: [
      "credit",
      "credit amount",
      "cr",
      "deposit",
      "deposits",
      "receipt",
      "credit(ghs)",
      "credit(gmd)",
    ],
    balance: [
      "balance",
      "running balance",
      "closing balance",
      "available balance",
      "ledger balance",
    ],
    reference: [
      "reference",
      "ref",
      "transaction ref",
      "txn ref",
      "cheque",
      "check no",
      "trx id",
      "transaction id",
    ],
    value_date: ["value date", "settlement date", "effective date"],
    type: ["type", "transaction type", "txn type", "trx type", "nature"],
    category: [
      "category",
      "transaction category",
      "classification",
      "type",
    ] as string[],
    counterparty: [
      "counterparty",
      "payee",
      "payer",
      "beneficiary",
      "sender",
      "receiver",
      "third party",
      "to",
      "from",
    ],
    notes: ["notes", "remark", "remarks", "memo", "extra info", "comment"],
  };

  for (const header of headers) {
    const lower = header.toLowerCase().trim();

    for (const [field, keywords] of Object.entries(patterns)) {
      if (mapping[field]) continue; // Already mapped

      // Exact match first
      if (keywords.includes(lower)) {
        mapping[field] = header;
        break;
      }

      // Partial match (e.g., "Tran Date" matches "transaction date" partially)
      for (const kw of keywords) {
        if (lower.includes(kw) || kw.includes(lower)) {
          mapping[field] = header;
          break;
        }
      }

      if (mapping[field]) break;
    }
  }

  // If we have date, description, and an amount column but no debit/credit,
  // try to infer amount type from sample data
  if (!mapping.debit && !mapping.credit && mapping.amount) {
    const amountCol = headers.indexOf(mapping.amount);
    if (amountCol >= 0) {
      const samples = sampleRows
        .map((r) => r[amountCol]?.trim() ?? "")
        .filter(Boolean);
      const hasNegatives = samples.some(
        (s) => s.startsWith("-") || s.startsWith("("),
      );
      const hasPositives = samples.some(
        (s) => !s.startsWith("-") && !s.startsWith("(") && s.length > 0,
      );

      if (hasNegatives && hasPositives) {
        // Single column with + and - values: use as 'amount'
        mapping.type = mapping.amount;
        delete mapping.amount;
        mapping.debit = headers[amountCol]!;
        mapping.credit = headers[amountCol]!;
      }
    }
  }

  return mapping;
}

/**
 * Try to detect the source name from CSV headers.
 */
function guessSourceName(headers: string[]): string {
  const allText = headers.join(" ").toLowerCase();

  if (allText.includes("gtbank") || allText.includes("gt bank"))
    return "GTBank";
  if (allText.includes("access bank")) return "Access Bank";
  if (allText.includes("zenith")) return "Zenith Bank";
  if (allText.includes("kcb")) return "KCB";
  if (allText.includes("equity")) return "Equity Bank";
  if (allText.includes("stanbic")) return "Stanbic";
  if (allText.includes("ecobank")) return "Ecobank";
  if (allText.includes("standard chartered")) return "Standard Chartered";
  if (allText.includes("fidelity")) return "Fidelity Bank";
  if (allText.includes("uba")) return "UBA";
  if (allText.includes("absa")) return "Absa";
  if (allText.includes("wave")) return "Wave";
  if (allText.includes("mpesa") || allText.includes("m-pesa")) return "M-Pesa";
  if (allText.includes("mtn")) return "MTN MoMo";
  if (allText.includes("airtel")) return "Airtel Money";
  if (allText.includes("orange")) return "Orange Money";

  return "import";
}

/**
 * Validate sample data against the guessed mapping.
 * Checks date formats, numeric amounts, and required fields.
 */
function validateSampleData(
  mapping: Record<string, string>,
  headers: string[],
  sampleRows: string[][],
  _delimiter: string,
): {
  dateFormatsValid: boolean;
  amountsNumeric: boolean;
  requiredFieldsPresent: boolean;
  missingRequired: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const missingRequired: string[] = [];

  // Check required fields: date + at least one amount column
  if (!mapping.date) {
    missingRequired.push("date");
  }
  if (!mapping.debit && !mapping.credit && !mapping.amount) {
    missingRequired.push("debit/credit/amount");
  }
  if (!mapping.description) {
    warnings.push(
      "No description column mapped - transactions will have empty descriptions",
    );
  }

  // Validate date formats in sample
  let dateFormatsValid = true;
  if (mapping.date) {
    const dateCol = headers.indexOf(mapping.date);
    if (dateCol >= 0) {
      for (const row of sampleRows) {
        const val = row[dateCol]?.trim();
        if (val && !isValidDate(val)) {
          dateFormatsValid = false;
          warnings.push(
            `Unrecognized date format in column "${mapping.date}": "${val}"`,
          );
          break;
        }
      }
    }
  }

  // Validate amounts are numeric
  let amountsNumeric = true;
  const amountCols = ["debit", "credit", "amount", "balance"]
    .map((f) => (mapping[f] ? headers.indexOf(mapping[f]!) : -1))
    .filter((i) => i >= 0);

  for (const col of amountCols) {
    for (const row of sampleRows) {
      const val = row[col]?.trim().replace(/[, ]/g, "") ?? "";
      if (
        val &&
        isNaN(parseFloat(val)) &&
        !val.startsWith("-") &&
        !val.startsWith("(")
      ) {
        amountsNumeric = false;
        const colName = headers[col] ?? `column ${col}`;
        warnings.push(`Non-numeric value in "${colName}": "${val}"`);
        break;
      }
    }
  }

  return {
    dateFormatsValid,
    amountsNumeric,
    requiredFieldsPresent: missingRequired.length === 0,
    missingRequired,
    warnings,
  };
}

function isValidDate(val: string): boolean {
  // Try common date formats
  const patterns = [
    /^\d{4}-\d{2}-\d{2}$/, // 2024-01-15
    /^\d{2}\/\d{2}\/\d{4}$/, // 15/01/2024
    /^\d{2}-\d{2}-\d{4}$/, // 15-01-2024
    /^\d{2}\.\d{2}\.\d{4}$/, // 15.01.2024
    /^[A-Za-z]{3}\s+\d{1,2},?\s+\d{4}$/i, // Jan 15, 2024
    /^\d{1,2}\s+[A-Za-z]{3}\s+\d{4}$/i, // 15 Jan 2024
  ];

  if (patterns.some((p) => p.test(val))) return true;
  return !isNaN(new Date(val).getTime());
}

// ─── Router ────────────────────────────────────────────────────────────────

export const integrationsRouter = router({
  // ── Bank Connections (Mono) ──

  getBankConnections: protectedProcedure.query(({ ctx }) => {
    return db.query.bankConnections.findMany({
      where: eq(bankConnections.entityId, ctx.entityId!),
      orderBy: [desc(bankConnections.createdAt)],
    });
  }),

  initiateBankConnection: protectedProcedure
    .input(
      z.object({
        institutionName: z.string().min(1),
        accountNumber: z.string().min(8).max(20),
        institutionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [connection] = await db
        .insert(bankConnections)
        .values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          institutionName: input.institutionName,
          accountNumber: input.accountNumber,
          institutionId:
            input.institutionId ?? input.institutionName.toLowerCase(),
          status: "pending",
        })
        .returning();

      return {
        connectionId: connection.id,
        institutionId: connection.institutionId,
      };
    }),

  completeBankConnection: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        providerConnectionId: z.string().min(1),
        accountName: z.string().optional(),
        currency: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.bankConnections.findFirst({
        where: and(
          eq(bankConnections.id, input.connectionId),
          eq(bankConnections.entityId, ctx.entityId!),
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      await db
        .update(bankConnections)
        .set({
          status: "active",
          providerConnectionId: input.providerConnectionId,
          accountName: input.accountName ?? existing.accountName,
          currency: input.currency ?? existing.currency,
          lastSyncedAt: new Date(),
        })
        .where(eq(bankConnections.id, input.connectionId));

      return { success: true };
    }),

  syncBankTransactions: protectedProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const connection = await db.query.bankConnections.findFirst({
        where: and(
          eq(bankConnections.id, input.connectionId),
          eq(bankConnections.entityId, ctx.entityId!),
        ),
      });

      if (!connection) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Connection not found",
        });
      }

      if (connection.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Connection is not active",
        });
      }

      await triggerClient.tasks.trigger("mono-sync-transactions", {
        connectionId: connection.id,
        entityId: ctx.entityId!,
        providerConnectionId: connection.providerConnectionId,
      });

      return { triggered: true };
    }),

  disconnectBank: protectedProcedure
    .input(z.object({ connectionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(bankConnections)
        .set({ status: "disconnected" })
        .where(
          and(
            eq(bankConnections.id, input.connectionId),
            eq(bankConnections.entityId, ctx.entityId!),
          ),
        );

      return { success: true };
    }),

  // ── Email Forwarding Rules ──

  getEmailRules: protectedProcedure.query(({ ctx }) => {
    return db.query.emailForwardingRules.findMany({
      where: eq(emailForwardingRules.entityId, ctx.entityId!),
      orderBy: [desc(emailForwardingRules.createdAt)],
    });
  }),

  createEmailRule: protectedProcedure
    .input(
      z.object({
        emailAddress: z.string().email(),
        forwardTo: z.string().email().optional(),
        displayName: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [rule] = await db
        .insert(emailForwardingRules)
        .values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          emailAddress: input.emailAddress,
          displayName: input.displayName,
          forwardTo: input.forwardTo,
          autoClassify: true,
          defaultDocumentType: "invoice",
        })
        .returning();

      return {
        ruleId: rule.id,
        emailAddress: rule.emailAddress,
      };
    }),

  deleteEmailRule: protectedProcedure
    .input(z.object({ ruleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(emailForwardingRules)
        .set({ isActive: false })
        .where(
          and(
            eq(emailForwardingRules.id, input.ruleId),
            eq(emailForwardingRules.entityId, ctx.entityId!),
          ),
        );

      return { success: true };
    }),

  // ── Inbound Emails ──

  getInboundEmails: protectedProcedure.query(({ ctx }) => {
    return db.query.inboundEmails.findMany({
      where: eq(inboundEmails.entityId, ctx.entityId!),
      orderBy: [desc(inboundEmails.createdAt)],
    });
  }),

  // ── CSV Column Mappings (Mapping Wizard) ──

  /**
   * Get saved CSV column mappings for an entity, optionally filtered by source.
   */
  getCsvMappings: protectedProcedure
    .input(z.object({ sourceName: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(csvMappings.entityId, ctx.entityId!)];
      if (input?.sourceName) {
        conditions.push(eq(csvMappings.sourceName, input.sourceName));
      }
      return db.query.csvMappings.findMany({
        where: and(...conditions),
        orderBy: [desc(csvMappings.lastUsedAt)],
      });
    }),

  /**
   * Detect column headers and auto-guess a mapping from a CSV text sample.
   * Returns detected columns and a best-guess mapping to standard fields.
   */
  guessCsvMapping: protectedProcedure
    .input(
      z.object({
        csvSample: z.string().min(1).max(50000),
        delimiter: z.string().default(","),
      }),
    )
    .mutation(async ({ input }) => {
      const lines = input.csvSample.split("\n").filter((l) => l.trim());
      if (lines.length < 2) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "CSV must have at least a header row and one data row",
        });
      }

      const headers = parseCsvLine(lines[0]!, input.delimiter).map((h) =>
        h.trim(),
      );
      const sampleRows = lines
        .slice(1, 4)
        .map((l) => parseCsvLine(l, input.delimiter).map((c) => c.trim()));

      // Auto-guess mapping using heuristics
      const guess = autoGuessMapping(headers, sampleRows);

      // Detect likely source name from headers
      const sourceName = guessSourceName(headers);

      // Validate that dates parse and amounts are numeric in sample data
      const validation = validateSampleData(
        guess,
        headers,
        sampleRows,
        input.delimiter,
      );

      return {
        columnCount: headers.length,
        headers,
        sampleRows,
        guess,
        sourceName,
        validation,
        delimiter: input.delimiter,
      };
    }),

  /**
   * Save a CSV column mapping for future use.
   */
  saveCsvMapping: protectedProcedure
    .input(
      z.object({
        sourceName: z.string().min(1),
        sourceLabel: z.string().optional(),
        fileHeaderHash: z.string().optional(),
        delimiter: z.string().default(","),
        hasHeaderRow: z.boolean().default(true),
        fieldMapping: z.record(z.string()),
        skipRows: z.number().int().min(0).default(0),
        dateFormat: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Upsert: use ON CONFLICT via entity + sourceName
      const existing = await db.query.csvMappings.findFirst({
        where: and(
          eq(csvMappings.entityId, ctx.entityId!),
          eq(csvMappings.sourceName, input.sourceName),
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(csvMappings)
          .set({
            fieldMapping: input.fieldMapping,
            delimiter: input.delimiter,
            hasHeaderRow: input.hasHeaderRow,
            skipRows: input.skipRows,
            dateFormat: input.dateFormat,
            useCount: sql`${csvMappings.useCount} + 1`,
            lastUsedAt: new Date(),
          })
          .where(eq(csvMappings.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(csvMappings)
        .values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          sourceName: input.sourceName,
          sourceLabel: input.sourceLabel ?? input.sourceName,
          fileHeaderHash: input.fileHeaderHash,
          delimiter: input.delimiter,
          hasHeaderRow: input.hasHeaderRow,
          fieldMapping: input.fieldMapping,
          skipRows: input.skipRows,
          dateFormat: input.dateFormat,
          useCount: 1,
          lastUsedAt: new Date(),
        })
        .returning();

      return created;
    }),

  deleteCsvMapping: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(csvMappings)
        .where(
          and(
            eq(csvMappings.id, input.id),
            eq(csvMappings.entityId, ctx.entityId!),
          ),
        );
      return { success: true };
    }),

  // ── Overview ──

  getOverview: protectedProcedure.query(async ({ ctx }) => {
    const [connections, rules, emails] = await Promise.all([
      db.query.bankConnections.findMany({
        where: eq(bankConnections.entityId, ctx.entityId!),
      }),
      db.query.emailForwardingRules.findMany({
        where: eq(emailForwardingRules.entityId, ctx.entityId!),
      }),
      db.query.inboundEmails.findMany({
        where: eq(inboundEmails.entityId, ctx.entityId!),
      }),
    ]);

    return {
      bankConnections: {
        total: connections.length,
        active: connections.filter((c) => c.status === "active").length,
      },
      emailRules: {
        total: rules.length,
        active: rules.filter((r) => r.isActive).length,
      },
      emailsReceived: {
        total: emails.length,
        processed: emails.filter((e) => e.status === "processed").length,
        pending: emails.filter((e) => e.status === "received").length,
      },
    };
  }),
});
