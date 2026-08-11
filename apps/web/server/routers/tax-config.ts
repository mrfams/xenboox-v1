// ─── Tax Configuration Router ─────────────────────────────────────────────
//
// Self-service tax management: users create taxes for their own jurisdiction
// (or any country), edit the built-in rates when laws change (which creates
// a NEW VERSION — never overwrites in place), configure conditional rules,
// per-person rate overrides, and employer/employee contribution splits.
//
// Every mutation is entity-scoped, owner/admin/finance_director-gated, and
// audit-logged. Computation happens through the same pure engine the payroll
// pipeline uses, so the Settings preview and real payroll always agree.

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "@/lib/db";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  jurisdictionTaxRules,
  taxRateOverrides,
  taxRuleTypeEnum,
} from "@xenboox/db/schema/tax-compliance";
import { entities } from "@xenboox/db/schema/organization";
import {
  calculateTax,
  calculateSplitContribution,
  getTaxPresetsForCountry,
  type TaxRateConfig,
  type TaxPreset,
} from "@xenboox/agents";
import {
  router,
  protectedProcedure,
  mutateProcedure,
  requireRole,
} from "@/lib/trpc/server";

// ─── Zod schemas ────────────────────────────────────────────────────────────

const bandSchema = z.object({
  from: z.number().min(0),
  to: z.number().min(0).nullable(),
  rate: z.number().min(0).max(1),
  cumulative: z.boolean().optional(),
});

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(["eq", "neq", "gte", "lte", "in"]),
  value: z.union([
    z.string(),
    z.number(),
    z.array(z.union([z.string(), z.number()])),
  ]),
  rate: z.number().min(0).max(1),
  fixedAmount: z.number().min(0).optional(),
});

const rateConfigSchema: z.ZodType<TaxRateConfig> = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("rate"),
      rate: z.number().min(0).max(1).optional(),
      threshold: z.number().min(0).optional(),
      ceiling: z.number().min(0).optional(),
      employeeRate: z.number().min(0).max(1).optional(),
      employerRate: z.number().min(0).max(1).optional(),
    }),
    z.object({
      type: z.literal("fixed"),
      fixedAmount: z.number().min(0),
      threshold: z.number().min(0).optional(),
    }),
    z.object({
      type: z.literal("bands"),
      bands: z.array(bandSchema).min(1),
      threshold: z.number().min(0).optional(),
      ceiling: z.number().min(0).optional(),
      employeeRate: z.number().min(0).max(1).optional(),
      employerRate: z.number().min(0).max(1).optional(),
    }),
    z.object({
      type: z.literal("conditional"),
      conditions: z.array(conditionSchema).min(1),
      rate: z.number().min(0).max(1).optional(),
      threshold: z.number().min(0).optional(),
      employeeRate: z.number().min(0).max(1).optional(),
      employerRate: z.number().min(0).max(1).optional(),
    }),
  ])
  .superRefine((v, ctx) => {
    // A rate rule needs either a combined rate or a split pair (or both).
    // This is what allows social-security-style employer/employee rules.
    if (v.type === "rate" && v.rate === undefined) {
      if (v.employeeRate === undefined && v.employerRate === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rate"],
          message: "Provide a rate, or employer/employee rates for a split",
        });
      }
    }
  });

type TaxRuleType = (typeof taxRuleTypeEnum.enumValues)[number];
// Zod enum typed to the exact pgEnum union so filters/inserts match the
// database column type (string widens and tsc rejects it).
const RULE_TYPES = taxRuleTypeEnum.enumValues as [
  TaxRuleType,
  ...TaxRuleType[],
];
const ruleTypeSchema = z.enum(RULE_TYPES);

const createRuleSchema = z.object({
  country: z.string().length(2).toUpperCase(),
  ruleType: ruleTypeSchema,
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  appliesTo: z
    .enum(["sales", "purchases", "payroll", "income", "other"])
    .default("sales"),
  rateConfig: rateConfigSchema,
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  notes: z.string().max(1000).optional(),
});

const overrideSchema = z.object({
  taxRuleId: z.string().uuid(),
  appliesToType: z.enum([
    "customer",
    "vendor",
    "employee",
    "product_category",
    "other",
  ]),
  appliesToId: z.string().min(1),
  appliesToName: z.string().max(120).optional(),
  rate: z.number().min(0).max(1).nullable().optional(),
  fixedAmount: z.number().min(0).nullable().optional(),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  notes: z.string().max(500).optional(),
});

// ─── Shared validation ──────────────────────────────────────────────────────

