/**
 * Tool Grants — Agent × Tool access control matrix.
 *
 * Every tool execution is checked against this table.
 * Default is DENY — only explicitly granted tools can execute.
 * Admins can manage grants via the admin UI.
 *
 * Design:
 * - Entity-scoped grants for multi-tenant isolation
 * - action field: "execute" | "read" | "*" (all actions)
 * - isActive flag for soft-disable without deletion
 * - grantedBy tracks who made the grant (user or "system" for defaults)
 */

import {
  pgTable,
  text,
  boolean,
  jsonb,
  uuid,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entities } from "./organization";

// ─── ENUMS ─────────────────────────────────────────────────────────────────

/** What action the grant allows */
export const toolGrantActionEnum = pgEnum("tool_grant_action", [
  "execute", // Can execute the tool
  "read", // Can only read (for write tools, limits to read-only mode)
  "*", // All actions
]);

// ─── TOOL GRANTS TABLE ─────────────────────────────────────────────────────

/**
 * Tool grants: which agents can use which tools.
 * One row per (entity, agent, tool, action) combination.
 * Default is DENY — if no row exists, the tool cannot be used.
 */
export const toolGrants = pgTable(
  "tool_grants",
  {
    id: uuidId(),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),

    /** Agent that gets the grant (e.g., "cfo", "ledger", "ap") */
    agentName: text("agent_name").notNull(),

    /** Tool name (e.g., "get_account_balance", "validate_double_entry") */
    toolName: text("tool_name").notNull(),

    /** What action is allowed */
    action: toolGrantActionEnum("action").notNull().default("execute"),

    /** Whether this grant is currently active */
    isActive: boolean("is_active").notNull().default(true),

    /** Who granted this: user UUID or "system" for default grants */
    grantedBy: text("granted_by").notNull().default("system"),

    /** Optional conditions (e.g., amount limits, time restrictions) */
    conditions: jsonb("conditions").$type<Record<string, unknown>>(),

    /** Notes about why this grant was made */
    notes: text("notes"),

    ...timestamps,
  },
  (t) => [
    uniqueIndex("tool_grants_unique").on(
      t.entityId,
      t.agentName,
      t.toolName,
      t.action,
    ),
    index("tool_grants_agent").on(t.entityId, t.agentName),
    index("tool_grants_tool").on(t.toolName),
    index("tool_grants_active").on(t.isActive),
  ],
);

// ─── Relations ─────────────────────────────────────────────────────────────

export const toolGrantsRelations = relations(toolGrants, ({ one }) => ({
  entity: one(entities, {
    fields: [toolGrants.entityId],
    references: [entities.id],
  }),
}));

// ─── Default Grants ────────────────────────────────────────────────────────

/**
 * Platform-level default grants (entity_id = null).
 * These are the baseline grants that apply to all entities.
 * Entity-level grants override these.
 *
 * Format: [agentName, toolName, action]
 */
export const DEFAULT_TOOL_GRANTS: Array<
  [string, string, "execute" | "read" | "*"]
> = [
  // CFO — read-only access to financial data
  ["cfo", "get_account_balance", "execute"],
  ["cfo", "get_recent_journal_entries", "execute"],
  ["cfo", "get_journal_entry_lines", "execute"],
  ["cfo", "get_account_by_code", "execute"],

  // Controller — read + validate
  ["controller", "get_account_balance", "execute"],
  ["controller", "get_recent_journal_entries", "execute"],
  ["controller", "get_journal_entry_lines", "execute"],
  ["controller", "get_account_by_code", "execute"],
  ["controller", "validate_double_entry", "execute"],

  // Ledger — sole GL writer (validate is read, post is separate)
  ["ledger", "get_account_balance", "execute"],
  ["ledger", "get_account_by_code", "execute"],
  ["ledger", "validate_double_entry", "execute"],
  ["ledger", "get_journal_entry_lines", "execute"],

  // Treasury — read cash/bank data
  ["treasury", "get_account_balance", "execute"],
  ["treasury", "get_recent_journal_entries", "execute"],

  // Document — lookup accounts for classification
  ["document", "get_account_by_code", "execute"],

  // AP — read vendor/invoice data
  ["ap", "get_account_balance", "execute"],
  ["ap", "get_account_by_code", "execute"],

  // AR — read customer/invoice data
  ["ar", "get_account_balance", "execute"],
  ["ar", "get_account_by_code", "execute"],
];

/**
 * Helper to build insert values for default grants.
 * Call this from a seed file or entity creation hook.
 */
export function buildDefaultGrantValues(entityId: string) {
  return DEFAULT_TOOL_GRANTS.map(([agentName, toolName, action]) => ({
    entityId,
    agentName,
    toolName,
    action,
    isActive: true,
    grantedBy: "system",
    notes: "Platform default grant",
  }));
}
