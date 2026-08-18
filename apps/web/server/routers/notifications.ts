import { z } from "zod";
import { eq, and, desc, or, sql } from "drizzle-orm";
import {
  notifications,
  notificationTypeEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
} from "@xenboox/db/schema/notifications";
import { users } from "@xenboox/db/schema/auth";

import { db } from "@/lib/db";
import {
  handleMutationError,
  router,
  protectedProcedure,
  adminProtectedProcedure,
} from "@/lib/trpc/server";
import { logger } from "@/lib/logger";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        onlyUnread: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId;
        if (!entityId) return [];

        const whereClause = input.onlyUnread
          ? and(
              eq(notifications.userId, ctx.session!.user!.id!),
              eq(notifications.entityId, entityId),
              eq(notifications.read, false),
            )
          : and(
              eq(notifications.userId, ctx.session!.user!.id!),
              eq(notifications.entityId, entityId),
            );

        const results = await db.query.notifications.findMany({
          where: whereClause,
          orderBy: [desc(notifications.createdAt)],
          limit: input.limit,
          offset: input.offset,
        });

        return results;
      } catch (err) {
        logger.warn({ err }, "notifications.list failed — returning empty");
        return [];
      }
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      const entityId = ctx.entityId;
      if (!entityId) return { count: 0 };

      // Real count — the badge must reflect EVERY unread row, not a 0/1
      // existence probe. The previous findFirst capped the count at 1.
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.session!.user!.id!),
            eq(notifications.entityId, entityId),
            eq(notifications.read, false),
          ),
        );

      return { count: rows[0]?.count ?? 0 };
    } catch (err) {
      logger.warn({ err }, "notifications.unreadCount failed — returning 0");
      return { count: 0 };
    }
  }),

  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId;
        if (!entityId) return { success: false };

        await db
          .update(notifications)
          .set({ read: true })
          .where(
            and(
              eq(notifications.id, input.id),
              eq(notifications.userId, ctx.session!.user!.id!),
              eq(notifications.entityId, entityId),
            ),
          );

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to mark notification as read");
      }
    }),

  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const entityId = ctx.entityId;
      if (!entityId) return { success: false };

      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.userId, ctx.session!.user!.id!),
            eq(notifications.entityId, entityId),
            eq(notifications.read, false),
          ),
        );

      return { success: true };
    } catch (error) {
      handleMutationError(error, "Failed to mark all notifications as read");
    }
  }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId;
        if (!entityId) return { success: false };

        await db
          .delete(notifications)
          .where(
            and(
              eq(notifications.id, input.id),
              eq(notifications.userId, ctx.session!.user!.id!),
              eq(notifications.entityId, entityId),
            ),
          );

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete notification");
      }
    }),

  create: adminProtectedProcedure
    .input(
      z.object({
        userId: z.string().optional(),
        entityId: z.string().optional(),
        type: z.nativeEnum(notificationTypeEnum),
        priority: z.nativeEnum(notificationPriorityEnum).default("medium"),
        title: z.string(),
        body: z.string(),
        data: z.record(z.any()).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const userId =
          input.userId ||
          (
            await db.query.userEntityAccess.findFirst({
              where: eq(notifications.entityId, input.entityId || ""),
            })
          )?.userId;

        if (!userId) {
          return { success: false, message: "User not found" };
        }

        await db.insert(notifications).values({
          userId,
          entityId: input.entityId,
          type: input.type,
          priority: input.priority,
          title: input.title,
          body: input.body,
          data: input.data ? JSON.stringify(input.data) : undefined,
        });

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to create notification");
      }
    }),

  admin: adminProtectedProcedure
    .input(
      z.object({
        entityId: z.string().optional(),
        type: z.nativeEnum(notificationTypeEnum).optional(),
        priority: z.nativeEnum(notificationPriorityEnum).optional(),
        status: z.nativeEnum(notificationStatusEnum).optional(),
        limit: z.number().min(1).max(100).default(50),
      }),
    )
    .query(async ({ input }) => {
      try {
        const conditions = [];
        if (input.entityId)
          conditions.push(eq(notifications.entityId, input.entityId));
        if (input.type) conditions.push(eq(notifications.type, input.type));
        if (input.priority)
          conditions.push(eq(notifications.priority, input.priority));
        if (input.status)
          conditions.push(eq(notifications.status, input.status));

        const whereClause =
          conditions.length > 0 ? and(...conditions) : undefined;

        const results = await db.query.notifications.findMany({
          where: whereClause,
          orderBy: [desc(notifications.createdAt)],
          limit: input.limit,
          with: { user: true },
        });

        return results;
      } catch (err) {
        logger.warn({ err }, "notifications.admin failed — returning empty");
        return [];
      }
    }),
});
