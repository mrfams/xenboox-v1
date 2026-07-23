import { z } from "zod";
import {
  handleMutationError,
  router,
  protectedProcedure,
  publicProcedure,
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
import { bankAccounts } from "@xenboox/db/schema/treasury";
import { invoicesAp, salesInvoices } from "@xenboox/db/schema/ap-ar";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";
import { TRPCError } from "@trpc/server";
import { runOnboardingPipeline } from "@xenboox/agents";

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
    const access = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, ctx.session.user.id!),
    });
    if (access.length === 0) return [];
    const entityIds = access.map((a) => a.entityId);
    const entityList = await db.query.entities.findMany({
      where: inArray(entities.id, entityIds),
    });
    const entityMap = new Map(entityList.map((e) => [e.id, e]));
    return entityIds
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

  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return [];
    return db.query.organizations.findMany({
      where: eq(organizations.ownerId, ctx.session.user.id!),
    });
  }),

  create: publicProcedure
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
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Must be logged in",
          });
        }

        const existing = await db.query.organizations.findFirst({
          where: eq(organizations.slug, input.slug),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Slug already taken",
          });
        }

        const [org] = await db
          .insert(organizations)
          .values({
            name: input.name,
            slug: input.slug,
            type: input.type,
            ownerId: ctx.session.user.id!,
          })
          .returning();

        // Auto-create a default entity and grant owner access
        const [entity] = await db
          .insert(entities)
          .values({
            organizationId: org.id,
            name: input.name,
            type: "company",
          })
          .returning();

        await db.insert(userEntityAccess).values({
          userId: ctx.session.user.id!,
          entityId: entity.id,
          role: "owner",
          grantedBy: ctx.session.user.id!,
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
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, input.id),
      });
      if (!org)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organization not found",
        });
      if (org.ownerId !== ctx.session!.user!.id!) {
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
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, input.organizationId),
        });
        if (!org || org.ownerId !== ctx.session!.user!.id!) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
        return db.query.entities.findMany({
          where: eq(entities.organizationId, input.organizationId),
        });
      }
      const orgs = await db.query.organizations.findMany({
        where: eq(organizations.ownerId, ctx.session!.user!.id!),
      });
      if (orgs.length === 0) return [];
      const allEntities = await db.query.entities.findMany({
        where: inArray(
          entities.organizationId,
          orgs.map((o) => o.id),
        ),
      });
      return allEntities;
    }),

  createEntity: protectedProcedure
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
        userId: ctx.session!.user!.id!,
        entityId: entity.id,
        role: "admin",
        grantedBy: ctx.session!.user!.id!,
      });

      return entity;
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

  // ─── USER ENTITY ACCESS ────────────────────────

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
