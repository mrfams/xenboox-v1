// ─── Jurisdiction Expansion Pipeline Schema ──────────────────────────
//
// The repeatable process for adding a new country's tax and statutory rules.
// First application: Nigeria (FIRS) and Ghana (GRA-GH).
//
// This schema feeds the existing jurisdiction_tax_rules, statutory deduction
// types, and coa_templates tables — no new core schema, only new rows and
// the expansion tracking infrastructure.
//
// Tables:
//   jurisdiction_expansion_requests  — Tracks expansion lifecycle
//   statutory_deduction_rules        — Per-country statutory deduction rates

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
import { uuidId, timestamps } from "./helpers";
import { organizations, entities } from "./organization";

// ─── ENUMS ───────────────────────────────────────

export const expansionStatusEnum = pgEnum("expansion_status", [
  "research",
  "drafted",
  "reviewed",
  "sandboxed",
  "live",
  "failed",
]);

export const deductionCategoryEnum = pgEnum("deduction_category", [
  "pension",
  "social_security",
  "health_insurance",
  "housing",
  "training",
  "other",
]);

// ─── JURISDICTION EXPANSION REQUESTS ──────────────
//
// Tracks the full lifecycle of adding a new jurisdiction.
// Every expansion has 5 phases (research → drafted → reviewed → sandboxed → live)
// with mandatory human sign-off at the reviewed → sandboxed gate.
// No jurisdiction skips its elevated-review grace period on first go-live.

export const jurisdictionExpansionRequests = pgTable(
  "jurisdiction_expansion_requests",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    country: text("country").notNull(), // "NG", "GH"
    countryName: text("country_name").notNull(), // "Nigeria", "Ghana"
    status: expansionStatusEnum("status").notNull().default("research"),
    currency: text("currency").notNull(), // "NGN", "GHS"
    researchedById: text("researched_by_id"),
    researchedAt: timestamp("researched_at"),
    sources: jsonb("sources")
      .$type<
        Array<{
          title: string;
          url: string;
          publicationDate: string;
          verifiedAt: string;
          verifiedBy: string;
        }>
      >()
      .default([]),
    draftedById: text("drafted_by_id"),
    draftedAt: timestamp("drafted_at"),
    reviewedById: text("reviewed_by_id"),
    reviewedAt: timestamp("reviewed_at"),
    reviewNotes: text("review_notes"),
    sandboxPassed: boolean("sandbox_passed"),
    sandboxRunId: text("sandbox_run_id"),
    sandboxCompletedAt: timestamp("sandbox_completed_at"),
    activatedAt: timestamp("activated_at"),
    activatedById: text("activated_by_id"),
    gracePeriodEndsAt: timestamp("grace_period_ends_at"),
    // Elevated review monitoring: during grace period, every filing/payroll run
    // gets mandatory human review regardless of confidence score.
    gracePeriodFilesReviewed: numeric("grace_period_files_reviewed")
      .notNull()
      .default("0"),
    gracePeriodFilesTotal: numeric("grace_period_files_total")
      .notNull()
      .default("0"),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    ...timestamps,
  },
  (t) => [
    index("jer_entity").on(t.entityId),
    index("jer_country").on(t.country),
    index("jer_status").on(t.status),
  ],
);

export const jurisdictionExpansionRequestsRelations = relations(
  jurisdictionExpansionRequests,
  ({ one }) => ({
    entity: one(entities, {
      fields: [jurisdictionExpansionRequests.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── STATUTORY DEDUCTION RULES ────────────────────
//
// Per-country statutory deduction rules (pension, social security, health
// insurance, etc.). Each rule has versioned rates with effective dates.
// New rules start as "draft" — never active on creation.

export const statutoryDeductionRules = pgTable(
  "statutory_deduction_rules",
  {
    id: uuidId(),
    entityId: uuid("entity_id")
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    country: text("country").notNull(),
    category: deductionCategoryEnum("category").notNull(),
    code: text("code").notNull(), // e.g. "NSITF", "SSNIT", "NHF"
    name: text("name").notNull(),
    description: text("description"),
    // Employee share config
    employeeRate: numeric("employee_rate", { precision: 6, scale: 4 })
      .notNull()
      .default("0"),
    employeeCeiling: numeric("employee_ceiling", { precision: 15, scale: 2 }),
    // Employer share config
    employerRate: numeric("employer_rate", { precision: 6, scale: 4 })
      .notNull()
      .default("0"),
    employerCeiling: numeric("employer_ceiling", { precision: 15, scale: 2 }),
    // Rate type: "percentage" | "fixed"
    rateType: text("rate_type").notNull().default("percentage"),
    version: numeric("version", { precision: 5, scale: 0 })
      .notNull()
      .default("1"),
    status: text("status").notNull().default("draft"),
    // "draft" | "active" | "superseded"
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    proposedById: text("proposed_by_id"),
    approvedById: text("approved_by_id"),
    approvedAt: timestamp("approved_at"),
    ...timestamps,
  },
  (t) => [
    index("sdr_entity").on(t.entityId),
    index("sdr_country_category").on(t.country, t.category),
    index("sdr_code").on(t.country, t.code),
    index("sdr_active").on(t.country, t.status),
  ],
);

export const statutoryDeductionRulesRelations = relations(
  statutoryDeductionRules,
  ({ one }) => ({
    entity: one(entities, {
      fields: [statutoryDeductionRules.entityId],
      references: [entities.id],
    }),
  }),
);
