import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, gte, lte, asc, sql } from "drizzle-orm";
import { fxRates, fxRevaluationRuns } from "@xenboox/db/schema/fx";
import {
  currencies,
  exchangeRates,
  auditLog,
} from "@xenboox/db/schema/documents";
import { entities } from "@xenboox/db/schema/organization";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";

import { db } from "@/lib/db";
import {
  router,
  rlsProtectedProcedure,
  rlsMutateProcedure,
  requirePermission,
  handleMutationError,
} from "@/lib/trpc/server";
import { cachedDomain } from "@/lib/cache/tenant-cache";

// §4.1 — exchange rates update daily (ECB sync) or via manual upsert; the
// rate-resolution path runs on every conversion. Entity-scoped 60s cache,
// invalidated on upsertRate so manual corrections surface immediately.
const fxCache = cachedDomain("fx", 60_000);

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Resolve a conversion rate from `fromCurrency` to `toCurrency` for an
 * entity, preferring the entity-scoped `fx_rates` overrides, then falling
 * back to the global `exchange_rates` pool (ECB sync). Returns the rate
 * expressed as "1 fromCurrency = rate toCurrency", plus its source.
 */
async function resolveRate(
  entityId: string,
  fromCurrency: string,
  toCurrency: string,
  asOf = new Date(),
): Promise<{ rate: number; source: string }> {
  if (fromCurrency === toCurrency) return { rate: 1, source: "direct" };

  // 1. Entity override — newest as-of at or before `asOf`.
  const asOfStr = `${asOf.getFullYear()}-${String(asOf.getMonth() + 1).padStart(2, "0")}-${String(asOf.getDate()).padStart(2, "0")}`;
  const entityRate = await db.query.fxRates.findFirst({
    where: and(
      eq(fxRates.entityId, entityId),
      eq(fxRates.fromCurrency, fromCurrency),
      eq(fxRates.toCurrency, toCurrency),
      lte(fxRates.asOf, asOfStr),
    ),
    orderBy: [desc(fxRates.asOf)],
  });
  if (entityRate)
    return { rate: parseFloat(entityRate.rate), source: "entity" };

  // 2 = Global exchange rate pool, newest validFrom first.
  const globalRate = await db.query.exchangeRates.findFirst({
    where: and(
      eq(exchangeRates.fromCurrency, fromCurrency),
      eq(exchangeRates.toCurrency, toCurrency),
      lte(exchangeRates.validFrom, asOf),
    ),
    orderBy: [desc(exchangeRates.validFrom)],
  });
  if (globalRate)
    return { rate: parseFloat(globalRate.rate), source: "global" };

  // 3 = Inverse via entity override.
  const inverseEntity = await db.query.fxRates.findFirst({
    where: and(
      eq(fxRates.entityId, entityId),
      eq(fxRates.fromCurrency, toCurrency),
      eq(fxRates.toCurrency, fromCurrency),
      lte(fxRates.asOf, asOfStr),
    ),
    orderBy: [desc(fxRates.asOf)],
  });
  if (inverseEntity) {
    const r = parseFloat(inverseEntity.rate);
    if (r !== 0) return { rate: 1 / r, source: "entity_inverse" };
  }

  // 4 = Inverse via global pool.
  const inverseGlobal = await db.query.exchangeRates.findFirst({
    where: and(
      eq(exchangeRates.fromCurrency, toCurrency),
      eq(exchangeRates.toCurrency, fromCurrency),
      lte(exchangeRates.validFrom, asOf),
    ),
    orderBy: [desc(exchangeRates.validFrom)],
  });
  if (inverseGlobal) {
    const r = parseFloat(inverseGlobal.rate);
    if (r !== 0) return { rate: 1 / r, source: "global_inverse" };
  }

  throw new Error(
    `No exchange rate found for ${fromCurrency} → ${toCurrency}. Add one in Settings → Currency.`,
  );
}

// ─── Router ───────────────────────────────────────────────────────────────