/** Only valid for known entity IDs — always exists in practice. */
async function assertEntity(ctx: { entityId?: string | null }) {
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, ctx.entityId ?? ""),
  });
  if (!entity) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Entity not found" });
  }
  return entity;
}

async function getRule(entityId: string, ruleId: string) {
  const rule = await db.query.jurisdictionTaxRules.findFirst({
    where: and(
      eq(jurisdictionTaxRules.entityId, entityId),
      eq(jurisdictionTaxRules.id, ruleId),
    ),
  });
  if (!rule) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Tax rule not found" });
  }
  return rule;
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const taxConfigRouter = router({
  // ── Read ─────────────────────────────────────────────────────────────

  listRules: protectedProcedure
    .input(
      z
        .object({
          country: z.string().length(2).toUpperCase().optional(),
          ruleType: ruleTypeSchema.optional(),
          status: z.enum(["draft", "active", "superseded"]).optional(),
          includeSuperseded: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(jurisdictionTaxRules.entityId, ctx.entityId!)];
      if (input?.country) {
        where.push(eq(jurisdictionTaxRules.country, input.country));
      }
      if (input?.ruleType) {
        where.push(eq(jurisdictionTaxRules.ruleType, input.ruleType));
      }
      if (input?.status) {
        where.push(eq(jurisdictionTaxRules.status, input.status));
      } else if (!input?.includeSuperseded) {
        // Default: show current + draft, hide superseded history rows.
        where.push(sql`${jurisdictionTaxRules.status} <> 'superseded'`);
      }

      const rules = await db.query.jurisdictionTaxRules.findMany({
        where: and(...where),
        orderBy: [
          desc(jurisdictionTaxRules.country),
          desc(jurisdictionTaxRules.version),
        ],
      });

      return {
        rules,
        count: rules.length,
      };
    }),

  listRulesWithHistory: protectedProcedure
    .input(z.object({ country: z.string().length(2).toUpperCase() }))
    .query(async ({ ctx, input }) => {
      return db.query.jurisdictionTaxRules.findMany({
        where: and(
          eq(jurisdictionTaxRules.entityId, ctx.entityId!),
          eq(jurisdictionTaxRules.country, input.country),
        ),
        orderBy: [desc(jurisdictionTaxRules.version)],
      });
    }),

  // ── Create ───────────────────────────────────────────────────────────

  createRule: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(createRuleSchema)
    .mutation(async ({ ctx, input }) => {
      await assertEntity(ctx);

      // Version 1 of this (country, ruleType, name) — or continue the
      // sequence if an existing rule with the same identity is superseded.
      const latest = await db.query.jurisdictionTaxRules.findFirst({
        where: and(
          eq(jurisdictionTaxRules.entityId, ctx.entityId!),
          eq(jurisdictionTaxRules.country, input.country),
          eq(jurisdictionTaxRules.ruleType, input.ruleType),
          eq(jurisdictionTaxRules.name, input.name),
        ),
        orderBy: [desc(jurisdictionTaxRules.version)],
      });

      const version = latest ? latest.version + 1 : 1;

      const [rule] = await db
        .insert(jurisdictionTaxRules)
        .values({
          entityId: ctx.entityId!,
          country: input.country,
          ruleType: input.ruleType,
          version,
          name: input.name,
          description: input.description,
          appliesTo: input.appliesTo,
          rateOrBands: input.rateConfig,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo ?? null,
          status: "active",
          proposedBy: ctx.session!.user!.id!,
          approvedBy: ctx.session!.user!.id!,
          approvedAt: new Date(),
          notes: input.notes,
        })
        .returning();

      return rule;
    }),

  // ── Update (new version — never overwrite in place) ───────────────────

  updateRule: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      createRuleSchema.extend({
        ruleId: z.string().uuid(),
        supersedeNote: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertEntity(ctx);
      const existing = await getRule(ctx.entityId!, input.ruleId);

      // Supersede the current active version (law change / correction).
      await db
        .update(jurisdictionTaxRules)
        .set({
          status: "superseded",
          effectiveTo:
            input.effectiveFrom <= (existing.effectiveFrom ?? "")
              ? existing.effectiveFrom
              : input.effectiveFrom,
          notes: [
            existing.notes,
            input.supersedeNote ? `Superseded: ${input.supersedeNote}` : null,
          ]
            .filter(Boolean)
            .join(" | "),
        })
        .where(eq(jurisdictionTaxRules.id, input.ruleId));

      // Insert the next version with the new config.
      const [rule] = await db
        .insert(jurisdictionTaxRules)
        .values({
          entityId: ctx.entityId!,
          country: input.country,
          ruleType: input.ruleType,
          version: existing.version + 1,
          name: input.name,
          description: input.description,
          appliesTo: input.appliesTo,
          rateOrBands: input.rateConfig,
          effectiveFrom: input.effectiveFrom,
          effectiveTo: input.effectiveTo ?? null,
          status: "active",
          proposedBy: ctx.session!.user!.id!,
          approvedBy: ctx.session!.user!.id!,
          approvedAt: new Date(),
          notes: input.notes,
        })
        .returning();

      return rule;
    }),

  // ── Lifecycle ─────────────────────────────────────────────────────────

  deactivateRule: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        ruleId: z.string().uuid(),
        effectiveTo: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getRule(ctx.entityId!, input.ruleId);
      await db
        .update(jurisdictionTaxRules)
        .set({
          status: "superseded",
          effectiveTo:
            input.effectiveTo ?? new Date().toISOString().slice(0, 10),
          notes: [
            sql`notes`,
            input.reason ? `Deactivated: ${input.reason}` : null,
          ]
            .filter(Boolean)
            .join(" | ") as unknown as string,
        })
        .where(eq(jurisdictionTaxRules.id, input.ruleId));
      return { success: true };
    }),

  reactivateRule: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ ruleId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await getRule(ctx.entityId!, input.ruleId);
      await db
        .update(jurisdictionTaxRules)
        .set({ status: "active", effectiveTo: null })
        .where(eq(jurisdictionTaxRules.id, input.ruleId));
      return { success: true };
    }),

  // ── Per-person / per-item overrides ──────────────────────────────────

  listOverrides: protectedProcedure
    .input(
      z
        .object({
          taxRuleId: z.string().uuid().optional(),
          appliesToType: z
            .enum([
              "customer",
              "vendor",
              "employee",
              "product_category",
              "other",
            ])
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where = [eq(taxRateOverrides.entityId, ctx.entityId!)];
      if (input?.taxRuleId) {
        where.push(eq(taxRateOverrides.taxRuleId, input.taxRuleId));
      }
      if (input?.appliesToType) {
        where.push(eq(taxRateOverrides.appliesToType, input.appliesToType));
      }
      return db.query.taxRateOverrides.findMany({
        where: and(...where),
        orderBy: [desc(taxRateOverrides.createdAt)],
      });
    }),

  upsertOverride: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(overrideSchema)
    .mutation(async ({ ctx, input }) => {
      await assertEntity(ctx);
      await getRule(ctx.entityId!, input.taxRuleId);

      const existing = await db.query.taxRateOverrides.findFirst({
        where: and(
          eq(taxRateOverrides.entityId, ctx.entityId!),
          eq(taxRateOverrides.taxRuleId, input.taxRuleId),
          eq(taxRateOverrides.appliesToType, input.appliesToType),
          eq(taxRateOverrides.appliesToId, input.appliesToId),
        ),
      });

      if (existing) {
        const [updated] = await db
          .update(taxRateOverrides)
          .set({
            appliesToName: input.appliesToName,
            rate: input.rate?.toString() ?? null,
            fixedAmount: input.fixedAmount?.toString() ?? null,
            effectiveFrom: input.effectiveFrom,
            effectiveTo: input.effectiveTo ?? null,
            notes: input.notes,
            isActive: true,
          })
          .where(eq(taxRateOverrides.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await db
        .insert(taxRateOverrides)
        .values({
          entityId: ctx.entityId!,
          taxRuleId: input.taxRuleId,
          appliesToType: input.appliesToType,
          appliesToId: input.appliesToId,
          appliesToName: input.appliesToName,
          rate: input.rate?.toString() ?? null,
          fixedAmount: input.fixedAmount?.toString() ?? null,
          effectiveFrom:
            input.effectiveFrom ?? new Date().toISOString().slice(0, 10),
          effectiveTo: input.effectiveTo ?? null,
          notes: input.notes,
        })
        .returning();
      return created;
    }),

  deleteOverride: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ overrideId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await db.query.taxRateOverrides.findFirst({
        where: and(
          eq(taxRateOverrides.entityId, ctx.entityId!),
          eq(taxRateOverrides.id, input.overrideId),
        ),
      });
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Override not found",
        });
      }
      await db
        .delete(taxRateOverrides)
        .where(eq(taxRateOverrides.id, input.overrideId));
      return { success: true };
    }),

  // ── Preset packs (Settings UI self-service installs) ───────────────────

  listPresets: protectedProcedure
    .input(z.object({ country: z.string().length(2).toUpperCase() }))
    .query(async ({ ctx, input }) => {
      const catalog = getTaxPresetsForCountry(input.country);
      if (catalog.length === 0) {
        return { presets: [], installedIds: [] };
      }

      const installed = await db.query.jurisdictionTaxRules.findMany({
        where: and(
          eq(jurisdictionTaxRules.entityId, ctx.entityId!),
          eq(jurisdictionTaxRules.country, input.country),
          sql`${jurisdictionTaxRules.status} <> 'superseded'`,
        ),
        columns: { ruleType: true, name: true },
      });
      const installedKeys = new Set(
        installed.map((r) => `${r.ruleType}::${r.name}`),
      );

      const presets = catalog.map((p) => ({
        ...p,
        installed: installedKeys.has(`${p.ruleType}::${p.name}`),
      }));

      return {
        presets,
        installedIds: presets.filter((p) => p.installed).map((p) => p.id),
      };
    }),

  installPresets: mutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        country: z.string().length(2).toUpperCase(),
        presetIds: z.array(z.string().min(1)).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertEntity(ctx);

      const catalog = getTaxPresetsForCountry(input.country);
      const byId = new Map(catalog.map((p) => [p.id, p]));

      const requested = input.presetIds
        .map((id) => byId.get(id))
        .filter((p): p is TaxPreset => p !== undefined);

      if (requested.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No valid presets found for this country",
        });
      }

      // Idempotency: skip presets already installed as a non-superseded rule.
      const existing = await db.query.jurisdictionTaxRules.findMany({
        where: and(
          eq(jurisdictionTaxRules.entityId, ctx.entityId!),
          eq(jurisdictionTaxRules.country, input.country),
          sql`${jurisdictionTaxRules.status} <> 'superseded'`,
        ),
        columns: { ruleType: true, name: true, version: true },
      });
      const existingKeys = new Set(
        existing.map((r) => `${r.ruleType}::${r.name}`),
      );

      const toInstall = requested.filter(
        (p) => !existingKeys.has(`${p.ruleType}::${p.name}`),
      );
      const skipped = requested.length - toInstall.length;

      if (toInstall.length > 0) {
        // Versioning contract: a re-install after a supersede/deactivate must
        // continue the version sequence for the (country, ruleType, name)
        // identity, exactly like createRule — never collide with an old v1.
        const history = await db.query.jurisdictionTaxRules.findMany({
          where: and(
            eq(jurisdictionTaxRules.entityId, ctx.entityId!),
            eq(jurisdictionTaxRules.country, input.country),
          ),
          columns: { ruleType: true, name: true, version: true },
        });
        const latestVersion = new Map<string, number>();
        for (const row of history) {
          const key = `${row.ruleType}::${row.name}`;
          latestVersion.set(
            key,
            Math.max(latestVersion.get(key) ?? 0, row.version),
          );
        }

        await db.insert(jurisdictionTaxRules).values(
          toInstall.map((p) => {
            const key = `${p.ruleType}::${p.name}`;
            return {
              entityId: ctx.entityId!,
              country: input.country,
              ruleType: p.ruleType,
              version: (latestVersion.get(key) ?? 0) + 1,
              name: p.name,
              description: p.description,
              appliesTo: p.appliesTo,
              rateOrBands: p.rateConfig,
              effectiveFrom: p.effectiveFrom,
              effectiveTo: null,
              status: "active" as const,
              proposedBy: ctx.session!.user!.id!,
              approvedBy: ctx.session!.user!.id!,
              approvedAt: new Date(),
              notes: `Installed from ${input.country} preset pack (${p.source})`,
            };
          }),
        );
      }

      return {
        installed: toInstall.length,
        skipped,
        installedNames: toInstall.map((p) => p.name),
      };
    }),

  // ── Preview computation (Settings UI + agent parity) ───────────────────

  preview: protectedProcedure
    .input(
      z.object({
        rateConfig: rateConfigSchema,
        amount: z.number().min(0),
        productCategory: z.string().optional(),
        customerType: z.string().optional(),
        location: z.string().optional(),
        split: z.boolean().default(false),
      }),
    )
    .query(async ({ input }) => {
      const result = calculateTax(input.rateConfig, input.amount, {
        productCategory: input.productCategory,
        customerType: input.customerType,
        location: input.location,
      });

      const split = input.split
        ? calculateSplitContribution(input.rateConfig, input.amount)
        : null;

      return {
        amount: result.amount,
        method: result.method,
        effectiveRate: result.effectiveRate ?? null,
        breakdown: result.breakdown ?? [],
        split,
      };
    }),
});
