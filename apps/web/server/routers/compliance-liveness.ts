import { z } from "zod";
import { db } from "@xenboox/db";
import { eq, and, desc, asc } from "drizzle-orm";
import {
  complianceDeadlines,
  ruleChangeProposals,
} from "@xenboox/db/schema/tax-compliance";
import {
  monitorDeadlines,
  detectRuleChanges,
  confirmRuleUpdate,
  reviewTaxAgentOutput,
  reportRegulatoryStatus,
} from "@xenboox/agents";
import {
  router,
  rlsProtectedProcedure,
  requireRole,
} from "../../lib/trpc/server";

export const complianceLivenessRouter = router({
  listDeadlines: rlsProtectedProcedure
    .input(
      z
        .object({
          jurisdiction: z.string().optional(),
          urgency: z
            .enum(["normal", "approaching", "critical", "overdue"])
            .optional(),
          status: z.enum(["filed", "pending", "overdue", "waived"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(complianceDeadlines.entityId, ctx.entityId!)];
      if (input?.jurisdiction)
        where.push(eq(complianceDeadlines.jurisdiction, input.jurisdiction));
      if (input?.status)
        where.push(eq(complianceDeadlines.status, input.status));

      const rows = await db.query.complianceDeadlines.findMany({
        where: and(...where),
        orderBy: [asc(complianceDeadlines.dueDate)],
      });

      const now = new Date();
      return rows.map((r) => {
        const due = new Date(r.dueDate);
        const daysUntilDue = Math.ceil(
          (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        let urgency: "normal" | "approaching" | "critical" | "overdue" =
          "normal";
        if (daysUntilDue <= 0) urgency = "overdue";
        else if (daysUntilDue <= 7) urgency = "critical";
        else if (daysUntilDue <= 14) urgency = "approaching";

        return {
          id: r.id,
          name: r.name,
          jurisdiction: r.jurisdiction,
          filingType: r.filingType,
          dueDate: r.dueDate.toISOString(),
          daysUntilDue,
          urgency,
          status: r.status,
          packageReady: r.packageReady,
          taxAgentReviewStatus: r.taxAgentReviewStatus,
          regulatoryStatus: r.regulatoryStatus,
          estimatedAmount: r.estimatedAmount?.toString() ?? null,
        };
      });
    }),

  getDeadlineStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const where = eq(complianceDeadlines.entityId, ctx.entityId!);
    const all = await db.query.complianceDeadlines.findMany({ where });

    const now = new Date();
    let normal = 0;
    let approaching = 0;
    let critical = 0;
    let overdue = 0;

    for (const d of all) {
      const due = new Date(d.dueDate);
      const days = Math.ceil(
        (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (days <= 0) overdue++;
      else if (days <= 7) critical++;
      else if (days <= 14) approaching++;
      else normal++;
    }

    return {
      total: all.length,
      normal,
      approaching,
      critical,
      overdue,
      clean: all.filter((d) => d.regulatoryStatus === "clean").length,
      itemsPending: all.filter(
        (d) =>
          d.regulatoryStatus === "items_pending" ||
          d.regulatoryStatus === "risk_detected",
      ).length,
    };
  }),

  runDeadlineMonitor: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .query(async ({ ctx }) => {
      return monitorDeadlines(ctx.entityId!);
    }),

  reviewTaxAgent: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ deadlineId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return reviewTaxAgentOutput(ctx.entityId!, input.deadlineId);
    }),

  listRuleChangeProposals: rlsProtectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["pending", "confirmed", "applied", "rejected"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(ruleChangeProposals.entityId, ctx.entityId!)];
      if (input?.status)
        where.push(eq(ruleChangeProposals.status, input.status));

      const rows = await db.query.ruleChangeProposals.findMany({
        where: and(...where),
        orderBy: [desc(ruleChangeProposals.detectedAt)],
      });

      return rows.map((r) => ({
        id: r.id,
        jurisdiction: r.jurisdiction,
        ruleType: r.ruleType,
        ruleName: r.ruleName,
        detectedAt: r.detectedAt.toISOString(),
        sourceCitation: r.sourceCitation,
        sourceUrl: r.sourceUrl,
        sourceConfidence: r.sourceConfidence
          ? Number(r.sourceConfidence)
          : null,
        oldValue: r.oldValue,
        newValue: r.newValue,
        effectiveDate: r.effectiveDate?.toISOString() ?? null,
        status: r.status,
        confirmedBy: r.confirmedBy,
        confirmedAt: r.confirmedAt?.toISOString() ?? null,
      }));
    }),

  detectRuleChanges: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .query(async ({ ctx }) => {
      return detectRuleChanges(ctx.entityId!);
    }),

  confirmRuleChange: rlsProtectedProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        proposalId: z.string().uuid(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return confirmRuleUpdate(input.proposalId, input.userId);
    }),

  getRegulatoryStatus: rlsProtectedProcedure.query(async ({ ctx }) => {
    return reportRegulatoryStatus(ctx.entityId!);
  }),

  proposeRuleChange: rlsProtectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        jurisdiction: z.string(),
        ruleType: z.enum(["vat", "paye", "withholding", "corporate"]),
        ruleName: z.string(),
        sourceCitation: z.string().optional(),
        sourceUrl: z.string().optional(),
        sourceConfidence: z.number().min(0).max(1).optional(),
        oldValue: z.record(z.unknown()).optional(),
        newValue: z.record(z.unknown()),
        effectiveDate: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [proposal] = await db
        .insert(ruleChangeProposals)
        .values({
          entityId: ctx.entityId!,
          jurisdiction: input.jurisdiction,
          ruleType: input.ruleType,
          ruleName: input.ruleName,
          sourceCitation: input.sourceCitation,
          sourceUrl: input.sourceUrl,
          sourceConfidence: input.sourceConfidence
            ? String(input.sourceConfidence)
            : null,
          oldValue: input.oldValue ?? null,
          newValue: input.newValue,
          effectiveDate: input.effectiveDate
            ? new Date(input.effectiveDate)
            : null,
          status: "pending",
          detectedBy: ctx.session?.user?.id ?? "unknown",
        })
        .returning();

      return proposal;
    }),
});
