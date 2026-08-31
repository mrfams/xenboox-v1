import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  date,
  numeric,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import {
  organizations,
  entities,
  onboardingSourceTypeEnum,
} from "./organization";
import { chartOfAccounts } from "./accounting";
import { users } from "./auth";

// ─── ENUMS ───────────────────────────────────────

export const onboardingStepEnum = pgEnum("onboarding_step", [
  "signup",
  "routing",
  "entity_setup",
  "data_connections",
  "historical_pull",
  "coa_review",
  "first_look",
  "complete",
]);

export const onboardingStatusEnum = pgEnum("onboarding_status", [
  "in_progress",
  "completed",
  "abandoned",
]);

export const onboardingRoutingAnswerEnum = pgEnum("onboarding_routing_answer", [
  "excel",
  "quickbooks",
  "xero",
  "nothing",
  "other",
]);

export const dataConnectionTypeEnum = pgEnum("data_connection_type", [
  "bank_api",
  "bank_pdf",
  "mobile_money",
  "quickbooks",
  "xero",
  "excel",
  "csv",
  "manual_entry",
]);

export const dataConnectionStatusEnum = pgEnum("data_connection_status", [
  "pending",
  "processing",
  "connected",
  "failed",
  "fallback_offered",
]);

export const historicalPullStatusEnum = pgEnum("historical_pull_status", [
  "pending",
  "pulling",
  "completed",
  "failed",
  "permission_required",
  "permission_granted",
  "permission_denied",
]);

export const openingBalanceSourceEnum = pgEnum("opening_balance_source", [
  "reconstructed",
  "owner_confirmed",
  "migrated_from_source_system",
]);

export const reconstructionDetailDepthEnum = pgEnum(
  "reconstruction_detail_depth",
  ["last_12_months", "last_3_years", "full_history"],
);

// ─── ONBOARDING SESSIONS ──────────────────────────
//
// Tracks the full onboarding journey for an organization.
// time_to_first_value_seconds is the north star metric.

export const onboardingSessions = pgTable(
  "onboarding_sessions",
  {
    id: uuidId(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    currentStep: onboardingStepEnum("current_step").notNull().default("signup"),
    status: onboardingStatusEnum("status").notNull().default("in_progress"),
    routingAnswer: onboardingRoutingAnswerEnum("routing_answer"),
    // Five-category record-keeping answer (spec §2/§6). New flows write this;
    // `routingAnswer` above is retained read-only for legacy sessions.
    sourceType: onboardingSourceTypeEnum("source_type"),
    completedSteps: text("completed_steps").array().notNull().default([]),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),
    timeToFirstValueSeconds: integer("time_to_first_value_seconds"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("onboarding_sessions_org").on(t.orgId),
    index("onboarding_sessions_status").on(t.status),
  ],
);

export const onboardingSessionsRelations = relations(
  onboardingSessions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [onboardingSessions.orgId],
      references: [organizations.id],
    }),
  }),
);

// ─── DATA CONNECTIONS ─────────────────────────────
//
// Every external data source a user connects during onboarding.
// Failure state is first-class: every row tracks what went wrong
// and what fallback was offered.

export const dataConnections = pgTable(
  "data_connections",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    type: dataConnectionTypeEnum("type").notNull(),
    status: dataConnectionStatusEnum("status").notNull().default("pending"),
    recordsProcessed: integer("records_processed").notNull().default(0),
    failureReason: text("failure_reason"),
    fallbackOffered: dataConnectionTypeEnum("fallback_offered"),
    fallbackAccepted: boolean("fallback_accepted"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("data_connections_entity").on(t.entityId),
    index("data_connections_status").on(t.status),
  ],
);

