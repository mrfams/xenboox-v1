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
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { employees } from "./payroll";

// ─── ENUMS ───────────────────────────────────────

export const taxRuleStatusEnum = pgEnum("tax_rule_status", [
  "draft",
  "active",
  "superseded",
]);

export const taxRuleTypeEnum = pgEnum("tax_rule_type", [
  "vat",
  "sales_tax",
  "paye",
  "withholding",
  "corporate",
  "social_security",
  "excise",
  "other",
]);

export const vatStatusEnum = pgEnum("vat_status", [
  "draft",
  "calculated",
  "reviewed",
  "filed",
]);

export const filingStatusEnum = pgEnum("filing_status", [
  "pending",
  "filed",
  "overdue",
  "waived",
]);

export const taxPackageTypeEnum = pgEnum("tax_package_type", [
  "vat",
  "paye",
  "corporate",
]);

export const taxPackageStatusEnum = pgEnum("tax_package_status", [
  "assembling",
  "reviewed",
  "submitted",
  "acknowledged",
]);

// ─── JURISDICTION TAX RULES ──────────────────────
//
// Versioned, never overwritten in place. New rules require explicit
// human sign-off (approved_by must be populated before active).

// ─── RATE OR BANDS PAYLOAD ─────────────────────────
//
// The full, user-configurable rate shape a tax rule can carry:
//   rate        — flat percentage (e.g. 15% VAT)
//   fixed       — fixed amount per transaction (e.g. GMD 50 excise)
//   bands       — progressive/edge brackets (PAYE, corporate)
//   conditional — rate depends on context (product category, customer type,
//                 amount threshold, location)
//   employeeRate / employerRate — split contributions (social security,
//                 pension) so a company can opt to pay the employee's share.

export type TaxRateConfig = {
  type: "rate" | "fixed" | "bands" | "conditional";
  // Flat percentage (0.15 = 15%)
  rate?: number;
  // Fixed amount per transaction
  fixedAmount?: number;
  // Progressive/edge brackets
  bands?: Array<{
    from: number;
    to: number | null;
    rate: number;
    cumulative?: boolean;
  }>;
  // Conditional rates keyed on context
  conditions?: Array<{
    field:
      | "product_category"
      | "customer_type"
      | "amount"
      | "location"
      | string;
    operator: "eq" | "neq" | "gte" | "lte" | "in";
    value: string | number | Array<string | number>;
    rate: number;
    fixedAmount?: number;
  }>;
  // Exemption threshold (amount below which no tax applies)
  threshold?: number;
  // Max amount subject to tax
  ceiling?: number;
  // Employer / employee split for contribution taxes
  employeeRate?: number;
  employerRate?: number;
};

export const jurisdictionTaxRules = pgTable(
  "jurisdiction_tax_rules",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    country: text("country").notNull(), // "GM", "NG", "KE", "GH", "US", …
    ruleType: taxRuleTypeEnum("rule_type").notNull(),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    description: text("description"),
    // Which side of the books this applies to (sales/purchases/payroll/income)
    appliesTo: text("applies_to")
      .$type<"sales" | "purchases" | "payroll" | "income" | "other">()
      .default("sales"),
    rateOrBands: jsonb("rate_or_bands").notNull().$type<TaxRateConfig>(),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    status: taxRuleStatusEnum("status").notNull().default("draft"),
    proposedBy: text("proposed_by"),
    approvedBy: text("approved_by"),
    approvedAt: timestamp("approved_at"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("tax_rules_entity").on(t.entityId),
    index("tax_rules_country_type").on(t.entityId, t.country, t.ruleType),
    index("tax_rules_effective").on(t.entityId, t.effectiveFrom, t.effectiveTo),
  ],
);

export const jurisdictionTaxRulesRelations = relations(
  jurisdictionTaxRules,
  ({ one, many }) => ({
    entity: one(entities, {
      fields: [jurisdictionTaxRules.entityId],
      references: [entities.id],
    }),
    overrides: many(taxRateOverrides),
  }),
);

// ─── TAX RATE OVERRIDES (per-person / per-item rates) ───────────────────
//
// Lets a user override a tax rate for a specific customer, vendor, employee
// or product category — e.g. a preferred customer charged a reduced VAT
// band, or a contractor with a bespoke withholding rate. Entity-scoped,
// effective-dated, audited.

