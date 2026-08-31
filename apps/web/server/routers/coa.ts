import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, asc } from "drizzle-orm";
import { chartOfAccounts } from "@xenboox/db/schema/accounting";

import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requireRole,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { cachedDomain } from "@/lib/cache/tenant-cache";

// §4.1 — COA is read-heavy (loaded by every journal-entry form, invoice
// line, report builder) and changes rarely. Entity-scoped 60s cache; every
// mutation below invalidates the entity's entry so edits surface immediately.
const coaCache = cachedDomain("coa", 60_000);

type Account = (typeof chartOfAccounts.$inferSelect)[];

async function fetchAccounts(entityId: string): Promise<Account> {
  const cacheKey = "accounts";
  const cached = await coaCache.get<Account>(entityId, cacheKey);
  if (cached) return cached;
  const accounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
    orderBy: [asc(chartOfAccounts.code)],
  });
  await coaCache.set(entityId, cacheKey, accounts);
  return accounts;
}

export const coaRouter = router({
  list: rlsProtectedProcedure.query(async ({ ctx }) => {
    return fetchAccounts(ctx.entityId!);
  }),

  listHierarchy: rlsProtectedProcedure.query(async ({ ctx }) => {
    const accounts = await fetchAccounts(ctx.entityId!);

    const map = new Map<
      string,
      (typeof accounts)[number] & { children: typeof accounts }
    >();
    const roots: typeof accounts = [];

    for (const account of accounts) {
      map.set(account.id, { ...account, children: [] });
    }

    for (const account of accounts) {
      const node = map.get(account.id)!;
      if (account.parentId && map.has(account.parentId)) {
        map.get(account.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }),

  getById: rlsProtectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.chartOfAccounts.findFirst({
        where: and(
          eq(chartOfAccounts.id, input.id),
          eq(chartOfAccounts.entityId, ctx.entityId!),
        ),
      });
    }),

  create: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        code: z.string().min(1).max(20),
        name: z.string().min(1).max(200),
        type: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
        subtype: z.enum([
          "current_asset",
          "fixed_asset",
          "bank_account",
          "cash",
          "accounts_receivable",
          "inventory",
          "prepaid",
          "current_liability",
          "long_term_liability",
          "accounts_payable",
          "tax_liability",
          "accrued_liability",
          "owner_equity",
          "retained_earnings",
          "current_year_earnings",
          "sales_revenue",
          "service_revenue",
          "other_income",
          "interest_income",
          "cost_of_goods_sold",
          "operating_expense",
          "payroll_expense",
          "tax_expense",
          "depreciation",
          "interest_expense",
          "other_expense",
        ]),
        description: z.string().optional(),
        parentId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.chartOfAccounts.findFirst({
          where: and(
            eq(chartOfAccounts.entityId, ctx.entityId!),
            eq(chartOfAccounts.code, input.code),
          ),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Account code ${input.code} already exists`,
          });
        }

        const [account] = await db
          .insert(chartOfAccounts)
          .values({
            entityId: ctx.entityId!,
            code: input.code,
            name: input.name,
            type: input.type,
            subtype: input.subtype,
            description: input.description,
            parentId: input.parentId,
          })
          .returning();

        await coaCache.invalidate(ctx.entityId!);
        return account;
      } catch (error) {
        handleMutationError(error, "Failed to create account");
      }
    }),

  update: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).max(200).optional(),
        description: z.string().optional(),
        isActive: z.boolean().optional(),
        parentId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.chartOfAccounts.findFirst({
          where: and(
            eq(chartOfAccounts.id, input.id),
            eq(chartOfAccounts.entityId, ctx.entityId!),
          ),
        });
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Account not found",
          });
        const { id, ...data } = input;
        const [updated] = await db
          .update(chartOfAccounts)
          .set({
          ...(data.name && { name: data.name }),
          ...(data.description !== undefined && {
            description: data.description,
          }),
          ...(data.isActive !== undefined && { isActive: data.isActive }),
          ...(data.parentId !== undefined && { parentId: data.parentId }),
        })
        .where(
          and(
            eq(chartOfAccounts.id, id),
            eq(chartOfAccounts.entityId, ctx.entityId!),
          ),
        )
        .returning();
        await coaCache.invalidate(ctx.entityId!);
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update account");
      }
    }),

  delete: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.chartOfAccounts.findFirst({
          where: and(
            eq(chartOfAccounts.id, input.id),
            eq(chartOfAccounts.entityId, ctx.entityId!),
          ),
        });
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Account not found",
          });

        const children = await db.query.chartOfAccounts.findMany({
          where: eq(chartOfAccounts.parentId, input.id),
        });
        if (children.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Cannot delete account with children. Remove children first.",
          });
        }

        await db
          .delete(chartOfAccounts)
          .where(
            and(
              eq(chartOfAccounts.id, input.id),
              eq(chartOfAccounts.entityId, ctx.entityId!),
            ),
          );
        await coaCache.invalidate(ctx.entityId!);
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete account");
      }
    }),

  importCsv: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        rows: z.array(
          z.object({
            code: z.string().min(1).max(20),
            name: z.string().min(1).max(200),
            type: z.enum([
              "asset",
              "liability",
              "equity",
              "revenue",
              "expense",
            ]),
            subtype: z.string().min(1),
            description: z.string().optional(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existingCodes = await db.query.chartOfAccounts.findMany({
        where: eq(chartOfAccounts.entityId, ctx.entityId!),
        columns: { code: true },
      });
      const existingCodeSet = new Set(existingCodes.map((a) => a.code));

      const validSubtypes = [
        "current_asset",
        "fixed_asset",
        "bank_account",
        "cash",
        "accounts_receivable",
        "inventory",
        "prepaid",
        "current_liability",
        "long_term_liability",
        "accounts_payable",
        "tax_liability",
        "accrued_liability",
        "owner_equity",
        "retained_earnings",
        "current_year_earnings",
        "sales_revenue",
        "service_revenue",
        "other_income",
        "interest_income",
        "cost_of_goods_sold",
        "operating_expense",
        "payroll_expense",
        "tax_expense",
        "depreciation",
        "interest_expense",
        "other_expense",
      ] as const;

      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const row of input.rows) {
        if (existingCodeSet.has(row.code)) {
          skipped++;
          continue;
        }
        const subtype = validSubtypes.includes(row.subtype as any)
          ? (row.subtype as (typeof validSubtypes)[number])
          : "other_expense";
        try {
          await db.insert(chartOfAccounts).values({
            entityId: ctx.entityId!,
            code: row.code,
            name: row.name,
            type: row.type,
            subtype,
            description: row.description,
          });
          existingCodeSet.add(row.code);
          imported++;
        } catch (e) {
          errors.push(
            `Failed to import ${row.code}: ${e instanceof Error ? e.message : "unknown error"}`,
          );
        }
      }

      await coaCache.invalidate(ctx.entityId!);
      return { imported, skipped, errors };
    }),

  importTemplate: rlsMutateProcedure
    .use(requireRole("owner", "admin", "finance_director"))
    .input(
      z.object({
        templateId: z.string(),
        overrides: z
          .record(
            z.object({
              code: z.string().optional(),
              name: z.string().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { COA_TEMPLATES } = await import("@/lib/coa-templates");
      const template = COA_TEMPLATES.find((t) => t.id === input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      const existingCodes = await db.query.chartOfAccounts.findMany({
        where: eq(chartOfAccounts.entityId, ctx.entityId!),
        columns: { code: true },
      });
      const existingCodeSet = new Set(existingCodes.map((a) => a.code));

      const inserted: typeof existingCodes = [];
      for (const account of template.accounts) {
        if (existingCodeSet.has(account.code)) continue;
        const [created] = await db
          .insert(chartOfAccounts)
          .values({
            entityId: ctx.entityId!,
            code: account.code,
            name: input.overrides?.[account.code]?.name ?? account.name,
            type: account.type,
            subtype: account.subtype as
              | "current_asset"
              | "fixed_asset"
              | "bank_account"
              | "cash"
              | "accounts_receivable"
              | "inventory"
              | "prepaid"
              | "current_liability"
              | "long_term_liability"
              | "accounts_payable"
              | "tax_liability"
              | "accrued_liability"
              | "owner_equity"
              | "retained_earnings"
              | "current_year_earnings"
              | "sales_revenue"
              | "service_revenue"
              | "other_income"
              | "interest_income"
              | "cost_of_goods_sold"
              | "operating_expense"
              | "payroll_expense"
              | "tax_expense"
              | "depreciation"
              | "interest_expense"
              | "other_expense",
            description: account.description,
          })
          .returning();
        inserted.push(created);
      }

      await coaCache.invalidate(ctx.entityId!);
      return { imported: inserted.length };
    }),
});