export const dataConnectionsRelations = relations(
  dataConnections,
  ({ one }) => ({
    entity: one(entities, {
      fields: [dataConnections.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── HISTORICAL PULL JOBS ─────────────────────────
//
// Background jobs that pull historical financial data.
// The ONE explicit human-permission gate in the whole flow.
// If detected history exceeds 12 months, CFO Agent stops and asks.

export const historicalPullJobs = pgTable(
  "historical_pull_jobs",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    dateRangeStart: text("date_range_start").notNull(),
    dateRangeEnd: text("date_range_end").notNull(),
    status: historicalPullStatusEnum("status").notNull().default("pending"),
    recordsImported: integer("records_imported").notNull().default(0),
    totalRecordsEstimated: integer("total_records_estimated"),
    exceeds12Months: boolean("exceeds_12_months").notNull().default(false),
    permissionRequestedAt: timestamp("permission_requested_at"),
    permissionGrantedAt: timestamp("permission_granted_at"),
    completedAt: timestamp("completed_at"),
    errorMessage: text("error_message"),
    // Reconstruction attributes (spec §4/§6): the five-category source,
    // user-selected detail depth, the cutoff before which only an opening
    // balance (not itemized detail) exists, and which model tier processed
    // the job (full tier routing is the Tech Stack §18 spec).
    sourceType: onboardingSourceTypeEnum("source_type"),
    detailDepth: reconstructionDetailDepthEnum("detail_depth")
      .notNull()
      .default("last_12_months"),
    openingBalanceCutoffDate: date("opening_balance_cutoff_date"),
    modelTierUsed: text("model_tier_used"),
    ...timestamps,
  },
  (t) => [
    index("historical_pull_entity").on(t.entityId),
    index("historical_pull_status").on(t.status),
  ],
);

export const historicalPullJobsRelations = relations(
  historicalPullJobs,
  ({ one }) => ({
    entity: one(entities, {
      fields: [historicalPullJobs.entityId],
      references: [entities.id],
    }),
  }),
);

// ─── OPENING BALANCES ──────────────────────────────
//
// Account balances as of the earliest point Xenboox reconstructs to (spec §4.1).
// `source` is the audit-critical distinction: a reconstructed/migrated balance
// is a different claim than an owner-confirmed estimate, and both must be
// distinguishable later if a question ever comes up about where a number came
// from (spec §7.5). Unique (entity, account) enables the idempotent upsert.

export const openingBalances = pgTable(
  "opening_balances",
  {
    id: uuidId(),
    entityId: entityId
      .notNull()
      .references(() => entities.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => chartOfAccounts.id),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    source: openingBalanceSourceEnum("source").notNull(),
    confirmedByUserId: uuid("confirmed_by_user_id").references(() => users.id),
    confirmedAt: timestamp("confirmed_at"),
    supportingDocumentId: uuid("supporting_document_id"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("opening_balances_entity_account").on(t.entityId, t.accountId),
    index("opening_balances_entity").on(t.entityId),
  ],
);

export const openingBalancesRelations = relations(
  openingBalances,
  ({ one }) => ({
    entity: one(entities, {
      fields: [openingBalances.entityId],
      references: [entities.id],
    }),
    account: one(chartOfAccounts, {
      fields: [openingBalances.accountId],
      references: [chartOfAccounts.id],
    }),
  }),
);

// ─── COA TEMPLATES ─────────────────────────────────
//
// Pre-built chart of accounts templates keyed by business segment and market.
// Used during onboarding to propose a relevant CoA.

export const coaTemplates = pgTable(
  "coa_templates",
  {
    id: uuidId(),
    name: text("name").notNull(),
    segment: text("segment").notNull(),
    country: text("country"),
    market: text("market"),
    accountList: jsonb("account_list").notNull().$type<
      Array<{
        code: string;
        name: string;
        type: "asset" | "liability" | "equity" | "revenue" | "expense";
        subtype: string;
        isActive: boolean;
      }>
    >(),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps,
  },
  (t) => [index("coa_templates_segment_country").on(t.segment, t.country)],
);

export const coaTemplatesRelations = relations(coaTemplates, () => ({}));
