import { z } from "zod";
import { eq, and, desc, sql, count, avg } from "drizzle-orm";
import { aiCorrections } from "@xenboox/db/schema";

import { router, rlsProtectedProcedure } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Generate a pattern key for matching similar corrections.
 * Normalizes vendor names, categories, and accounts for fuzzy matching.
 */
function generatePatternKey(
  type: string,
  decision: Record<string, unknown>,
): string {
  switch (type) {
    case "categorization":
      return `cat:${String(decision.category ?? "")
        .toLowerCase()
        .trim()}`;
    case "vendor":
      return `vendor:${String(decision.vendor ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")}`;
    case "account":
      return `acct:${String(decision.accountCode ?? "")
        .toLowerCase()
        .trim()}`;
    case "tax":
      return `tax:${String(decision.taxCode ?? "")
        .toLowerCase()
        .trim()}`;
    default:
      return `${type}:${JSON.stringify(decision).slice(0, 100)}`;
  }
}

// ─── Router ──────────────────────────────────────────────────────────────

export const aiCorrectionsRouter = router({
  /**
   * Record a user correction to an AI decision.
   * This is the core of the learning loop — every correction improves future AI accuracy.
   */
  record: rlsProtectedProcedure
    .input(
      z.object({
        agentName: z.string().min(1),
        taskType: z.string().min(1),
        originalDecision: z.record(z.unknown()),
        originalConfidence: z.number().min(0).max(1).optional(),
        correctedDecision: z.record(z.unknown()),
        correctionType: z.enum([
          "categorization",
          "amount",
          "vendor",
          "account",
          "tax",
          "duplicate",
          "description",
        ]),
        referenceEntityType: z.string().optional(),
        referenceEntityId: z.string().uuid().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const userId = ctx.session?.user?.id;

      const patternKey = generatePatternKey(
        input.correctionType,
        input.correctedDecision,
      );

      // Check if this pattern has been seen before
      const existingPattern = await db.query.aiCorrections.findFirst({
        where: and(
          eq(aiCorrections.entityId, entityId),
          eq(aiCorrections.patternKey, patternKey),
          eq(aiCorrections.correctionType, input.correctionType),
        ),
      });

      const [correction] = await db
        .insert(aiCorrections)
        .values({
          entityId,
          agentName: input.agentName,
          taskType: input.taskType,
          originalDecision: input.originalDecision,
          originalConfidence: input.originalConfidence
            ? String(input.originalConfidence)
            : null,
          correctedDecision: input.correctedDecision,
          correctionType: input.correctionType,
          referenceEntityType: input.referenceEntityType,
          referenceEntityId: input.referenceEntityId,
          correctedBy: userId,
          notes: input.notes,
          patternKey,
          timesSeen: existingPattern ? existingPattern.timesSeen + 1 : 1,
          learned: false,
        })
        .returning();

      logger.info(
        {
          correctionId: correction.id,
          entityId,
          agentName: input.agentName,
          correctionType: input.correctionType,
          patternKey,
          timesSeen: correction.timesSeen,
        },
        "AI correction recorded",
      );

      return correction;
    }),

  /**
   * List corrections with filtering and pagination.
   */
  list: rlsProtectedProcedure
    .input(
      z.object({
        status: z
          .enum(["all", "pending", "accepted", "rejected", "applied"])
          .default("all"),
        correctionType: z.string().optional(),
        agentName: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const conditions = [eq(aiCorrections.entityId, entityId)];

      if (input.status !== "all") {
        conditions.push(eq(aiCorrections.status, input.status));
      }
      if (input.correctionType) {
        conditions.push(eq(aiCorrections.correctionType, input.correctionType));
      }
      if (input.agentName) {
        conditions.push(eq(aiCorrections.agentName, input.agentName));
      }

      const corrections = await db.query.aiCorrections.findMany({
        where: and(...conditions),
        orderBy: [desc(aiCorrections.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      const [{ cnt }] = await db
        .select({ cnt: count() })
        .from(aiCorrections)
        .where(and(...conditions));

      return {
        corrections,
        totalCount: Number(cnt),
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(Number(cnt) / input.limit),
      };
    }),

  /**
   * Accept a correction — mark it as applied and trigger learning.
   */
  accept: rlsProtectedProcedure
    .input(z.object({ correctionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const [updated] = await db
        .update(aiCorrections)
        .set({ status: "accepted", learned: true })
        .where(
          and(
            eq(aiCorrections.id, input.correctionId),
            eq(aiCorrections.entityId, entityId),
            eq(aiCorrections.status, "pending"),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Correction not found or already processed");
      }

      return updated;
    }),

  /**
   * Reject a correction — mark it as rejected.
   */
  reject: rlsProtectedProcedure
    .input(z.object({ correctionId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const [updated] = await db
        .update(aiCorrections)
        .set({ status: "rejected" })
        .where(
          and(
            eq(aiCorrections.id, input.correctionId),
            eq(aiCorrections.entityId, entityId),
            eq(aiCorrections.status, "pending"),
          ),
        )
        .returning();

      if (!updated) {
        throw new Error("Correction not found or already processed");
      }

      return updated;
    }),

  /**
   * Get learning stats for the entity.
   * Shows accuracy trends, most corrected categories, and agent performance.
   */
  getStats: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    const allCorrections = await db.query.aiCorrections.findMany({
      where: eq(aiCorrections.entityId, entityId),
    });

    const total = allCorrections.length;
    const pending = allCorrections.filter((c) => c.status === "pending").length;
    const accepted = allCorrections.filter(
      (c) => c.status === "accepted",
    ).length;
    const rejected = allCorrections.filter(
      (c) => c.status === "rejected",
    ).length;
    const learned = allCorrections.filter((c) => c.learned).length;

    // By type
    const byType = allCorrections.reduce(
      (acc, c) => {
        acc[c.correctionType] = (acc[c.correctionType] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // By agent
    const byAgent = allCorrections.reduce(
      (acc, c) => {
        acc[c.agentName] = (acc[c.agentName] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Average original confidence of corrected decisions
    const confidences = allCorrections
      .map((c) => parseFloat(c.originalConfidence ?? "0"))
      .filter((c) => c > 0);
    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b, 0) / confidences.length
        : 0;

    // Most frequent patterns (patterns seen 2+ times)
    const patternCounts = allCorrections.reduce(
      (acc, c) => {
        if (c.patternKey) {
          acc[c.patternKey] = (acc[c.patternKey] ?? 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    const topPatterns = Object.entries(patternCounts)
      .filter(([, count]) => count >= 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([pattern, count]) => ({ pattern, count }));

    return {
      total,
      pending,
      accepted,
      rejected,
      learned,
      byType,
      byAgent,
      avgConfidence: Math.round(avgConfidence * 100) / 100,
      topPatterns,
      learningRate: total > 0 ? Math.round((learned / total) * 100) : 0,
    };
  }),

  /**
   * Get learned patterns for an agent — used to improve agent prompts.
   * Returns corrections that have been accepted and can influence future decisions.
   */
  getLearnedPatterns: rlsProtectedProcedure
    .input(
      z.object({
        agentName: z.string().optional(),
        correctionType: z.string().optional(),
        limit: z.number().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const conditions = [
        eq(aiCorrections.entityId, entityId),
        eq(aiCorrections.learned, true),
      ];

      if (input.agentName) {
        conditions.push(eq(aiCorrections.agentName, input.agentName));
      }
      if (input.correctionType) {
        conditions.push(eq(aiCorrections.correctionType, input.correctionType));
      }

      const patterns = await db.query.aiCorrections.findMany({
        where: and(...conditions),
        orderBy: [desc(aiCorrections.timesSeen)],
        limit: input.limit,
      });

      // Deduplicate by pattern key, keeping the most recent correction
      const seen = new Map<string, (typeof patterns)[0]>();
      for (const p of patterns) {
        if (p.patternKey && !seen.has(p.patternKey)) {
          seen.set(p.patternKey, p);
        }
      }

      return Array.from(seen.values()).map((p) => ({
        patternKey: p.patternKey,
        correctionType: p.correctionType,
        originalDecision: p.originalDecision,
        correctedDecision: p.correctedDecision,
        timesSeen: p.timesSeen,
        agentName: p.agentName,
      }));
    }),
});
