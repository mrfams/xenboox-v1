// ─── Journal Entry Sources Join Table (§16b) ──────────────────────────────
//
// Dedicated join table replacing the nullable `source_id` / `linked_record_id`
// discriminated columns pattern. Composite index on (source_type, source_id)
// for reverse lookups ("show me the invoice for this journal entry").
//
// No FK constraint on source_id — validated in app layer since it can point
// to multiple tables (ap_invoices, ar_invoices, payroll_runs, etc.).

import { pgTable, uuid, text, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps } from "./helpers";
import { journalEntries } from "./accounting";

export const journalEntrySources = pgTable(
  "journal_entry_sources",
  {
    id: uuidId(),
    journalEntryId: uuid("journal_entry_id")
      .notNull()
      .references(() => journalEntries.id, { onDelete: "cascade" }),
    // Source type discriminator: "ap_invoice" | "ar_invoice" | "payroll_run" |
    // "bank_transaction" | "mobile_money_transaction" | "cash_transaction" |
    // "manual" | "adjustment" | "reconciliation"
    sourceType: text("source_type").notNull(),
    // Polymorphic source ID (validated in app layer, no FK constraint)
    sourceId: uuid("source_id"),
    // Human-readable reference for display
    sourceReference: text("source_reference"),
    // Optional description of the source
    sourceDescription: text("source_description"),
    ...timestamps,
  },
  (t) => [
    index("jes_journal_entry").on(t.journalEntryId),
    index("jes_source").on(t.sourceType, t.sourceId),
    uniqueIndex("jes_unique_source").on(
      t.journalEntryId,
      t.sourceType,
      t.sourceId,
    ),
  ],
);

export const journalEntrySourcesRelations = relations(
  journalEntrySources,
  ({ one }) => ({
    journalEntry: one(journalEntries, {
      fields: [journalEntrySources.journalEntryId],
      references: [journalEntries.id],
    }),
  }),
);