export const currencyRouter = router({
  // ── Settings ──
  getSettings: rlsProtectedProcedure
    .use(requirePermission("multi_currency", "view"))
    .query(async ({ ctx }) => {
      const entityId = ctx.entityId!;
      const cacheKey = "settings";
      const cached = await fxCache.get<{
        baseCurrency: string;
        rateCount: number;
        recentRuns: {
          id: string;
          period: string;
          baseCurrency: string;
          status: string;
          runAt: Date | null;
        }[];
      }>(entityId, cacheKey);
      if (cached) return cached;

      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, entityId),
        columns: { id: true, currency: true },
      });

      const [recentRuns, rateCount] = await Promise.all([
        db.query.fxRevaluationRuns.findMany({
          where: eq(fxRevaluationRuns.entityId, entityId),
          orderBy: [desc(fxRevaluationRuns.createdAt)],
          limit: 5,
          columns: {
            id: true,
            period: true,
            baseCurrency: true,
            status: true,
            runAt: true,
          },
        }),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(fxRates)
          .where(eq(fxRates.entityId, entityId)),
      ]);

      const result = {
        baseCurrency: entity?.currency ?? "USD",
        rateCount: rateCount[0]?.count ?? 0,
        recentRuns,
      };
      await fxCache.set(entityId, cacheKey, result);
      return result;
    }),

  // ── Currency reference (ISO codes) — global read ──
  listCurrencies: rlsProtectedProcedure
    .use(requirePermission("multi_currency", "view"))
    .query(async () => {
      const all = await db.query.currencies.findMany({
        orderBy: [asc(currencies.code)],
      });
      return all;
    }),

  // ── Entity-scoped FX rates ──
  listRates: rlsProtectedProcedure
    .use(requirePermission("multi_currency", "view"))
    .query(async ({ ctx }) => {
      const entityId = ctx.entityId!;
      const cacheKey = "list";
      const cached = await fxCache.get<(typeof fxRates.$inferSelect)[]>(
        entityId,
        cacheKey,
      );
      if (cached) return cached;
      const rates = await db.query.fxRates.findMany({
        where: eq(fxRates.entityId, entityId),
        orderBy: [desc(fxRates.asOf), asc(fxRates.fromCurrency)],
      });
      await fxCache.set(entityId, cacheKey, rates);
      return rates;
    }),

  // ── Global exchange rates (ECB-synced pool) ──
  listGlobalRates: rlsProtectedProcedure
    .use(requirePermission("multi_currency", "view"))
    .input(
      z
        .object({
          pairs: z
            .array(
              z.object({
                from: z.string().length(3),
                to: z.string().length(3),
              }),
            )
            .optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const cacheKey = `global:${JSON.stringify(input?.pairs ?? [])}`;
      const cached = await fxCache.get<
        Array<{
          fromCurrency: string;
          toCurrency: string;
          rate: string;
          source: string;
          validFrom: Date;
        }>
      >("_global", cacheKey);
      if (cached) return cached;

      // If specific pairs requested, resolve each one
      if (input?.pairs && input.pairs.length > 0) {
        const results = await Promise.all(
          input.pairs.map(async (pair) => {
            const rate = await db.query.exchangeRates.findFirst({
              where: and(
                eq(exchangeRates.fromCurrency, pair.from),
                eq(exchangeRates.toCurrency, pair.to),
              ),
              orderBy: [desc(exchangeRates.validFrom)],
            });
            return rate ?? null;
          }),
        );
        const filtered = results.filter(Boolean) as NonNullable<
          (typeof results)[number]
        >[];
        await fxCache.set("_global", cacheKey, filtered);
        return filtered;
      }

      // Otherwise return the latest rate per unique pair
      const allRates = await db
        .select({
          fromCurrency: exchangeRates.fromCurrency,
          toCurrency: exchangeRates.toCurrency,
          rate: exchangeRates.rate,
          source: exchangeRates.source,
          validFrom: exchangeRates.validFrom,
        })
        .from(exchangeRates)
        .orderBy(desc(exchangeRates.validFrom));

      // Deduplicate: keep only the newest rate per pair
      const seen = new Set<string>();
      const unique = allRates.filter((r) => {
        const key = `${r.fromCurrency}:${r.toCurrency}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      await fxCache.set("_global", cacheKey, unique);
      return unique;
    }),

  upsertRate: rlsMutateProcedure
    .use(requirePermission("multi_currency", "edit"))
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
        rate: z.number().positive(),
        asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        source: z.string().max(50).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        if (input.fromCurrency === input.toCurrency) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "From and to currency must be different",
          });
        }
        const entityId = ctx.entityId!;
        const existing = await db.query.fxRates.findFirst({
          where: and(
            eq(fxRates.entityId, entityId),
            eq(fxRates.fromCurrency, input.fromCurrency),
            eq(fxRates.toCurrency, input.toCurrency),
            eq(fxRates.asOf, input.asOf),
          ),
        });

        if (existing) {
          await db
            .update(fxRates)
            .set({
              rate: input.rate.toString(),
              source: input.source ?? "manual",
              updatedAt: new Date(),
            })
            .where(eq(fxRates.id, existing.id));
        } else {
          await db.insert(fxRates).values({
            entityId,
            fromCurrency: input.fromCurrency,
            toCurrency: input.toCurrency,
            rate: input.rate.toString(),
            asOf: input.asOf,
            source: input.source ?? "manual",
            createdBy: ctx.session?.user?.id,
          });
        }

        await fxCache.invalidate(entityId);

        await db.insert(auditLog).values({
          entityId,
          userId: ctx.session?.user?.id,
          action: "currency.upsertRate",
          entityType: "fx_rate",
          entityIdRef: existing?.id,
          newValues: {
            fromCurrency: input.fromCurrency,
            toCurrency: input.toCurrency,
            rate: input.rate,
            asOf: input.asOf,
          },
        });

        return { success: true, message: "Exchange rate saved" };
      } catch (error) {
        handleMutationError(error, "Failed to save exchange rate");
      }
    }),

  deleteRate: rlsMutateProcedure
    .use(requirePermission("multi_currency", "edit"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.fxRates.findFirst({
          where: and(
            eq(fxRates.id, input.id),
            eq(fxRates.entityId, ctx.entityId!),
          ),
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Exchange rate not found",
          });
        }
        await db.delete(fxRates).where(eq(fxRates.id, input.id));
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session?.user?.id,
          action: "currency.deleteRate",
          entityType: "fx_rate",
          entityIdRef: input.id,
          oldValues: {
            fromCurrency: existing.fromCurrency,
            toCurrency: existing.toCurrency,
            rate: existing.rate,
            asOf: existing.asOf,
          },
        });
        return { success: true, message: "Exchange rate deleted" };
      } catch (error) {
        handleMutationError(error, "Failed to delete exchange rate");
      }
    }),

  // ── Conversion ──
  convert: rlsProtectedProcedure
    .use(requirePermission("multi_currency", "view"))
    .input(
      z.object({
        fromCurrency: z.string().length(3),
        toCurrency: z.string().length(3),
        amount: z.number().nonnegative(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;
      const cacheKey = `${input.fromCurrency}:${input.toCurrency}`;
      const cached = await fxCache.get<{ rate: number; source: string }>(
        entityId,
        cacheKey,
      );
      let rate: number;
      let source: string;
      if (cached) {
        rate = cached.rate;
        source = cached.source;
      } else {
        const resolved = await resolveRate(
          entityId,
          input.fromCurrency,
          input.toCurrency,
        );
        rate = resolved.rate;
        source = resolved.source;
        await fxCache.set(entityId, cacheKey, resolved);
      }
      return {
        fromCurrency: input.fromCurrency,
        toCurrency: input.toCurrency,
        amount: input.amount,
        rate,
        source,
        convertedAmount: Math.round(input.amount * rate * 100) / 100,
      };
    }),

  // ── FX Revaluation ──
  getRevaluation: rlsProtectedProcedure
    .use(requirePermission("multi_currency", "view"))
    .input(z.object({ period: z.string().regex(/^\d{4}-\d{2}$/) }).optional())
    .query(async ({ ctx, input }) => {
      const runs = await db.query.fxRevaluationRuns.findMany({
        where: and(
          eq(fxRevaluationRuns.entityId, ctx.entityId!),
          input?.period
            ? eq(fxRevaluationRuns.period, input.period)
            : undefined,
        ),
        orderBy: [desc(fxRevaluationRuns.createdAt)],
        limit: 12,
      });
      return runs;
    }),

  runRevaluation: rlsMutateProcedure
    .use(requirePermission("multi_currency", "edit"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityId = ctx.entityId!;
        const entity = await db.query.entities.findFirst({
          where: eq(entities.id, entityId),
          columns: { id: true, currency: true },
        });
        const baseCurrency = entity?.currency ?? "USD";

        // Lines whose currency differs from the entity base currency.
        const [startYear, startMonth] = input.period.split("-").map(Number);
        const monthEnd = new Date(Date.UTC(startYear, startMonth, 0));
        const periodStartStr = `${input.period}-01`;
        const periodEndStr = `${monthEnd.getUTCFullYear()}-${String(monthEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(monthEnd.getUTCDate()).padStart(2, "0")}`;

        // Lines whose currency differs from the entity base currency.
        const lines = await db
          .select({
            currency: journalEntryLines.currency,
            debit: journalEntryLines.debit,
            credit: journalEntryLines.credit,
            baseAmount: journalEntryLines.baseAmount,
          })
          .from(journalEntryLines)
          .innerJoin(
            journalEntries,
            eq(journalEntryLines.journalEntryId, journalEntries.id),
          )
          .where(
            and(
              eq(journalEntries.entityId, entityId),
              eq(journalEntries.status, "posted"),
              sql`${journalEntryLines.currency} <> ${baseCurrency}`,
              gte(journalEntries.date, periodStartStr),
              lte(journalEntries.date, periodEndStr),
            ),
          );

        // Summarize open exposures and compute gain/loss at the latest rate.
        const byCurrency = new Map<
          string,
          { foreignBalance: number; recordedBase: number; count: number }
        >();
        for (const l of lines) {
          const cur = l.currency;
          if (!cur) continue;
          const rec = byCurrency.get(cur) ?? {
            foreignBalance: 0,
            recordedBase: 0,
            count: 0,
          };
          const debit = parseFloat(l.debit ?? "0");
          const credit = parseFloat(l.credit ?? "0");
          rec.foreignBalance += debit - credit;
          rec.recordedBase += parseFloat(l.baseAmount ?? "0");
          rec.count++;
          byCurrency.set(cur, rec);
        }

        const totals: Array<{
          accountClass: string;
          currency: string;
          balance: number;
          rateUsed: number;
          baseAmount: number;
          gainLoss: number;
        }> = [];

        for (const [currency, rec] of byCurrency.entries()) {
          const { rate } = await resolveRate(
            entityId,
            currency,
            baseCurrency,
            new Date(`${periodEndStr}T00:00:00Z`),
          );
          const baseAmount = rec.foreignBalance * rate;
          totals.push({
            accountClass: "fx_balance",
            currency,
            balance: Math.round(rec.foreignBalance * 100) / 100,
            rateUsed: rate,
            baseAmount: Math.round(baseAmount * 100) / 100,
            gainLoss: Math.round((baseAmount - rec.recordedBase) * 100) / 100,
          });
        }

        const [run] = await db
          .insert(fxRevaluationRuns)
          .values({
            entityId,
            period: input.period,
            baseCurrency,
            totals,
            status: "completed",
            runBy: ctx.session?.user?.name ?? ctx.session?.user?.email,
            runAt: new Date(),
          })
          .returning();

        await db.insert(auditLog).values({
          entityId,
          userId: ctx.session?.user?.id,
          action: "currency.runRevaluation",
          entityType: "fx_revaluation_run",
          entityIdRef: run.id,
          newValues: {
            period: input.period,
            baseCurrency,
            totalCurrencies: totals.length,
          },
        });

        return run;
      } catch (error) {
        handleMutationError(error, "Failed to run FX revaluation");
      }
    }),
});
