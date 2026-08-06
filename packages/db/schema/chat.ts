import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";
import { users } from "./auth";
import { documents } from "./documents";

// ─── ENUMS ───────────────────────────────────────

export const chatRoleEnum = pgEnum("chat_role", [
  "user",
  "assistant",
  "system",
]);

export const conversationStatusEnum = pgEnum("conversation_status", [
  "active",
  "archived",
  "pinned",
]);

export const messageStatusEnum = pgEnum("message_status", [
  "streaming",
  "completed",
  "failed",
  "cancelled",
]);

export const attachmentTypeEnum = pgEnum("attachment_type", [
  "document",
  "image",
  "file",
]);

// ─── CONVERSATIONS ───────────────────────────────

export const conversations = pgTable(
  "conversations",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title"),
    status: conversationStatusEnum("status").notNull().default("active"),
    summary: text("summary"),
    pinned: integer("pinned").default(0),
    lastMessageAt: timestamp("last_message_at"),
    messageCount: integer("message_count").default(0),
    forkedFromConversationId: uuid("forked_from_conversation_id").references(
      (): any => conversations.id,
    ),
    forkedFromMessageId: uuid("forked_from_message_id"),
    metadata: jsonb("metadata").default({}),
    ...timestamps,
  },
  (table) => [
    index("conversations_entity_idx").on(table.entityId),
    index("conversations_user_idx").on(table.userId),
    index("conversations_entity_user_idx").on(table.entityId, table.userId),
    index("conversations_last_message_idx").on(table.lastMessageAt),
    index("conversations_fork_source_idx").on(table.forkedFromConversationId),
  ],
);

// ─── MESSAGES ────────────────────────────────────

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuidId(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: chatRoleEnum("role").notNull(),
    content: text("content"),
    status: messageStatusEnum("status").notNull().default("completed"),
    parentMessageId: uuid("parent_message_id"),
    confidence: real("confidence"),
    agentModel: text("agent_model"),
    tokenCount: integer("token_count"),
    latencyMs: integer("latency_ms"),
    hasAttachments: integer("has_attachments").default(0),
    /** Tool calls made during this message (assistant messages only) */
    toolCalls: jsonb("tool_calls")
      .$type<
        Array<{
          toolName: string;
          args: Record<string, unknown>;
          success: boolean;
          result?: unknown;
          durationMs?: number;
        }>
      >()
      .default([]),
    /** RAG citations included in this message */
    citations: jsonb("citations")
      .$type<
        Array<{
          chunkId: string;
          documentId: string;
          sourceType: string;
          content: string;
          score: number;
        }>
      >()
      .default([]),
    metadata: jsonb("metadata").default({}),
    ...timestamps,
  },
  (table) => [
    index("chat_messages_conversation_idx").on(table.conversationId),
    index("chat_messages_created_idx").on(table.createdAt),
  ],
);

// ─── CHAT ATTACHMENTS ────────────────────────────

export const chatAttachments = pgTable(
  "chat_attachments",
  {
    id: uuidId(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => chatMessages.id, {
      onDelete: "cascade",
    }),
    documentId: uuid("document_id").references(() => documents.id, {
      onDelete: "set null",
    }),
    attachmentType: attachmentTypeEnum("attachment_type")
      .notNull()
      .default("document"),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    r2Key: text("r2_key"),
    r2Bucket: text("r2_bucket"),
    ocrText: text("ocr_text"),
    ocrConfidence: real("ocr_confidence"),
    status: text("status").notNull().default("uploaded"),
    metadata: jsonb("metadata").default({}),
    ...timestamps,
  },
  (table) => [
    index("chat_attachments_conversation_idx").on(table.conversationId),
    index("chat_attachments_message_idx").on(table.messageId),
    index("chat_attachments_document_idx").on(table.documentId),
  ],
);

// ─── AGENT ACTIVITY PER MESSAGE ──────────────────

export const chatAgentActivity = pgTable(
  "chat_agent_activity",
  {
    id: uuidId(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    agentId: text("agent_id").notNull(),
    tier: integer("tier"),
    action: text("action"),
    input: jsonb("input"),
    output: jsonb("output"),
    confidence: real("confidence"),
    durationMs: integer("duration_ms"),
    langfuseTraceId: text("langfuse_trace_id"),
    ...timestamps,
  },
  (table) => [
    index("chat_agent_activity_conversation_idx").on(table.conversationId),
    index("chat_agent_activity_message_idx").on(table.messageId),
  ],
);

// ─── MESSAGE REACTIONS ───────────────────────────

export const chatMessageReactions = pgTable(
  "chat_message_reactions",
  {
    id: uuidId(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    emoji: text("emoji").notNull(),
    ...timestamps,
  },
  (table) => [
    index("chat_reactions_message_idx").on(table.messageId),
    index("chat_reactions_user_idx").on(table.userId),
    // One reaction per user per emoji per message
  ],
);

// ─── CONVERSATION SHARES ─────────────────────────

export const conversationShares = pgTable(
  "conversation_shares",
  {
    id: uuidId(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    sharedByUserId: uuid("shared_by_user_id")
      .notNull()
      .references(() => users.id),
    sharedWithUserId: uuid("shared_with_user_id").references(() => users.id),
    permission: text("permission").notNull().default("read"), // read | write
    expiresAt: timestamp("expires_at"),
    ...timestamps,
  },
  (table) => [
    index("shares_conversation_idx").on(table.conversationId),
    index("shares_shared_with_idx").on(table.sharedWithUserId),
  ],
);
