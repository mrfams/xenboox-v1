/**
 * Tool Contract — Type definitions for the Xenboox agent tool system.
 *
 * Replaces the LangChain `tool()` pattern with a typed, auditable,
 * grant-enforced contract. Every tool is registered once in the ToolRegistry
 * and only accessible to agents with an explicit grant.
 *
 * Design principles:
 * - Zod schemas for runtime validation (not JSON Schema)
 * - Entity-scoped: every execute() receives entityId context
 * - Audit-logged: every execution is traced to LangFuse
 * - Deterministic guards: write tools go through TrustGuard
 */

import { z } from "zod";

// ─── Tool Context ──────────────────────────────────────────────────────────

/**
 * Context passed to every tool execution.
 * Carries entity scope, user identity, and audit metadata.
 */
export interface ToolExecutionContext {
  /** Entity ID for scoping — non-negotiable */
  entityId: string;
  /** User who triggered the agent (if any) */
  userId?: string;
  /** Agent executing the tool */
  agentName: string;
  /** LangFuse trace ID for observability */
  traceId?: string;
  /** Timestamp of execution */
  timestamp: Date;
}

// ─── Tool Result ───────────────────────────────────────────────────────────

/**
 * Standard result from every tool execution.
 * Includes success/failure, data, and audit metadata.
 */
export interface ToolResult {
  /** Whether the tool executed successfully */
  success: boolean;
  /** The tool's output data (tool-specific) */
  data?: unknown;
  /** Error message if failed */
  error?: string;
  /** Confidence score the tool assigns to its result (0-1) */
  confidence?: number;
  /** Whether this result should trigger TrustGuard validation */
  requiresValidation?: boolean;
  /** Audit metadata */
  audit?: {
    action: string;
    targetType?: string;
    targetId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
  };
}

// ─── Tool Definition ───────────────────────────────────────────────────────

/**
 * A fully-defined tool in the registry.
 * Every tool has: name, description, zod input schema, execute function,
 * and metadata about its capabilities.
 */
export interface ToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  /** Unique tool name (snake_case) */
  name: string;
  /** Human-readable description for the LLM */
  description: string;
  /** Zod schema for input validation */
  inputSchema: TInput;
  /** Execute the tool with validated input */
  execute: (
    input: z.infer<TInput>,
    ctx: ToolExecutionContext,
  ) => Promise<ToolResult>;
  /** Whether this tool only reads data (no writes) */
  readOnly: boolean;
  /** Whether this tool writes to the database */
  writes: boolean;
  /** Whether this tool's result should be idempotent (safe to retry) */
  idempotencyKey: boolean;
  /** Category for grouping in the admin UI */
  category: "read" | "write" | "validation" | "reporting" | "rag";
  /** Which agent tiers can access this tool (empty = all) */
  allowedTiers?: string[];
}

// ─── Tool Grant ────────────────────────────────────────────────────────────

/**
 * A grant entry: agent X is allowed to use tool Y with action Z.
 * Stored in the `tool_grants` table. Default is DENY.
 */
export interface ToolGrant {
  id: string;
  agentName: string;
  toolName: string;
  /** What action is allowed: "execute", "read", or "*" (all) */
  action: string;
  /** Whether this grant is currently active */
  isActive: boolean;
  /** Who granted this (user or "system" for defaults) */
  grantedBy: string;
  /** Optional conditions (e.g., amount limits) */
  conditions?: Record<string, unknown>;
}

// ─── Tool Execution Result (for the execution loop) ────────────────────────

/**
 * Result of a single tool call within the execution loop.
 * Includes the tool result plus execution metadata.
 */
export interface ToolCallResult {
  /** The tool that was called */
  toolName: string;
  /** Arguments passed to the tool */
  args: Record<string, unknown>;
  /** The tool's result */
  result: ToolResult;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Whether the grant was found */
  grantFound: boolean;
  /** Whether the tool was allowed to execute */
  allowed: boolean;
}

// ─── Agent Tool Config ─────────────────────────────────────────────────────

/**
 * Configuration for an agent's tool access.
 * Defines which tools an agent can use and any constraints.
 */
export interface AgentToolConfig {
  /** Agent name */
  agentName: string;
  /** Tools this agent can access (by name) */
  allowedTools: string[];
  /** Maximum concurrent tool calls */
  maxConcurrentCalls: number;
  /** Maximum tool calls per conversation turn */
  maxCallsPerTurn: number;
  /** Whether this agent can escalate (request human review) */
  canEscalate: boolean;
}

// ─── Default Agent Tool Configs ────────────────────────────────────────────

/**
 * Default tool configurations per agent tier.
 * These are the baseline grants; admin can override via tool_grants table.
 */
export const DEFAULT_AGENT_TOOL_CONFIGS: Record<string, AgentToolConfig> = {
  // CFO — read-only + escalation + batch ingestion + knowledge graph
  cfo: {
    agentName: "cfo",
    allowedTools: [
      "get_account_balance",
      "get_recent_journal_entries",
      "get_journal_entry_lines",
      "get_account_by_code",
      "search_knowledge",
      "start_batch_ingestion",
      "query_knowledge_graph",
    ],
    maxConcurrentCalls: 3,
    maxCallsPerTurn: 5,
    canEscalate: true,
  },
  // Controller — read + approve + knowledge graph
  controller: {
    agentName: "controller",
    allowedTools: [
      "get_account_balance",
      "get_recent_journal_entries",
      "get_journal_entry_lines",
      "get_account_by_code",
      "validate_double_entry",
      "search_knowledge",
      "query_knowledge_graph",
    ],
    maxConcurrentCalls: 3,
    maxCallsPerTurn: 8,
    canEscalate: true,
  },
  // Ledger — sole GL writer
  ledger: {
    agentName: "ledger",
    allowedTools: [
      "get_account_balance",
      "get_account_by_code",
      "validate_double_entry",
      "get_journal_entry_lines",
    ],
    maxConcurrentCalls: 2,
    maxCallsPerTurn: 10,
    canEscalate: false,
  },
  // Treasury/Reconciliation
  treasury: {
    agentName: "treasury",
    allowedTools: [
      "get_account_balance",
      "get_recent_journal_entries",
      "search_knowledge",
      "query_knowledge_graph",
    ],
    maxConcurrentCalls: 3,
    maxCallsPerTurn: 5,
    canEscalate: true,
  },
  // Document agent
  document: {
    agentName: "document",
    allowedTools: [
      "get_account_by_code",
      "search_knowledge",
      "start_batch_ingestion",
    ],
    maxConcurrentCalls: 2,
    maxCallsPerTurn: 5,
    canEscalate: false,
  },
  // Default for other agents
  _default: {
    agentName: "_default",
    allowedTools: [],
    maxConcurrentCalls: 1,
    maxCallsPerTurn: 3,
    canEscalate: true,
  },
};
