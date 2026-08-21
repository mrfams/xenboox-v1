import {
  pgTable,
  text,
  numeric,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── Knowledge Graph Schema ────────────────────────────────────────────────
//
// Maps relationships between business entities for AI reasoning.
// Enables: "Find all invoices related to this vendor" or
//          "What accounts are affected by this transaction?"

// ─── NODE TYPES ────────────────────────────────────────────────────────────
// Each node represents a business entity in the graph.

export const kgNodes = pgTable(
  "kg_nodes",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    // Node identity
    nodeType: text("node_type").notNull(), // e.g., "company", "invoice", "account", "bank_account", "employee", "vendor"
    internalId: text("internal_id").notNull(), // Reference to the actual record ID in the system
    internalTable: text("internal_table").notNull(), // e.g., "invoices", "chart_of_accounts", "bank_accounts"
    // Display
    label: text("label").notNull(), // Human-readable name
    description: text("description"),
    // Metadata
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    // For AI reasoning
    embedding: text("embedding"), // Vector embedding for semantic search
    // Stats
    relationshipCount: integer("relationship_count").notNull().default(0),
    lastAccessedAt: timestamp("last_accessed_at"),
    ...timestamps,
  },
  (t) => [
    index("kg_nodes_entity").on(t.entityId),
    index("kg_nodes_type").on(t.entityId, t.nodeType),
    index("kg_nodes_internal").on(t.internalTable, t.internalId),
    uniqueIndex("kg_nodes_unique").on(t.entityId, t.nodeType, t.internalId),
  ],
);

export const kgNodesRelations = relations(kgNodes, ({ one, many }) => ({
  entity: one(entities, {
    fields: [kgNodes.entityId],
    references: [entities.id],
  }),
  outgoingEdges: many(kgEdges, { relationName: "source" }),
  incomingEdges: many(kgEdges, { relationName: "target" }),
}));

// ─── EDGE TYPES ────────────────────────────────────────────────────────────
// Each edge represents a relationship between two nodes.

export const kgEdges = pgTable(
  "kg_edges",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    // Source node
    sourceId: text("source_id").notNull(), // kg_node ID
    sourceType: text("source_type").notNull(), // For quick filtering
    // Target node
    targetId: text("target_id").notNull(), // kg_node ID
    targetType: text("target_type").notNull(), // For quick filtering
    // Relationship
    relationType: text("relation_type").notNull(), // e.g., "has_invoice", "pays_to", "uses_account"
    relationLabel: text("relation_label"), // Human-readable: "Has Invoice", "Pays To"
    // Weight/strength
    weight: numeric("weight", { precision: 5, scale: 2 }).default("1.0"), // 0.0 - 1.0
    // Metadata
    metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
    // For AI
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default(
      "1.0",
    ), // AI confidence in this edge
    source: text("source").default("system"), // "system", "ai_inferred", "user_created"
    ...timestamps,
  },
  (t) => [
    index("kg_edges_entity").on(t.entityId),
    index("kg_edges_source").on(t.sourceId),
    index("kg_edges_target").on(t.targetId),
    index("kg_edges_relation").on(t.entityId, t.relationType),
    index("kg_edges_type_pair").on(t.entityId, t.sourceType, t.targetType),
  ],
);

export const kgEdgesRelations = relations(kgEdges, ({ one }) => ({
  entity: one(entities, {
    fields: [kgEdges.entityId],
    references: [entities.id],
  }),
}));

// ─── KNOWLEDGE GRAPH SNAPSHOTS ─────────────────────────────────────────────
// Cached graph snapshots for performance.

export const kgSnapshots = pgTable(
  "kg_snapshots",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    // Snapshot data
    nodeCount: integer("node_count").notNull().default(0),
    edgeCount: integer("edge_count").notNull().default(0),
    // Cached graph data (for quick rendering)
    graphData: jsonb("graph_data").$type<{
      nodes: Array<{ id: string; label: string; type: string; size: number }>;
      edges: Array<{
        source: string;
        target: string;
        label: string;
        weight: number;
      }>;
    }>(),
    // Stats
    nodeTypes: jsonb("node_types").$type<Record<string, number>>(),
    edgeTypes: jsonb("edge_types").$type<Record<string, number>>(),
    // Timestamps
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    expiresAt: timestamp("expires_at"),
    ...timestamps,
  },
  (t) => [index("kg_snapshots_entity").on(t.entityId)],
);

export const kgSnapshotsRelations = relations(kgSnapshots, ({ one }) => ({
  entity: one(entities, {
    fields: [kgSnapshots.entityId],
    references: [entities.id],
  }),
}));

// ─── NODE TYPES ────────────────────────────────────────────────────────────

export type KgNodeType =
  | "company"
  | "invoice"
  | "bill"
  | "account"
  | "bank_account"
  | "employee"
  | "vendor"
  | "customer"
  | "transaction"
  | "journal_entry"
  | "tax"
  | "budget"
  | "asset"
  | "contract";

export type KgRelationType =
  | "has_invoice"
  | "has_bill"
  | "uses_account"
  | "has_bank_account"
  | "employs"
  | "pays_to"
  | "receives_from"
  | "records_transaction"
  | "affects_account"
  | "has_tax"
  | "has_budget"
  | "has_asset"
  | "has_contract"
  | "related_to";
