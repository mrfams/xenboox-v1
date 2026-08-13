import {
  pgEnum,
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// Enums
export const sourceTypeEnum = pgEnum("source_type", [
  "notion",
  "confluence",
  "google_drive",
  "slack",
  "github",
  "gmail",
  "custom",
]);

export const sourceStatusEnum = pgEnum("source_status", [
  "active",
  "syncing",
  "error",
  "paused",
]);

// Knowledge Sources
export const knowledgeSources = pgTable("knowledge_sources", {
  id: uuidId(),
  ...timestamps,

  name: varchar("name", { length: 255 }).notNull(),
  type: sourceTypeEnum("type").notNull(),
  status: sourceStatusEnum("status").notNull().default("active"),

  // Stats
  documentCount: integer("document_count").notNull().default(0),

  // Sync info
  lastSyncedAt: timestamp("last_synced_at"),
  syncInterval: integer("sync_interval"), // minutes

  // Configuration
  config: jsonb("config").$type<Record<string, unknown>>(),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Documents
export const knowledgeDocuments = pgTable("knowledge_documents", {
  id: uuidId(),
  ...timestamps,

  sourceId: uuid("source_id").references(() => knowledgeSources.id),

  title: varchar("title", { length: 500 }).notNull(),
  content: text("content"),
  url: varchar("url", { length: 1000 }),

  // Classification
  category: varchar("category", { length: 100 }),
  tags: jsonb("tags").$type<string[]>().default([]),

  // Stats
  connectionCount: integer("connection_count").notNull().default(0),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Conversations
export const knowledgeConversations = pgTable("knowledge_conversations", {
  id: uuidId(),
  ...timestamps,

  question: text("question").notNull(),
  answer: text("answer"),

  // Confidence
  confidence: numeric("confidence", { precision: 5, scale: 2 }),

  // Sources used
  sourcesUsed: jsonb("sources_used").$type<string[]>().default([]),

  // User
  userId: varchar("user_id", { length: 255 }),

  // Feedback
  helpful: boolean("helpful"),
  feedback: text("feedback"),
});

// Popular Questions
export const knowledgePopularQuestions = pgTable(
  "knowledge_popular_questions",
  {
    id: uuidId(),
    ...timestamps,

    question: text("question").notNull(),
    category: varchar("category", { length: 100 }),
    askCount: integer("ask_count").notNull().default(0),

    // Last asked
    lastAskedAt: timestamp("last_asked_at"),
  },
);

// Knowledge Connections (graph edges)
export const knowledgeConnections = pgTable("knowledge_connections", {
  id: uuidId(),
  ...timestamps,

  sourceNodeId: varchar("source_node_id", { length: 255 }).notNull(),
  targetNodeId: varchar("target_node_id", { length: 255 }).notNull(),

  // Relationship
  relationship: varchar("relationship", { length: 255 }),
  weight: integer("weight").notNull().default(1),
});

// Knowledge Nodes (graph nodes)
export const knowledgeNodes = pgTable("knowledge_nodes", {
  id: uuidId(),
  ...timestamps,

  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(), // topic, document, source, etc.
  category: varchar("category", { length: 100 }),

  // Stats
  connectionCount: integer("connection_count").notNull().default(0),

  // Position (for graph layout)
  x: numeric("x", { precision: 10, scale: 2 }),
  y: numeric("y", { precision: 10, scale: 2 }),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Recent Activity
export const knowledgeActivity = pgTable("knowledge_activity", {
  id: uuidId(),
  ...timestamps,

  activityType: varchar("activity_type", { length: 100 }).notNull(), // document_indexed, message_indexed, page_updated, etc.
  title: varchar("title", { length: 500 }).notNull(),
  source: varchar("source", { length: 255 }),

  // Reference
  documentId: varchar("document_id", { length: 255 }),

  // Metadata
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
});

// Top Connected Topics
export const knowledgeTopTopics = pgTable("knowledge_top_topics", {
  id: uuidId(),
  ...timestamps,

  topic: varchar("topic", { length: 255 }).notNull(),
  connectionCount: integer("connection_count").notNull().default(0),
  category: varchar("category", { length: 100 }),
});
