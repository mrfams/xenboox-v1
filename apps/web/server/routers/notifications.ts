import { z } from "zod";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  adminProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, or } from "drizzle-orm";
import {
  notifications,
  notificationTypeEnum,
  notificationPriorityEnum,
  notificationStatusEnum,
} from "@xenboox/db/schema/notifications";
import { users } from "@xenboox/db/schema/auth";

export const notificationsRouter = router({
  list: rlsProtectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        onlyUnread: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.onlyUnread
        ? and(
            eq(notifications.userId, ctx.session!.user!.id!),
            eq(notifications.entityId, ctx.entityId!),
            eq(notifications.read, false),
          )
        : and(
            eq(notifications.userId, ctx.session!.user!.id!),
            eq(notifications.entityId, ctx.entityId!),
          );

      const results = await db.query.notifications.findMany({
        where: whereClause,
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit,
        offset: input.offset,
      });

      return results;
    }),

  unreadCount: rlsProtectedProcedure.query(async ({ ctx }) => {
    const results = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, ctx.session!.user!.id!),
        eq(notifications.entityId, ctx.entityId!),
        eq(notifications.read, false),
      ),
    });

    return { count: results ? 1 : 0 };
  }),

  markAsRead: rlsProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.session!.user!.id!),
            eq(notifications.entityId, ctx.entityId!),
          ),
        );

      return { success: true };
    }),

  markAllAsRead: rlsProtectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.userId, ctx.session!.user!.id!),
          eq(notifications.entityId, ctx.entityId!),
          eq(notifications.read, false),
        ),
      );

    return { success: true };
  }),

  delete: rlsProtectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(notifications)
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, ctx.session!.user!.id!),
            eq(notifications.entityId, ctx.entityId!),
          ),
        );

      return { success: true };
    }),

  create: adminProcedure
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
    }),

  admin: adminProcedure
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
      const conditions = [];
      if (input.entityId)
        conditions.push(eq(notifications.entityId, input.entityId));
      if (input.type) conditions.push(eq(notifications.type, input.type));
      if (input.priority)
        conditions.push(eq(notifications.priority, input.priority));
      if (input.status) conditions.push(eq(notifications.status, input.status));

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      const results = await db.query.notifications.findMany({
        where: whereClause,
        orderBy: [desc(notifications.createdAt)],
        limit: input.limit,
        with: { user: true },
      });

      return results;
    }),
});
