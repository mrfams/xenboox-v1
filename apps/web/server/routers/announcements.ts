import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { announcements } from "@xenboox/db/schema";
import { db } from "@xenboox/db";

import {
  router,
  publicProcedure,
  adminProtectedProcedure,
} from "@/lib/trpc/server";

const announcementInput = z.object({
  message: z.string().min(1).max(500),
  linkText: z.string().min(1).max(100).default("Learn more →"),
  linkHref: z.string().min(1).max(500).default("/blog"),
  isActive: z.boolean().default(false),
});

export const announcementsRouter = router({
  // Public: active announcement for marketing bar
  getActive: publicProcedure.query(async () => {
    const [row] = await db
      .select()
      .from(announcements)
      .where(eq(announcements.isActive, true))
      .orderBy(desc(announcements.updatedAt))
      .limit(1);
    return row ?? null;
  }),

  // Admin: list all
  adminList: adminProtectedProcedure.query(async () => {
    const rows = await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.updatedAt));
    return rows;
  }),

  adminCreate: adminProtectedProcedure
    .input(announcementInput)
    .mutation(async ({ input }) => {
      if (input.isActive) {
        await db
          .update(announcements)
          .set({ isActive: false })
          .where(eq(announcements.isActive, true));
      }
      const [row] = await db
        .insert(announcements)
        .values({
          message: input.message,
          linkText: input.linkText,
          linkHref: input.linkHref,
          isActive: input.isActive,
        })
        .returning();
      return row;
    }),

  adminUpdate: adminProtectedProcedure
    .input(
      z.object({ id: z.string().uuid(), data: announcementInput.partial() }),
    )
    .mutation(async ({ input }) => {
      if (input.data.isActive) {
        await db
          .update(announcements)
          .set({ isActive: false })
          .where(eq(announcements.isActive, true));
      }
      const patch: Record<string, unknown> = {
        ...input.data,
        updatedAt: new Date(),
      };
      const [row] = await db
        .update(announcements)
        .set(patch)
        .where(eq(announcements.id, input.id))
        .returning();
      return row;
    }),

  adminToggle: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      if (input.isActive) {
        await db
          .update(announcements)
          .set({ isActive: false })
          .where(eq(announcements.isActive, true));
      }
      const [row] = await db
        .update(announcements)
        .set({ isActive: input.isActive, updatedAt: new Date() })
        .where(eq(announcements.id, input.id))
        .returning();
      return row;
    }),

  adminDelete: adminProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(announcements).where(eq(announcements.id, input.id));
      return { ok: true };
    }),
});
