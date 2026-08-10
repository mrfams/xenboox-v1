import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  protectedProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq } from "drizzle-orm";
import { organizations, entities } from "@xenboox/db/schema/organization";
import { onboardingSessions } from "@xenboox/db/schema/onboarding";
import {
  createOnboardingSession,
  updateRoutingAnswer,
  setBusinessStart,
  setDetailDepth,
  confirmOpeningBalance,
  confirmOpeningBalanceEscape,
  getOpeningBalanceSummary,
  getOnboardingStatus,
  getFirstMessage,
  legacyRoutingToSourceType,
  createDataConnection,
  getFallbackForFailure,
  startHistoricalPull,
  requestHistoricalPullPermission,
  approveHistoricalPull,
  getSuggestedCoA,
  confirmCoA,
  completeOnboarding,
  runOnboardingPipeline,
  markCoAComplete,
} from "@xenboox/agents/core/onboarding-pipeline";
import type {
  OnboardingSourceType,
  ReconstructionDetailDepth,
} from "@xenboox/agents/core/onboarding-pipeline";

const ONBOARDING_SOURCE_TYPES = [
  "brand_new",
  "professional_software",
  "manual_records",
  "statements_only",
  "no_records",
] as const;

const DETAIL_DEPTHS = [
  "last_12_months",
  "last_3_years",
  "full_history",
] as const;

// Helper to find the user's org ID from their user ID
async function getUserOrgId(userId: string): Promise<string | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.ownerId, userId),
    columns: { id: true },
  });
  return org?.id ?? null;
}

