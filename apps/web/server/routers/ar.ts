import { z } from "zod";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  customers,
  salesInvoices,
  salesInvoiceLines,
  paymentsAr,
  auditLog,
} from "@xenboox/db/schema";
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
        name: z.string().min(1),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        taxId: z.string().optional(),
        address: z.string().optional(),
        paymentTerms: z.string().default("net30"),
        creditLimit: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [customer] = await db
          .insert(customers)
          .values({ ...input, entityId: ctx.entityId! })
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
        invoiceNumber: z.string().min(1),
        invoiceDate: z.string(),
        dueDate: z.string(),
        currency: z.string().length(3).default("GMD"),
        notes: z.string().optional(),
        lines: z
          .array(
            z.object({
              description: z.string().min(1),
              accountId: z.string().uuid(),
              quantity: z.number().positive(),
              unitPrice: z.string(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { lines, ...invoiceData } = input;

        let totalAmount = 0;
        for (const line of lines) {
          const qty = line.quantity;
          const price = parseFloat(line.unitPrice);
          totalAmount += qty * price;
        }

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

        return await db.transaction(async (tx) => {
          const [invoice] = await tx
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

          for (const line of lines) {
            const qty = line.quantity;
            const price = parseFloat(line.unitPrice);
            const amount = (qty * price).toFixed(2);

            await tx.insert(salesInvoiceLines).values({
              salesInvoiceId: invoice.id,
              accountId: line.accountId,
              description: line.description,
              quantity: qty.toFixed(2),
              unitPrice: line.unitPrice,
              amount,
            });
          }

          await tx.insert(auditLog).values({
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

          return invoice;
        });
      } catch (error) {
        handleMutationError(error, "Failed to create invoice");
      }
    }),

  updateInvoice: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        invoiceDate: z.string().optional(),
        dueDate: z.string().optional(),
        totalAmount: z.string().optional(),
        notes: z.string().optional(),
        status: z
          .enum(["pending", "partial", "paid", "overdue", "voided"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(salesInvoices)
          .set(data)
          .where(
            and(
              eq(salesInvoices.id, id),
              eq(salesInvoices.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (updated && input.status === "overdue") {
          try {
            void dispatchWebhookEvent({
              entityId: ctx.entityId!,
              eventType: "invoice.overdue",
              data: {
                invoiceId: updated.id,
                invoiceNumber: updated.invoiceNumber,
                customerId: updated.customerId,
                totalAmount: updated.totalAmount,
                balance: updated.balance,
                dueDate: updated.dueDate,
              },
            });
          } catch (e) {
            logger.error(
              { err: e },
              "Failed to dispatch invoice.overdue webhook",
            );
          }
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
        amount: z.string(),
        paymentDate: z.string(),
        method: z.enum([
          "bank_transfer",
          "cash",
          "mobile_money",
          "check",
          "card",
        ]),
        reference: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const {
          salesInvoiceId,
          amount: paymentAmountStr,
          ...paymentData
        } = input;
        const paymentAmount = parseFloat(paymentAmountStr);

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

        const currentBalance = parseFloat(invoice.balance);
        if (paymentAmount > currentBalance) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Payment amount ${paymentAmountStr} exceeds invoice balance ${invoice.balance}`,
          });
        }

        return await db.transaction(async (tx) => {
          const [payment] = await tx
            .insert(paymentsAr)
            .values({
              ...paymentData,
              entityId: ctx.entityId!,
              salesInvoiceId,
              amount: paymentAmountStr,
            })
            .returning();

          const newBalance = currentBalance - paymentAmount;
          const newPaidAmount = parseFloat(invoice.paidAmount) + paymentAmount;
          const newStatus = newBalance <= 0 ? "paid" : "partial";

          await tx
            .update(salesInvoices)
            .set({
              paidAmount: newPaidAmount.toFixed(2),
              balance: Math.max(newBalance, 0).toFixed(2),
              status: newStatus,
            })
            .where(
              and(
                eq(salesInvoices.id, salesInvoiceId),
                eq(salesInvoices.entityId, ctx.entityId!),
              ),
            );

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "ar.createPayment",
            entityType: "payment_ar",
            entityIdRef: payment.id,
            newValues: {
              salesInvoiceId,
              amount: paymentAmountStr,
              method: input.method,
              reference: input.reference,
            },
          });

          // Send email notification (non-blocking)
          if (invoice) {
            const customer = await tx.query.customers.findFirst({
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
                    amount: paymentAmountStr,
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
                amount: paymentAmountStr,
                method: input.method,
                reference: input.reference,
                newStatus,
              },
            });
          } catch (e) {
            logger.error({ err: e }, "Failed to dispatch invoice.paid webhook");
          }

          return payment;
        });
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

        await db.delete(customers).where(eq(customers.id, input.id));

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

        await db.delete(salesInvoices).where(eq(salesInvoices.id, input.id));

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

        await db.delete(paymentsAr).where(eq(paymentsAr.id, input.id));

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
        .where(eq(customers.id, invoice.customerId))
        .limit(1);

      const customerName = customer?.name ?? "Customer";
      const balance = parseFloat(invoice.balance);
      const due = new Date(invoice.dueDate);
      const daysOverdue = Math.max(
        0,
        Math.floor((Date.now() - due.getTime()) / 86_400_000),
      );
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

      const body = `Hi ${customerName},\n\n${tone.opener}\n\nInvoice: ${invoice.invoiceNumber}\nDue date: ${dueLabel}\nOutstanding balance: GMD ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\n${tone.closing}\n\nBest regards,\nThe Xenboox team`;

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
});
