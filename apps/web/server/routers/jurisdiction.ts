// ─── Jurisdiction Expansion Router ──────────────────────────────────
//
// Management endpoints for the Jurisdiction Expansion Pipeline.
// Allows running the full 9-step expansion process for new jurisdictions.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc } from "drizzle-orm";
import {
  jurisdictionExpansionRequests,
  statutoryDeductionRules,
} from "@xenboox/db/schema";
import { jurisdictionTaxRules } from "@xenboox/db/schema/tax-compliance";
import { entities } from "@xenboox/db/schema/organization";
import {
  runJurisdictionExpansionPipeline,
  getExpansionStatus,
} from "@xenboox/agents";
import {
  handleMutationError,
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "@/lib/trpc/server";

export const jurisdictionRouter = router({
  // ── Run Expansion Pipeline ─────────────────────────────────────────

  runExpansion: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        country: z.enum(["NG", "GH"]),
        countryName: z.string().min(1).max(100),
        sources: z
          .array(
            z.object({
              title: z.string(),
              url: z.string().url(),
              publicationDate: z.string(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityCtx = await db.query.entities.findFirst({
          where: eq(entities.id, ctx.entityId!),
        });

        if (!entityCtx) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Entity not found",
          });
        }

        // Create expansion request record
        const [request] = await db
          .insert(jurisdictionExpansionRequests)
          .values({
            entityId: ctx.entityId!,
            country: input.country,
            countryName: input.countryName,
            status: "research",
            currency: input.country === "NG" ? "NGN" : "GHS",
            researchedById: ctx.session!.user!.id!,
            researchedAt: new Date(),
            sources: input.sources.map((s) => ({
              ...s,
              verifiedAt: new Date().toISOString(),
              verifiedBy: ctx.session!.user!.id!,
            })),
            notes: `Jurisdiction expansion for ${input.countryName} (${input.country})`,
          })
          .returning();

        const result = await runJurisdictionExpansionPipeline({
          entityId: ctx.entityId!,
          country: input.country,
          countryName: input.countryName,
          userId: ctx.session!.user!.id!,
          sources: input.sources.map((s) => ({
            ...s,
            verifiedAt: new Date().toISOString(),
            verifiedBy: ctx.session!.user!.id!,
          })),
        });

        return {
          expansionId: request.id,
          success: result.success,
          country: result.country,
          countryName: result.countryName,
          taxRulesCreated: result.taxRulesCreated,
          deductionRulesCreated: result.deductionRulesCreated,
          sandboxPassed: result.sandboxPassed,
          activated:
            result.steps.find((s) => s.id === "go_live_activation")?.status ===
            "completed",
          gracePeriodEndsAt: result.gracePeriodEndsAt,
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
        handleMutationError(error, "Jurisdiction expansion pipeline failed");
      }
    }),

  // ── Get Expansion Status ──────────────────────────────────────────

  getStatus: protectedProcedure
    .input(
      z
        .object({
          country: z.enum(["NG", "GH"]).optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getExpansionStatus({
        entityId: ctx.entityId!,
        country: input?.country,
      });
    }),

  // ── List Expansion History ────────────────────────────────────────

  listExpansions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return db.query.jurisdictionExpansionRequests.findMany({
        where: eq(jurisdictionExpansionRequests.entityId, ctx.entityId!),
        orderBy: [desc(jurisdictionExpansionRequests.createdAt)],
        limit: input?.limit ?? 10,
      });
    }),

  // ── Get Country Tax Rules ─────────────────────────────────────────

  listTaxRules: protectedProcedure
    .input(
      z.object({
        country: z.enum(["NG", "GH"]),
        ruleType: z
          .enum(["vat", "paye", "withholding", "corporate"])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [
        eq(jurisdictionTaxRules.entityId, ctx.entityId!),
        eq(jurisdictionTaxRules.country, input.country),
      ];
      if (input.ruleType) {
        where.push(eq(jurisdictionTaxRules.ruleType, input.ruleType));
      }
      return db.query.jurisdictionTaxRules.findMany({
        where: and(...where),
        orderBy: [desc(jurisdictionTaxRules.version)],
      });
    }),

  // ── Get Statutory Deduction Rules ─────────────────────────────────

  listDeductionRules: protectedProcedure
    .input(
      z.object({
        country: z.enum(["NG", "GH"]),
        category: z
          .enum([
            "pension",
            "social_security",
            "health_insurance",
            "housing",
            "training",
            "other",
          ])
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = [
        eq(statutoryDeductionRules.entityId, ctx.entityId!),
        eq(statutoryDeductionRules.country, input.country),
      ];
      if (input.category) {
        where.push(eq(statutoryDeductionRules.category, input.category));
      }
      return db.query.statutoryDeductionRules.findMany({
        where: and(...where),
        orderBy: [desc(statutoryDeductionRules.version)],
      });
    }),

  // ── Approve Rules (Human Sign-off) ────────────────────────────────

  approveRules: mutateProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        country: z.enum(["NG", "GH"]),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Update expansion request to reviewed status
        const request = await db.query.jurisdictionExpansionRequests.findFirst({
          where: and(
            eq(jurisdictionExpansionRequests.entityId, ctx.entityId!),
            eq(jurisdictionExpansionRequests.country, input.country),
          ),
        });

        if (!request) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No expansion request found for this country",
          });
        }

        if (request.status !== "drafted" && request.status !== "research") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Cannot approve rules in "${request.status}" status. Rules must be in "drafted" status.`,
          });
        }

        await db
          .update(jurisdictionExpansionRequests)
          .set({
            status: "reviewed",
            reviewedById: ctx.session!.user!.id!,
            reviewedAt: new Date(),
            reviewNotes: input.notes,
          })
          .where(eq(jurisdictionExpansionRequests.id, request.id));

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to approve rules");
      }
    }),
});
