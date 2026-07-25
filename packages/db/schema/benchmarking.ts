// ─── Benchmarking & Consent Architecture Schema (Phase 3) ─────────────────
//
// Implements the opt-in consent, anonymization, cohort management, and
// aggregate benchmarking system that the Analytics Pipeline's Benchmarking
// Engine milestone defers to. This pipeline is a prerequisite, not an
// enhancement — Analytics benchmarking stays unbuilt until this ships.
//
// Core rules:
//   1. DEFAULT EXCLUDED — opt-in only, never included by default
//   2. Minimum cohort size enforced under any circumstance
//   3. No individual org's raw figures ever exposed
//   4. Revocable consent at any time
//
// Tables:
//   benchmark_consent_records   — Explicit opt-IN consent grants/revocations
//   benchmark_cohort_members    — Internal org-to-cohort mapping (never exposed)
//   benchmark_aggregates        — Aggregate statistics only (median, quartiles)
//
// The benchmark_cohorts table lives in analytics.ts (Phase 2).

import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  numeric,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, timestamps, entityId } from "./helpers";
import { entities, organizations } from "./organization";
import { benchmarkCohorts } from "./analytics";

// ─── BENCHMARK CONSENT RECORDS ───────────────────────────────────────────
//
// Tracks explicit opt-IN consent grants and revocations per organization.
// Default state is excluded/opted-out — never included by default.
// Consent is revocable at any time via a new record.

export const benchmarkConsentRecords = pgTable(
  "benchmark_consent_records",
  {
    id: uuidId(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    // The entity within the org that consented (usually the primary entity)
    consented: boolean("consented").notNull(),
    // true = opted in, false = revoked
    consentedAt: timestamp("consented_at"),
    // When the consent was granted (null if never explicitly consented)
    revokedAt: timestamp("revoked_at"),
    // When consent was revoked (null if still active)
    consentedBy: uuid("consented_by").references(() => entities.id),
    // Who/what granted the consent (user ID)
    ipAddress: text("ip_address"),
    // For audit trail — source IP of consent action
    userAgent: text("user_agent"),
    // For audit trail — UA string
    notes: text("notes"),
    // Optional notes about the consent decision
    ...timestamps,
  },
  (t) => [
    index("bcr_org").on(t.organizationId),
    index("bcr_entity").on(t.entityId),
    index("bcr_consented").on(t.organizationId, t.consented),
    uniqueIndex("bcr_org_latest").on(t.organizationId, t.createdAt),
  ],
);

export const benchmarkConsentRecordsRelations = relations(
  benchmarkConsentRecords,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [benchmarkConsentRecords.organizationId],
      references: [organizations.id],
    }),
    entity: one(entities, {
      fields: [benchmarkConsentRecords.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── BENCHMARK COHORT MEMBERS ──────────────────────────────────────────
//
// Internal mapping of organizations to cohorts. This table is NEVER exposed
// downstream — it exists solely for cohort size calculation and consent
// revocation handling. No individual org's identity is ever surfaced.

export const benchmarkCohortMembers = pgTable(
  "benchmark_cohort_members",
  {
    id: uuidId(),
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => benchmarkCohorts.id, { onDelete: "cascade" }),
    // References the benchmark_cohorts.id from analytics.ts
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // Internal reference only — never exposed downstream of this table
    active: boolean("active").notNull().default(true),
    // false = member has been removed (consent revoked)
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    removedAt: timestamp("removed_at"),
    reasonRemoved: text("reason_removed"),
    // "consent_revoked" | "org_deleted" | "cohort_disbanded"
    ...timestamps,
  },
  (t) => [
    index("bcm_cohort").on(t.cohortId),
    index("bcm_org").on(t.organizationId),
    index("bcm_active").on(t.cohortId, t.active),
    uniqueIndex("bcm_member").on(t.cohortId, t.organizationId),
  ],
);

export const benchmarkCohortMembersRelations = relations(
  benchmarkCohortMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [benchmarkCohortMembers.organizationId],
      references: [organizations.id],
    }),
  }),
);

// ─── BENCHMARK AGGREGATES ──────────────────────────────────────────────
//
// Aggregate statistics only — median, quartile ranges. No individual
// organization's data is ever surfaced, including internally to Xenboox
// staff, beyond what's strictly needed to compute the aggregate.

export const benchmarkAggregates = pgTable(
  "benchmark_aggregates",
  {
    id: uuidId(),
    cohortId: uuid("cohort_id")
      .notNull()
      .references(() => benchmarkCohorts.id, { onDelete: "cascade" }),
    // References the benchmark_cohorts.id from analytics.ts
    metric: text("metric").notNull(),
    // Metric name: "revneue", "expense_ratio", "profit_margin", "liquidity_ratio",
    //              "overhead_rate", "receivables_turnover", "payables_turnover"
    period: text("period").notNull(),
    // Period this aggregate was computed for (YYYY-MM)
    memberCount: numeric("member_count").notNull(),
    // Number of orgs in the cohort for this computation
    median: numeric("median", { precision: 15, scale: 4 }).notNull(),
    // Median value of the metric across the cohort
    quartileLow: numeric("quartile_low", { precision: 15, scale: 4 }).notNull(),
    // First quartile (Q1 / 25th percentile)
    quartileHigh: numeric("quartile_high", {
      precision: 15,
      scale: 4,
    }).notNull(),
    // Third quartile (Q3 / 75th percentile)
    mean: numeric("mean", { precision: 15, scale: 4 }),
    // Mean value (optional — median is the primary metric)
    min: numeric("min", { precision: 15, scale: 4 }),
    // Minimum value in the cohort (aggregate only, not attributable)
    max: numeric("max", { precision: 15, scale: 4 }),
    // Maximum value in the cohort (aggregate only, not attributable)
    stdDev: numeric("std_dev", { precision: 15, scale: 4 }),
    // Standard deviation (optional — for confidence intervals)
    anonymizationMethod: text("anonymization_method")
      .notNull()
      .default("ratio_bands"),
    // How the data was anonymized: "ratio_bands", "range_bands", "exact_rounded"
    consentVerified: boolean("consent_verified").notNull().default(false),
    // Whether consent was verified for this computation
    minimumSizeVerified: boolean("minimum_size_verified")
      .notNull()
      .default(false),
    // Whether min cohort size was verified before computation
    computedAt: timestamp("computed_at").notNull().defaultNow(),
    computedBy: text("computed_by").notNull().default("benchmarking-pipeline"),
    computedForEntityId: entityId,
    // The entity that requested this benchmark (for RBAC)
    ...timestamps,
  },
  (t) => [
    index("ba_cohort").on(t.cohortId),
    index("ba_cohort_metric").on(t.cohortId, t.metric),
    index("ba_cohort_period").on(t.cohortId, t.period),
    index("ba_consent_verified").on(t.consentVerified),
    index("ba_min_size_verified").on(t.minimumSizeVerified),
  ],
);

export const benchmarkAggregatesRelations = relations(
  benchmarkAggregates,
  ({ one }) => ({
    entity: one(entities, {
      fields: [benchmarkAggregates.computedForEntityId],
      references: [entities.id],
    }),
  }),
);
