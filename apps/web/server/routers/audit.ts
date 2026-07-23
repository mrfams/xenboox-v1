import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  handleMutationError,
  router,
  protectedProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, desc, and, gte, lte, like, sql } from "drizzle-orm";
import { auditLog } from "@xenboox/db/schema/documents";

export const auditRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
        action: z.string().optional(),
        entityType: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const conditions = [eq(auditLog.entityId, ctx.entityId!)];

        if (input.action) {
          conditions.push(like(auditLog.action, `%${input.action}%`));
        }
        if (input.entityType) {
          conditions.push(eq(auditLog.entityType, input.entityType));
        }
        if (input.dateFrom) {
          conditions.push(gte(auditLog.createdAt, new Date(input.dateFrom)));
        }
        if (input.dateTo) {
          conditions.push(lte(auditLog.createdAt, new Date(input.dateTo)));
        }

        const whereClause = and(...conditions);

        const [logs, countResult] = await Promise.all([
          db.query.auditLog.findMany({
            where: whereClause,
            orderBy: [desc(auditLog.createdAt)],
            limit: input.limit,
            offset: input.offset,
          }),
          db.execute(
            sql`SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`,
          ),
        ]);

        const total = Number(
          (countResult.rows?.[0] as { total?: number })?.total ?? 0,
        );

        return {
          logs: logs.map((log) => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType,
            entityIdRef: log.entityIdRef,
            userId: log.userId,
            newValues: log.newValues as Record<string, unknown> | null,
            oldValues: log.oldValues as Record<string, unknown> | null,
            createdAt: log.createdAt,
          })),
          total,
        };
      } catch (error) {
        handleMutationError(error, "Failed to fetch audit logs");
      }
    }),
});
