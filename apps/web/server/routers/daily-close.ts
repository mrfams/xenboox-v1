import { router, protectedProcedure } from "../trpc";
import { db } from "@xenboox/db";
import { dailyCloseRuns } from "@xenboox/db/schema/daily-close";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";

export const dailyCloseRouter = router({
  // Get today's close status
  getToday: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0]!;
    const runs = await db.query.dailyCloseRuns.findMany({
      where: and(
        eq(dailyCloseRuns.entityId, ctx.entityId),
        eq(dailyCloseRuns.closeDate, today),
      ),
    });
    return runs[0] ?? null;
  }),

  // Get close history
  getHistory: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      }),
    )
    .query(async ({ ctx, input }) => {
      const runs = await db.query.dailyCloseRuns.findMany({
        where: eq(dailyCloseRuns.entityId, ctx.entityId),
        orderBy: [desc(dailyCloseRuns.closeDate)],
        limit: input.days,
      });
      return runs;
    }),

  // Get exceptions needing human review
  getExceptions: protectedProcedure.query(async ({ ctx }) => {
    const runs = await db.query.dailyCloseRuns.findMany({
      where: and(
        eq(dailyCloseRuns.entityId, ctx.entityId),
        eq(dailyCloseRuns.status, "exception"),
      ),
      orderBy: [desc(dailyCloseRuns.createdAt)],
      limit: 20,
    });
    return runs;
  }),

  // Get stats for dashboard
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const runs = await db.query.dailyCloseRuns.findMany({
      where: eq(dailyCloseRuns.entityId, ctx.entityId),
      orderBy: [desc(dailyCloseRuns.closeDate)],
      limit: 30,
    });

    const completed = runs.filter((r) => r.status === "completed").length;
    const exceptions = runs.filter((r) => r.status === "exception").length;
    const failed = runs.filter((r) => r.status === "failed").length;
    const totalTransactions = runs.reduce(
      (sum, r) => sum + Number(r.transactionsProcessed ?? 0),
      0,
    );
    const totalAutoMatched = runs.reduce(
      (sum, r) => sum + Number(r.autoMatched ?? 0),
      0,
    );

    return {
      totalRuns: runs.length,
      completed,
      exceptions,
      failed,
      passRate: runs.length > 0 ? completed / runs.length : 0,
      totalTransactions,
      totalAutoMatched,
      autoMatchRate: totalTransactions > 0 ? totalAutoMatched / totalTransactions : 0,
    };
  }),
});
