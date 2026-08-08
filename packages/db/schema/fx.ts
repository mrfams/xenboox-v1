import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  jsonb,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── ENUMS ──────────────────────────────────────────────────────────────────

export const revaluationStatusEnum = pgEnum("fx_revaluation_status", [
  "draft",
  "completed",
]);

// ─── FX RATES ───────────────────────────────────────────────────────────────
//
// Entity-scoped exchange rates. The global `exchange_rates` pool (ECB seed /
// sync job) is the fallback; `fx_rates` lets an entity override or pin a rate
// for a specific pair + as-of date. Rate is expressed as 1 `fromCurrency`
// converted into `toCurrency` units (e.g. from=GMD to=USD rate=0.00095).

export const fxRates = pgTable(
  "fx_rates",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: numeric("rate", { precision: 15, scale: 6 }).notNull(),
    asOf: date("as_of").notNull(),
    source: text("source").notNull().default("manual"),
    createdBy: uuid("created_by"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("fx_rates_pair_date").on(
      t.entityId,
      t.fromCurrency,
      t.toCurrency,
      t.asOf,
    ),
    index("fx_rates_entity").on(t.entityId),
    index("fx_rates_pair").on(t.entityId, t.fromCurrency, t.toCurrency),
  ],
);

export const fxRatesRelations = relations(fxRates, ({ one }) => ({
  entity: one(entities, {
    fields: [fxRates.entityId],
    references: [entities.id],
  }),
}));

// ─── FX REVALUATION RUNS ────────────────────────────────────────────────────
//
// Persists a point-in-time snapshot of an entity's unrealized / realized FX
// gain-loss computation. `totals` holds the per account-class breakdown
// computed by the currency router at run time.

export const fxRevaluationRuns = pgTable(
  "fx_revaluation_runs",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    baseCurrency: text("base_currency").notNull(),
    totals: jsonb("totals").default([]).$type<
      Array<{
        accountClass: string;
        currency: string;
        balance: number;
        rateUsed: number;
        baseAmount: number;
        gainLoss: number;
      }>
    >(),
    status: revaluationStatusEnum("status").notNull().default("draft"),
    runBy: text("run_by"),
    runAt: timestamp("run_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("fx_reval_entity").on(t.entityId),
    index("fx_reval_period").on(t.entityId, t.period),
  ],
);

export const fxRevaluationRunsRelations = relations(
  fxRevaluationRuns,
  ({ one }) => ({
    entity: one(entities, {
      fields: [fxRevaluationRuns.entityId],
      references: [entities.id],
    }),
  }),
);
