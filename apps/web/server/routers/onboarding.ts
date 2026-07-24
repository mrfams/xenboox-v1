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
  getOnboardingStatus,
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

    return {
      status: session.status as "in_progress" | "completed" | "abandoned",
      sessionId: session.id,
      currentStep: session.currentStep,
      completedSteps: session.completedSteps ?? [],
      routingAnswer: session.routingAnswer,
      timeToFirstValueSeconds: session.timeToFirstValueSeconds,
      pipeline: pipelineStatus,
    };
  }),

  /** Store how the user currently manages their books (routing question) */
  updateRoutingAnswer: protectedProcedure
    .input(
      z.object({
        answer: z.enum(["excel", "quickbooks", "xero", "nothing", "other"]),
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

  /** Start a historical data pull */
  requestHistoricalPull: protectedProcedure
    .input(
      z.object({
        dateRangeStart: z.string(),
        dateRangeEnd: z.string(),
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

      const result = await completeOnboarding(session.id);

      // Run the backend pipeline to seed CoA and fiscal periods if not done
      const entity = await db.query.entities.findFirst({
        where: eq(entities.organizationId, orgId),
      });
      if (entity) {
        // Fire and forget — the pipeline is idempotent
        runOnboardingPipeline(entity.id, entity.name ?? "Organization").catch(
          () => {},
        );
      }

      return {
        success: true,
        timeToFirstValueSeconds: result.timeToFirstValueSeconds,
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
