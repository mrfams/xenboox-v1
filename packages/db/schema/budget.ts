// ─── Budget Schema ───────────────────────────────────────────────────────────
//
// Annual and multi-year budgets, budget-vs-actual tracking, variance analysis,
// departmental budget scoping, and alert thresholds.
//
// Tables:
//   budgets                   — Budget headers per fiscal year
//   budget_lines              — Line items mapped to COA accounts + dimensions
//   budget_versions           — Versioned revisions (never overwritten in place)
//   variance_records          — Budget vs actual comparisons per period
//   budget_alert_thresholds   — Configurable approaching/exceeded triggers
//
// Rules:
//   - Budget revisions are NEVER overwritten — every version preserved
//   - Department visibility enforced at query layer (entityId + dimension scoping)
//   - Every revision logged with who approved it and when

import {
  pgTable,
  text,
  timestamp,
  uuid,
  numeric,
  integer,
  jsonb,
  index,
  boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps, entityId } from "./helpers";
import { entities } from "./organization";
import { chartOfAccounts, fiscalPeriods } from "./accounting";

// ─── Budget Status Enum ───────────────────────────────────────────────────
export const budgetStatusEnum = (status: string) =>
  ["draft", "active", "superseded"].includes(status);

// ─── Budgets ───────────────────────────────────────────────────────────────
// Header record for each budget — one per entity per fiscal year.
// Multi-year budgets use the first year as the anchor with a multiYear flag.

export const budgets = pgTable(
  "budgets",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    fiscalYear: integer("fiscal_year").notNull(),
    status: text("status").notNull().default("draft"),
    // "draft" | "active" | "superseded"
    multiYear: boolean("multi_year").notNull().default(false),
    multiYearEnd: integer("multi_year_end"), // last fiscal year if multi-year
    totalBudgeted: numeric("total_budgeted", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    currency: text("currency").notNull().default("USD"),
    notes: text("notes"),
    createdById: uuid("created_by_id"),
    approvedById: uuid("approved_by_id"),
    approvedAt: timestamp("approved_at"),
    supersededById: uuid("superseded_by_id"), // ID of the budget that supersedes this one
    currentVersionId: uuid("current_version_id"),
    ...timestamps,
  },
  (t) => [
    index("budgets_entity").on(t.entityId),
    index("budgets_fiscal_year").on(t.entityId, t.fiscalYear),
    index("budgets_status").on(t.entityId, t.status),
  ],
);

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  entity: one(entities, {
    fields: [budgets.entityId],
    references: [entities.id],
  }),
  lines: many(budgetLines),
  versions: many(budgetVersions),
  supersededBy: one(budgets, {
    fields: [budgets.supersededById],
    references: [budgets.id],
  }),
}));

// ─── Budget Lines ──────────────────────────────────────────────────────────
// Individual line items mapped to a COA account + dimension (department,
// project, cost center). This mapping enables automatic actuals comparison.

export const budgetLines = pgTable(
  "budget_lines",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id),
    lineDescription: text("line_description").notNull(),
    dimensionType: text("dimension_type"),
    // "department" | "project" | "cost_center"
    dimensionId: text("dimension_id"),
    // References the department/project/cost_center ID
    annualAmount: numeric("annual_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    jan: numeric("jan", { precision: 15, scale: 2 }).default("0"),
    feb: numeric("feb", { precision: 15, scale: 2 }).default("0"),
    mar: numeric("mar", { precision: 15, scale: 2 }).default("0"),
    apr: numeric("apr", { precision: 15, scale: 2 }).default("0"),
    may: numeric("may", { precision: 15, scale: 2 }).default("0"),
    jun: numeric("jun", { precision: 15, scale: 2 }).default("0"),
    jul: numeric("jul", { precision: 15, scale: 2 }).default("0"),
    aug: numeric("aug", { precision: 15, scale: 2 }).default("0"),
    sep: numeric("sep", { precision: 15, scale: 2 }).default("0"),
    oct: numeric("oct", { precision: 15, scale: 2 }).default("0"),
    nov: numeric("nov", { precision: 15, scale: 2 }).default("0"),
    dec: numeric("dec", { precision: 15, scale: 2 }).default("0"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("budget_lines_budget").on(t.budgetId),
    index("budget_lines_account").on(t.accountId),
    index("budget_lines_dimension").on(
      t.entityId,
      t.dimensionType,
      t.dimensionId,
    ),
  ],
);

