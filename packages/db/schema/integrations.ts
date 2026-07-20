import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { users } from "./auth";
import { documents } from "./documents";

// ─── ENUMS ───────────────────────────────────────

export const bankConnectionStatusEnum = pgEnum("bank_connection_status", [
  "pending",
  "active",
  "error",
  "disconnected",
]);

export const bankConnectionProviderEnum = pgEnum("bank_connection_provider", [
  "mono",
  "plaid",
  "stitch",
  "manual",
]);

export const inboundEmailStatusEnum = pgEnum("inbound_email_status", [
  "received",
  "processing",
  "processed",
  "failed",
  "ignored",
]);

// ─── BANK CONNECTIONS ─────────────────────────────

export const bankConnections = pgTable(
  "bank_connections",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    provider: bankConnectionProviderEnum("provider").notNull().default("mono"),
    providerConnectionId: text("provider_connection_id"),
    institutionName: text("institution_name").notNull(),
    institutionId: text("institution_id"),
    accountName: text("account_name"),
    accountNumber: text("account_number"),
    accountType: text("account_type"),
    currency: text("currency").notNull().default("GMD"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at"),
    status: bankConnectionStatusEnum("status").notNull().default("pending"),
    lastSyncedAt: timestamp("last_synced_at"),
    syncError: text("sync_error"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("bank_conn_entity").on(t.entityId),
    index("bank_conn_user").on(t.userId),
    index("bank_conn_status").on(t.entityId, t.status),
    index("bank_conn_provider").on(t.provider, t.providerConnectionId),
  ],
);

export const bankConnectionsRelations = relations(
  bankConnections,
  ({ one }) => ({
    entity: one(entities, {
      fields: [bankConnections.entityId],
      references: [entities.id],
    }),
    user: one(users, {
      fields: [bankConnections.userId],
      references: [users.id],
    }),
  }),
);

// ─── EMAIL FORWARDING RULES ───────────────────────

export const emailForwardingRules = pgTable(
  "email_forwarding_rules",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    emailAddress: text("email_address").notNull(),
    displayName: text("display_name"),
    isActive: boolean("is_active").notNull().default(true),
    autoClassify: boolean("auto_classify").notNull().default(true),
    defaultDocumentType: text("default_document_type").default("invoice"),
    forwardTo: text("forward_to"),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("email_rule_entity").on(t.entityId),
    index("email_rule_address").on(t.emailAddress),
  ],
);

export const emailForwardingRulesRelations = relations(
  emailForwardingRules,
  ({ one }) => ({
    entity: one(entities, {
      fields: [emailForwardingRules.entityId],
      references: [entities.id],
    }),
    user: one(users, {
      fields: [emailForwardingRules.userId],
      references: [users.id],
    }),
  }),
);

// ─── INBOUND EMAILS ───────────────────────────────

export const inboundEmails = pgTable(
  "inbound_emails",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    ruleId: uuid("rule_id").references(() => emailForwardingRules.id),
    fromAddress: text("from_address").notNull(),
    fromName: text("from_name"),
    toAddress: text("to_address").notNull(),
    subject: text("subject"),
    bodyText: text("body_text"),
    bodyHtml: text("body_html"),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    status: inboundEmailStatusEnum("status").notNull().default("received"),
    documentId: uuid("document_id").references(() => documents.id),
    attachmentCount: integer("attachment_count").notNull().default(0),
    attachmentPaths: jsonb("attachment_paths").default([]).$type<string[]>(),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    processingError: text("processing_error"),
    ...timestamps,
  },
  (t) => [
    index("inbound_email_entity").on(t.entityId),
    index("inbound_email_status").on(t.entityId, t.status),
    index("inbound_email_from").on(t.fromAddress),
  ],
);

// ─── CSV COLUMN MAPPINGS ───────────────────────────

/**
 * Stores saved CSV/Excel column mappings per entity + source.
 * When a user uploads a CSV, the system checks for an existing mapping
 * by source name (e.g., "GTBank", "Wave", "custom-import").
 * If found, the mapping is auto-applied. If not, the Mapping Wizard UI
 * is presented and the result is saved here.
 *
 * fieldMapping schema:
 * {
 *   "date": "Transaction Date",
 *   "description": "Narration",
 *   "debit": "Debit Amount",
 *   "credit": "Credit Amount",
 *   "balance": "Running Balance",
 *   "reference": "Reference"
 * }
 */
export const csvMappings = pgTable(
  "csv_mappings",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    sourceName: text("source_name").notNull(),
    sourceLabel: text("source_label"),
    fileHeaderHash: text("file_header_hash"),
    delimiter: text("delimiter").default(","),
    hasHeaderRow: boolean("has_header_row").notNull().default(true),
    fieldMapping: jsonb("field_mapping")
      .notNull()
      .$type<Record<string, string>>(),
    skipRows: integer("skip_rows").notNull().default(0),
    dateFormat: text("date_format"),
    userId: uuid("user_id").references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    useCount: integer("use_count").notNull().default(1),
    lastUsedAt: timestamp("last_used_at").defaultNow(),
    ...timestamps,
  },
  (t) => [
    index("csv_map_entity").on(t.entityId),
    index("csv_map_source").on(t.entityId, t.sourceName),
    uniqueIndex("csv_map_entity_source").on(t.entityId, t.sourceName),
  ],
);

export const csvMappingsRelations = relations(csvMappings, ({ one }) => ({
  entity: one(entities, {
    fields: [csvMappings.entityId],
    references: [entities.id],
  }),
}));

export const inboundEmailsRelations = relations(inboundEmails, ({ one }) => ({
  entity: one(entities, {
    fields: [inboundEmails.entityId],
    references: [entities.id],
  }),
  rule: one(emailForwardingRules, {
    fields: [inboundEmails.ruleId],
    references: [emailForwardingRules.id],
  }),
  document: one(documents, {
    fields: [inboundEmails.documentId],
    references: [documents.id],
  }),
}));
