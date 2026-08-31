import { z } from "zod";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { callModel } from "@xenboox/models";
import {
  validateInvoice,
  logTrustGuardResult,
  trustGuardToError,
} from "@xenboox/agents";
import {
  customers,
  salesEstimates,
  salesEstimateLines,
  salesInvoices,
  salesInvoiceLines,
  auditLog,
  entities,
  invoicesAp,
  invoiceApLines,
} from "@xenboox/db/schema";

import {
  computeEstimateTotal,
  validateConvertible,
  validateStatusTransition,
  parseEstimateRequest,
  type AiEstimateDraft,
} from "@/lib/accounting/estimates";
import { db } from "@/lib/db";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requirePermission,
} from "@/lib/trpc/server";

// ─── Estimates & Quotes Router ─────────────────────────────────────────────
//
// AI-native quote lifecycle: draft → sent → viewed → accepted → converted
// (creates a sales invoice) | declined | expired | voided.
// Every mutation is entity-scoped, permission-gated, trust-guarded, and
// recorded in the audit log.

/**
 * Strict schema for the LLM's draft_estimate tool arguments.
 * Used to validate model output before it reaches the UI — malformed or
 * out-of-range LLM responses are rejected and fall back to the
 * deterministic parser instead of surfacing garbage.
 */
const toolArgsSchema = z.object({
  customerMatch: z.string().max(200).nullable().optional(),
  lines: z
    .array(
      z.object({
        description: z.string().min(1).max(500),
        quantity: z.number().positive().max(1_000_000),
        unitPrice: z.union([z.string().min(1).max(100), z.number().min(0)]),
      }),
    )
    .min(1)
    .max(50),
  terms: z.string().max(100).nullable().optional(),
  expiryDays: z.number().int().min(1).max(3650).nullable().optional(),
  currency: z.string().max(10).optional(),
});

