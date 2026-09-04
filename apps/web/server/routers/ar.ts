import { z } from "zod";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  customers,
  salesInvoices,
  salesInvoiceLines,
  paymentsAr,
  auditLog,
  chartOfAccounts,
} from "@xenboox/db/schema";
import {
  moneyString,
  positiveMoneyString,
  isoDateString,
  moneyToCents,
  MAX_CENTS,
  optionalMoneyString,
} from "../ar-validation";
import { TRPCError } from "@trpc/server";
import {
  validateInvoice,
  logTrustGuardResult,
  trustGuardToError,
} from "@xenboox/agents";

import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  paginationSchema,
  requirePermission,
} from "@/lib/trpc/server";
import { logger } from "@/lib/logger";
import { generateInvoiceNarrative } from "./ar-invoice-narrative";
import { db } from "@/lib/db";
import { sendPaymentReceivedEmail } from "@/lib/email";
import { getEnrichedEntityContext } from "@/lib/entity-context-enrichment";
import { dispatchWebhookEvent } from "@/lib/webhooks/delivery";

// ─── AR Router ───────────────────────────────────────────────────────────────

export const arRouter = router({
  // ── Customers ──
  listCustomers: rlsProtectedProcedure
    .input(paginationSchema)
    .query(({ ctx, input }) => {
      return db.query.customers.findMany({
        where: eq(customers.entityId, ctx.entityId!),
        orderBy: [desc(customers.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  createCustomer: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "create"))
    .input(
      z.object({
        name: z.string().trim().min(1).max(200),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().max(50).optional(),
        taxId: z.string().max(50).optional(),
        address: z.string().max(500).optional(),
        paymentTerms: z
          .string()
          .max(50)
          .regex(/^[a-zA-Z0-9_\-]+$/, "Invalid payment terms")
          .default("net30"),
        creditLimit: optionalMoneyString.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [customer] = await db
          .insert(customers)
          .values({
            ...input,
            // Normalize "" (forms send empty strings) to NULL for numeric col.
            creditLimit: input.creditLimit ? input.creditLimit : undefined,
            entityId: ctx.entityId!,
          })
          .returning();

        if (customer) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ar.createCustomer",
            entityType: "customer",
            entityIdRef: customer.id,
            newValues: {
              name: input.name,
              contactEmail: input.contactEmail,
              paymentTerms: input.paymentTerms,
              creditLimit: input.creditLimit,
            },
          });
        }

        return customer;
      } catch (error) {
        handleMutationError(error, "Failed to create customer");
      }
    }),

  updateCustomer: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        taxId: z.string().optional(),
        address: z.string().optional(),
        paymentTerms: z.string().optional(),
        creditLimit: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(customers)
          .set(data)
          .where(
            and(eq(customers.id, id), eq(customers.entityId, ctx.entityId!)),
          )
          .returning();
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update customer");
      }
    }),

  getCustomerById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return db.query.customers.findFirst({
        where: and(
          eq(customers.id, input.id),
          eq(customers.entityId, ctx.entityId!),
        ),
      });
    }),

  // ── Sales Invoices ──
  listInvoices: rlsProtectedProcedure
    .input(paginationSchema)
    .query(({ ctx, input }) => {
      return db.query.salesInvoices.findMany({
        where: eq(salesInvoices.entityId, ctx.entityId!),
        orderBy: [desc(salesInvoices.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  createInvoice: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "create"))
    .input(
      z.object({
        customerId: z.string().uuid(),
        invoiceNumber: z
          .string()
          .trim()
          .min(1, "Invoice number is required")
          .max(40, "Invoice number must be under 40 characters"),
        invoiceDate: isoDateString,
        dueDate: isoDateString,
        currency: z.string().length(3).default("USD"),
        notes: z.string().max(4000).optional(),
        lines: z
          .array(
            z.object({
              description: z
                .string()
                .trim()
                .min(1, "Line description is required")
                .max(500, "Line description is too long"),
              accountId: z.string().uuid(),
              quantity: z.number().positive().max(999_999_999),
              unitPrice: moneyString,
            }),
          )
          .min(1, "An invoice needs at least one line")
          .max(200, "An invoice can have at most 200 lines"),
      }),
    )
    .superRefine((data, ctx) => {
      // A3: due date must not precede the invoice date.
      if (data.dueDate < data.invoiceDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dueDate"],
          message: "Due date cannot be before the invoice date",
        });
      }
    })
    .mutation(async ({ ctx, input }) => {
      try {
        const { lines, ...invoiceData } = input;

        // A2: integer-cents math — never float-accumulate money. Each line's
        // amount must be a safe integer within numeric(15,2); anything beyond
        // the column's ceiling would be an un-representable total anyway.
        let totalCents = 0;
        for (const line of lines) {
          const lineCents = Math.round(
            line.quantity * moneyToCents(line.unitPrice),
          );
          if (
            !Number.isSafeInteger(lineCents) ||
            lineCents < 0 ||
            lineCents > MAX_CENTS
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Line "${line.description}" total is too large`,
            });
          }
          totalCents += lineCents;
          if (totalCents > MAX_CENTS) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invoice total is too large",
            });
          }
        }
        const totalAmount = totalCents / 100;

        const trustResult = validateInvoice({
          entityId: ctx.entityId!,
          customerId: input.customerId,
          lines: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: parseFloat(l.unitPrice),
            amount: l.quantity * parseFloat(l.unitPrice),
          })),
          subtotal: totalAmount,
          taxAmount: 0,
          totalAmount,
          currency: input.currency,
        });

        await logTrustGuardResult(
          ctx.entityId!,
          ctx.session!.user!.id!,
          "ar.createInvoice",
          trustResult,
        );

        if (!trustResult.passed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              trustGuardToError(trustResult) ?? "Invoice validation failed",
          });
        }

        // Friendly pre-check for duplicate number (uniqueIndex ar_invoice_entity_number)
        const existing = await db.query.salesInvoices.findFirst({
          where: and(
            eq(salesInvoices.entityId, ctx.entityId!),
            eq(salesInvoices.invoiceNumber, input.invoiceNumber),
          ),
          columns: { id: true },
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Invoice number ${input.invoiceNumber} already exists for this entity`,
          });
        }

        // Validate customer belongs to this entity (defense-in-depth)
        const custCheck = await db.query.customers.findFirst({
          where: and(
            eq(customers.id, input.customerId),
            eq(customers.entityId, ctx.entityId!),
          ),
          columns: { id: true },
        });
        if (!custCheck) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Customer not found for this entity",
          });
        }

        // A4: every line account must belong to THIS entity. The FK only proves
        // global existence — a cross-entity account id would leak other
        // entities' accounts into this entity's books on the first posting.
        const lineAccountIds = [...new Set(lines.map((l) => l.accountId))];
        const ownedAccounts = await db.query.chartOfAccounts.findMany({
          where: and(
            eq(chartOfAccounts.entityId, ctx.entityId!),
            inArray(chartOfAccounts.id, lineAccountIds),
          ),
          columns: { id: true },
        });
        if (ownedAccounts.length !== lineAccountIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "One or more line accounts are not in this entity's chart of accounts",
          });
        }

        // neon-http has no real transactions — use sequential inserts with compensation.
        // The central db shim also falls back, but this path ensures no orphan invoice
        // if the lines/audit insert fails outside a real transaction.
        const [invoice] = await db
          .insert(salesInvoices)
          .values({
            ...invoiceData,
            entityId: ctx.entityId!,
            totalAmount: totalAmount.toFixed(2),
            balance: totalAmount.toFixed(2),
            status: "pending",
          })
          .returning();

        if (!invoice) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        try {
          // Batch insert — 1 query instead of N (N+1 fix)
          await db.insert(salesInvoiceLines).values(
            lines.map((line) => {
              const qty = line.quantity;
              // Cents math — the header total used the same accumulation, so
              // the stored line amounts always reconcile exactly.
              const amount = (
                Math.round(qty * moneyToCents(line.unitPrice)) / 100
              ).toFixed(2);
              return {
                salesInvoiceId: invoice.id,
                accountId: line.accountId,
                description: line.description,
                quantity: qty.toFixed(2),
                unitPrice: line.unitPrice,
                amount,
              };
            }),
          );

          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ar.createInvoice",
            entityType: "sales_invoice",
            entityIdRef: invoice.id,
            newValues: {
              customerId: input.customerId,
              invoiceNumber: input.invoiceNumber,
              totalAmount: totalAmount.toFixed(2),
              dueDate: input.dueDate,
            },
          });
        } catch (txError) {
          // Compensate: remove orphan header if lines/audit failed (no real rollback)
          await db
            .delete(salesInvoices)
            .where(eq(salesInvoices.id, invoice.id))
            .catch(() => {});
          throw txError;
        }

        // Generate invoice narrative (non-blocking)
        generateInvoiceNarrative({
          entityId: ctx.entityId!,
          entityName: ctx.entityName ?? "your business",
          currency: input.currency,
          invoiceId: invoice.id,
          invoiceNumber: input.invoiceNumber,
          totalAmount,
          customerId: input.customerId,
          dueDate: input.dueDate,
        }).catch((err) => {
          logger.error({ err }, "[ar] Invoice narrative generation failed");
        });

        return invoice;
      } catch (error) {
        // Map Postgres unique violation to a user-readable 409 before generic 500 masking
        const msg = error instanceof Error ? error.message : String(error);
        const causeMsg =
          error && typeof error === "object" && "cause" in error
            ? String((error as { cause?: unknown }).cause ?? "")
            : "";
        const combined = `${msg} ${causeMsg}`;
        if (
          combined.includes("duplicate key") ||
          combined.includes("ar_invoice_entity_number") ||
          combined.includes("23505")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Invoice number ${input.invoiceNumber} already exists`,
          });
        }
        handleMutationError(error, "Failed to create invoice");
      }
    }),

  updateInvoice: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        invoiceDate: isoDateString.optional(),
        dueDate: isoDateString.optional(),
        notes: z.string().max(4000).optional(),
        // A5 state machine: callers may only VOID. "paid"/"partial"/"overdue"
        // are driven by payments + the overdue job — a hand-set status (paid
        // with no payment, paid → pending, etc.) would forge the books.
        status: z.literal("voided").optional(),
      }),
    )
    .superRefine((data, ctx) => {
      if (
        data.invoiceDate !== undefined &&
        data.dueDate !== undefined &&
        data.dueDate < data.invoiceDate
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dueDate"],
          message: "Due date cannot be before the invoice date",
        });
      }
    })
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;

        const existing = await db.query.salesInvoices.findFirst({
          where: and(
            eq(salesInvoices.id, id),
            eq(salesInvoices.entityId, ctx.entityId!),
          ),
          columns: {
            id: true,
            status: true,
            paidAmount: true,
            balance: true,
            invoiceNumber: true,
            customerId: true,
            totalAmount: true,
            dueDate: true,
          },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        const updates: {
          invoiceDate?: string;
          dueDate?: string;
          notes?: string | null;
          status?: "voided";
        } = {};
        if (data.invoiceDate !== undefined)
          updates.invoiceDate = data.invoiceDate;
        if (data.dueDate !== undefined) updates.dueDate = data.dueDate;
        if (data.notes !== undefined) updates.notes = data.notes;

        if (data.status === "voided") {
          if (existing.status === "voided") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invoice is already voided",
            });
          }
          const paid = moneyToCents(String(existing.paidAmount));
          if (!Number.isNaN(paid) && paid > 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Invoice has payments recorded — reverse them before voiding",
            });
          }
          if (existing.status === "paid") {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot void a paid invoice — post a credit note instead",
            });
          }
          updates.status = "voided";
        }

        if (Object.keys(updates).length === 0) {
          // Nothing to change — return current state unchanged.
          const [fresh] = await db
            .select()
            .from(salesInvoices)
            .where(
              and(
                eq(salesInvoices.id, id),
                eq(salesInvoices.entityId, ctx.entityId!),
              ),
            )
            .limit(1);
          return fresh ?? null;
        }

        const [updated] = await db
          .update(salesInvoices)
          .set(updates)
          .where(
            and(
              eq(salesInvoices.id, id),
              eq(salesInvoices.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (updated && updates.status === "voided") {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ar.voidInvoice",
            entityType: "sales_invoice",
            entityIdRef: updated.id,
            oldValues: {
              invoiceNumber: existing.invoiceNumber,
              status: existing.status,
            },
            newValues: { status: "voided" },
          });
        }

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update invoice");
      }
    }),

  getInvoiceById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const invoice = await db.query.salesInvoices.findFirst({
        where: and(
          eq(salesInvoices.id, input.id),
          eq(salesInvoices.entityId, ctx.entityId!),
        ),
      });
      if (!invoice) return null;

      const lines = await db.query.salesInvoiceLines.findMany({
        where: eq(salesInvoiceLines.salesInvoiceId, invoice.id),
      });

      return { ...invoice, lines };
    }),

  // ── AR Payments ──
  listPayments: rlsProtectedProcedure
    .input(paginationSchema)
    .query(({ ctx, input }) => {
      return db.query.paymentsAr.findMany({
        where: eq(paymentsAr.entityId, ctx.entityId!),
        orderBy: [desc(paymentsAr.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });
    }),

  createPayment: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "create"))
    .input(
      z.object({
        salesInvoiceId: z.string().uuid(),
        amount: positiveMoneyString,
        paymentDate: isoDateString,
        method: z.enum([
          "bank_transfer",
          "cash",
          "mobile_money",
          "check",
          "card",
        ]),
        reference: z.string().max(100).optional(),
        notes: z.string().max(1000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const {
          salesInvoiceId,
          amount: paymentAmountStr,
          ...paymentData
        } = input;

        const invoice = await db.query.salesInvoices.findFirst({
          where: and(
            eq(salesInvoices.id, salesInvoiceId),
            eq(salesInvoices.entityId, ctx.entityId!),
          ),
        });
        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        // A7: the authoritative balance lives in the row, not in this read. On
        // the default neon-http driver db.transaction is a no-op shim (see
        // packages/db/client), so the final gate is a single-statement
        // compare-and-set — two concurrent payments can never both pass a
        // stale read.
        const paymentCents = moneyToCents(paymentAmountStr);
        if (Number.isNaN(paymentCents) || paymentCents <= 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment amount must be greater than zero",
          });
        }
        const currentBalanceCents = moneyToCents(String(invoice.balance));
        if (currentBalanceCents < paymentCents) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment amount ${paymentAmountStr} exceeds invoice balance ${invoice.balance}`,
          });
        }

        const amountStr = (paymentCents / 100).toFixed(2);
        const newStatus =
          currentBalanceCents - paymentCents <= 0 ? "paid" : "partial";

        const [payment] = await db
          .insert(paymentsAr)
          .values({
            ...paymentData,
            entityId: ctx.entityId!,
            salesInvoiceId,
            amount: amountStr,
          })
          .returning();
        if (!payment) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to record payment",
          });
        }

        // Atomic compare-and-set: 0 rows => the balance moved (another payment
        // or an edit landed) after our read — fail loudly, never overpay.
        const cas = await db
          .update(salesInvoices)
          .set({
            paidAmount: sql`${salesInvoices.paidAmount}::numeric + ${amountStr}::numeric`,
            balance: sql`${salesInvoices.balance}::numeric - ${amountStr}::numeric`,
            status: newStatus,
          })
          .where(
            and(
              eq(salesInvoices.id, salesInvoiceId),
              eq(salesInvoices.entityId, ctx.entityId!),
              gte(
                sql`${salesInvoices.balance}::numeric`,
                sql`${amountStr}::numeric`,
              ),
            ),
          )
          .returning({ id: salesInvoices.id });

        if (cas.length === 0) {
          // Roll back the just-inserted payment row (no real tx on neon-http).
          await db
            .delete(paymentsAr)
            .where(
              and(
                eq(paymentsAr.id, payment.id),
                eq(paymentsAr.entityId, ctx.entityId!),
              ),
            )
            .catch(() => {});
          throw new TRPCError({
            code: "CONFLICT",
            message: "Invoice balance changed — refresh and try again",
          });
        }

        try {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ar.createPayment",
            entityType: "payment_ar",
            entityIdRef: payment.id,
            newValues: {
              salesInvoiceId,
              amount: amountStr,
              method: input.method,
              reference: input.reference,
            },
          });

          // Send email notification (non-blocking)
          if (invoice) {
            const customer = await db.query.customers.findFirst({
              where: and(
                eq(customers.id, invoice.customerId),
                eq(customers.entityId, ctx.entityId!),
              ),
            });
            if (customer && customer.contactEmail) {
              getEnrichedEntityContext(ctx.entityId!)
                .then((entityCtx) => {
                  sendPaymentReceivedEmail(customer.contactEmail!, {
                    customerName: customer.name,
                    invoiceNumber: invoice.invoiceNumber,
                    amount: amountStr,
                    currency: invoice.currency,
                    paymentMethod: input.method,
                    reference: input.reference,
                    entityName: entityCtx.entityName,
                  }).catch((e) =>
                    logger.error({ err: e }, "Failed to send payment email"),
                  );
                })
                .catch((e) =>
                  logger.error(
                    { err: e },
                    "Failed to send payment notification",
                  ),
                );
            }
          }

          // Fire-and-forget webhook dispatch
          try {
            void dispatchWebhookEvent({
              entityId: ctx.entityId!,
              eventType: "invoice.paid",
              data: {
                invoiceId: salesInvoiceId,
                invoiceNumber: invoice.invoiceNumber,
                amount: amountStr,
                method: input.method,
                reference: input.reference,
                newStatus,
              },
            });
          } catch (e) {
            logger.error({ err: e }, "Failed to dispatch invoice.paid webhook");
          }

          return payment;
        } catch (err) {
          // No real transaction on neon-http: if audit/email setup fails after
          // the balance moved, roll the CAS adjustment back and drop the
          // payment row so the invoice can never be half-applied.
          await db
            .delete(paymentsAr)
            .where(
              and(
                eq(paymentsAr.id, payment.id),
                eq(paymentsAr.entityId, ctx.entityId!),
              ),
            )
            .catch(() => {});
          await db
            .update(salesInvoices)
            .set({
              paidAmount: sql`${salesInvoices.paidAmount}::numeric - ${amountStr}::numeric`,
              balance: sql`${salesInvoices.balance}::numeric + ${amountStr}::numeric`,
              // Restore the pre-payment status (pending/partial/overdue — never
              // "paid" since a positive balance remained before this payment).
              status:
                invoice.status === "partial" ||
                invoice.status === "overdue" ||
                invoice.status === "pending"
                  ? invoice.status
                  : "pending",
            })
            .where(
              and(
                eq(salesInvoices.id, salesInvoiceId),
                eq(salesInvoices.entityId, ctx.entityId!),
              ),
            )
            .catch(() => {});
          throw err;
        }
      } catch (error) {
        handleMutationError(error, "Failed to create payment");
      }
    }),

  // ── Delete Procedures ──

  deleteCustomer: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [existing] = await db
          .select()
          .from(customers)
          .where(
            and(
              eq(customers.id, input.id),
              eq(customers.entityId, ctx.entityId!),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Customer not found",
          });
        }

        // A6: customers with invoice history must be deactivated, not deleted
        // (the FK would fail with a raw error anyway).
        const invoiceCount = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.customerId, input.id),
              eq(salesInvoices.entityId, ctx.entityId!),
            ),
          );
        if ((invoiceCount[0]?.n ?? 0) > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Customer has invoices on record — deactivate them instead of deleting",
          });
        }

        await db
          .delete(customers)
          .where(
            and(
              eq(customers.id, input.id),
              eq(customers.entityId, ctx.entityId!),
            ),
          );

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ar.deleteCustomer",
          entityType: "customer",
          entityIdRef: input.id,
          oldValues: { name: existing.name },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete customer");
      }
    }),

  deleteInvoice: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [existing] = await db
          .select()
          .from(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.id),
              eq(salesInvoices.entityId, ctx.entityId!),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        if (existing.status === "paid") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a paid invoice",
          });
        }

        // A6: an invoice with recorded payments is protected by the FK anyway
        // — surface a clear conflict instead of a raw FK failure.
        const paymentCount = await db
          .select({ n: sql<number>`count(*)::int` })
          .from(paymentsAr)
          .where(eq(paymentsAr.salesInvoiceId, input.id));
        if ((paymentCount[0]?.n ?? 0) > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Invoice has recorded payments — reverse the payments before deleting",
          });
        }

        await db
          .delete(salesInvoices)
          .where(
            and(
              eq(salesInvoices.id, input.id),
              eq(salesInvoices.entityId, ctx.entityId!),
            ),
          );

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ar.deleteInvoice",
          entityType: "sales_invoice",
          entityIdRef: input.id,
          oldValues: {
            invoiceNumber: existing.invoiceNumber,
            status: existing.status,
            totalAmount: existing.totalAmount,
          },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete invoice");
      }
    }),

  deletePayment: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const [existing] = await db
          .select()
          .from(paymentsAr)
          .where(
            and(
              eq(paymentsAr.id, input.id),
              eq(paymentsAr.entityId, ctx.entityId!),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payment not found",
          });
        }

        const invoice = await db.query.salesInvoices.findFirst({
          where: and(
            eq(salesInvoices.id, existing.salesInvoiceId),
            eq(salesInvoices.entityId, ctx.entityId!),
          ),
          columns: {
            id: true,
            totalAmount: true,
            status: true,
            invoiceNumber: true,
            customerId: true,
          },
        });

        await db
          .delete(paymentsAr)
          .where(
            and(
              eq(paymentsAr.id, input.id),
              eq(paymentsAr.entityId, ctx.entityId!),
            ),
          );

        // A11: deleting a payment must restore the invoice's paid/balance/status
        // from the remaining payments — otherwise the invoice stays "paid" with
        // a zero balance while its payment history disappears (books drift).
        if (invoice) {
          const [agg] = await db
            .select({
              paid: sql<string>`COALESCE(SUM(${paymentsAr.amount}::numeric), 0)::text`,
            })
            .from(paymentsAr)
            .where(
              and(
                eq(paymentsAr.salesInvoiceId, invoice.id),
                eq(paymentsAr.entityId, ctx.entityId!),
              ),
            );
          const paid = parseFloat(agg?.paid ?? "0");
          const total = parseFloat(String(invoice.totalAmount));
          const balance = Math.max(total - paid, 0);
          const nextStatus =
            paid <= 0 ? "pending" : balance <= 0 ? "paid" : "partial";
          await db
            .update(salesInvoices)
            .set({
              paidAmount: paid.toFixed(2),
              balance: balance.toFixed(2),
              status: nextStatus,
            })
            .where(
              and(
                eq(salesInvoices.id, invoice.id),
                eq(salesInvoices.entityId, ctx.entityId!),
              ),
            );
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "ar.deletePayment",
          entityType: "payment_ar",
          entityIdRef: input.id,
          oldValues: {
            salesInvoiceId: existing.salesInvoiceId,
            amount: existing.amount,
            method: existing.method,
          },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete payment");
      }
    }),

  // ── AI-drafted invoice reminders + collections (ai-reminders) ──────────
  // Draft a personalized collection email from real invoice data. The draft
  // is deterministic and production-safe: no LLM call, everything traceable
  // to the invoice. Tone escalates with how overdue the invoice is.

  draftReminder: rlsProtectedProcedure
    .input(z.object({ invoiceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const [invoice] = await db
        .select({
          id: salesInvoices.id,
          invoiceNumber: salesInvoices.invoiceNumber,
          dueDate: salesInvoices.dueDate,
          balance: salesInvoices.balance,
          totalAmount: salesInvoices.totalAmount,
          status: salesInvoices.status,
          currency: salesInvoices.currency,
          customerId: salesInvoices.customerId,
        })
        .from(salesInvoices)
        .where(
          and(
            eq(salesInvoices.id, input.invoiceId),
            eq(salesInvoices.entityId, entityId),
          ),
        )
        .limit(1);
      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      const [customer] = await db
        .select({
          name: customers.name,
          contactEmail: customers.contactEmail,
        })
        .from(customers)
        .where(
          and(
            eq(customers.id, invoice.customerId),
            // A9: defense-in-depth — never trust the invoice row's FK alone.
            eq(customers.entityId, entityId),
          ),
        )
        .limit(1);

      const customerName = customer?.name ?? "Customer";
      const balance = parseFloat(invoice.balance);
      const due = new Date(invoice.dueDate);
      // Legacy rows may predate date validation — never let NaN poison aging.
      const dueMs = due.getTime();
      const rawDays = Number.isFinite(dueMs)
        ? Math.floor((Date.now() - dueMs) / 86_400_000)
        : 0;
      const daysOverdue = Math.max(0, rawDays);
      const dueLabel = due.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      });

      const tone =
        daysOverdue === 0
          ? {
              subject: `Friendly reminder: Invoice ${invoice.invoiceNumber}`,
              opener: `Just a friendly reminder that invoice ${invoice.invoiceNumber} (${dueLabel}) is coming due.`,
              closing:
                "Thanks for your prompt attention — it keeps things simple on both sides.",
            }
          : daysOverdue <= 7
            ? {
                subject: `Payment reminder: Invoice ${invoice.invoiceNumber}`,
                opener: `Our records show invoice ${invoice.invoiceNumber} (${dueLabel}) is now ${daysOverdue} day${daysOverdue > 1 ? "s" : ""} overdue.`,
                closing:
                  "Could you confirm the payment date? Happy to help with any questions.",
              }
            : {
                subject: `Second notice: Invoice ${invoice.invoiceNumber} is ${daysOverdue} days overdue`,
                opener: `Invoice ${invoice.invoiceNumber} (${dueLabel}) is now ${daysOverdue} days past due.`,
                closing:
                  "Please arrange payment of the outstanding balance, or reach out so we can resolve any issue together.",
              };

      const body = `Hi ${customerName},\n\n${tone.opener}\n\nInvoice: ${invoice.invoiceNumber}\nDue date: ${dueLabel}\n        Outstanding balance: ${(ctx as { entityCurrency?: string | null }).entityCurrency ?? invoice.currency ?? "USD"} ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n${tone.closing}\n\nBest regards,\nThe Xenboox team`;

      return {
        draft: {
          to: customer?.contactEmail ?? null,
          subject: tone.subject,
          body,
          daysOverdue,
          balance,
        },
      };
    }),

  // Collections queue — invoices needing a reminder, ranked by aging.
  listCollections: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const rows = await db
      .select({
        id: salesInvoices.id,
        invoiceNumber: salesInvoices.invoiceNumber,
        dueDate: salesInvoices.dueDate,
        balance: salesInvoices.balance,
        status: salesInvoices.status,
        customerName: customers.name,
        customerEmail: customers.contactEmail,
      })
      .from(salesInvoices)
      .leftJoin(customers, eq(salesInvoices.customerId, customers.id))
      .where(
        and(
          eq(salesInvoices.entityId, entityId),
          sql`${salesInvoices.balance}::numeric > 0`,
        ),
      )
      .orderBy(desc(salesInvoices.dueDate));

    const now = Date.now();
    const aged = rows
      .map((r) => {
        const daysOverdue = Math.max(
          0,
          Math.floor((now - new Date(r.dueDate).getTime()) / 86_400_000),
        );
        return {
          id: r.id,
          invoiceNumber: r.invoiceNumber,
          dueDate: r.dueDate,
          balance: parseFloat(r.balance),
          status: r.status,
          customerName: r.customerName ?? "Customer",
          customerEmail: r.customerEmail,
          daysOverdue,
          bucket:
            daysOverdue === 0
              ? "due_soon"
              : daysOverdue <= 7
                ? "overdue_7"
                : daysOverdue <= 30
                  ? "overdue_30"
                  : "overdue_90",
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    const totalOutstanding = aged.reduce((s, r) => s + r.balance, 0);
    return {
      items: aged,
      totals: {
        totalOutstanding,
        count: aged.length,
        buckets: {
          due_soon: aged.filter((r) => r.bucket === "due_soon").length,
          overdue_7: aged.filter((r) => r.bucket === "overdue_7").length,
          overdue_30: aged.filter((r) => r.bucket === "overdue_30").length,
          overdue_90: aged.filter((r) => r.bucket === "overdue_90").length,
        },
      },
    };
  }),

  /**
   * Get count of overdue invoices for the approval badge.
   * Used by the sidebar notification badge and financial pulse overview.
   */
  getOverdueCount: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(salesInvoices)
      .where(
        and(
          eq(salesInvoices.entityId, entityId),
          eq(salesInvoices.status, "overdue"),
        ),
      );

    return { count: result[0]?.count ?? 0 };
  }),
});