export const budgetLinesRelations = relations(budgetLines, ({ one, many }) => ({
  entity: one(entities, {
    fields: [budgetLines.entityId],
    references: [entities.id],
  }),
  budget: one(budgets, {
    fields: [budgetLines.budgetId],
    references: [budgets.id],
  }),
  account: one(chartOfAccounts, {
    fields: [budgetLines.accountId],
    references: [chartOfAccounts.id],
  }),
  variances: many(varianceRecords),
}));

// ─── Budget Versions ──────────────────────────────────────────────────────
// Every revision preserved — never overwritten. Enables full audit trail
// of "what we originally budgeted" vs "what we later revised to."

export const budgetVersions = pgTable(
  "budget_versions",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    changesSummary: text("changes_summary"),
    linesSnapshot: jsonb("lines_snapshot").$type<
      Array<{
        lineId: string;
        accountId: string;
        annualAmount: string;
        dimensionType?: string;
        dimensionId?: string;
      }>
    >(),
    approvedById: text("approved_by_id"),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("budget_versions_budget").on(t.budgetId),
    index("budget_versions_number").on(t.budgetId, t.versionNumber),
  ],
);

export const budgetVersionsRelations = relations(budgetVersions, ({ one }) => ({
  entity: one(entities, {
    fields: [budgetVersions.entityId],
    references: [entities.id],
  }),
  budget: one(budgets, {
    fields: [budgetVersions.budgetId],
    references: [budgets.id],
  }),
}));

// ─── Variance Records ─────────────────────────────────────────────────────
// Budget vs actual per line per period. Includes auto-generated narrative
// explanation for significant variances (materiality-gated).

export const varianceRecords = pgTable(
  "variance_records",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    budgetLineId: uuid("budget_line_id")
      .notNull()
      .references(() => budgetLines.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    budgetedAmount: numeric("budgeted_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    actualAmount: numeric("actual_amount", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    variance: numeric("variance", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    variancePct: numeric("variance_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    cumulativeVariance: numeric("cumulative_variance", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    isSignificant: boolean("is_significant").notNull().default(false),
    narrativeExplanation: text("narrative_explanation"),
    generatedBy: text("generated_by").default("agent"),
    // "agent" | "manual"
    acknowledgedById: uuid("acknowledged_by_id"),
    acknowledgedAt: timestamp("acknowledged_at"),
    ...timestamps,
  },
  (t) => [
    index("variance_line").on(t.budgetLineId),
    index("variance_period").on(t.entityId, t.period),
    index("variance_significant").on(t.entityId, t.isSignificant),
  ],
);

export const varianceRecordsRelations = relations(
  varianceRecords,
  ({ one }) => ({
    entity: one(entities, {
      fields: [varianceRecords.entityId],
      references: [entities.id],
    }),
    budgetLine: one(budgetLines, {
      fields: [varianceRecords.budgetLineId],
      references: [budgetLines.id],
    }),
  }),
);

// ─── Budget Alert Thresholds ──────────────────────────────────────────────
// Configurable per-line trigger points for "approaching limit" and "exceeded"
// — same pattern as confidence_thresholds but budget-specific.

export const budgetAlertThresholds = pgTable(
  "budget_alert_thresholds",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    budgetLineId: uuid("budget_line_id")
      .notNull()
      .references(() => budgetLines.id, { onDelete: "cascade" }),
    approachingPct: numeric("approaching_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("80.00"),
    // Trigger "approaching limit" alert when spend reaches this % of budget
    exceededPct: numeric("exceeded_pct", { precision: 5, scale: 2 })
      .notNull()
      .default("100.00"),
    // Trigger "exceeded" alert when spend reaches this % of budget
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => [
    index("budget_alert_line").on(t.budgetLineId),
    index("budget_alert_active").on(t.entityId, t.isActive),
  ],
);

export const budgetAlertThresholdsRelations = relations(
  budgetAlertThresholds,
  ({ one }) => ({
    entity: one(entities, {
      fields: [budgetAlertThresholds.entityId],
      references: [entities.id],
    }),
    budgetLine: one(budgetLines, {
      fields: [budgetAlertThresholds.budgetLineId],
      references: [budgetLines.id],
    }),
  }),
);
