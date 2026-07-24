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
import { employees } from "./payroll";

// ─── ENUMS ───────────────────────────────────────

export const taxRuleStatusEnum = pgEnum("tax_rule_status", [
  "draft",
  "active",
  "superseded",
]);

export const taxRuleTypeEnum = pgEnum("tax_rule_type", [
  "vat",
  "paye",
  "withholding",
  "corporate",
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

export const jurisdictionTaxRules = pgTable(
  "jurisdiction_tax_rules",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    country: text("country").notNull(), // "GM", "NG", "KE", "GH"
    ruleType: taxRuleTypeEnum("rule_type").notNull(),
    version: integer("version").notNull().default(1),
    name: text("name").notNull(),
    description: text("description"),
    rateOrBands: jsonb("rate_or_bands").notNull().$type<{
      type: "rate" | "bands";
      rate?: number;
      bands?: Array<{ from: number; to: number | null; rate: number }>;
      threshold?: number;
      ceiling?: number;
    }>(),
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
  ({ one }) => ({
    entity: one(entities, {
      fields: [jurisdictionTaxRules.entityId],
      references: [entities.id],
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

// Need to import integer
import { integer } from "drizzle-orm/pg-core";
