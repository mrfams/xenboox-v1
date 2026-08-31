import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import { analyticsEvents } from "@xenboox/db/schema/analytics";
import {
  calculateActivationScore,
  getActivationStatus,
  getNextStep,
  ACTIVATION_EVENTS,
  type ActivationEvent,
} from "@xenboox/db/schema/analytics";
import { rlsProtectedProcedure, rlsMutateProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getRateLimiter } from "@/lib/security/rate-limiter";

export const activationRouter = {
  /**
   * Track an activation event.
   * Idempotent — won't duplicate if already tracked.
   */
  trackEvent: rlsMutateProcedure
    .input(
      z.object({
        event: z.string(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const userId = ctx.session!.user!.id!;

      // Rate limit: 30 activation events per minute per user
      const rateLimiter = getRateLimiter();
      const rateCheck = await rateLimiter.checkApiRateLimit(`activation:${userId}`);
      if (!rateCheck.success) {
        logger.warn({ userId, entityId }, "[activation] Rate limited");
        return { tracked: false, reason: "rate_limited" };
      }

      // Validate event type
      const validEvents = Object.keys(ACTIVATION_EVENTS);
      if (!validEvents.includes(input.event)) {
        logger.warn({ event: input.event }, "[activation] Invalid event type");
        return { tracked: false, reason: "invalid_event" };
      }

      // Check if event already exists (idempotent)
      const existing = await db.query.analyticsEvents.findFirst({
        where: and(
          eq(analyticsEvents.entityId, entityId),
          eq(analyticsEvents.userId, userId),
          eq(analyticsEvents.event, input.event),
        ),
      });

      if (existing) {
        return { tracked: false, reason: "already_tracked" };
      }

      // Track the event
      await db.insert(analyticsEvents).values({
        entityId,
        userId,
        event: input.event,
        metadata: input.metadata ?? {},
      });

      logger.info(
        { entityId, userId, event: input.event },
        "[activation] Event tracked",
      );

      return { tracked: true };
    }),

  /**
   * Get activation status for the current entity.
   */
  getStatus: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;
    const userId = ctx.session!.user!.id!;

    // Get all activation events for this user/entity
    const events = await db.query.analyticsEvents.findMany({
      where: and(
        eq(analyticsEvents.entityId, entityId),
        eq(analyticsEvents.userId, userId),
      ),
      orderBy: [desc(analyticsEvents.createdAt)],
    });

    const completedEvents = events.map((e) => e.event);
    const score = calculateActivationScore(completedEvents);
    const status = getActivationStatus(score);
    const nextStep = getNextStep(completedEvents);

    const total = Object.keys(ACTIVATION_EVENTS).length;
    const completed = completedEvents.length;

    return {
      score,
      status,
      nextStep,
      progress: {
        total,
        completed,
        percentage: Math.round((completed / total) * 100),
      },
      completedEvents,
      isFullyActivated: score >= 1,
      events: events.map((e) => ({
        event: e.event,
        createdAt: e.createdAt,
        metadata: e.metadata,
      })),
    };
  }),

  /**
   * Get activation funnel metrics (admin only).
   */
  getFunnelMetrics: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get all activation events for this entity
    const events = await db.query.analyticsEvents.findMany({
      where: and(
        eq(analyticsEvents.entityId, entityId),
        eq(analyticsEvents.event, "signup"),
      ),
      orderBy: [desc(analyticsEvents.createdAt)],
    });

    // Calculate funnel metrics
    const totalSignups = events.length;
    const completedSteps: Record<string, number> = {};

    // Single query for all activation events (avoids N+1)
    const allActivationEvents = await db.query.analyticsEvents.findMany({
      where: and(
        eq(analyticsEvents.entityId, entityId),
      ),
    });

    // Count by event type
    for (const event of allActivationEvents) {
      completedSteps[event.event] = (completedSteps[event.event] ?? 0) + 1;
    }

    // Ensure all event types have a count
    for (const event of Object.keys(ACTIVATION_EVENTS)) {
      if (!(event in completedSteps)) {
        completedSteps[event] = 0;
      }
    }

    // Calculate conversion rates
    const conversionRates: Record<string, number> = {};
    for (const [event, count] of Object.entries(completedSteps)) {
      conversionRates[event] =
        totalSignups > 0 ? Math.round((count / totalSignups) * 100) : 0;
    }

    return {
      totalSignups,
      completedSteps,
      conversionRates,
    };
  }),
};
