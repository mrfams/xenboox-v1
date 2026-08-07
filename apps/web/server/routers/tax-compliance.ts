import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@xenboox/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  jurisdictionTaxRules,
  vatCalculations,
  withholdingRecords,
  filingDeadlines,
  taxPackages,
} from "@xenboox/db/schema/tax-compliance";
import {
  runTaxCompliancePipeline,
  getTaxComplianceStatus,
} from "@xenboox/agents";
import { aggregate1099 } from "@/lib/accounting/estimates";
import { entities } from "@xenboox/db/schema/organization";

import { router, protectedProcedure, requireRole } from "../../lib/trpc/server";

// ─── Tax & Compliance Router ────────────────────────────────────────────

export const taxComplianceRouter = router({
  // ── Pipeline Execution ──────────────────────────────────────────────

  runPipeline: protectedProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        triggerSource: z
          .enum(["manual", "scheduled", "agent"])
          .default("manual"),
        jurisdictions: z
          .array(z.enum(["GM", "SN", "GH", "NG", "KE", "US"]))
          .optional(),
        includeCorporateTax: z.boolean().optional(),
        simulateRules: z.boolean().optional(),
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
        const result = await runTaxCompliancePipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.name ?? "Entity",
          currency: entityCtx.currency ?? "GMD",
          period: input.period,
          userId: ctx.session!.user!.id!,
          triggerSource: input.triggerSource,
          jurisdictions: input.jurisdictions,
          includeCorporateTax: input.includeCorporateTax,
          simulateRules: input.simulateRules,
        });

        return {
          success: result.success,
          status: result.status,
          period: result.period,
          overallConfidence: result.overallConfidence,
          escalated: result.escalated,
          escalationReason: result.escalationReason,
          complianceApproved: result.complianceApproved,
          vatNetPosition: result.vatCalculation?.netPosition ?? 0,
          withholdingTotal: result.withholdingSummary?.totalWithheld ?? 0,
          payeTotal: result.payeFiling?.totalPaye ?? 0,
          corporateTaxLiability:
            result.corporateTax?.estimatedTaxLiability ?? 0,
          regulatoryRisks: result.regulatoryRisks.length,
          stepsCompleted: result.steps.filter((s) =>
            ["completed", "skipped", "escalated"].includes(s.status),
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
          message: `Tax compliance pipeline failed: ${msg}`,
        });
      }
    }),

  // ── Pipeline Status ─────────────────────────────────────────────────

  getStatus: protectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getTaxComplianceStatus({
        entityId: ctx.entityId!,
        period: input?.period,
      });
    }),

  // ── VAT Calculations ────────────────────────────────────────────────

  listVatCalculations: protectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(vatCalculations.entityId, ctx.entityId!)];
      if (input?.period) where.push(eq(vatCalculations.period, input.period));

      return db.query.vatCalculations.findMany({
        where: and(...where),
        orderBy: [desc(vatCalculations.createdAt)],
        limit: input?.limit ?? 20,
      });
    }),

  // ── Withholding Records ─────────────────────────────────────────────

  listWithholdingRecords: protectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
          limit: z.number().min(1).max(100).default(20),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(withholdingRecords.entityId, ctx.entityId!)];
      if (input?.period)
        where.push(eq(withholdingRecords.period, input.period));

      return db.query.withholdingRecords.findMany({
        where: and(...where),
        orderBy: [desc(withholdingRecords.createdAt)],
        limit: input?.limit ?? 20,
      });
    }),

  // ── Filing Deadlines ────────────────────────────────────────────────

  listFilingDeadlines: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "filed", "overdue", "waived"]).optional(),
          jurisdiction: z.enum(["GM", "SN", "GH", "NG", "KE", "US"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(filingDeadlines.entityId, ctx.entityId!)];
      if (input?.status) where.push(eq(filingDeadlines.status, input.status));
      if (input?.jurisdiction)
        where.push(eq(filingDeadlines.jurisdiction, input.jurisdiction));

      return db.query.filingDeadlines.findMany({
        where: and(...where),
        orderBy: [desc(filingDeadlines.dueDate)],
        limit: 50,
      });
    }),

  // ── Tax Rules ──────────────────────────────────────────────────────

  listTaxRules: protectedProcedure
    .input(
      z
        .object({
          country: z.enum(["GM", "SN", "GH", "NG", "KE", "US"]).optional(),
          ruleType: z
            .enum(["vat", "paye", "withholding", "corporate"])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(jurisdictionTaxRules.entityId, ctx.entityId!)];
      if (input?.country)
        where.push(eq(jurisdictionTaxRules.country, input.country));
      if (input?.ruleType)
        where.push(eq(jurisdictionTaxRules.ruleType, input.ruleType));

      return db.query.jurisdictionTaxRules.findMany({
        where: and(...where),
        orderBy: [desc(jurisdictionTaxRules.createdAt)],
      });
    }),

  // ── 1099 Contractor Summary (US) ────────────────────────────────────
  //
  // Aggregates annual payments to US contractors from withholding records
  // and vendors with 1099 eligibility. Powers the 1099-NEC/1099-MISC
  // preparation surface (filing threshold: $600).

  list1099Summary: protectedProcedure
    .input(
      z
        .object({
          year: z
            .string()
            .regex(/^\d{4}$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const year = input?.year ?? String(new Date().getFullYear());
      const where = [eq(withholdingRecords.entityId, ctx.entityId!)];
      where.push(
        sql`${withholdingRecords.jurisdiction} = 'US'`,
        sql`extract(year from ${withholdingRecords.createdAt}) = ${year}`,
      );

      const records = await db.query.withholdingRecords.findMany({
        where: and(...where),
      });

      // Aggregate per payee (pure logic — unit tested)
      const contractors = aggregate1099(records);

      return {
        year,
        contractors,
        totalContractors: contractors.length,
        totalPayments: contractors.reduce((s, c) => s + c.totalPayments, 0),
        totalWithheld: contractors.reduce((s, c) => s + c.totalWithheld, 0),
        formsRequired: contractors.filter((c) => c.thresholdMet).length,
      };
    }),

  // ── Tax Packages ──────────────────────────────────────────────────

  listTaxPackages: protectedProcedure
    .input(
      z
        .object({
          packageType: z.enum(["vat", "paye", "corporate"]).optional(),
          period: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(taxPackages.entityId, ctx.entityId!)];
      if (input?.packageType)
        where.push(eq(taxPackages.packageType, input.packageType));
      if (input?.period) where.push(eq(taxPackages.period, input.period));

      return db.query.taxPackages.findMany({
        where: and(...where),
        orderBy: [desc(taxPackages.createdAt)],
      });
    }),
});
