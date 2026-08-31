// ─── Entity Settings Schema (§16b) ─────────────────────────────────────────
//
// One row per entity, created automatically at entity setup with defaults.
// Editable by FD/Org Owner only (per RBAC Matrix Settings section).
//
// Unlocks the Approve-column enforcement in the RBAC Matrix:
//   - approval_threshold_minor: dollar threshold below which scoped "approve"
//     permissions can auto-approve. Above this → requires human with "full"
//     scope approval.
//   - always_require_approval: modules/actions that always require explicit
//     human approval regardless of amount (e.g., ["payroll_run", "month_end_close"])
//   - fiscal_locale_overrides: per-entity locale settings for currency format,
//     date format, decimal separators, etc.

import {
  pgTable,
  uuid,
  text,
  numeric,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps } from "./helpers";
import { entities } from "./organization";

export const entitySettings = pgTable(
  "entity_settings",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .unique()
      .references(() => entities.id, { onDelete: "cascade" }),
    // Approval threshold in minor units (cents/kobo/butut)
    // Default $500.00 = 50000 minor units
    approvalThresholdMinor: numeric("approval_threshold_minor", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("50000"),
    // Currency code for the approval threshold
    approvalThresholdCurrency: text("approval_threshold_currency")
      .notNull()
      .default("USD"),
    // Modules/actions that always require human approval regardless of amount
    // e.g. ["payroll_run", "month_end_close"]
    alwaysRequireApproval: jsonb("always_require_approval")
      .$type<string[]>()
      .notNull()
      .default([]),
    // Per-entity locale overrides for currency format, date format, etc.
    fiscalLocaleOverrides: jsonb("fiscal_locale_overrides")
      .$type<{
        currencyFormat?: string;
        dateFormat?: string;
        decimalSeparator?: string;
        thousandsSeparator?: string;
        locale?: string;
      }>()
      .default({}),
    // Fiscal year start month (1-12, overrides entity's default)
    fiscalYearStartMonth: integer("fiscal_year_start_month").default(1),
    // Whether auto-approve is allowed for scoped permissions
    allowAutoApprove: jsonb("allow_auto_approve")
      .$type<string[]>()
      .notNull()
      .default([]),
    ...timestamps,
  },
  (t) => [index("idx_entity_settings_entity").on(t.entityId)],
);

export const entitySettingsRelations = relations(entitySettings, ({ one }) => ({
  entity: one(entities, {
    fields: [entitySettings.entityId],
    references: [entities.id],
  }),
}));
