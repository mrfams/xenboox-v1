import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import {
  expenseClaims,
  claimLineItems,
  policyRules,
  approvalRecords,
  reimbursementRecords,
} from "@xenboox/db/schema/expense";
import { runExpensePipeline, getExpenseStatus } from "@xenboox/agents";
import type { ClaimSource } from "@xenboox/agents";
import {
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "../../lib/trpc/server";
import { entities } from "@xenboox/db/schema/organization";

// ─── Expense Router ─────────────────────────────────────────────────────

export const expenseRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        claimNumber: z.string().min(1),
        claimantId: z.string().min(1),
        claimantName: z.string().optional(),
        department: z.string().optional(),
        category: z.string().min(1),
        description: z.string().min(1),
        totalAmount: z.number().min(0),
        currency: z.string().default("GMD"),
        source: z.enum(["mobile", "web", "agent"]).default("web"),
        lineItems: z
          .array(
            z.object({
              category: z.string().min(1),
              description: z.string().min(1),
              amount: z.number().min(0),
              taxAmount: z.number().optional(),
              receiptDocumentRef: z.string().optional(),
              ocrConfidence: z.number().min(0).max(1).optional(),
            }),
          )
          .min(1),
        autoApproveUnderAmount: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityCtx = await db.query.entities.findFirst({
        where: eq(entities.id, ctx.entityId!),
      });

      if (!entityCtx) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
      }

      try {
        const result = await runExpensePipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.name ?? "Entity",
          currency: input.currency,
          claim: {
            id: crypto.randomUUID(),
            claimNumber: input.claimNumber,
            claimantId: input.claimantId,
            claimantName: input.claimantName ?? "",
            department: input.department ?? "general",
            category: input.category,
            description: input.description,
            totalAmount: input.totalAmount,
            currency: input.currency,
            status: "submitted",
            source: input.source,
            lineItems: input.lineItems.map((li) => ({
              category: li.category,
              description: li.description,
              amount: li.amount,
              taxAmount: li.taxAmount,
              receiptDocumentRef: li.receiptDocumentRef,
              ocrConfidence: li.ocrConfidence,
            })),
            submittedAt: new Date().toISOString(),
          },
          userId: ctx.session!.user!.id!,
          autoApproveUnderAmount: input.autoApproveUnderAmount,
        });

        return {
          success: result.success,
          claimId: result.claimId,
          claimNumber: result.claimNumber,
          status: result.status,
          totalAmount: result.totalAmount,
          overallConfidence: result.overallConfidence,
          escalated: result.escalated,
          flagged: result.status === "flagged",
          autoApproved: result.approvalRecord?.approverId === "system-auto",
          policyFlags: result.policyResults.filter((r) => r.flagged).length,
          flagReasons: result.policyResults
            .filter((r) => r.flagged)
            .map((r) => r.flagReason)
            .filter(Boolean),
          approvalRouting: result.approvalRouting
            ? {
                approverName: result.approvalRouting.approverName,
                department: result.approvalRouting.department,
                level: result.approvalRouting.level,
              }
            : null,
          budgetImpact: result.budgetImpact
            ? {
                available: result.budgetImpact.available,
                remaining: result.budgetImpact.remainingAmount,
              }
            : null,
          reimbursement: result.reimbursement,
          stepsCompleted: result.steps.filter((s) =>
            ["completed", "skipped", "flagged"].includes(s.status),
          ).length,
          totalSteps: result.steps.length,
          stepDetails: result.steps.map((s) => ({
            id: s.id,
            label: s.label,
            status: s.status,
            agent: s.agent,
          })),
          errors: result.errors,
          warnings: result.warnings,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Expense pipeline failed: ${msg}`,
        });
      }
    }),

  // ── Pipeline Status ─────────────────────────────────────────────────

  getStatus: protectedProcedure
    .input(
      z
        .object({
          claimId: z.string().optional(),
          claimantId: z.string().optional(),
          status: z
            .enum([
              "draft",
              "submitted",
              "flagged",
              "approved",
              "rejected",
              "reimbursed",
              "voided",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getExpenseStatus({
        entityId: ctx.entityId!,
        claimId: input?.claimId,
        claimantId: input?.claimantId,
        status: input?.status,
      });
    }),

  // ── Claims List ─────────────────────────────────────────────────────

  listClaims: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum([
              "draft",
              "submitted",
              "flagged",
              "approved",
              "rejected",
              "reimbursed",
              "voided",
            ])
            .optional(),
          claimantId: z.string().optional(),
          category: z.string().optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(expenseClaims.entityId, ctx.entityId!)];
      if (input?.status) where.push(eq(expenseClaims.status, input.status));
      if (input?.claimantId)
        where.push(eq(expenseClaims.claimantId, input.claimantId));
      if (input?.category)
        where.push(eq(expenseClaims.category, input.category));

      return db.query.expenseClaims.findMany({
        where: and(...where),
        orderBy: [desc(expenseClaims.createdAt)],
        limit: input?.limit ?? 20,
      });
    }),

  // ── Claim Detail ────────────────────────────────────────────────────

  getClaim: protectedProcedure
    .input(z.object({ claimId: z.string() }))
    .query(async ({ ctx, input }) => {
      const claim = await db.query.expenseClaims.findFirst({
        where: and(
          eq(expenseClaims.id, input.claimId),
          eq(expenseClaims.entityId, ctx.entityId!),
        ),
      });

      if (!claim) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      }

      const [lineItems, approvals, reimbursements] = await Promise.all([
        db.query.claimLineItems.findMany({
          where: eq(claimLineItems.claimId, input.claimId),
        }),
        db.query.approvalRecords.findMany({
          where: eq(approvalRecords.claimId, input.claimId),
          orderBy: [desc(approvalRecords.createdAt)],
        }),
        db.query.reimbursementRecords.findMany({
          where: eq(reimbursementRecords.claimId, input.claimId),
          orderBy: [desc(reimbursementRecords.createdAt)],
        }),
      ]);

      return { claim, lineItems, approvals, reimbursements };
    }),

  // ── Approve/Reject Claim ────────────────────────────────────────────

  approveClaim: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director", "manager"))
    .input(
      z.object({
        claimId: z.string(),
        decision: z.enum(["approved", "rejected"]),
        note: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const claim = await db.query.expenseClaims.findFirst({
        where: and(
          eq(expenseClaims.id, input.claimId),
          eq(expenseClaims.entityId, ctx.entityId!),
        ),
      });

      if (!claim) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Claim not found" });
      }

      if (claim.status !== "flagged" && claim.status !== "submitted") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Claim is already ${claim.status}. Only flagged or submitted claims can be approved/rejected.`,
        });
      }

      // Insert approval record
      await db.insert(approvalRecords).values({
        entityId: ctx.entityId!,
        claimId: input.claimId,
        approverId: ctx.session!.user!.id!,
        approverName: ctx.session!.user!.name ?? "Manager",
        decision: input.decision,
        decidedAt: new Date(),
        note: input.note,
        escalationLevel: 1,
      });

      // Update claim status
      await db
        .update(expenseClaims)
        .set({
          status: input.decision === "approved" ? "approved" : "rejected",
          approvedById: ctx.session!.user!.id!,
          approvedAt: new Date(),
        })
        .where(eq(expenseClaims.id, input.claimId));

      return {
        success: true,
        claimId: input.claimId,
        decision: input.decision,
      };
    }),

  // ── Policy Rules ────────────────────────────────────────────────────

  listPolicyRules: protectedProcedure.query(async ({ ctx }) => {
    return db.query.policyRules.findMany({
      where: eq(policyRules.entityId, ctx.entityId!),
      orderBy: [desc(policyRules.createdAt)],
    });
  }),

  createPolicyRule: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        category: z.string().min(1),
        role: z.string().default("employee"),
        limitAmount: z.number().min(0),
        requiresApprovalAbove: z.number().optional(),
        requiresReceiptAbove: z.number().optional(),
        maxPerMonth: z.number().optional(),
        allowedCurrencies: z.array(z.string()).optional(),
        effectiveFrom: z.string().optional(),
        effectiveTo: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [rule] = await db
        .insert(policyRules)
        .values({
          entityId: ctx.entityId!,
          category: input.category,
          role: input.role,
          limitAmount: String(input.limitAmount),
          requiresApprovalAbove: input.requiresApprovalAbove
            ? String(input.requiresApprovalAbove)
            : null,
          requiresReceiptAbove: input.requiresReceiptAbove
            ? String(input.requiresReceiptAbove)
            : null,
          maxPerMonth: input.maxPerMonth ? String(input.maxPerMonth) : null,
          allowedCurrencies: input.allowedCurrencies,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo,
          description: input.description,
        })
        .returning();

      return rule;
    }),

  // ── Reimbursement Records ───────────────────────────────────────────

  listReimbursements: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["scheduled", "processing", "paid", "failed", "cancelled"])
            .optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(reimbursementRecords.entityId, ctx.entityId!)];
      if (input?.status)
        where.push(eq(reimbursementRecords.status, input.status));

      return db.query.reimbursementRecords.findMany({
        where: and(...where),
        orderBy: [desc(reimbursementRecords.createdAt)],
        limit: input?.limit ?? 20,
      });
    }),
});
