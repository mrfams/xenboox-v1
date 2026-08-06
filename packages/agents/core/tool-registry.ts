/**
 * Tool Registry — Central registry of all available tools.
 *
 * Every tool is registered once. Agents access tools through grants
 * (checked by the tool executor). The registry provides:
 * - Lookup by name
 * - Lookup by agent (via grants)
 * - Schema export for callModel tool definitions
 * - Validation that all tools are properly defined
 *
 * This replaces the dead `core/tools.ts` LangChain tools.
 */

import { z } from "zod";
import { db } from "@xenboox/db";
import { eq, and } from "drizzle-orm";
import { toolGrants } from "@xenboox/db/schema/tool-grants";
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ToolGrant,
} from "./tool-contract";
import { DEFAULT_AGENT_TOOL_CONFIGS } from "./tool-contract";
import { validateDoubleEntry as validateDoubleEntryRule } from "./accounting-rules";

// ─── Tool Implementations ──────────────────────────────────────────────────

/**
 * validate_double_entry — Validate journal entry lines balance.
 * READ-ONLY: does not write to DB, just validates math.
 */
const validateDoubleEntryTool: ToolDefinition = {
  name: "validate_double_entry",
  description:
    "Validate that journal entry lines balance (debits == credits) and follow double-entry rules. Returns balanced status, totals, and any errors.",
  inputSchema: z.object({
    lines: z.array(
      z.object({
        accountId: z.string().describe("Account ID"),
        debit: z.string().describe("Debit amount as string"),
        credit: z.string().describe("Credit amount as string"),
      }),
    ),
  }),
  execute: async (input) => {
    const result = validateDoubleEntryRule(
      input.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    );

    return {
      success: true,
      data: {
        balanced: result.balanced,
        totalDebit: result.totalDebit,
        totalCredit: result.totalCredit,
        difference: result.difference,
        lineCount: result.lineCount,
        errors: result.errors,
      },
      confidence: result.balanced ? 1.0 : 0.0,
      requiresValidation: false,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "validation",
};

/**
 * get_account_balance — Get the current balance of a specific account.
 * READ-ONLY: queries GL for posted entries.
 */
const getAccountBalanceTool: ToolDefinition = {
  name: "get_account_balance",
  description:
    "Get the current balance of a specific account by its code. Returns account details and computed balance from posted journal entries.",
  inputSchema: z.object({
    accountCode: z.string().describe("Chart of accounts code (e.g., '1010')"),
  }),
  execute: async (input, ctx) => {
    const { chartOfAccounts, journalEntries, journalEntryLines } = await import(
      "@xenboox/db/schema/accounting"
    );

    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, ctx.entityId),
        eq(chartOfAccounts.code, input.accountCode),
      ),
    });

    if (!account) {
      return {
        success: false,
        error: `Account ${input.accountCode} not found`,
        confidence: 0,
      };
    }

    const entries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, ctx.entityId),
        eq(journalEntries.status, "posted"),
      ),
    });

    let balance = 0;
    for (const entry of entries) {
      const lines = await db.query.journalEntryLines.findMany({
        where: eq(journalEntryLines.journalEntryId, entry.id),
      });
      for (const line of lines) {
        if (line.accountId === account.id) {
          balance += Number(line.debit) - Number(line.credit);
        }
      }
    }

    return {
      success: true,
      data: {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        accountType: account.type,
        balance,
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

/**
 * get_journal_entry_lines — Get the lines of a specific journal entry.
 * READ-ONLY
 */
const getJournalEntryLinesTool: ToolDefinition = {
  name: "get_journal_entry_lines",
  description:
    "Get the lines (debits and credits) of a specific journal entry. Returns entry metadata and all line items.",
  inputSchema: z.object({
    entryId: z.string().uuid().describe("Journal entry ID"),
  }),
  execute: async (input, ctx) => {
    const { journalEntries, journalEntryLines } = await import(
      "@xenboox/db/schema/accounting"
    );

    const entry = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.id, input.entryId),
        eq(journalEntries.entityId, ctx.entityId),
      ),
    });

    if (!entry) {
      return {
        success: false,
        error: "Journal entry not found",
        confidence: 0,
      };
    }

    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, input.entryId),
    });

    return {
      success: true,
      data: {
        entry: {
          id: entry.id,
          entryNumber: entry.entryNumber,
          description: entry.description,
          status: entry.status,
          date: entry.date,
        },
        lines: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        })),
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

/**
 * get_recent_journal_entries — Get recent journal entries.
 * READ-ONLY
 */
