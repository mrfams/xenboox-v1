import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import {
  rolePermissions,
  userPermissionOverrides,
  permissionAuditLog,
} from "@xenboox/db/schema/permissions";

import {
  handleMutationError,
  router,
  protectedProcedure,
  requireRole,
  paginationSchema,
  clearPermissionCache,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";

// ─── Admin Permissions Router ────────────────────────────────────────────────

export const permissionsAdminRouter = router({
  // ── List all permissions for a role ──
  listByRole: protectedProcedure
    .use(requireRole("owner", "admin"))
    .input(z.object({ role: z.string() }))
    .query(async ({ ctx, input }) => {
      const perms = await db.query.rolePermissions.findMany({
        where: eq(rolePermissions.role, input.role as any),
        orderBy: (t: any) => [t.module, t.action],
      });
      return perms;
    }),

  // ── List all permissions (grouped by role, paginated) ──
  listAll: protectedProcedure
    .use(requireRole("owner", "admin"))
    .input(paginationSchema.optional())
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const perms = await db.query.rolePermissions.findMany({
        orderBy: (t: any) => [t.role, t.module, t.action],
        limit,
        offset,
      });
      return perms;
    }),

  // ── Get permission for a specific role x module x action ──
  getPermission: protectedProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        role: z.string(),
        module: z.string(),
        action: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const perm = await db.query.rolePermissions.findFirst({
        where: and(
          eq(rolePermissions.role, input.role as any),
          eq(rolePermissions.module, input.module as any),
          eq(rolePermissions.action, input.action as any),
        ),
      });
      return perm;
    }),

  // ── Upsert a permission entry (create or update scope) ──
  upsertPermission: protectedProcedure
    .use(requireRole("owner"))
    .input(
      z.object({
        role: z.string(),
        module: z.string(),
        action: z.string(),
        scope: z.enum(["full", "scoped", "none"]),
        description: z.string().optional(),
        scopeCondition: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.rolePermissions.findFirst({
          where: and(
            eq(rolePermissions.role, input.role as any),
            eq(rolePermissions.module, input.module as any),
            eq(rolePermissions.action, input.action as any),
          ),
        });

        if (existing) {
          const [updated] = await db
            .update(rolePermissions)
            .set({
              scope: input.scope as any,
              description: input.description,
              scopeCondition: input.scopeCondition,
              updatedAt: new Date(),
            })
            .where(eq(rolePermissions.id, existing.id))
            .returning();

          // Invalidate permission cache so changes take effect immediately
          clearPermissionCache();

          await db.insert(permissionAuditLog).values({
            userId: ctx.session!.user!.id!,
            action: "role_permission_updated",
            targetRole: input.role as any,
            module: input.module as any,
            actionName: input.action as any,
            oldScope: existing.scope,
            newScope: input.scope as any,
            details: `Updated ${input.role}:${input.module}:${input.action} from ${existing.scope} to ${input.scope}`,
          });

          return updated;
        }

        const [created] = await db
          .insert(rolePermissions)
          .values({
            role: input.role as any,
            module: input.module as any,
            action: input.action as any,
            scope: input.scope as any,
            description: input.description,
            scopeCondition: input.scopeCondition,
          })
          .returning();

        clearPermissionCache();

        await db.insert(permissionAuditLog).values({
          userId: ctx.session!.user!.id!,
          action: "role_permission_updated",
          targetRole: input.role as any,
          module: input.module as any,
          actionName: input.action as any,
          newScope: input.scope as any,
          details: `Created ${input.role}:${input.module}:${input.action} = ${input.scope}`,
        });

        return created;
      } catch (error) {
        handleMutationError(error, "Failed to upsert permission");
      }
    }),

  // ── Bulk set permissions for a role ──
  bulkSetRolePermissions: protectedProcedure
    .use(requireRole("owner"))
    .input(
      z.object({
        role: z.string(),
        permissions: z.array(
          z.object({
            module: z.string(),
            action: z.string(),
            scope: z.enum(["full", "scoped", "none"]),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await db.transaction(async (tx) => {
          await tx
            .delete(rolePermissions)
            .where(eq(rolePermissions.role, input.role as any));

          for (const perm of input.permissions) {
            await tx.insert(rolePermissions).values({
              role: input.role as any,
              module: perm.module as any,
              action: perm.action as any,
              scope: perm.scope as any,
            });
          }
        });

        clearPermissionCache();

        await db.insert(permissionAuditLog).values({
          userId: ctx.session!.user!.id!,
          action: "role_permission_updated",
          targetRole: input.role as any,
          details: `Bulk updated ${input.role} with ${input.permissions.length} permissions`,
        });

        return { success: true, count: input.permissions.length };
      } catch (error) {
        handleMutationError(error, "Failed to bulk set permissions");
      }
    }),

  // ── List user permission overrides (entity-scoped) ──
  listOverrides: protectedProcedure
    .use(requireRole("owner", "admin"))
    .input(z.object({ userId: z.string().uuid() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(userPermissionOverrides.entityId, ctx.entityId!)];
      if (input?.userId) {
        conditions.push(eq(userPermissionOverrides.userId, input.userId));
      }
      return db.query.userPermissionOverrides.findMany({
        where: and(...conditions),
        orderBy: (t: any) => [t.userId, t.module, t.action],
      });
    }),

  // ── Grant/revoke a user permission override (entity-scoped) ──
  setUserOverride: protectedProcedure
    .use(requireRole("owner", "admin"))
    .input(
      z.object({
        userId: z.string().uuid(),
        module: z.string(),
        action: z.string(),
        grant: z.boolean(),
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.userPermissionOverrides.findFirst({
          where: and(
            eq(userPermissionOverrides.userId, input.userId),
            eq(userPermissionOverrides.entityId, ctx.entityId!),
            eq(userPermissionOverrides.module, input.module as any),
            eq(userPermissionOverrides.action, input.action as any),
          ),
        });

        if (existing) {
          const [updated] = await db
            .update(userPermissionOverrides)
            .set({
              grant: input.grant,
              reason: input.reason,
              grantedBy: ctx.session!.user!.id!,
              updatedAt: new Date(),
            })
            .where(eq(userPermissionOverrides.id, existing.id))
            .returning();

          await db.insert(permissionAuditLog).values({
            userId: ctx.session!.user!.id!,
            action: input.grant ? "override_granted" : "override_revoked",
            targetUserId: input.userId,
            module: input.module as any,
            actionName: input.action as any,
            details: `${input.grant ? "Granted" : "Revoked"} ${input.module}:${input.action} for user ${input.userId} in entity ${ctx.entityId}${input.reason ? ` - ${input.reason}` : ""}`,
          });

          return updated;
        }

        const [created] = await db
          .insert(userPermissionOverrides)
          .values({
            userId: input.userId,
            entityId: ctx.entityId!,
            module: input.module as any,
            action: input.action as any,
            grant: input.grant,
            grantedBy: ctx.session!.user!.id!,
            reason: input.reason,
          })
          .returning();

        await db.insert(permissionAuditLog).values({
          userId: ctx.session!.user!.id!,
          action: input.grant ? "override_granted" : "override_revoked",
          targetUserId: input.userId,
          module: input.module as any,
          actionName: input.action as any,
          details: `${input.grant ? "Granted" : "Revoked"} ${input.module}:${input.action} for user ${input.userId} in entity ${ctx.entityId}`,
        });

        return created;
      } catch (error) {
        handleMutationError(error, "Failed to set user override");
      }
    }),

  // ── Get my current permissions for the session entity ──
  myPermissions: protectedProcedure.query(async ({ ctx }) => {
    const role = ctx.entityRole!;
    const perms = await db.query.rolePermissions.findMany({
      where: eq(rolePermissions.role, role as any),
      columns: {
        module: true,
        action: true,
        scope: true,
        scopeCondition: true,
        description: true,
      },
    });

    // Check for user-specific overrides scoped to current entity
    const overrides = await db.query.userPermissionOverrides.findMany({
      where: and(
        eq(userPermissionOverrides.userId, ctx.session!.user!.id!),
        eq(userPermissionOverrides.entityId, ctx.entityId!),
        eq(userPermissionOverrides.grant, false),
      ),
      columns: {
        module: true,
        action: true,
        grant: true,
      },
    });

    // Apply overrides (revocations) to the permission list
    const overrideMap = new Map(
      overrides.map((o) => [`${o.module}:${o.action}`, o]),
    );

    const result = perms
      .filter((p) => {
        const key = `${p.module}:${p.action}`;
        const override = overrideMap.get(key);
        return !override || override.grant !== false;
      })
      .map((p) => ({
        module: p.module,
        action: p.action,
        scope: p.scope,
      }));

    return result;
  }),
});
