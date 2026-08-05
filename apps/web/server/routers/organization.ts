import { z } from "zod";
import {
  handleMutationError,
  router,
  protectedProcedure,
  authProcedure,
  mutateProcedure,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  organizations,
  entities,
  userEntityAccess,
} from "@xenboox/db/schema/organization";
import { users } from "@xenboox/db/schema/auth";
import { orgRoles } from "@xenboox/db/schema/org-roles";
import { pendingInvites } from "@xenboox/db/schema/invitations";
import { bankAccounts } from "@xenboox/db/schema/treasury";
import { invoicesAp, salesInvoices } from "@xenboox/db/schema/ap-ar";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";
import { TRPCError } from "@trpc/server";
import { runOnboardingPipeline } from "@xenboox/agents";
import { auditLog } from "@xenboox/db/schema/documents";
import { logger } from "@/lib/logger";

export const organizationRouter = router({
  // ─── CURRENT USER ──────────────────────────────

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null;
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id!),
      columns: { id: true, name: true, email: true, emailVerified: true },
    });
    return user;
  }),

  listUserEntities: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return [];
    const userId = ctx.session.user.id!;

    // Collect entities from orgRoles (org-level owner/admin access)
    const userOrgRoles = await db.query.orgRoles.findMany({
      where: eq(orgRoles.userId, userId),
      columns: { orgId: true, role: true },
    });
    const orgEntityPromises = userOrgRoles.map(async (r) => {
      const orgEntities = await db.query.entities.findMany({
        where: eq(entities.organizationId, r.orgId),
        columns: { id: true, name: true },
      });
      return orgEntities.map((e) => ({
        id: e.id,
        name: e.name,
        role: r.role,
      }));
    });
    const orgEntities = (await Promise.all(orgEntityPromises)).flat();

    // Collect entities from user_entity_access
    const access = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, userId),
    });
    const accessEntityIds = access.map((a) => a.entityId);
    const entityList =
      accessEntityIds.length > 0
        ? await db.query.entities.findMany({
            where: inArray(entities.id, accessEntityIds),
          })
        : [];
    const entityMap = new Map(entityList.map((e) => [e.id, e]));
    const accessEntities = accessEntityIds
      .filter((id) => entityMap.has(id))
      .map((id) => {
        const entity = entityMap.get(id)!;
        const acc = access.find((a) => a.entityId === id);
        return {
          id: entity.id,
          name: entity.name,
          role: acc?.role ?? "member",
        };
      });

    // Combine and deduplicate by entity id (prefer orgRoles for role display)
    const seen = new Set<string>();
    const combined = [...orgEntities, ...accessEntities].filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    return combined;
  }),

  getEntitySummary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.entityId)
      return {
        cashBalance: 0,
        apOutstanding: 0,
        arOutstanding: 0,
        currentPeriod: "No period",
      };
    const entityId = ctx.entityId;

    // Get cash balance from bank accounts
    const bankAccs = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId),
    });
    const cashBalance = bankAccs.reduce(
      (sum, a) => sum + parseFloat(a.currentBalance || "0"),
      0,
    );

    // Get AP outstanding (sum of unpaid invoice balances)
    const apInvs = await db.query.invoicesAp.findMany({
      where: and(
        eq(invoicesAp.entityId, entityId),
        eq(invoicesAp.status, "pending"),
      ),
    });
    const apOutstanding = apInvs.reduce(
      (sum, i) => sum + parseFloat(i.balance || "0"),
      0,
    );

    // Get AR outstanding (sum of unpaid sales invoice balances)
    const arInvs = await db.query.salesInvoices.findMany({
      where: and(
        eq(salesInvoices.entityId, entityId),
        eq(salesInvoices.status, "pending"),
      ),
    });
    const arOutstanding = arInvs.reduce(
      (sum, i) => sum + parseFloat(i.balance || "0"),
      0,
    );

    // Get current fiscal period
    const periods = await db.query.fiscalPeriods.findMany({
      where: eq(fiscalPeriods.entityId, entityId),
      orderBy: [desc(fiscalPeriods.startDate)],
    });
    const now = new Date();
    const current = periods.find(
      (p) => new Date(p.startDate) <= now && new Date(p.endDate) >= now,
    );
    const currentPeriod = current
      ? `${current.year}-${String(current.month).padStart(2, "0")}`
      : "No period";

    return { cashBalance, apOutstanding, arOutstanding, currentPeriod };
  }),

  // ─── ORGANIZATIONS ─────────────────────────────

  list: authProcedure.query(async ({ ctx }) => {
    const userId = ctx.session!.user!.id!;
    // Get orgs where user has an org_roles entry (owner/admin)
    const userRoles = await db.query.orgRoles.findMany({
      where: eq(orgRoles.userId, userId),
      columns: { orgId: true },
    });
    if (userRoles.length === 0) return [];
    const orgIds = userRoles.map((r) => r.orgId);
    return db.query.organizations.findMany({
      where: inArray(organizations.id, orgIds),
    });
  }),

  create: authProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200),
        slug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9-]+$/),
        type: z
          .enum(["business", "nonprofit", "government", "accounting_firm"])
          .default("business"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session!.user!.id!;

        const existing = await db.query.organizations.findFirst({
          where: eq(organizations.slug, input.slug),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Slug already taken",
          });
        }

        // Create org + org_roles (owner) + org-level admin bypass for creator
        const [org] = await db
          .insert(organizations)
          .values({
            name: input.name,
            slug: input.slug,
            type: input.type,
            ownerId: userId,
            billingOwnerUserId: userId,
          })
          .returning();

        // Grant org-level owner role
        await db.insert(orgRoles).values({
          userId,
          orgId: org.id,
          role: "owner",
          grantedBy: userId,
        });

        // Auto-create a default entity and grant entity-level owner access
        const [entity] = await db
          .insert(entities)
          .values({
            organizationId: org.id,
            name: input.name,
            type: "company",
          })
          .returning();

        await db.insert(userEntityAccess).values({
          userId,
          entityId: entity.id,
          role: "owner",
          grantedBy: userId,
        });

        return { organization: org, entity };
      } catch (error) {
        handleMutationError(error, "Failed to create organization");
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const role = await db.query.orgRoles.findFirst({
        where: and(
          eq(orgRoles.userId, ctx.session!.user!.id!),
          eq(orgRoles.orgId, input.id),
          eq(orgRoles.role, "owner"),
        ),
      });
      if (!role) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only the organization owner can update it",
        });
      }
      const [updated] = await db
        .update(organizations)
        .set({ name: input.name })
        .where(eq(organizations.id, input.id))
        .returning();
      return updated;
    }),

  // ─── ENTITIES ──────────────────────────────────

  listEntities: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      if (input.organizationId) {
        // Check orgRoles for access to this org
        const role = await db.query.orgRoles.findFirst({
          where: and(
            eq(orgRoles.userId, ctx.session!.user!.id!),
            eq(orgRoles.orgId, input.organizationId),
          ),
        });
        if (!role) {
          // Fallback: check userEntityAccess for entities in this org
          const orgEntities = await db.query.entities.findMany({
            where: eq(entities.organizationId, input.organizationId),
            columns: { id: true },
          });
          if (orgEntities.length === 0) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
          const access = await db.query.userEntityAccess.findFirst({
            where: and(
              eq(userEntityAccess.userId, ctx.session!.user!.id!),
              inArray(
                userEntityAccess.entityId,
                orgEntities.map((e) => e.id),
              ),
            ),
          });
          if (!access) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Access denied",
            });
          }
        }
        return db.query.entities.findMany({
          where: eq(entities.organizationId, input.organizationId),
        });
      }
      // No org filter: return all entities the user can access via orgRoles or userEntityAccess
      const userRoles = await db.query.orgRoles.findMany({
        where: eq(orgRoles.userId, ctx.session!.user!.id!),
        columns: { orgId: true },
      });
      const orgIds = userRoles.map((r) => r.orgId);
      const access = await db.query.userEntityAccess.findMany({
        where: eq(userEntityAccess.userId, ctx.session!.user!.id!),
        columns: { entityId: true },
      });
      const accessEntityIds = access.map((a) => a.entityId);
      const allOrgIds = [...new Set(orgIds)];
      if (allOrgIds.length === 0 && accessEntityIds.length === 0) return [];
      // Fetch entities from orgRoles
      const orgEntities =
        allOrgIds.length > 0
          ? await db.query.entities.findMany({
              where: inArray(entities.organizationId, allOrgIds),
            })
          : [];
      // Fetch entities from direct access
      const dirEntities =
        accessEntityIds.length > 0
          ? await db.query.entities.findMany({
              where: inArray(entities.id, accessEntityIds),
            })
          : [];
      // Deduplicate
      const seen = new Set<string>();
      return [...orgEntities, ...dirEntities].filter((e) => {
        if (seen.has(e.id)) return false;
        seen.add(e.id);
        return true;
      });
    }),

  // createEntity uses authProcedure (authenticated but no entity scoping)
  // because we can't use protectedProcedure (requires entityId scoping).
  // Auth is handled by the authMiddleware — no manual session check needed.
  createEntity: authProcedure
    .input(
      z.object({
        organizationId: z.string().uuid(),
        name: z.string().min(1).max(200),
        type: z
          .enum(["company", "subsidiary", "branch", "client"])
          .default("company"),
        currency: z.string().length(3).default("GMD"),
        country: z.string().length(2).default("GM"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const userId = ctx.session!.user!.id!;

        // Check orgRoles for permission to create entities under this org
        const role = await db.query.orgRoles.findFirst({
          where: and(
            eq(orgRoles.userId, userId),
            eq(orgRoles.orgId, input.organizationId),
          ),
        });
        if (!role) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only org owners and admins can create entities",
          });
        }

        const [entity] = await db
          .insert(entities)
          .values({
            organizationId: input.organizationId,
            name: input.name,
            type: input.type,
            currency: input.currency,
            country: input.country,
          })
          .returning();

        // Grant admin access to creator
        await db.insert(userEntityAccess).values({
          userId,
          entityId: entity.id,
          role: "admin",
          grantedBy: userId,
        });

        return entity;
      } catch (error) {
        handleMutationError(error, "Failed to create entity");
      }
    }),

  updateEntity: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        currency: z.string().length(3).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await db.query.userEntityAccess.findFirst({
        where: and(
          eq(userEntityAccess.userId, ctx.session!.user!.id!),
          eq(userEntityAccess.entityId, input.id),
        ),
      });
      if (!access || !["owner", "admin"].includes(access.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can update entities",
        });
      }
      const [updated] = await db
        .update(entities)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.currency && { currency: input.currency }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        })
        .where(eq(entities.id, input.id))
        .returning();
      return updated;
    }),

  // ─── ORG-LEVEL OWNER SAFEGUARD (Milestone 10) ───

  /**
   * Removes a user's org-level role (owner/admin).
   * Blocks removal of the LAST owner — ownership must be transferred first.
   */
  removeOrgRole: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Current user must be an owner
        const currentRole = await db.query.orgRoles.findFirst({
          where: and(
            eq(orgRoles.userId, ctx.session!.user!.id!),
            eq(orgRoles.orgId, input.orgId),
            eq(orgRoles.role, "owner"),
          ),
        });
        if (!currentRole) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the organization owner can remove members",
          });
        }

        // Can't remove yourself as last owner
        if (input.userId === ctx.session!.user!.id!) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot remove yourself as owner. Use transferOwnership first.",
          });
        }

        // Check if the target is the last owner
        const targetRole = await db.query.orgRoles.findFirst({
          where: and(
            eq(orgRoles.userId, input.userId),
            eq(orgRoles.orgId, input.orgId),
          ),
        });
        if (!targetRole) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User is not a member of this organization",
          });
        }

        if (targetRole.role === "owner") {
          // Count total owners
          const owners = await db.query.orgRoles.findMany({
            where: and(
              eq(orgRoles.orgId, input.orgId),
              eq(orgRoles.role, "owner"),
            ),
          });
          if (owners.length <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "Cannot remove the last owner. Transfer ownership first via transferOwnership.",
            });
          }
        }

        // Remove org role
        await db
          .delete(orgRoles)
          .where(
            and(
              eq(orgRoles.userId, input.userId),
              eq(orgRoles.orgId, input.orgId),
            ),
          );

        // Audit trail
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "organization.removeOrgRole",
          entityType: "org_roles",
          newValues: { removedUserId: input.userId, orgId: input.orgId },
        });

        logger.info(
          {
            orgId: input.orgId,
            removedUserId: input.userId,
            byUserId: ctx.session!.user!.id!,
          },
          "Org role removed",
        );

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to remove org role");
      }
    }),

  // ─── USER ENTITY ACCESS ────────────────────────

  // ─── OWNERSHIP TRANSFER (Milestone 10) ──────────

  transferOwnership: protectedProcedure
    .input(
      z.object({
        orgId: z.string().uuid(),
        newOwnerUserId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Check current user is an owner of this org
        const currentRole = await db.query.orgRoles.findFirst({
          where: and(
            eq(orgRoles.userId, ctx.session!.user!.id!),
            eq(orgRoles.orgId, input.orgId),
            eq(orgRoles.role, "owner"),
          ),
        });
        if (!currentRole) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the organization owner can transfer ownership",
          });
        }

        // Check the new owner is already an org member
        const newOwnerRole = await db.query.orgRoles.findFirst({
          where: and(
            eq(orgRoles.userId, input.newOwnerUserId),
            eq(orgRoles.orgId, input.orgId),
          ),
        });
        if (!newOwnerRole) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "New owner must already be a member of this organization",
          });
        }

        // Demote current owner to admin
        await db
          .update(orgRoles)
          .set({ role: "admin" })
          .where(
            and(
              eq(orgRoles.userId, ctx.session!.user!.id!),
              eq(orgRoles.orgId, input.orgId),
            ),
          );

        // Promote new owner
        await db
          .update(orgRoles)
          .set({ role: "owner" })
          .where(
            and(
              eq(orgRoles.userId, input.newOwnerUserId),
              eq(orgRoles.orgId, input.orgId),
            ),
          );

        // Update organization owner reference
        await db
          .update(organizations)
          .set({ ownerId: input.newOwnerUserId })
          .where(eq(organizations.id, input.orgId));

        logger.info(
          {
            orgId: input.orgId,
            fromUserId: ctx.session!.user!.id!,
            toUserId: input.newOwnerUserId,
          },
          "Ownership transferred",
        );

        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to transfer ownership");
      }
    }),

  listAccess: protectedProcedure
    .input(z.object({ entityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const access = await db.query.userEntityAccess.findFirst({
        where: and(
          eq(userEntityAccess.userId, ctx.session!.user!.id!),
          eq(userEntityAccess.entityId, input.entityId),
        ),
      });
      if (!access) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return db.query.userEntityAccess.findMany({
        where: eq(userEntityAccess.entityId, input.entityId),
      });
    }),

  grantAccess: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum([
          "owner",
          "admin",
          "finance_director",
          "accountant",
          "payroll_officer",
          "cashier",
          "department_manager",
          "employee",
          "external_auditor",
          "donor",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await db.query.userEntityAccess.findFirst({
        where: and(
          eq(userEntityAccess.userId, ctx.session!.user!.id!),
          eq(userEntityAccess.entityId, input.entityId),
        ),
      });
      if (!access || !["owner", "admin"].includes(access.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can grant access",
        });
      }
      const [newAccess] = await db
        .insert(userEntityAccess)
        .values({
          userId: input.userId,
          entityId: input.entityId,
          role: input.role,
          grantedBy: ctx.session!.user!.id!,
        })
        .returning();
      return newAccess;
    }),

  revokeAccess: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        userId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const access = await db.query.userEntityAccess.findFirst({
          where: and(
            eq(userEntityAccess.userId, ctx.session!.user!.id!),
            eq(userEntityAccess.entityId, input.entityId),
          ),
        });
        if (!access || !["owner", "admin"].includes(access.role)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only owners and admins can revoke access",
          });
        }
        // Cannot revoke yourself if you're the only owner
        if (input.userId === ctx.session!.user!.id!) {
          const owners = await db.query.userEntityAccess.findMany({
            where: and(
              eq(userEntityAccess.entityId, input.entityId),
              eq(userEntityAccess.role, "owner"),
            ),
          });
          if (owners.length <= 1) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Cannot revoke the last owner",
            });
          }
        }
        await db
          .delete(userEntityAccess)
          .where(
            and(
              eq(userEntityAccess.entityId, input.entityId),
              eq(userEntityAccess.userId, input.userId),
            ),
          );
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to revoke access");
      }
    }),

  updateRole: protectedProcedure
    .input(
      z.object({
        entityId: z.string().uuid(),
        userId: z.string().uuid(),
        role: z.enum([
          "owner",
          "admin",
          "finance_director",
          "accountant",
          "payroll_officer",
          "cashier",
          "department_manager",
          "employee",
          "external_auditor",
          "donor",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const access = await db.query.userEntityAccess.findFirst({
        where: and(
          eq(userEntityAccess.userId, ctx.session!.user!.id!),
          eq(userEntityAccess.entityId, input.entityId),
        ),
      });
      if (!access || !["owner", "admin"].includes(access.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only owners and admins can change roles",
        });
      }
      const [updated] = await db
        .update(userEntityAccess)
        .set({ role: input.role })
        .where(
          and(
            eq(userEntityAccess.entityId, input.entityId),
            eq(userEntityAccess.userId, input.userId),
          ),
        )
        .returning();
      return updated;
    }),

  // ─── Pipeline 6: Autonomous Onboarding ─────────────────────────────────

  runOnboardingPipeline: mutateProcedure
    .input(z.object({ entityName: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return runOnboardingPipeline(ctx.entityId!, input.entityName);
    }),
});
