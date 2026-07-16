// @ts-nocheck

import { z } from "zod"
import { router, protectedProcedure, publicProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import { eq, and, desc } from "drizzle-orm"
import { organizations, entities, userEntityAccess } from "@xenboox/db/schema/organization"
import { users } from "@xenboox/db/schema/auth"
import { bankAccounts } from "@xenboox/db/schema/treasury"
import { invoicesAp, salesInvoices } from "@xenboox/db/schema/ap-ar"
import { fiscalPeriods } from "@xenboox/db/schema/accounting"
import { TRPCError } from "@trpc/server"

export const organizationRouter = router({
  // ─── CURRENT USER ──────────────────────────────

  getCurrentUser: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.session.user.id!),
      columns: { id: true, name: true, email: true, emailVerified: true }
    })
    return user
  }),

  listUserEntities: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return []
    const access = await db.query.userEntityAccess.findMany({
      where: eq(userEntityAccess.userId, ctx.session.user.id!)
    })
    if (access.length === 0) return []
    const entityIds = access.map(a => a.entityId)
    const entityList = await Promise.all(
      entityIds.map(id => db.query.entities.findFirst({ where: eq(entities.id, id) }))
    )
    return entityList
      .filter(Boolean)
      .map((entity, i) => ({
        id: entity!.id,
        name: entity!.name,
        role: access[i]?.role || "member"
      }))
  }),

  getEntitySummary: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return null
    const entityId = ctx.session.user.entityId
    if (!entityId) return { cashBalance: 0, apOutstanding: 0, arOutstanding: 0, currentPeriod: "No period" }

    // Get cash balance from bank accounts
    const bankAccs = await db.query.bankAccounts.findMany({
      where: eq(bankAccounts.entityId, entityId)
    })
    const cashBalance = bankAccs.reduce((sum, a) => sum + parseFloat(a.currentBalance || "0"), 0)

    // Get AP outstanding (sum of unpaid invoice balances)
    const apInvs = await db.query.invoicesAp.findMany({
      where: and(eq(invoicesAp.entityId, entityId), eq(invoicesAp.status, "pending"))
    })
    const apOutstanding = apInvs.reduce((sum, i) => sum + parseFloat(i.balance || "0"), 0)

    // Get AR outstanding (sum of unpaid sales invoice balances)
    const arInvs = await db.query.salesInvoices.findMany({
      where: and(eq(salesInvoices.entityId, entityId), eq(salesInvoices.status, "pending"))
    })
    const arOutstanding = arInvs.reduce((sum, i) => sum + parseFloat(i.balance || "0"), 0)

    // Get current fiscal period
    const periods = await db.query.fiscalPeriods.findMany({
      where: eq(fiscalPeriods.entityId, entityId),
      orderBy: [desc(fiscalPeriods.startDate)]
    })
    const now = new Date()
    const current = periods.find(p => new Date(p.startDate) <= now && new Date(p.endDate) >= now)
    const currentPeriod = current?.name || "No period"

    return { cashBalance, apOutstanding, arOutstanding, currentPeriod }
  }),

  // ─── ORGANIZATIONS ─────────────────────────────

  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) return []
    return db.query.organizations.findMany({
      where: eq(organizations.ownerId, ctx.session.user.id!)
    })
  }),

  create: publicProcedure
    .input(z.object({
      name: z.string().min(1).max(200),
      slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
      type: z.enum(["business", "nonprofit", "government", "accounting_firm"]).default("business"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Must be logged in" })
      }

      const existing = await db.query.organizations.findFirst({
        where: eq(organizations.slug, input.slug)
      })
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Slug already taken" })
      }

      const [org] = await db.insert(organizations).values({
        name: input.name,
        slug: input.slug,
        type: input.type,
        ownerId: ctx.session.user.id!
      }).returning()

      // Auto-create a default entity and grant owner access
      const [entity] = await db.insert(entities).values({
        organizationId: org.id,
        name: input.name,
        type: "company",
      }).returning()

      await db.insert(userEntityAccess).values({
        userId: ctx.session.user.id!,
        entityId: entity.id,
        role: "owner",
        grantedBy: ctx.session.user.id!
      })

      return { organization: org, entity }
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(organizations)
        .set({ name: input.name })
        .where(eq(organizations.id, input.id))
        .returning()
      return updated
    }),

  // ─── ENTITIES ──────────────────────────────────

  listEntities: protectedProcedure
    .input(z.object({ organizationId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      // If no organizationId provided, get all orgs the user owns and list their entities
      if (input.organizationId) {
        return db.query.entities.findMany({
          where: eq(entities.organizationId, input.organizationId)
        })
      }
      const orgs = await db.query.organizations.findMany({
        where: eq(organizations.ownerId, ctx.session!.user!.id!)
      })
      if (orgs.length === 0) return []
      const allEntities = await Promise.all(
        orgs.map(org =>
          db.query.entities.findMany({
            where: eq(entities.organizationId, org.id)
          })
        )
      )
      return allEntities.flat()
    }),

  createEntity: protectedProcedure
    .input(z.object({
      organizationId: z.string().uuid(),
      name: z.string().min(1).max(200),
      type: z.enum(["company", "subsidiary", "branch", "client"]).default("company"),
      currency: z.string().length(3).default("GMD"),
      country: z.string().length(2).default("GM"),
    }))
    .mutation(async ({ ctx, input }) => {
      const [entity] = await db.insert(entities).values({
        organizationId: input.organizationId,
        name: input.name,
        type: input.type,
        currency: input.currency,
        country: input.country,
      }).returning()

      // Grant admin access to creator
      await db.insert(userEntityAccess).values({
        userId: ctx.session!.user!.id!,
        entityId: entity.id,
        role: "admin",
        grantedBy: ctx.session!.user!.id!
      })

      return entity
    }),

  updateEntity: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).max(200).optional(),
      currency: z.string().length(3).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(entities)
        .set({
          ...(input.name && { name: input.name }),
          ...(input.currency && { currency: input.currency }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        })
        .where(eq(entities.id, input.id))
        .returning()
      return updated
    }),

  // ─── USER ENTITY ACCESS ────────────────────────

  listAccess: protectedProcedure
    .input(z.object({ entityId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.userEntityAccess.findMany({
        where: eq(userEntityAccess.entityId, input.entityId)
      })
    }),

  grantAccess: protectedProcedure
    .input(z.object({
      entityId: z.string().uuid(),
      userId: z.string().uuid(),
      role: z.enum([
        "owner", "admin", "finance_director", "accountant",
        "payroll_officer", "cashier", "department_manager",
        "employee", "external_auditor", "donor"
      ]),
    }))
    .mutation(async ({ ctx, input }) => {
      const [access] = await db.insert(userEntityAccess).values({
        userId: input.userId,
        entityId: input.entityId,
        role: input.role,
        grantedBy: ctx.session!.user!.id!
      }).returning()
      return access
    }),

  revokeAccess: protectedProcedure
    .input(z.object({
      entityId: z.string().uuid(),
      userId: z.string().uuid(),
    }))
    .mutation(async ({ input }) => {
      await db.delete(userEntityAccess).where(
        and(
          eq(userEntityAccess.entityId, input.entityId),
          eq(userEntityAccess.userId, input.userId)
        )
      )
      return { success: true }
    }),

  updateRole: protectedProcedure
    .input(z.object({
      entityId: z.string().uuid(),
      userId: z.string().uuid(),
      role: z.enum([
        "owner", "admin", "finance_director", "accountant",
        "payroll_officer", "cashier", "department_manager",
        "employee", "external_auditor", "donor"
      ]),
    }))
    .mutation(async ({ input }) => {
      const [updated] = await db.update(userEntityAccess)
        .set({ role: input.role })
        .where(
          and(
            eq(userEntityAccess.entityId, input.entityId),
            eq(userEntityAccess.userId, input.userId)
          )
        )
        .returning()
      return updated
    }),
})