const getRecentJournalEntriesTool: ToolDefinition = {
  name: "get_recent_journal_entries",
  description:
    "Get recent journal entries for an entity. Returns entry metadata (no lines). Useful for summarizing recent activity.",
  inputSchema: z.object({
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Max entries to return (default 20)"),
  }),
  execute: async (input, ctx) => {
    const { journalEntries } = await import("@xenboox/db/schema/accounting");

    const entries = await db.query.journalEntries.findMany({
      where: eq(journalEntries.entityId, ctx.entityId),
      orderBy: [journalEntries.createdAt],
      limit: input.limit ?? 20,
    });

    return {
      success: true,
      data: {
        entries: entries.map((e) => ({
          id: e.id,
          entryNumber: e.entryNumber,
          description: e.description,
          status: e.status,
          date: e.date,
          reference: e.reference,
        })),
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

/**
 * get_account_by_code — Look up a chart of accounts entry by code.
 * READ-ONLY
 */
const getAccountByCodeTool: ToolDefinition = {
  name: "get_account_by_code",
  description:
    "Look up a chart of accounts entry by its code. Returns account details (id, code, name, type, subtype).",
  inputSchema: z.object({
    code: z.string().describe("Account code to look up"),
  }),
  execute: async (input, ctx) => {
    const { chartOfAccounts } = await import("@xenboox/db/schema/accounting");

    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, ctx.entityId),
        eq(chartOfAccounts.code, input.code),
      ),
    });

    if (!account) {
      return {
        success: false,
        error: `Account ${input.code} not found`,
        confidence: 0,
      };
    }

    return {
      success: true,
      data: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        parentId: account.parentId,
        isActive: account.isActive,
      },
      confidence: 1.0,
    };
  },
  readOnly: true,
  writes: false,
  idempotencyKey: false,
  category: "read",
};

// ─── Registry ──────────────────────────────────────────────────────────────

/**
 * All registered tools. Add new tools here.
 */
const REGISTERED_TOOLS: ToolDefinition[] = [
  validateDoubleEntryTool,
  getAccountBalanceTool,
  getJournalEntryLinesTool,
  getRecentJournalEntriesTool,
  getAccountByCodeTool,
];

/**
 * Map for O(1) lookup by name.
 */
const TOOL_MAP: Map<string, ToolDefinition> = new Map(
  REGISTERED_TOOLS.map((t) => [t.name, t]),
);

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Get a tool definition by name.
 */
export function getTool(name: string): ToolDefinition | undefined {
  return TOOL_MAP.get(name);
}

/**
 * Get all registered tools.
 */
export function getAllTools(): ToolDefinition[] {
  return [...REGISTERED_TOOLS];
}

/**
 * Get tools by category.
 */
export function getToolsByCategory(
  category: ToolDefinition["category"],
): ToolDefinition[] {
  return REGISTERED_TOOLS.filter((t) => t.category === category);
}

/**
 * Get read-only tools (safe for any agent).
 */
export function getReadOnlyTools(): ToolDefinition[] {
  return REGISTERED_TOOLS.filter((t) => t.readOnly);
}

/**
 * Get write tools (require explicit grant).
 */
export function getWriteTools(): ToolDefinition[] {
  return REGISTERED_TOOLS.filter((t) => t.writes);
}

/**
 * Convert a ToolDefinition to the format expected by callModel's tools param.
 * Used when building the tool list for an agent's LLM call.
 */
export function toolToCallModelFormat(tool: ToolDefinition): {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
} {
  // Convert zod schema to JSON Schema for callModel
  const zodShape = (tool.inputSchema as z.ZodObject<z.ZodRawShape>).shape;
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [key, schema] of Object.entries(zodShape)) {
    const isOptional = schema instanceof z.ZodOptional;
    const innerSchema = isOptional ? schema.unwrap() : schema;

    properties[key] = {
      type:
        innerSchema instanceof z.ZodString
          ? "string"
          : innerSchema instanceof z.ZodNumber
            ? "number"
            : innerSchema instanceof z.ZodBoolean
              ? "boolean"
              : "string",
      description: (schema as any)._def?.description ?? key,
    };

    if (!isOptional) {
      required.push(key);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: "object",
      properties,
      required,
    },
  };
}

/**
 * Get all tools as callModel format, for a specific agent.
 * Filters by the agent's default grants.
 */
export function getToolsForAgent(agentName: string): Array<{
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}> {
  const config =
    DEFAULT_AGENT_TOOL_CONFIGS[agentName] ??
    DEFAULT_AGENT_TOOL_CONFIGS._default;

  return config.allowedTools
    .map((name) => TOOL_MAP.get(name))
    .filter(Boolean)
    .map((tool) => toolToCallModelFormat(tool!));
}

/**
 * Check if a tool exists in the registry.
 */
export function toolExists(name: string): boolean {
  return TOOL_MAP.has(name);
}

/**
 * Get registry stats for monitoring.
 */
export function getRegistryStats(): {
  totalTools: number;
  readOnly: number;
  writeTools: number;
  validationTools: number;
  reportingTools: number;
  ragTools: number;
} {
  const tools = [...REGISTERED_TOOLS];
  return {
    totalTools: tools.length,
    readOnly: tools.filter((t) => t.readOnly).length,
    writeTools: tools.filter((t) => t.writes).length,
    validationTools: tools.filter((t) => t.category === "validation").length,
    reportingTools: tools.filter((t) => t.category === "reporting").length,
    ragTools: tools.filter((t) => t.category === "rag").length,
  };
}