export const onboardingRouter = router({
  /** Get the current onboarding status for the user's organization */
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id!;
    const orgId = await getUserOrgId(userId);
    if (!orgId) {
      return { status: "not_started" as const };
    }

    const session = await db.query.onboardingSessions.findFirst({
      where: eq(onboardingSessions.orgId, orgId),
    });

    if (!session) {
      return { status: "not_started" as const };
    }

    const pipelineStatus = await getOnboardingStatus(orgId);

    // Five-category source: prefer the new column; fall back to a best-effort
    // mapping of a legacy routing answer (null → wizard re-asks, never assumes).
    const sourceType: OnboardingSourceType | null =
      (session.sourceType as OnboardingSourceType | null) ??
      legacyRoutingToSourceType(session.routingAnswer);

    return {
      status: session.status as "in_progress" | "completed" | "abandoned",
      sessionId: session.id,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps ?? [],
      routingAnswer: session.routingAnswer,
      sourceType,
      timeToFirstValueSeconds: session.timeToFirstValueSeconds,
      pipeline: pipelineStatus,
    };
  }),

  /** Store how the user keeps their books — the five-category Step 3a answer */
  updateRoutingAnswer: protectedProcedure
    .input(
      z.object({
        answer: z.enum(ONBOARDING_SOURCE_TYPES),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const orgId = await getUserOrgId(ctx.session!.user!.id!);
        if (!orgId)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No org found",
          });

        // Ensure session exists
        const session = await createOnboardingSession(orgId);
        await updateRoutingAnswer(session.sessionId, input.answer);

        return { success: true, sessionId: session.sessionId };
      } catch (error) {
        handleMutationError(error, "Failed to update routing answer");
      }
    }),

  /** Category A follow-up: business start date + pre-incorporation activity */
  setBusinessStart: protectedProcedure
    .input(
      z.object({
        businessStartDate: z.string().date().optional(),
        preIncorporationActivity: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const orgId = await getUserOrgId(ctx.session!.user!.id!);
        if (!orgId)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No org found",
          });

        const session = await createOnboardingSession(orgId);
        await setBusinessStart(session.sessionId, input);
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to save business start details");
      }
    }),

  /** Category B/C/D follow-up: transaction-level detail depth (spec §4.2) */
  setDetailDepth: protectedProcedure
    .input(z.object({ depth: z.enum(DETAIL_DEPTHS) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const orgId = await getUserOrgId(ctx.session!.user!.id!);
        if (!orgId)
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "No org found",
          });

        const session = await createOnboardingSession(orgId);
        await setDetailDepth(
          session.sessionId,
          input.depth as ReconstructionDetailDepth,
        );
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to save detail depth");
      }
    }),

  /** Category E: owner-confirmed opening balance (spec §3.5/§4.1) */
  confirmOpeningBalance: protectedProcedure
    .input(
      z
        .object({
          rows: z
            .array(
              z.object({
                code: z.string().min(1),
                amount: z.number().finite(),
              }),
            )
            .default([])
            .refine(
              (rows) => new Set(rows.map((r) => r.code)).size === rows.length,
              { message: "Duplicate account codes in one batch" },
            ),
          // "I don't know yet — start from today, we'll reconcile later"
          escape: z.boolean().optional().default(false),
        })
        .superRefine((val, ctx) => {
          if (!val.escape && val.rows.length === 0) {
            ctx.addIssue({
              code: "custom",
              message:
                "Enter at least one opening balance, or choose to start from today.",
            });
          }
        }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId;
        if (!entityId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No entity selected",
          });

        if (input.escape) {
          await confirmOpeningBalanceEscape(entityId);
          return { success: true, saved: 0, escaped: true };
        }

        const result = await confirmOpeningBalance(
          entityId,
          input.rows,
          ctx.session!.user!.id!,
        );
        return { success: true, saved: result.saved, escaped: false };
      } catch (error) {
        handleMutationError(error, "Failed to confirm opening balance");
      }
    }),

  /** Review screen: current opening-balance state (incl. Category E escape) */
  getOpeningBalances: protectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId;
    if (!entityId)
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No entity selected",
      });
    return getOpeningBalanceSummary(entityId);
  }),

  /** Connect a data source (bank, mobile money, file upload, etc.) */
  connectData: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "bank_api",
          "bank_pdf",
          "mobile_money",
          "quickbooks",
          "xero",
          "excel",
          "csv",
          "manual_entry",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId;
        if (!entityId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No entity selected",
          });

        const connection = await createDataConnection(entityId, input.type);

        // Update session steps if this is the first connection
        const orgId = await getUserOrgId(ctx.session!.user!.id!);
        if (orgId) {
          const session = await db.query.onboardingSessions.findFirst({
            where: eq(onboardingSessions.orgId, orgId),
          });
          if (
            session &&
            !(session.completedSteps ?? []).includes("data_connections")
          ) {
            await markDataConnectionsStepComplete(session.id);
          }
        }

        return connection;
      } catch (error) {
        handleMutationError(error, "Failed to create data connection");
      }
    }),

  /** Get the fallback option for a failed connection */
  getFallback: protectedProcedure
    .input(
      z.object({
        type: z.enum([
          "bank_api",
          "bank_pdf",
          "mobile_money",
          "quickbooks",
          "xero",
          "excel",
          "csv",
          "manual_entry",
        ]),
      }),
    )
    .query(({ input }) => {
      return getFallbackForFailure(input.type);
    }),

  /** Start a historical data pull (Category B/C/D only; A never calls this) */
  requestHistoricalPull: protectedProcedure
    .input(
      z.object({
        dateRangeStart: z.string(),
        dateRangeEnd: z.string(),
        detailDepth: z.enum(DETAIL_DEPTHS).default("last_12_months"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId;
        if (!entityId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No entity selected",
          });

        const result = await startHistoricalPull(
          entityId,
          input.dateRangeStart,
          input.dateRangeEnd,
          input.detailDepth as ReconstructionDetailDepth,
        );

        if (result.needsPermission) {
          await requestHistoricalPullPermission(result.jobId);
        }

        return result;
      } catch (error) {
        handleMutationError(error, "Failed to start historical pull");
      }
    }),

  /** Approve or deny a historical pull that exceeds 12 months */
  approveHistoricalPull: protectedProcedure
    .input(
      z.object({
        jobId: z.string().uuid(),
        approved: z.boolean(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await approveHistoricalPull(input.jobId, input.approved);
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to process approval");
      }
    }),

  /** Get suggested chart of accounts for a business type */
  getCoaSuggestions: protectedProcedure
    .input(
      z.object({
        segment: z.string(),
        country: z.string().default("GM"),
      }),
    )
    .query(async ({ input }) => {
      return getSuggestedCoA(input.segment, input.country);
    }),

  /** Confirm and create the chart of accounts */
  confirmCoa: protectedProcedure
    .input(
      z.object({
        templateId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId;
        if (!entityId)
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No entity selected",
          });

        const result = await confirmCoA(entityId, input.templateId);

        // Look up session to get the correct sessionId
        const orgId = await getUserOrgId(ctx.session!.user!.id!);
        if (orgId) {
          const session = await db.query.onboardingSessions.findFirst({
            where: eq(onboardingSessions.orgId, orgId),
          });
          if (session) {
            await markCoAComplete(session.id);
          }
        }

        return result;
      } catch (error) {
        handleMutationError(error, "Failed to confirm chart of accounts");
      }
    }),

  /** Complete the onboarding flow and log time-to-first-value */
  completeFlow: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const orgId = await getUserOrgId(ctx.session!.user!.id!);
      if (!orgId)
        throw new TRPCError({ code: "UNAUTHORIZED", message: "No org found" });

      const session = await db.query.onboardingSessions.findFirst({
        where: eq(onboardingSessions.orgId, orgId),
      });
      if (!session)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No onboarding session found",
        });

      // Resolve the five-category source (new column, else legacy mapping).
      const sourceType: OnboardingSourceType | null =
        (session.sourceType as OnboardingSourceType | null) ??
        legacyRoutingToSourceType(session.routingAnswer);

      const entity = await db.query.entities.findFirst({
        where: eq(entities.organizationId, orgId),
      });

      // Defensive mirror: the entity may have been created after the routing
      // step, so ensure the category is never null on a finished onboarding.
      if (entity && sourceType) {
        await db
          .update(entities)
          .set({ onboardingSourceType: sourceType })
          .where(eq(entities.id, entity.id));
      }

      // Category E gate (spec honesty rule): no_records first look requires
      // confirmed opening balances OR the explicit "start from today" escape.
      if (entity && sourceType === "no_records") {
        const summary = await getOpeningBalanceSummary(entity.id);
        if (summary.balances.length === 0 && !summary.escaped) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Confirm your opening balance (or choose to start from today) before finishing setup.",
          });
        }
      }

      const result = await completeOnboarding(session.id);

      // Run the backend pipeline to seed CoA and fiscal periods if not done
      // (Category A included — it seeds CoA/periods but never a pull job).
      if (entity) {
        // Fire and forget — the pipeline is idempotent
        runOnboardingPipeline(entity.id, entity.name ?? "Organization").catch(
          () => {},
        );
      }

      // Per-category CFO first message (spec §3.1/§3.5).
      const firstMessage = getFirstMessage(sourceType, {
        transactions: 0,
        flagged: 0,
        months: 12,
      });

      return {
        success: true,
        timeToFirstValueSeconds: result.timeToFirstValueSeconds,
        sourceType,
        firstMessage,
      };
    } catch (error) {
      handleMutationError(error, "Failed to complete onboarding");
    }
  }),
});

// Helper used by the router
async function markDataConnectionsStepComplete(sessionId: string) {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
  });
  if (!session) return;

  const steps = [...(session.completedSteps ?? []), "data_connections"];
  const entity = await db.query.entities.findFirst({
    where: eq(entities.organizationId, session.orgId),
  });

  await db
    .update(onboardingSessions)
    .set({
      currentStep: entity ? "historical_pull" : "entity_setup",
      completedSteps: steps,
    })
    .where(eq(onboardingSessions.id, sessionId));
}
