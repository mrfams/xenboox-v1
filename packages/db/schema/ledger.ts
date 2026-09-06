// ─── LEDGER ENGINE v2 — immutable hash-chained journal (KILLPLAN §4.1) ──────
//
// journal_events is the Event Store: append-only, INSERT-only, hash-chained
// per entity. Corrections are reversal EVENTS — nothing is ever mutated.
// ledger_account_balances is the CQRS read model (per-period deltas), fully
// rebuildable from events.
//
// Enforcement:
//   - app role: UPDATE/DELETE revoked (migration 0041) + BEFORE UPDATE/DELETE
//     trigger raises an exception — belt and braces.
//   - (entity_id, seq) unique — per-entity single-writer sequence.
//   - (entity_id, idempotency_key) unique — retries can never double-post.

import {
  bigint,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";
import { entities } from "./organization";
import { fiscalPeriods } from "./accounting";
import { chartOfAccounts } from "./accounting";

/** One journal line, amounts in integer MINOR units (no decimals, ever). */
export type LedgerEventLine = {
  accountId: string;
  /** COA code snapshot at posting time — the event is self-contained. */
  accountCode: string;
  debitMinor: number;
  creditMinor: number;
  description?: string;
  /** FX stamp (revaluation/foreign postings): the currency this line is
   * denominated in, its base-currency amount, and the rate used. Present on
   * FX lines; absent (undefined) for base-currency lines so revaluation runs
   * can exclude them deterministically. */
  currency?: string;
  baseCurrency?: string;
  baseAmountMinor?: number;
  exchangeRate?: number;
};

export const journalEvents = pgTable(
  "journal_events",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    /** 1-based position in the entity's chain — allocation + uniqueness is
     * the concurrency guard: two writers for one entity cannot both commit. */
    seq: integer("seq").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** Accounting date (YYYY-MM-DD) — drives the open-period check. */
    effectiveDate: text("effective_date").notNull(),
    periodId: uuid("period_id").references(() => fiscalPeriods.id),
    /** "posting" | "reversal" */
    eventType: text("event_type").notNull(),
    reversesEventId: uuid("reverses_event_id"),
    reason: text("reason"),
    /** ar_invoice | ap_bill | manual | agent:<name> | close | ... */
    source: text("source").notNull(),
    /** user | agent | system */
    actorType: text("actor_type").notNull(),
    actorId: text("actor_id").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    currency: text("currency").notNull(),
    lines: jsonb("lines").$type<LedgerEventLine[]>().notNull(),
    prevEventHash: text("prev_event_hash").notNull(),
    eventHash: text("event_hash").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    // timestamps gives createdAt + updatedAt; updatedAt is written once at
    // insert and never touched again (append-only).
    ...timestamps,
  },
  (t) => [
    uniqueIndex("journal_events_entity_seq").on(t.entityId, t.seq),
    uniqueIndex("journal_events_entity_idem").on(t.entityId, t.idempotencyKey),
    index("journal_events_entity_period").on(t.entityId, t.periodId),
    index("journal_events_entity_date").on(t.entityId, t.effectiveDate),
    index("journal_events_reverses").on(t.reversesEventId),
  ],
);

/**
 * CQRS read model — per-period DELTAS in minor units. Running balances are
 * SUM(deltas) over periods ≤ the requested one; the close writes immutable
 * snapshots derived from these. Rebuildable at any time from journal_events
 * (see packages/ledger rebuildBalances) — the events are the truth.
 */
export const ledgerAccountBalances = pgTable(
  "ledger_account_balances",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id, { onDelete: "cascade" }),
    periodId: uuid("period_id")
      .notNull()
      .references(() => fiscalPeriods.id, { onDelete: "cascade" }),
    currency: text("currency").notNull(),
    debitMinor: bigint("debit_minor", { mode: "number" }).notNull().default(0),
    creditMinor: bigint("credit_minor", { mode: "number" }).notNull().default(0),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("ledger_balances_key").on(
      t.entityId,
      t.accountId,
      t.periodId,
      t.currency,
    ),
    index("ledger_balances_entity_period").on(t.entityId, t.periodId),
  ],
);
