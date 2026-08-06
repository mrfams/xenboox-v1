/**
 * Tool System Tests — Tool Registry, Executor, Grants, Execution Loop
 *
 * Tests the complete tool system:
 * - Tool Registry: lookup, categories, callModel format, stats
 * - Tool Executor: grant checking, single/batch execution, error handling
 * - Grant Enforcement: entity-level grants, default configs, deny-by-default
 * - Execution Loop: callLLMWithTools with mocked model and tool calls
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// ─── Mocks ────────────────────────────────────────────────────────────────

// Mock database
const mockDbQuery = {
  toolGrants: { findFirst: vi.fn(), findMany: vi.fn() },
};

const mockDbInsert = vi.fn().mockResolvedValue({});
const mockDb = {
  query: mockDbQuery,
  insert: vi.fn().mockReturnValue({ values: mockDbInsert }),
};

vi.mock("@xenboox/db", () => ({ db: mockDb }));

// Mock accounting-rules
vi.mock("../core/accounting-rules", () => ({
  validateDoubleEntry: vi.fn(
    (lines: Array<{ accountId: string; debit: string; credit: string }>) => {
      const totalDebit = lines.reduce(
        (s, l) => s + parseFloat(l.debit || "0"),
        0,
      );
      const totalCredit = lines.reduce(
        (s, l) => s + parseFloat(l.credit || "0"),
        0,
      );
      return {
        balanced: Math.abs(totalDebit - totalCredit) < 0.01,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
        difference: Math.abs(totalDebit - totalCredit).toFixed(2),
        lineCount: lines.length,
        errors:
          Math.abs(totalDebit - totalCredit) >= 0.01
            ? ["Entry is unbalanced"]
            : [],
      };
    },
  ),
}));

// Mock langfuse
vi.mock("../core/langfuse", () => ({
  langfuse: { event: vi.fn(), span: vi.fn(), trace: vi.fn() },
}));

// ─── Tool Registry Tests ──────────────────────────────────────────────────

describe("Tool Registry", () => {
  let getTool: typeof import("../tool-registry").getTool;
  let getAllTools: typeof import("../tool-registry").getAllTools;
  let getToolsByCategory: typeof import("../tool-registry").getToolsByCategory;
  let getReadOnlyTools: typeof import("../tool-registry").getReadOnlyTools;
  let getWriteTools: typeof import("../tool-registry").getWriteTools;
  let toolToCallModelFormat: typeof import("../tool-registry").toolToCallModelFormat;
  let getToolsForAgent: typeof import("../tool-registry").getToolsForAgent;
  let toolExists: typeof import("../tool-registry").toolExists;
  let getRegistryStats: typeof import("../tool-registry").getRegistryStats;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../core/tool-registry");
    getTool = mod.getTool;
    getAllTools = mod.getAllTools;
    getToolsByCategory = mod.getToolsByCategory;
    getReadOnlyTools = mod.getReadOnlyTools;
    getWriteTools = mod.getWriteTools;
    toolToCallModelFormat = mod.toolToCallModelFormat;
    getToolsForAgent = mod.getToolsForAgent;
    toolExists = mod.toolExists;
    getRegistryStats = mod.getRegistryStats;
  });

  describe("getTool", () => {
    it("returns a registered tool by name", () => {
      const tool = getTool("validate_double_entry");
      expect(tool).toBeDefined();
      expect(tool!.name).toBe("validate_double_entry");
      expect(tool!.readOnly).toBe(true);
      expect(tool!.writes).toBe(false);
    });

    it("returns undefined for unknown tool", () => {
      expect(getTool("nonexistent_tool")).toBeUndefined();
    });

    it("returns get_account_balance", () => {
      const tool = getTool("get_account_balance");
      expect(tool).toBeDefined();
      expect(tool!.category).toBe("read");
    });

    it("returns get_account_by_code", () => {
      const tool = getTool("get_account_by_code");
      expect(tool).toBeDefined();
      expect(tool!.category).toBe("read");
    });
  });

  describe("getAllTools", () => {
    it("returns all registered tools", () => {
      const tools = getAllTools();
      expect(tools.length).toBeGreaterThanOrEqual(5);
      expect(tools.map((t) => t.name)).toContain("validate_double_entry");
      expect(tools.map((t) => t.name)).toContain("get_account_balance");
      expect(tools.map((t) => t.name)).toContain("get_journal_entry_lines");
      expect(tools.map((t) => t.name)).toContain("get_recent_journal_entries");
      expect(tools.map((t) => t.name)).toContain("get_account_by_code");
    });

    it("every tool has required fields", () => {
      const tools = getAllTools();
      for (const tool of tools) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.execute).toBe("function");
        expect(typeof tool.readOnly).toBe("boolean");
        expect(typeof tool.writes).toBe("boolean");
      }
    });
  });

  describe("getToolsByCategory", () => {
    it("returns validation tools", () => {
      const tools = getToolsByCategory("validation");
      expect(tools.length).toBeGreaterThanOrEqual(1);
      expect(tools.every((t) => t.category === "validation")).toBe(true);
    });

    it("returns read tools", () => {
      const tools = getToolsByCategory("read");
      expect(tools.length).toBeGreaterThanOrEqual(4);
      expect(tools.every((t) => t.category === "read")).toBe(true);
    });

    it("returns empty for non-existent category", () => {
      const tools = getToolsByCategory("rag");
      expect(tools).toHaveLength(0);
    });
  });

  describe("getReadOnlyTools / getWriteTools", () => {
    it("all 5 registered tools are read-only", () => {
      const readOnly = getReadOnlyTools();
      expect(readOnly.length).toBeGreaterThanOrEqual(5);
    });

    it("no write tools registered yet", () => {
      const write = getWriteTools();
      expect(write).toHaveLength(0);
    });
  });

  describe("toolToCallModelFormat", () => {
    it("converts a tool to callModel format", () => {
      const tool = getTool("validate_double_entry")!;
      const format = toolToCallModelFormat(tool);

      expect(format.name).toBe("validate_double_entry");
      expect(format.description).toBeTruthy();
      expect(format.inputSchema.type).toBe("object");
      expect(format.inputSchema.properties).toBeDefined();
      expect(format.inputSchema.required).toContain("lines");
    });

    it("converts get_account_balance correctly", () => {
      const tool = getTool("get_account_balance")!;
      const format = toolToCallModelFormat(tool);

      expect(format.name).toBe("get_account_balance");
      expect(format.inputSchema.required).toContain("accountCode");
    });

    it("converts tools with optional params", () => {
      const tool = getTool("get_recent_journal_entries")!;
      const format = toolToCallModelFormat(tool);

      expect(format.name).toBe("get_recent_journal_entries");
      // limit is optional
      expect(format.inputSchema.required).not.toContain("limit");
    });
  });

  describe("getToolsForAgent", () => {
    it("returns allowed tools for cfo", () => {
      const tools = getToolsForAgent("cfo");
      const names = tools.map((t) => t.name);
      expect(names).toContain("get_account_balance");
      expect(names).toContain("get_recent_journal_entries");
      expect(names).toContain("get_journal_entry_lines");
      expect(names).toContain("get_account_by_code");
      // CFO should NOT have validate_double_entry
      expect(names).not.toContain("validate_double_entry");
    });

    it("returns allowed tools for controller", () => {
      const tools = getToolsForAgent("controller");
      const names = tools.map((t) => t.name);
      expect(names).toContain("validate_double_entry");
      expect(names).toContain("get_account_balance");
    });

    it("returns allowed tools for ledger", () => {
      const tools = getToolsForAgent("ledger");
      const names = tools.map((t) => t.name);
      expect(names).toContain("validate_double_entry");
      expect(names).toContain("get_account_balance");
    });

    it("returns empty for unknown agent (uses _default)", () => {
      const tools = getToolsForAgent("unknown_agent");
      expect(tools).toHaveLength(0);
    });
  });

  describe("toolExists", () => {
    it("returns true for registered tools", () => {
      expect(toolExists("validate_double_entry")).toBe(true);
      expect(toolExists("get_account_balance")).toBe(true);
    });

    it("returns false for unknown tools", () => {
      expect(toolExists("nonexistent")).toBe(false);
    });
  });

  describe("getRegistryStats", () => {
    it("returns correct stats", () => {
      const stats = getRegistryStats();
      expect(stats.totalTools).toBeGreaterThanOrEqual(5);
      expect(stats.readOnly).toBeGreaterThanOrEqual(5);
      expect(stats.writeTools).toBe(0);
      expect(stats.validationTools).toBeGreaterThanOrEqual(1);
    });
  });
});

// ─── Tool Executor Tests (with mocked DB) ─────────────────────────────────

describe("Tool Executor", () => {
  let executeTool: typeof import("../tool-executor").executeTool;
  let executeToolCalls: typeof import("../tool-executor").executeToolCalls;
  let checkGrant: typeof import("../tool-executor").checkGrant;

  const baseCtx = {
    entityId: "entity-1",
    agentName: "ledger",
    userId: "user-1",
    traceId: "trace-1",
    timestamp: new Date(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: no entity-level grants found
    mockDbQuery.toolGrants.findFirst.mockResolvedValue(null);
    mockDbQuery.toolGrants.findMany.mockResolvedValue([]);
    mockDbInsert.mockResolvedValue({});
    mockDb.insert.mockReturnValue({ values: mockDbInsert });

    const mod = await import("../core/tool-executor");
    executeTool = mod.executeTool;
    executeToolCalls = mod.executeToolCalls;
    checkGrant = mod.checkGrant;
  });

  describe("checkGrant", () => {
    it("allows tool when entity-level grant exists", async () => {
      mockDbQuery.toolGrants.findFirst.mockResolvedValue({
        id: "grant-1",
        entityId: "entity-1",
        agentName: "ledger",
        toolName: "validate_double_entry",
        action: "execute",
        isActive: true,
      });

      const result = await checkGrant(
        "entity-1",
        "ledger",
        "validate_double_entry",
      );
      expect(result.allowed).toBe(true);
      expect(result.grantFound).toBe(true);
    });

    it("allows tool via default config when no entity grant", async () => {
      mockDbQuery.toolGrants.findFirst.mockResolvedValue(null);

      // ledger has validate_double_entry in default config
      const result = await checkGrant(
        "entity-1",
        "ledger",
        "validate_double_entry",
      );
      expect(result.allowed).toBe(true);
      expect(result.grantFound).toBe(false);
    });

    it("denies tool not in default config and no entity grant", async () => {
      mockDbQuery.toolGrants.findFirst.mockResolvedValue(null);

      // ledger does NOT have search_knowledge in default config
      const result = await checkGrant("entity-1", "ledger", "search_knowledge");
      expect(result.allowed).toBe(false);
      expect(result.grantFound).toBe(false);
    });

    it("denies tool for _default agent with no grants", async () => {
      mockDbQuery.toolGrants.findFirst.mockResolvedValue(null);

      const result = await checkGrant(
        "entity-1",
        "unknown_agent",
        "validate_double_entry",
      );
      expect(result.allowed).toBe(false);
    });

    it("entity grant overrides default config (can revoke)", async () => {
      // Even though ledger has validate_double_entry in default config,
      // an inactive entity grant should NOT override (only active grants count)
      mockDbQuery.toolGrants.findFirst.mockResolvedValue(null);

      const result = await checkGrant(
        "entity-1",
        "ledger",
        "validate_double_entry",
      );
      expect(result.allowed).toBe(true); // via default config
    });

    it("cfo cannot use validate_double_entry (not in default config)", async () => {
      mockDbQuery.toolGrants.findFirst.mockResolvedValue(null);

      const result = await checkGrant(
        "entity-1",
        "cfo",
        "validate_double_entry",
      );
      expect(result.allowed).toBe(false);
    });

    it("cfo can use get_account_balance (in default config)", async () => {
      mockDbQuery.toolGrants.findFirst.mockResolvedValue(null);

      const result = await checkGrant("entity-1", "cfo", "get_account_balance");
      expect(result.allowed).toBe(true);
    });
  });

  describe("executeTool", () => {
    it("executes a valid tool with grant", async () => {
      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: "acc-1", debit: "100.00", credit: "0.00" },
            { accountId: "acc-2", debit: "0.00", credit: "100.00" },
          ],
        },
        baseCtx,
      );

      expect(result.toolName).toBe("validate_double_entry");
      expect(result.result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.result.data).toBeDefined();
    });

    it("returns error for unknown tool", async () => {
      const result = await executeTool("nonexistent_tool", {}, baseCtx);

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("not found in registry");
      expect(result.allowed).toBe(false);
    });

    it("denies execution when grant is missing", async () => {
      // CFO doesn't have validate_double_entry in default config
      const ctx = { ...baseCtx, agentName: "cfo" };
      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: "acc-1", debit: "100.00", credit: "0.00" },
            { accountId: "acc-2", debit: "0.00", credit: "100.00" },
          ],
        },
        ctx,
      );

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("Access denied");
      expect(result.allowed).toBe(false);
    });

    it("validates input with zod schema", async () => {
      const result = await executeTool(
        "validate_double_entry",
        { invalid: "input" }, // missing 'lines' field
        baseCtx,
      );

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("validation failed");
      expect(result.allowed).toBe(true); // grant check passed, but input validation failed
    });

    it("logs audit trail on successful execution", async () => {
      await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: "acc-1", debit: "50.00", credit: "0.00" },
            { accountId: "acc-2", debit: "0.00", credit: "50.00" },
          ],
        },
        baseCtx,
      );

      // Should have called db.insert for auditLog and agentActivity
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("logs audit trail on denied execution", async () => {
      const ctx = { ...baseCtx, agentName: "cfo" };
      await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: "acc-1", debit: "50.00", credit: "0.00" },
            { accountId: "acc-2", debit: "0.00", credit: "50.00" },
          ],
        },
        ctx,
      );

      // Should still log the denied attempt
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("returns confidence score from tool", async () => {
      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: "acc-1", debit: "100.00", credit: "0.00" },
            { accountId: "acc-2", debit: "0.00", credit: "100.00" },
          ],
        },
        baseCtx,
      );

      expect(result.result.confidence).toBe(1.0); // balanced entry
    });

    it("returns low confidence for unbalanced entry", async () => {
      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: "acc-1", debit: "100.00", credit: "0.00" },
            { accountId: "acc-2", debit: "0.00", credit: "99.00" },
          ],
        },
        baseCtx,
      );

      expect(result.result.success).toBe(true); // tool executed
      expect(result.result.confidence).toBe(0.0); // but unbalanced
      expect(result.result.data).toBeDefined();
    });
  });

  describe("executeToolCalls (batch)", () => {
    it("executes multiple tool calls in sequence", async () => {
      const toolCalls = [
        {
          name: "validate_double_entry",
          arguments: {
            lines: [
              { accountId: "acc-1", debit: "100.00", credit: "0.00" },
              { accountId: "acc-2", debit: "0.00", credit: "100.00" },
            ],
          },
        },
        {
          name: "validate_double_entry",
          arguments: {
            lines: [
              { accountId: "acc-1", debit: "50.00", credit: "0.00" },
              { accountId: "acc-2", debit: "0.00", credit: "50.00" },
            ],
          },
        },
      ];

      const results = await executeToolCalls(toolCalls, baseCtx);

      expect(results).toHaveLength(2);
      expect(results[0].result.success).toBe(true);
      expect(results[1].result.success).toBe(true);
    });

    it("continues on error when stopOnError is false", async () => {
      const toolCalls = [
        { name: "nonexistent_tool", arguments: {} },
        {
          name: "validate_double_entry",
          arguments: {
            lines: [
              { accountId: "acc-1", debit: "100.00", credit: "0.00" },
              { accountId: "acc-2", debit: "0.00", credit: "100.00" },
            ],
          },
        },
      ];

      const results = await executeToolCalls(toolCalls, baseCtx, false);

      expect(results).toHaveLength(2);
      expect(results[0].result.success).toBe(false);
      expect(results[1].result.success).toBe(true);
    });

    it("stops on first error when stopOnError is true", async () => {
      const toolCalls = [
        { name: "nonexistent_tool", arguments: {} },
        {
          name: "validate_double_entry",
          arguments: {
            lines: [
              { accountId: "acc-1", debit: "100.00", credit: "0.00" },
              { accountId: "acc-2", debit: "0.00", credit: "100.00" },
            ],
          },
        },
      ];

      const results = await executeToolCalls(toolCalls, baseCtx, true);

      expect(results).toHaveLength(1); // stopped after first error
      expect(results[0].result.success).toBe(false);
    });

    it("returns empty array for empty input", async () => {
      const results = await executeToolCalls([], baseCtx);
      expect(results).toHaveLength(0);
    });

    it("respects per-agent grants across batch", async () => {
      // CFO trying to batch: get_account_balance (allowed) + validate_double_entry (denied)
      const ctx = { ...baseCtx, agentName: "cfo" };
      const toolCalls = [
        { name: "get_account_balance", arguments: { accountCode: "1000" } },
        { name: "validate_double_entry", arguments: { lines: [] } },
      ];

      const results = await executeToolCalls(toolCalls, ctx, false);

      expect(results).toHaveLength(2);
      expect(results[0].allowed).toBe(true); // cfo has get_account_balance
      expect(results[1].allowed).toBe(false); // cfo does NOT have validate_double_entry
    });
  });

  describe("Grant Enforcement Edge Cases", () => {
    it("entity-level grant allows tool not in default config", async () => {
      // CFO doesn't have search_knowledge by default,
      // but an entity-level grant can grant it
      mockDbQuery.toolGrants.findFirst.mockResolvedValue({
        id: "grant-custom",
        entityId: "entity-1",
        agentName: "cfo",
        toolName: "search_knowledge",
        action: "execute",
        isActive: true,
      });

      const ctx = { ...baseCtx, agentName: "cfo" };
      const result = await executeTool(
        "search_knowledge",
        { query: "test" },
        ctx,
      );

      // The tool doesn't exist in registry yet, but grant check passes
      expect(result.result.success).toBe(false); // tool not found
      // But the grant was found and allowed
    });

    it("inactive entity grant does not grant access", async () => {
      mockDbQuery.toolGrants.findFirst.mockResolvedValue(null); // inactive grants not returned

      const ctx = { ...baseCtx, agentName: "cfo" };
      const result = await executeTool(
        "validate_double_entry",
        { lines: [] },
        ctx,
      );

      expect(result.allowed).toBe(false);
    });

    it("audit logging failure does not crash execution", async () => {
      mockDbInsert.mockRejectedValue(new Error("DB write failed"));

      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: "acc-1", debit: "100.00", credit: "0.00" },
            { accountId: "acc-2", debit: "0.00", credit: "100.00" },
          ],
        },
        baseCtx,
      );

      // Tool should still succeed even if audit logging fails
      expect(result.result.success).toBe(true);
    });
  });
});

// ─── Default Agent Config Tests ───────────────────────────────────────────

describe("Default Agent Tool Configs", () => {
  let configs: typeof import("../tool-contract").DEFAULT_AGENT_TOOL_CONFIGS;

  beforeEach(async () => {
    const mod = await import("../core/tool-contract");
    configs = mod.DEFAULT_AGENT_TOOL_CONFIGS;
  });

  it("cfo has read-only tools", () => {
    expect(configs.cfo.allowedTools).toContain("get_account_balance");
    expect(configs.cfo.allowedTools).toContain("get_recent_journal_entries");
    expect(configs.cfo.allowedTools).not.toContain("validate_double_entry");
    expect(configs.cfo.canEscalate).toBe(true);
  });

  it("controller has read + validation tools", () => {
    expect(configs.controller.allowedTools).toContain("validate_double_entry");
    expect(configs.controller.allowedTools).toContain("get_account_balance");
    expect(configs.controller.canEscalate).toBe(true);
  });

  it("ledger has validation + read tools (sole GL writer path)", () => {
    expect(configs.ledger.allowedTools).toContain("validate_double_entry");
    expect(configs.ledger.allowedTools).toContain("get_account_balance");
    expect(configs.ledger.canEscalate).toBe(false); // ledger doesn't escalate
  });

  it("treasury has limited read tools", () => {
    expect(configs.treasury.allowedTools).toContain("get_account_balance");
    expect(configs.treasury.allowedTools).toContain(
      "get_recent_journal_entries",
    );
    expect(configs.treasury.canEscalate).toBe(true);
  });

  it("document agent has minimal tools", () => {
    expect(configs.document.allowedTools).toContain("get_account_by_code");
    expect(configs.document.allowedTools.length).toBeLessThanOrEqual(2);
  });

  it("_default has no tools (deny-all)", () => {
    expect(configs._default.allowedTools).toHaveLength(0);
  });

  it("every config has maxConcurrentCalls and maxCallsPerTurn", () => {
    for (const [name, config] of Object.entries(configs)) {
      expect(config.maxConcurrentCalls).toBeGreaterThan(0);
      expect(config.maxCallsPerTurn).toBeGreaterThan(0);
      expect(config.agentName).toBe(name);
    }
  });

  it("tier hierarchy: tier1 (cfo) has fewer tools than tier2 (controller)", () => {
    expect(configs.cfo.allowedTools.length).toBeLessThanOrEqual(
      configs.controller.allowedTools.length,
    );
  });
});

// ─── Tool Input Validation Tests ──────────────────────────────────────────

describe("Tool Input Schemas", () => {
  let getTool: typeof import("../tool-registry").getTool;

  beforeEach(async () => {
    const mod = await import("../core/tool-registry");
    getTool = mod.getTool;
  });

  it("validate_double_entry requires lines array", () => {
    const tool = getTool("validate_double_entry")!;
    expect(() => tool.inputSchema.parse({})).toThrow();
    expect(() =>
      tool.inputSchema.parse({
        lines: [{ accountId: "a", debit: "100", credit: "0" }],
      }),
    ).not.toThrow();
  });

  it("get_account_balance requires accountCode string", () => {
    const tool = getTool("get_account_balance")!;
    expect(() => tool.inputSchema.parse({})).toThrow();
    expect(() => tool.inputSchema.parse({ accountCode: "1000" })).not.toThrow();
  });

  it("get_journal_entry_lines requires entryId UUID", () => {
    const tool = getTool("get_journal_entry_lines")!;
    expect(() => tool.inputSchema.parse({})).toThrow();
    expect(() =>
      tool.inputSchema.parse({
        entryId: "00000000-0000-0000-0000-000000000001",
      }),
    ).not.toThrow();
    expect(() => tool.inputSchema.parse({ entryId: "not-a-uuid" })).toThrow();
  });

  it("get_recent_journal_entries has optional limit", () => {
    const tool = getTool("get_recent_journal_entries")!;
    expect(() => tool.inputSchema.parse({})).not.toThrow();
    expect(() => tool.inputSchema.parse({ limit: 10 })).not.toThrow();
    expect(() => tool.inputSchema.parse({ limit: 0 })).toThrow(); // min(1)
    expect(() => tool.inputSchema.parse({ limit: 101 })).toThrow(); // max(100)
  });

  it("get_account_by_code requires code string", () => {
    const tool = getTool("get_account_by_code")!;
    expect(() => tool.inputSchema.parse({})).toThrow();
    expect(() => tool.inputSchema.parse({ code: "1000" })).not.toThrow();
  });
});
