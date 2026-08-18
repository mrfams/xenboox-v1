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
import { entities } from "@xenboox/db/schema/organization";

import { router, protectedProcedure, requireRole } from "../../lib/trpc/server";

import { aggregate1099 } from "@/lib/accounting/estimates";

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

  // ── VAT / Sales-Tax Compliance Flags ───────────────────────────────
  //
  // Deterministic compliance signals computed from the entity's own VAT
  // calculations and filing deadlines: overdue / due-soon filings, unfiled
  // calculations, large net-position swings period-over-period, and
  // refundable positions awaiting review. No LLM — every flag traces to
  // a specific record.

  getComplianceSignals: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const signals: Array<{
      id: string;
      severity: "high" | "medium" | "low";
      category: string;
      title: string;
      description: string;
      period?: string;
      dueDate?: string;
      amount?: number;
    }> = [];

    const deadlines = await db.query.filingDeadlines.findMany({
      where: and(
        eq(filingDeadlines.entityId, entityId),
        sql`${filingDeadlines.status} IN ('pending', 'overdue')`,
      ),
      orderBy: [desc(filingDeadlines.dueDate)],
    });

    const vatCalcs = await db.query.vatCalculations.findMany({
      where: eq(vatCalculations.entityId, entityId),
      orderBy: [desc(vatCalculations.period)],
    });

    // ── Overdue filings ────────────────────────────────────────────────
    for (const d of deadlines) {
      if (d.dueDate < todayStr && d.status !== "waived") {
        signals.push({
          id: `overdue-${d.id}`,
          severity: "high",
          category: "Overdue filing",
          title: `${d.name} is overdue`,
          description: `Due ${d.dueDate} — file immediately to avoid penalties${d.estimatedAmount ? ` (estimated GMD ${Number(d.estimatedAmount).toLocaleString("en-US", { maximumFractionDigits: 2 })})` : ""}.`,
          period: d.period ?? undefined,
          dueDate: d.dueDate,
          amount: d.estimatedAmount ? Number(d.estimatedAmount) : undefined,
        });
      }
    }

    // ── Due within 7 days ──────────────────────────────────────────────
    const soon = new Date();
    soon.setDate(soon.getDate() + 7);
    const soonStr = `${soon.getFullYear()}-${String(soon.getMonth() + 1).padStart(2, "0")}-${String(soon.getDate()).padStart(2, "0")}`;
    for (const d of deadlines) {
      if (d.dueDate >= todayStr && d.dueDate <= soonStr) {
        signals.push({
          id: `due-${d.id}`,
          severity: "medium",
          category: "Due soon",
          title: `${d.name} is due ${d.dueDate}`,
          description: `Filing window closes in ${Math.max(1, Math.round((new Date(d.dueDate).getTime() - today.getTime()) / 86_400_000))} day(s). Prepare the return now.`,
          period: d.period ?? undefined,
          dueDate: d.dueDate,
        });
      }
    }

    // ── Unfiled VAT calculations for past periods ──────────────────────
    const pastMonths = new Set<string>();
    for (let i = 1; i <= 3; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      pastMonths.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      );
    }
    for (const c of vatCalcs) {
      if (pastMonths.has(c.period) && !c.filedAt && c.status !== "filed") {
        const net = Number(c.netPosition);
        signals.push({
          id: `unfiled-${c.id}`,
          severity: "high",
          category: "Unfiled calculation",
          title: `VAT for ${c.period} is calculated but not filed`,
          description: `Net position GMD ${Math.abs(net).toLocaleString("en-US", { maximumFractionDigits: 2 })} (${net >= 0 ? "payable" : "refundable"}) — submit the return to close the period.`,
          period: c.period,
          amount: net,
        });
      }
    }

    // ── Large net-position swings period-over-period ───────────────────
    const sorted = [...vatCalcs].sort((a, b) => (a.period < b.period ? 1 : -1));
    for (let i = 0; i < sorted.length - 1; i++) {
      const cur = Number(sorted[i].netPosition);
      const prev = Number(sorted[i + 1].netPosition);
      if (Math.abs(prev) < 1) continue;
      const pct = ((cur - prev) / Math.abs(prev)) * 100;
      if (Math.abs(pct) >= 50) {
        signals.push({
          id: `swing-${sorted[i].id}`,
          severity: "medium",
          category: "Position swing",
          title: `VAT net position swung ${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% in ${sorted[i].period}`,
          description: `Net position moved from GMD ${Math.abs(prev).toLocaleString("en-US", { maximumFractionDigits: 2 })} to GMD ${Math.abs(cur).toLocaleString("en-US", { maximumFractionDigits: 2 })} — confirm the drivers (large purchases, refunds, or misclassified input tax).`,
          period: sorted[i].period,
          amount: cur,
        });
      }
    }

    // ── Refundable positions awaiting review ───────────────────────────
    for (const c of vatCalcs) {
      const net = Number(c.netPosition);
      if (net < -5_000 && !c.filedAt) {
        signals.push({
          id: `refund-${c.id}`,
          severity: "low",
          category: "Refundable position",
          title: `Refundable VAT of GMD ${Math.abs(net).toLocaleString("en-US", { maximumFractionDigits: 2 })} for ${c.period}`,
          description:
            "Input VAT exceeds output VAT. File the return to claim the refund or carry it forward.",
          period: c.period,
          amount: net,
        });
      }
    }

    const order = { high: 0, medium: 1, low: 2 } as const;
    signals.sort((a, b) => {
      const sev = order[a.severity] - order[b.severity];
      if (sev !== 0) return sev;
      const da = a.dueDate ?? "";
      const db_ = b.dueDate ?? "";
      return da.localeCompare(db_);
    });

    return {
      signals: signals.slice(0, 25),
      summary: {
        high: signals.filter((s) => s.severity === "high").length,
        medium: signals.filter((s) => s.severity === "medium").length,
        low: signals.filter((s) => s.severity === "low").length,
      },
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

  // ── Tax deduction discovery (§ deduction-discovery) ──────────────────────
  //
  // Continuously scans for missed deductions and tax-saving opportunities:
  //   1. WHT paid but never filed/recovered
  //   2. VAT refundable positions never claimed
  //   3. Unfiled VAT returns (deduction left on the table)
  //   4. Estimated-vs-actual liability drift worth reconciling
  // Every item traces to the exact record behind it.

  getDeductionDiscovery: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const opportunities: Array<{
      id: string;
      type:
        | "wht_recovery"
        | "vat_refund"
        | "unfiled_return"
        | "liability_review";
      title: string;
      description: string;
      estimatedSavings: number;
      period?: string;
      reference?: string;
      confidence: number;
    }> = [];

    // ── 1. WHT paid but not filed (recoverable credit) ───────────────────
    const wht = await db.query.withholdingRecords.findMany({
      where: eq(withholdingRecords.entityId, entityId),
    });
    for (const w of wht) {
      if (!w.filed) {
        opportunities.push({
          id: `wht-${w.id}`,
          type: "wht_recovery",
          title: `WHT credit of GMD ${Number(w.taxWithheld).toLocaleString("en-US", { maximumFractionDigits: 2 })} not yet recovered`,
          description: `Withholding tax on ${w.payeeName} (${w.period}) has not been filed — filing it claims the credit against your liability.`,
          estimatedSavings: Number(w.taxWithheld),
          period: w.period,
          confidence: 0.9,
        });
      }
    }

    // ── 2. Refundable VAT never claimed ──────────────────────────────────
    const vats = await db.query.vatCalculations.findMany({
      where: eq(vatCalculations.entityId, entityId),
    });
    for (const c of vats) {
      const net = Number(c.netPosition);
      if (net < 0 && !c.filedAt && c.status !== "filed") {
        opportunities.push({
          id: `vat-refund-${c.id}`,
          type: "vat_refund",
          title: `Refundable VAT of GMD ${Math.abs(net).toLocaleString("en-US", { maximumFractionDigits: 2 })} for ${c.period}`,
          description:
            "Input VAT exceeds output VAT. Filing the return claims the refund or carry-forward — otherwise the credit expires.",
          estimatedSavings: Math.abs(net),
          period: c.period,
          confidence: 0.85,
        });
      }
    }

    // ── 3. VAT calculated but never filed (deduction left behind) ────────
    for (const c of vats) {
      if (c.status === "calculated" && !c.filedAt) {
        const net = Number(c.netPosition);
        opportunities.push({
          id: `vat-unfiled-${c.id}`,
          type: "unfiled_return",
          title: `VAT return for ${c.period} was calculated but never filed`,
          description:
            "The period's input VAT credit is only claimable once the return is submitted. File it to lock in the deduction.",
          estimatedSavings: Math.max(0, Number(c.inputVat) - Math.max(0, net)),
          period: c.period,
          confidence: 0.8,
        });
      }
    }

    // ── 4. Liability drift worth reviewing (estimated vs actual) ─────────
    const deadlines = await db.query.filingDeadlines.findMany({
      where: eq(filingDeadlines.entityId, entityId),
    });
    for (const d of deadlines) {
      const est = Number(d.estimatedAmount ?? "0");
      if (est > 0 && d.status === "pending") {
        opportunities.push({
          id: `liability-${d.id}`,
          type: "liability_review",
          title: `${d.name} — review estimated liability before filing`,
          description: `Estimated at GMD ${est.toLocaleString("en-US", { maximumFractionDigits: 2 })}. Reconciling actuals before filing avoids overpayment — a deduction-safe review.`,
          estimatedSavings: Math.round(est * 0.05),
          period: d.period ?? undefined,
          confidence: 0.7,
        });
      }
    }

    opportunities.sort((a, b) => b.estimatedSavings - a.estimatedSavings);

    return {
      opportunities,
      summary: {
        total: opportunities.length,
        totalSavings: opportunities.reduce((s, o) => s + o.estimatedSavings, 0),
        whtRecovery: opportunities.filter((o) => o.type === "wht_recovery")
          .length,
        vatRefund: opportunities.filter((o) => o.type === "vat_refund").length,
      },
    };
  }),
});