export const taxRateOverrides = pgTable(
  "tax_rate_overrides",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    taxRuleId: uuid("tax_rule_id")
      .notNull()
      .references(() => jurisdictionTaxRules.id, { onDelete: "cascade" }),
    appliesToType: text("applies_to_type")
      .$type<
        "customer" | "vendor" | "employee" | "product_category" | "other"
      >()
      .notNull(),
    appliesToId: text("applies_to_id").notNull(),
    appliesToName: text("applies_to_name"),
    rate: numeric("rate", { precision: 6, scale: 4 }),
    fixedAmount: numeric("fixed_amount", { precision: 15, scale: 2 }),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("tro_entity").on(t.entityId),
    index("tro_tax_rule").on(t.taxRuleId),
    index("tro_target").on(t.entityId, t.appliesToType, t.appliesToId),
  ],
);

export const taxRateOverridesRelations = relations(
  taxRateOverrides,
  ({ one }) => ({
    entity: one(entities, {
      fields: [taxRateOverrides.entityId],
      references: [entities.id],
    }),
    taxRule: one(jurisdictionTaxRules, {
      fields: [taxRateOverrides.taxRuleId],
      references: [jurisdictionTaxRules.id],
    }),
  }),
);

// ─── VAT CALCULATIONS ────────────────────────────