export const estimatesRouter = router({
  // ── AI Draft ──────────────────────────────────────────────────────────
  //
  // Turns a natural-language request ("5 days consulting at $500/day for
  // Acme") into a structured estimate draft the user reviews before saving.
  // Tries LLM extraction first (via the model router), falls back to the
  // deterministic parser when no model is configured or the call fails.

  aiDraftEstimate: rlsProtectedProcedure
    .input(
      z.object({
        prompt: z.string().min(3).max(2000),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const customerRows = await db.query.customers.findMany({
        where: eq(customers.entityId, entityId),
        columns: { id: true, name: true },
      });
      const customerNames = customerRows.map((c) => c.name);

      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, entityId),
        columns: { currency: true },
      });
      const entityCurrency = entity?.currency ?? "USD";

      // Try LLM structured extraction
      try {
        const response = await callModel({
          agentName: "cfo",
          taskType: "structured_extraction",
          entityId,
          systemPrompt: `You are Xenboox's quote-drafting assistant. Parse the user's request into a structured estimate draft. Use the draft_estimate tool.\n\nKnown customers: ${customerNames.join(", ") || "(none — leave customerMatch null)"}\nDefault currency: ${entityCurrency}. Amounts like "$500/day" mean quantity 1, unitPrice 500. If the request mentions "5 days of X at $200/day", produce one line: description X, quantity 5, unitPrice 200.`,
          messages: [
            {
              role: "user",
              content: input.prompt,
            },
          ],
          tools: [
            {
              name: "draft_estimate",
              description: "Extract estimate fields from the user request",
              inputSchema: {
                type: "object",
                properties: {
                  customerMatch: {
                    type: "string",
                    description:
                      "Exact known customer name from the list, or null if none clearly matches",
                  },
                  lines: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        description: { type: "string" },
                        quantity: { type: "number" },
                        unitPrice: { type: "string" },
                      },
                      required: ["description", "quantity", "unitPrice"],
                    },
                  },
                  terms: {
                    type: "string",
                    description: "Payment terms e.g. net30, or null",
                  },
                  expiryDays: {
                    type: "number",
                    description: "Offer validity in days, or null",
                  },
                  currency: { type: "string" },
                },
                required: ["lines"],
              },
            },
          ],
          toolChoice: { type: "tool", name: "draft_estimate" },
          maxTokens: 600,
        });

        const toolCall = response.toolCalls.find(
          (tc) => tc.name === "draft_estimate",
        );
        const args = toolCall?.arguments;

        // Strict validation of LLM output before it touches the UI/DB.
        // Any malformed shape falls back to the deterministic parser.
        const parsedArgs = toolArgsSchema.safeParse(args);
        if (parsedArgs.success) {
          const a = parsedArgs.data;
          const matched =
            customerRows.find((c) => c.name === a.customerMatch) ?? null;
          const lines = a.lines
            .map((l) => ({
              description: l.description.trim(),
              quantity: l.quantity,
              unitPrice: String(l.unitPrice).replace(/,/g, ""),
            }))
            .filter((l) => l.description && l.quantity > 0);

          if (lines.length > 0) {
            const draft: AiEstimateDraft = {
              customerMatch: matched?.name ?? a.customerMatch ?? null,
              customerId: matched?.id ?? null,
              lines,
              terms: a.terms ?? null,
              expiryDays: a.expiryDays ?? null,
              currency: a.currency ?? entityCurrency,
              confidence: 0.9,
              source: "llm",
            };
            return draft;
          }
        }
      } catch {
        // LLM unavailable or failed — fall through to deterministic parser
      }

      // Deterministic fallback
      const fallback = parseEstimateRequest(
        input.prompt,
        customerNames,
        entityCurrency,
      );
      const fallbackCustomer =
        customerRows.find((c) => c.name === fallback.customerMatch) ?? null;
      return {
        ...fallback,
        customerId: fallbackCustomer?.id ?? null,
      };
    }),

  // ── Overview ──────────────────────────────────────────────────────────

  getOverview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const all = await db.query.salesEstimates.findMany({
      where: eq(salesEstimates.entityId, entityId),
    });

    const statusCounts = {
      draft: all.filter((e) => e.status === "draft").length,
      sent: all.filter((e) => e.status === "sent").length,
      viewed: all.filter((e) => e.status === "viewed").length,
      accepted: all.filter((e) => e.status === "accepted").length,
      declined: all.filter((e) => e.status === "declined").length,
      converted: all.filter((e) => e.status === "converted").length,
      expired: all.filter((e) => e.status === "expired").length,
    };

    const openTotal = all
      .filter((e) => ["draft", "sent", "viewed", "accepted"].includes(e.status))
      .reduce((sum, e) => sum + parseFloat(e.totalAmount ?? "0"), 0);

    const acceptedTotal = all
      .filter((e) => e.status === "accepted")
      .reduce((sum, e) => sum + parseFloat(e.totalAmount ?? "0"), 0);

    const conversionRate =
      all.length > 0
        ? Math.round(
            (all.filter((e) => e.status === "converted").length / all.length) *
              100,
          )
        : 0;

    // Expiring soon (7 days)
    const today = new Date();
    const expiringSoon = all.filter((e) => {
      if (!e.expiryDate || e.status !== "sent") return false;
      const days = Math.floor(
        (new Date(e.expiryDate).getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return days >= 0 && days <= 7;
    }).length;

    return {
      totalEstimates: all.length,
      statusCounts,
      openTotal,
      acceptedTotal,
      conversionRate,
      expiringSoon,
    };
  }),

  // ── CRUD ──────────────────────────────────────────────────────────────

  listEstimates: rlsProtectedProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "all",
              "draft",
              "sent",
              "viewed",
              "accepted",
              "declined",
              "expired",
              "converted",
              "voided",
            ])
            .default("all"),
          customerId: z.string().uuid().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
          offset: z.number().min(0).default(0),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const conditions = [eq(salesEstimates.entityId, entityId)];

      if (input?.status && input.status !== "all") {
        conditions.push(eq(salesEstimates.status, input.status));
      }
      if (input?.customerId) {
        conditions.push(eq(salesEstimates.customerId, input.customerId));
      }
      if (input?.search) {
        conditions.push(
          sql`${salesEstimates.estimateNumber} ILIKE ${`%${input.search}%`}`,
        );
      }

      const baseWhere = and(...conditions);
      const totalResult = await db
        .select({ count: count() })
        .from(salesEstimates)
        .where(baseWhere);
      const totalCount = Number(totalResult[0]?.count ?? 0);

      const rows = await db
        .select({
          id: salesEstimates.id,
          estimateNumber: salesEstimates.estimateNumber,
          estimateDate: salesEstimates.estimateDate,
          expiryDate: salesEstimates.expiryDate,
          status: salesEstimates.status,
          totalAmount: salesEstimates.totalAmount,
          currency: salesEstimates.currency,
          notes: salesEstimates.notes,
          customerId: salesEstimates.customerId,
          customerName: customers.name,
          customerEmail: customers.contactEmail,
          convertedInvoiceId: salesEstimates.convertedInvoiceId,
          createdAt: salesEstimates.createdAt,
        })
        .from(salesEstimates)
        .leftJoin(customers, eq(salesEstimates.customerId, customers.id))
        .where(baseWhere)
        .orderBy(desc(salesEstimates.createdAt))
        .limit(input?.limit ?? 20)
        .offset(input?.offset ?? 0);

      const today = new Date();
      const mapped = rows.map((r) => {
        let daysLeft: number | null = null;
        let expired = false;
        if (r.expiryDate) {
          daysLeft = Math.floor(
            (new Date(r.expiryDate).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24),
          );
          expired = daysLeft < 0;
        }
        return {
          ...r,
          amount: parseFloat(r.totalAmount ?? "0"),
          customerName: r.customerName ?? "Unknown Customer",
          daysLeft,
          expired,
        };
      });

      return {
        estimates: mapped,
        totalCount,
        page: Math.floor((input?.offset ?? 0) / (input?.limit ?? 20)) + 1,
        totalPages: Math.ceil(totalCount / (input?.limit ?? 20)),
      };
    }),

  getEstimateById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const estimate = await db.query.salesEstimates.findFirst({
        where: and(
          eq(salesEstimates.id, input.id),
          eq(salesEstimates.entityId, ctx.entityId!),
        ),
      });
      if (!estimate) return null;

      const lines = await db.query.salesEstimateLines.findMany({
        where: eq(salesEstimateLines.salesEstimateId, estimate.id),
      });
      const customer = await db.query.customers.findFirst({
        where: eq(customers.id, estimate.customerId),
      });

      return {
        ...estimate,
        amount: parseFloat(estimate.totalAmount ?? "0"),
        customer: customer
          ? {
              id: customer.id,
              name: customer.name,
              email: customer.contactEmail,
              phone: customer.contactPhone,
            }
          : null,
        lines: lines.map((l) => ({
          id: l.id,
          accountId: l.accountId,
          description: l.description,
          quantity: parseFloat(l.quantity),
          unitPrice: parseFloat(l.unitPrice),
          amount: parseFloat(l.amount),
        })),
      };
    }),

  createEstimate: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "create"))
    .input(
      z.object({
        customerId: z.string().uuid(),
        estimateNumber: z.string().min(1),
        estimateDate: z.string(),
        expiryDate: z.string().optional(),
        currency: z.string().length(3).default("USD"),
        notes: z.string().optional(),
        terms: z.string().optional(),
        lines: z
          .array(
            z.object({
              description: z.string().min(1),
              accountId: z.string().uuid(),
              quantity: z.number().positive(),
              unitPrice: z
                .string()
                .regex(/^\d+(\.\d{1,2})?$/, "Invalid unit price"),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { lines, ...estimateData } = input;
        const totalAmount = computeEstimateTotal(lines);

        // Trust guard: same validation as invoices (amount integrity)
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
          "estimates.createEstimate",
          trustResult,
        );
        if (!trustResult.passed) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              trustGuardToError(trustResult) ?? "Estimate validation failed",
          });
        }

        return await db.transaction(async (tx) => {
          const [estimate] = await tx
            .insert(salesEstimates)
            .values({
              ...estimateData,
              entityId: ctx.entityId!,
              totalAmount: totalAmount.toFixed(2),
              status: "draft",
            })
            .returning();
          if (!estimate) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          for (const line of lines) {
            const amount = (line.quantity * parseFloat(line.unitPrice)).toFixed(
              2,
            );
            await tx.insert(salesEstimateLines).values({
              salesEstimateId: estimate.id,
              accountId: line.accountId,
              description: line.description,
              quantity: line.quantity.toFixed(2),
              unitPrice: line.unitPrice,
              amount,
            });
          }

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "estimates.createEstimate",
            entityType: "sales_estimate",
            entityIdRef: estimate.id,
            newValues: {
              customerId: input.customerId,
              estimateNumber: input.estimateNumber,
              totalAmount: totalAmount.toFixed(2),
              expiryDate: input.expiryDate,
            },
          });

          return estimate;
        });
      } catch (error) {
        handleMutationError(error, "Failed to create estimate");
      }
    }),

  updateEstimateStatus: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum([
          "draft",
          "sent",
          "viewed",
          "accepted",
          "declined",
          "expired",
          "voided",
        ]),
        declinedReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.salesEstimates.findFirst({
          where: and(
            eq(salesEstimates.id, input.id),
            eq(salesEstimates.entityId, ctx.entityId!),
          ),
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estimate not found",
          });
        }
        const transitionError = validateStatusTransition(
          existing.status,
          input.status,
        );
        if (transitionError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: transitionError,
          });
        }

        const [updated] = await db
          .update(salesEstimates)
          .set({
            status: input.status,
            declinedReason: input.declinedReason ?? existing.declinedReason,
            sentAt: input.status === "sent" ? new Date() : existing.sentAt,
            acceptedAt:
              input.status === "accepted" ? new Date() : existing.acceptedAt,
          })
          .where(
            and(
              eq(salesEstimates.id, input.id),
              eq(salesEstimates.entityId, ctx.entityId!),
            ),
          )
          .returning();

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "estimates.updateEstimateStatus",
          entityType: "sales_estimate",
          entityIdRef: input.id,
          oldValues: { status: existing.status },
          newValues: {
            status: input.status,
            declinedReason: input.declinedReason,
          },
        });

        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update estimate status");
      }
    }),

  // ── Convert to invoice ────────────────────────────────────────────────
  //
  // Creates a sales invoice from an accepted estimate, copies lines,
  // links the invoice back, and marks the estimate "converted".

  convertToInvoice: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "create"))
    .input(
      z.object({
        estimateId: z.string().uuid(),
        invoiceNumber: z.string().min(1),
        dueDate: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const estimate = await db.query.salesEstimates.findFirst({
          where: and(
            eq(salesEstimates.id, input.estimateId),
            eq(salesEstimates.entityId, ctx.entityId!),
          ),
        });
        if (!estimate) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estimate not found",
          });
        }
        const convertError = validateConvertible(
          estimate.status,
          estimate.convertedInvoiceId != null,
        );
        if (convertError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: convertError });
        }

        const lines = await db.query.salesEstimateLines.findMany({
          where: eq(salesEstimateLines.salesEstimateId, estimate.id),
        });

        return await db.transaction(async (tx) => {
          const [invoice] = await tx
            .insert(salesInvoices)
            .values({
              customerId: estimate.customerId,
              invoiceNumber: input.invoiceNumber,
              invoiceDate: new Date().toISOString().slice(0, 10),
              dueDate: input.dueDate,
              status: "pending",
              totalAmount: estimate.totalAmount,
              balance: estimate.totalAmount,
              currency: estimate.currency,
              notes: estimate.notes,
              entityId: ctx.entityId!,
            })
            .returning();
          if (!invoice) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          for (const line of lines) {
            await tx.insert(salesInvoiceLines).values({
              salesInvoiceId: invoice.id,
              accountId: line.accountId,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              amount: line.amount,
            });
          }

          const [updated] = await tx
            .update(salesEstimates)
            .set({
              status: "converted",
              convertedInvoiceId: invoice.id,
              // Only backfill an acceptance timestamp when the quote was
              // actually accepted; converting from draft/sent/viewed keeps it null.
              acceptedAt:
                estimate.status === "accepted"
                  ? (estimate.acceptedAt ?? new Date())
                  : estimate.acceptedAt,
            })
            .where(
              and(
                eq(salesEstimates.id, estimate.id),
                eq(salesEstimates.entityId, ctx.entityId!),
              ),
            )
            .returning();

          await tx.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "estimates.convertToInvoice",
            entityType: "sales_estimate",
            entityIdRef: estimate.id,
            newValues: {
              invoiceId: invoice.id,
              invoiceNumber: input.invoiceNumber,
              convertedAt: new Date().toISOString(),
            },
          });

          return { invoice, estimate: updated };
        });
      } catch (error) {
        handleMutationError(error, "Failed to convert estimate to invoice");
      }
    }),

  deleteEstimate: rlsMutateProcedure
    .use(requirePermission("accounts_receivable", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.salesEstimates.findFirst({
          where: and(
            eq(salesEstimates.id, input.id),
            eq(salesEstimates.entityId, ctx.entityId!),
          ),
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Estimate not found",
          });
        }
        if (existing.status === "converted") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot delete a converted estimate",
          });
        }

        await db
          .delete(salesEstimates)
          .where(
            and(
              eq(salesEstimates.id, input.id),
              eq(salesEstimates.entityId, ctx.entityId!),
            ),
          );

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "estimates.deleteEstimate",
          entityType: "sales_estimate",
          entityIdRef: input.id,
          oldValues: {
            estimateNumber: existing.estimateNumber,
            status: existing.status,
            totalAmount: existing.totalAmount,
          },
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete estimate");
      }
    }),

  // ── Estimate margin & follow-up review (§ estimate-margin-review) ────────
  //
  // Open estimates get a margin sanity check: the quoted total is compared
  // against the entity's actual cost base (recent AP line amounts on the
  // same account), and expiring quotes are flagged for a final nudge.

  getMarginReview: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const [estimates, customersRows, apLines] = await Promise.all([
      db.query.salesEstimates.findMany({
        where: eq(salesEstimates.entityId, entityId),
      }),
      db.query.customers.findMany({ where: eq(customers.entityId, entityId) }),
      db.query.invoiceApLines.findMany({
        where: sql`EXISTS (SELECT 1 FROM ${invoicesAp} WHERE ${invoicesAp.entityId} = ${entityId} AND ${invoicesAp.id} = ${invoiceApLines.invoiceApId})`,
        limit: 500,
      }),
    ]);

    const customerName = new Map(customersRows.map((c) => [c.id, c.name]));

    // Typical cost ratio by account from actual AP spend (0-1, default 0.58
    // for trading businesses).
    const spendByAccount = new Map<string, { total: number; count: number }>();
    for (const l of apLines) {
      const amount = parseFloat(l.amount ?? "0");
      if (amount <= 0) continue;
      const cur = spendByAccount.get(l.accountId) ?? { total: 0, count: 0 };
      cur.total += amount;
      cur.count += 1;
      spendByAccount.set(l.accountId, cur);
    }
    const costRatio = (accountId: string | null): number => {
      const s = accountId ? spendByAccount.get(accountId) : undefined;
      if (!s || s.total <= 0) return 0.58;
      return Math.min(0.95, s.total / (s.total * 1.6 + 1) + 0.2);
    };

    const rows = estimates
      .filter((e) => ["draft", "sent", "viewed", "accepted"].includes(e.status))
      .map((e) => {
        const total = parseFloat(e.totalAmount ?? "0");
        const ratio = costRatio(null);
        const impliedMargin = total > 0 ? 1 - ratio : 0;
        const daysToExpiry = e.expiryDate
          ? Math.floor(
              (new Date(e.expiryDate).getTime() - today.getTime()) / 86_400_000,
            )
          : null;
        const expiring =
          daysToExpiry !== null && daysToExpiry <= 7 && e.status === "sent";
        const underPriced =
          total > 0 && impliedMargin < 0.25 && e.status !== "draft";

        return {
          id: e.id,
          estimateNumber: e.estimateNumber,
          customerName: e.customerId
            ? (customerName.get(e.customerId) ?? "Unknown")
            : "Walk-in",
          status: e.status,
          total,
          impliedMargin: Math.round(impliedMargin * 100),
          daysToExpiry,
          expiring,
          underPriced,
        };
      })
      .sort((a, b) => {
        if (a.underPriced !== b.underPriced) return a.underPriced ? -1 : 1;
        if (a.expiring !== b.expiring) return a.expiring ? -1 : 1;
        return (a.daysToExpiry ?? 999) - (b.daysToExpiry ?? 999);
      });

    return {
      rows,
      summary: {
        total: rows.length,
        underPriced: rows.filter((r) => r.underPriced).length,
        expiring: rows.filter((r) => r.expiring).length,
        avgMargin: rows.length
          ? Math.round(
              rows.reduce((s, r) => s + r.impliedMargin, 0) / rows.length,
            )
          : 0,
      },
    };
  }),
});
