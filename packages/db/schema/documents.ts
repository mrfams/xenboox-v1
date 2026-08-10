import {
  pgTable,
  uuid,
  text,
  integer,
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
import { users } from "./auth";

// ─── ENUMS ───────────────────────────────────────

export const docTypeEnum = pgEnum("doc_type", [
  "invoice",
  "receipt",
  "contract",
  "voucher",
  "bank_statement",
  "tax_return",
  "payroll_report",
  "journal_entry",
  "po",
  "supporting",
]);

export const docStatusEnum = pgEnum("doc_status", [
  // ── Document processing pipeline (stages 1-3) ──
  "detected",
  "processing",
  "extracted",
  "validated",
  "synced",
  // ── Ingestion pipeline (stages 4-13) ──
  "resolving", // Stage 4: entity resolution
  "classifying_workflow", // Stage 5: workflow classification
  "mapping_accounts", // Stage 7: COA mapping
  "calculating_tax", // Stage 8: tax calculation
  "generating_journal", // Stage 9: journal entry generation
  "validating_entry", // Stage 10: validation
  "deciding_post", // Stage 12: posting decision
  "posting", // Stage 13: posting execution
  "propagating", // Stage 14: downstream propagation
  // ── Terminal states ──
  "agent_processing",
  "persisted",
  "done",
  "failed",
  "archived",
  // Legacy values kept for backward compatibility
  "uploaded",
  "processed",
]);

// ─── DOCUMENTS ───────────────────────────────────

export const documents = pgTable(
  "documents",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: docTypeEnum("type").notNull(),
    status: docStatusEnum("status").notNull().default("detected"),
    mimeType: text("mime_type"),
    sizeBytes: integer("size_bytes"),
    r2Key: text("r2_key").notNull(),
    r2Bucket: text("r2_bucket").notNull(),
    ocrText: text("ocr_text"),
    ocrConfidence: numeric("ocr_confidence", { precision: 3, scale: 2 }),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    tags: jsonb("tags").default([]).$type<string[]>(),
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    ...timestamps,
  },
  (t) => [
    index("documents_entity").on(t.entityId),
    index("documents_type").on(t.entityId, t.type),
    index("documents_status").on(t.entityId, t.status),
  ],
);

export const documentsRelations = relations(documents, ({ one, many }) => ({
  entity: one(entities, {
    fields: [documents.entityId],
    references: [entities.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
  links: many(documentLinks),
}));

// ─── DOCUMENT LINKS ──────────────────────────────

export const documentLinks = pgTable(
  "document_links",
  {
    id: uuidId(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    ...timestamps,
  },
  (t) => [
    index("doc_links_document").on(t.documentId),
    index("doc_links_entity").on(t.entityType, t.entityId),
  ],
);

export const documentLinksRelations = relations(documentLinks, ({ one }) => ({
  document: one(documents, {
    fields: [documentLinks.documentId],
    references: [documents.id],
  }),
}));

// ─── AUDIT LOG ───────────────────────────────────

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityIdRef: uuid("entity_id_ref"),
    oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
    newValues: jsonb("new_values").$type<Record<string, unknown>>(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    // ── Tamper-evident chain fields (see lib/audit/chain.ts — keep in sync
    //    with the DB trigger in the 0025 migration) ──
    actorType: text("actor_type"), // user | agent | system | api
    agentId: text("agent_id"), // e.g. "cfo-agent" when actorType = agent
    reason: text("reason"), // business justification for sensitive actions
    sessionId: text("session_id"),
    requestId: text("request_id"),
    seq: integer("seq"), // 1-based position within the entity's chain
    prevHash: text("prev_hash"), // SHA-256 of the previous event in the chain
    eventHash: text("event_hash"), // SHA-256 of this event (prevHash + payload text)
    payloadHashInput: text("payload_hash_input"), // canonical text that was hashed
    ...timestamps,
  },
  (t) => [
    index("audit_entity").on(t.entityId),
    index("audit_user").on(t.userId),
    index("audit_action").on(t.entityId, t.action),
    index("audit_entity_type").on(t.entityType, t.entityIdRef),
    index("audit_entity_seq").on(t.entityId, t.seq),
  ],
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  entity: one(entities, {
    fields: [auditLog.entityId],
    references: [entities.id],
  }),
  user: one(users, { fields: [auditLog.userId], references: [users.id] }),
}));

// ─── AGENT ACTIVITY ──────────────────────────────

export const agentActivity = pgTable(
  "agent_activity",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    agentName: text("agent_name").notNull(),
    action: text("action").notNull(),
    input: jsonb("input").$type<Record<string, unknown>>(),
    output: jsonb("output").$type<Record<string, unknown>>(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }),
    durationMs: integer("duration_ms"),
    costCents: integer("cost_cents"),
    // §4.4 — Model telemetry fields
    modelId: text("model_id"),
    provider: text("provider"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    fromCache: boolean("from_cache").default(false),
    langfuseTraceId: text("langfuse_trace_id"),
    status: text("status").notNull().default("success"),
    errorMessage: text("error_message"),
    ...timestamps,
  },
  (t) => [
    index("agent_activity_entity").on(t.entityId),
    index("agent_activity_agent").on(t.agentName),
    index("agent_activity_date").on(t.entityId, t.createdAt),
    index("agent_activity_model").on(t.modelId, t.provider),
  ],
);

export const agentActivityRelations = relations(agentActivity, ({ one }) => ({
  entity: one(entities, {
    fields: [agentActivity.entityId],
    references: [entities.id],
  }),
}));

// ─── CURRENCIES ──────────────────────────────────

export const currencies = pgTable("currencies", {
  id: uuidId(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  symbol: text("symbol").notNull(),
  decimalPlaces: integer("decimal_places").notNull().default(2),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

// ─── EXCHANGE RATES ──────────────────────────────

export const exchangeRates = pgTable(
  "exchange_rates",
  {
    id: uuidId(),
    fromCurrency: text("from_currency").notNull(),
    toCurrency: text("to_currency").notNull(),
    rate: numeric("rate", { precision: 15, scale: 6 }).notNull(),
    source: text("source").notNull(),
    validFrom: timestamp("valid_from").notNull().defaultNow(),
    validTo: timestamp("valid_to"),
    ...timestamps,
  },
  (t) => [
    index("exchange_rates_pair").on(t.fromCurrency, t.toCurrency),
    index("exchange_rates_valid").on(t.fromCurrency, t.toCurrency, t.validFrom),
  ],
);