export const vatCalculations = pgTable(
  "vat_calculations",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(), // YYYY-MM
    inputVat: numeric("input_vat", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    outputVat: numeric("output_vat", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    netPosition: numeric("net_position", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    // netPosition = outputVat - inputVat (positive = payable, negative = refundable)
    status: vatStatusEnum("status").notNull().default("draft"),
    calculatedBy: text("calculated_by"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    filedAt: timestamp("filed_at"),
    filingReference: text("filing_reference"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("vat_calc_entity").on(t.entityId),
    index("vat_calc_period").on(t.entityId, t.period),
  ],
);

export const vatCalculationsRelations = relations(
  vatCalculations,
  ({ one }) => ({
    entity: one(entities, {
      fields: [vatCalculations.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── WITHHOLDING RECORDS ─────────────────────────

export const withholdingRecords = pgTable(
  "withholding_records",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    period: text("period").notNull(),
    payeeId: text("payee_id").notNull(),
    payeeName: text("payee_name"),
    payeeType: text("payee_type").notNull().default("contractor"), // "contractor" | "vendor"
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 5, scale: 4 }).notNull(),
    taxWithheld: numeric("tax_withheld", { precision: 15, scale: 2 }).notNull(),
    jurisdiction: text("jurisdiction").notNull().default("GM"),
    invoiceId: uuid("invoice_id"),
    payrollRunId: uuid("payroll_run_id"),
    filed: boolean("filed").notNull().default(false),
    filingReference: text("filing_reference"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("wht_entity").on(t.entityId),
    index("wht_period").on(t.entityId, t.period),
    index("wht_payee").on(t.entityId, t.payeeId),
  ],
);

export const withholdingRecordsRelations = relations(
  withholdingRecords,
  ({ one }) => ({
    entity: one(entities, {
      fields: [withholdingRecords.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── FILING DEADLINES ────────────────────────────

export const filingDeadlines = pgTable(
  "filing_deadlines",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    jurisdiction: text("jurisdiction").notNull(),
    filingType: text("filing_type").notNull(), // "vat", "paye", "withholding", "corporate_tax", "social_security"
    name: text("name").notNull(),
    dueDate: text("due_date").notNull(),
    period: text("period"), // YYYY-MM
    estimatedAmount: numeric("estimated_amount", { precision: 15, scale: 2 }),
    status: filingStatusEnum("status").notNull().default("pending"),
    filedAt: timestamp("filed_at"),
    filingReference: text("filing_reference"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("filing_deadlines_entity").on(t.entityId),
    index("filing_deadlines_due").on(t.entityId, t.dueDate),
    index("filing_deadlines_status").on(t.entityId, t.status),
  ],
);

export const filingDeadlinesRelations = relations(
  filingDeadlines,
  ({ one }) => ({
    entity: one(entities, {
      fields: [filingDeadlines.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── TAX PACKAGES ────────────────────────────────

export const taxPackages = pgTable(
  "tax_packages",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    packageType: taxPackageTypeEnum("package_type").notNull(),
    period: text("period").notNull(),
    status: taxPackageStatusEnum("status").notNull().default("assembling"),
    formatExport: jsonb("format_export").$type<{
      format: string;
      content: Record<string, unknown>;
      exportedAt: string;
    }>(),
    complianceChecked: boolean("compliance_checked").notNull().default(false),
    complianceNotes: text("compliance_notes"),
    reviewedBy: text("reviewed_by"),
    reviewedAt: timestamp("reviewed_at"),
    submitted: boolean("submitted").notNull().default(false),
    submittedAt: timestamp("submitted_at"),
    submissionReference: text("submission_reference"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("tax_packages_entity").on(t.entityId),
    index("tax_packages_type_period").on(t.entityId, t.packageType, t.period),
  ],
);

export const taxPackagesRelations = relations(taxPackages, ({ one }) => ({
  entity: one(entities, {
    fields: [taxPackages.entityId],
    references: [entities.id],
  }),
}));

// ─── COMPLIANCE DEADLINES (Live Countdown) ──────────────────────────
//
// Tracks filing deadlines with live-countdown-aware fields.
// The daysUntilDue field is computed at query time for liveness display.
// Color thresholds: 30d=blue, 14d=amber, 7d=red

export const complianceDeadlines = pgTable(
  "compliance_deadlines",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    jurisdiction: text("jurisdiction").notNull(),
    filingType: text("filing_type").notNull(),
    name: text("name").notNull(),
    dueDate: timestamp("due_date").notNull(),
    period: text("period"),
    estimatedAmount: numeric("estimated_amount", { precision: 15, scale: 2 }),
    status: filingStatusEnum("status").notNull().default("pending"),
    urgencyLevel: text("urgency_level")
      .$type<"normal" | "approaching" | "critical" | "overdue">()
      .default("normal"),
    lastCheckedAt: timestamp("last_checked_at"),
    taxAgentReviewStatus: text("tax_agent_review_status")
      .$type<"pending" | "reviewing" | "passed" | "kicked_back">()
      .default("pending"),
    taxAgentReviewNotes: text("tax_agent_review_notes"),
    packageReady: boolean("package_ready").notNull().default(false),
    filedAt: timestamp("filed_at"),
    filingReference: text("filing_reference"),
    regulatoryStatus: text("regulatory_status")
      .$type<"clean" | "items_pending" | "risk_detected">()
      .default("clean"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("cd_entity").on(t.entityId),
    index("cd_due_date").on(t.entityId, t.dueDate),
    index("cd_status").on(t.entityId, t.status),
    index("cd_urgency").on(t.entityId, t.urgencyLevel),
  ],
);

export const complianceDeadlinesRelations = relations(
  complianceDeadlines,
  ({ one }) => ({
    entity: one(entities, {
      fields: [complianceDeadlines.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── RULE CHANGE PROPOSALS ─────────────────────────────────────────
//
// Tracks detected tax law changes before they are applied.
// Every proposal requires explicit human confirmation (confirmedBy must be
// populated before rule set is updated). Never auto-applied.

export const ruleChangeProposals = pgTable(
  "rule_change_proposals",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    jurisdiction: text("jurisdiction").notNull(),
    ruleType: taxRuleTypeEnum("rule_type").notNull(),
    ruleName: text("rule_name").notNull(),
    detectedAt: timestamp("detected_at").notNull().defaultNow(),
    detectedBy: text("detected_by"),
    sourceCitation: text("source_citation"),
    sourceUrl: text("source_url"),
    sourceConfidence: numeric("source_confidence", { precision: 3, scale: 2 }),
    oldValue: jsonb("old_value").$type<Record<string, unknown>>(),
    newValue: jsonb("new_value").$type<Record<string, unknown>>(),
    effectiveDate: timestamp("effective_date"),
    status: text("status")
      .$type<"pending" | "confirmed" | "applied" | "rejected">()
      .notNull()
      .default("pending"),
    confirmedBy: text("confirmed_by"),
    confirmedAt: timestamp("confirmed_at"),
    appliedAt: timestamp("applied_at"),
    rejectionReason: text("rejection_reason"),
    notes: text("notes"),
    ...timestamps,
  },
  (t) => [
    index("rcp_entity").on(t.entityId),
    index("rcp_status").on(t.entityId, t.status),
    index("rcp_jurisdiction").on(t.entityId, t.jurisdiction),
  ],
);

export const ruleChangeProposalsRelations = relations(
  ruleChangeProposals,
  ({ one }) => ({
    entity: one(entities, {
      fields: [ruleChangeProposals.entityId],
      references: [entities.id],
    }),
  }),
);
