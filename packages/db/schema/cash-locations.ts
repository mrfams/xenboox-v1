import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { cashAccounts } from "./cash";

// ─── ENUMS ────────────────────────────────────────────────────────────────

/** Transaction type for cash in/out */
export const cashTxTypeEnum = pgEnum("cash_tx_type", ["in", "out"]);

/** Status of a discrepancy flag */
export const discrepancyStatusEnum = pgEnum("discrepancy_status", [
  "open",
  "resolved",
  "investigating",
]);

/** Severity of a cash discrepancy */
export const discrepancySeverityEnum = pgEnum("discrepancy_severity", [
  "minor",
  "moderate",
  "material",
  "critical",
]);

// ─── CASH LOCATIONS (Tills) ──────────────────────────────────────────────
//
// Every entity can have multiple physical cash locations/tills.
// Each till has: location, currency, responsible person, opening balance.
// This is the scoping anchor — every cash event is tied to a specific till.

export const cashLocations = pgTable(
  "cash_locations",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    currency: text("currency").notNull().default("USD"),
    cashAccountId: uuid("cash_account_id").references(() => cashAccounts.id, {
      onDelete: "set null",
    }),
    responsibleUserId: text("responsible_user_id"),
    openingBalance: numeric("opening_balance", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    currentBalance: numeric("current_balance", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    isActive: boolean("is_active").notNull().default(true),
    lastCountedAt: timestamp("last_counted_at"),
    countCadenceDays: numeric("count_cadence_days").default("1"), // Daily by default
    ...timestamps,
  },
  (t) => [
    index("cash_locations_entity").on(t.entityId),
    index("cash_locations_active").on(t.entityId, t.isActive),
  ],
);

export const cashLocationsRelations = relations(
  cashLocations,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [cashLocations.entityId],
      references: [entities.id],
    }),
    cashAccount: one(cashAccounts, {
      fields: [cashLocations.cashAccountId],
      references: [cashAccounts.id],
    }),
    transactions: many(cashTransactions),
    discrepancyFlags: many(discrepancyFlags),
  }),
);

// ─── CASH TRANSACTIONS ───────────────────────────────────────────────────
//
// Cashier records cash in/out at point of transaction, mobile-first, <3 taps.
// Running till balance updates live. Simpler than pettyCashLedger — no
// double-entry, just cash movement tracking for physical till operations.

export const cashTransactions = pgTable(
  "cash_transactions",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => cashLocations.id, { onDelete: "cascade" }),
    type: cashTxTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    description: text("description").notNull(),
    recordedByUserId: text("recorded_by_user_id"),
    recordedAt: timestamp("recorded_at").notNull().defaultNow(),
    reference: text("reference"),
    category: text("category"),
    journalEntryId: uuid("journal_entry_id"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("cash_tx_entity").on(t.entityId),
    index("cash_tx_location").on(t.locationId),
    index("cash_tx_date").on(t.entityId, t.recordedAt),
  ],
);

export const cashTransactionsRelations = relations(
  cashTransactions,
  ({ one }) => ({
    entity: one(entities, {
      fields: [cashTransactions.entityId],
      references: [entities.id],
    }),
    location: one(cashLocations, {
      fields: [cashTransactions.locationId],
      references: [cashLocations.id],
    }),
  }),
);

// ─── DISCREPANCY FLAGS ───────────────────────────────────────────────────
//
// Every cash discrepancy is flagged explicitly — never netted, averaged, or
// absorbed into "miscellaneous." Flag carries: location, expected, counted,
// variance, counted_by, timestamp. Resolution requires explicit action.

export const discrepancyFlags = pgTable(
  "discrepancy_flags",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    locationId: uuid("location_id").references(() => cashLocations.id, {
      onDelete: "cascade",
    }),
    imprestFloatId: uuid("imprest_float_id"),
    expected: numeric("expected", { precision: 15, scale: 2 }).notNull(),
    counted: numeric("counted", { precision: 15, scale: 2 }).notNull(),
    variance: numeric("variance", { precision: 15, scale: 2 }).notNull(),
    variancePct: numeric("variance_pct", { precision: 5, scale: 2 }),
    severity: discrepancySeverityEnum("severity").notNull().default("minor"),
    countedByUserId: text("counted_by_user_id"),
    countedAt: timestamp("counted_at").notNull().defaultNow(),
    status: discrepancyStatusEnum("status").notNull().default("open"),
    resolutionNote: text("resolution_note"),
    resolvedByUserId: text("resolved_by_user_id"),
    resolvedAt: timestamp("resolved_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("disc_flags_entity").on(t.entityId),
    index("disc_flags_location").on(t.locationId),
    index("disc_flags_status").on(t.entityId, t.status),
  ],
);

export const discrepancyFlagsRelations = relations(
  discrepancyFlags,
  ({ one }) => ({
    entity: one(entities, {
      fields: [discrepancyFlags.entityId],
      references: [entities.id],
    }),
    location: one(cashLocations, {
      fields: [discrepancyFlags.locationId],
      references: [cashLocations.id],
    }),
  }),
);
