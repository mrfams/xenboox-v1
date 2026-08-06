/**
 * Tool Execution Loop Tests — callLLMWithTools
 *
 * Tests the agent LLM loop where the model can request tool calls,
 * which are executed and fed back until a final text response is produced.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────

// Mock callModel
const mockCallModel = vi.fn();
vi.mock("@xenboox/models", () => ({
  callModel: (...args: unknown[]) => mockCallModel(...args),
}));

// Mock tool executor
const mockExecuteToolWithGrants = vi.fn();
vi.mock("../core/tool-executor", () => ({
  executeTool: (...args: unknown[]) => mockExecuteToolWithGrants(...args),
}));

// Mock tool registry
const mockGetToolsForAgent = vi.fn().mockReturnValue([
  {
    name: "validate_double_entry",
    description: "Validate entries",
    inputSchema: {},
  },
  { name: "get_account_balance", description: "Get balance", inputSchema: {} },
]);
vi.mock("../core/tool-registry", () => ({
  getToolsForAgent: (...args: unknown[]) => mockGetToolsForAgent(...args),
}));

// Mock langfuse
vi.mock("../core/langfuse", () => ({
  langfuse: { event: vi.fn(), span: vi.fn(), trace: vi.fn() },
}));

// Mock DB for tool executor
vi.mock("@xenboox/db", () => ({
  db: {
    query: { toolGrants: { findFirst: vi.fn().mockResolvedValue(null) } },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
  },
}));

// ─── Tests ────────────────────────────────────────────────────────────────

describe("callLLMWithTools — Execution Loop", () => {
  let callLLMWithTools: typeof import("../llm/agent-llm").callLLMWithTools;

  const baseParams = {
    systemPrompt: "You are a helpful accounting assistant.",
    messages: [{ role: "user" as const, content: "What is the cash balance?" }],
    entityId: "entity-1",
    agentId: "cfo",
    traceId: "trace-1",
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../core/llm/agent-llm");
    callLLMWithTools = mod.callLLMWithTools;
  });

  it("returns direct response when model has no tool calls", async () => {
    mockCallModel.mockResolvedValue({
      content: "The cash balance is GMD 50,000.",
      toolCalls: null,
      tokensUsed: { input: 100, output: 50, total: 150 },
      providerId: "anthropic",
      modelId: "haiku-4-5",
      latencyMs: 500,
    });

    const result = await callLLMWithTools(baseParams);

    expect(result.content).toBe("The cash balance is GMD 50,000.");
    expect(result.toolCalls).toHaveLength(0);
    expect(result.provider).toBe("anthropic");
    expect(result.model).toBe("haiku-4-5");
    expect(mockCallModel).toHaveBeenCalledTimes(1);
  });

  it("executes tool calls and feeds results back", async () => {
    // First call: model requests a tool call
    mockCallModel
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { name: "get_account_balance", arguments: { accountCode: "1000" } },
        ],
        tokensUsed: { input: 100, output: 30, total: 130 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 300,
      })
      // Second call: model produces final response with tool result context
      .mockResolvedValueOnce({
        content: "The cash account (1000) has a balance of GMD 50,000.",
        toolCalls: null,
        tokensUsed: { input: 150, output: 40, total: 190 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 400,
      });

    // Mock tool executor to return success
    mockExecuteToolWithGrants.mockResolvedValue({
      toolName: "get_account_balance",
      args: { accountCode: "1000" },
      result: {
        success: true,
        data: { balance: 50000, accountCode: "1000" },
        confidence: 1.0,
      },
      durationMs: 50,
      grantFound: false,
      allowed: true,
    });

    const result = await callLLMWithTools(baseParams);

    expect(result.content).toBe(
      "The cash account (1000) has a balance of GMD 50,000.",
    );
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls![0].toolName).toBe("get_account_balance");
    expect(result.toolCalls![0].result.success).toBe(true);
    expect(mockCallModel).toHaveBeenCalledTimes(2);
  });

  it("handles multiple sequential tool calls", async () => {
    // First call: two tool calls
    mockCallModel
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { name: "get_account_balance", arguments: { accountCode: "1000" } },
          { name: "validate_double_entry", arguments: { lines: [] } },
        ],
        tokensUsed: { input: 100, output: 30, total: 130 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 300,
      })
      // Second call: final response
      .mockResolvedValueOnce({
        content: "Both checks passed.",
        toolCalls: null,
        tokensUsed: { input: 200, output: 40, total: 240 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 400,
      });

    mockExecuteToolWithGrants
      .mockResolvedValueOnce({
        toolName: "get_account_balance",
        args: { accountCode: "1000" },
        result: { success: true, data: { balance: 50000 }, confidence: 1.0 },
        durationMs: 50,
        grantFound: false,
        allowed: true,
      })
      .mockResolvedValueOnce({
        toolName: "validate_double_entry",
        args: { lines: [] },
        result: { success: true, data: { balanced: true }, confidence: 1.0 },
        durationMs: 30,
        grantFound: false,
        allowed: true,
      });

    const result = await callLLMWithTools(baseParams);

    expect(result.content).toBe("Both checks passed.");
    expect(result.toolCalls).toHaveLength(2);
    expect(mockCallModel).toHaveBeenCalledTimes(2);
    expect(mockExecuteToolWithGrants).toHaveBeenCalledTimes(2);
  });

  it("fires onToolCall and onToolResult callbacks", async () => {
    const onToolCall = vi.fn();
    const onToolResult = vi.fn();

    mockCallModel
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { name: "get_account_balance", arguments: { accountCode: "1000" } },
        ],
        tokensUsed: { input: 100, output: 30, total: 130 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 300,
      })
      .mockResolvedValueOnce({
        content: "Done.",
        toolCalls: null,
        tokensUsed: { input: 150, output: 40, total: 190 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 400,
      });

    mockExecuteToolWithGrants.mockResolvedValue({
      toolName: "get_account_balance",
      args: { accountCode: "1000" },
      result: { success: true, data: { balance: 50000 }, confidence: 1.0 },
      durationMs: 50,
      grantFound: false,
      allowed: true,
    });

    await callLLMWithTools({ ...baseParams, onToolCall, onToolResult });

    expect(onToolCall).toHaveBeenCalledWith("get_account_balance", {
      accountCode: "1000",
    });
    expect(onToolResult).toHaveBeenCalledWith("get_account_balance", true, {
      balance: 50000,
    });
  });

  it("stops after max iterations (5) even if model keeps calling tools", async () => {
    // Model always returns a tool call — should stop at iteration 5
    const toolCallResponse = {
      content: "",
      toolCalls: [
        { name: "get_account_balance", arguments: { accountCode: "1000" } },
      ],
      tokensUsed: { input: 100, output: 30, total: 130 },
      providerId: "anthropic",
      modelId: "haiku-4-5",
      latencyMs: 300,
    };

    // 5 iterations of tool calls + 1 final call = 6 total
    for (let i = 0; i < 6; i++) {
      mockCallModel.mockResolvedValueOnce(toolCallResponse);
    }

    mockExecuteToolWithGrants.mockResolvedValue({
      toolName: "get_account_balance",
      args: { accountCode: "1000" },
      result: { success: true, data: {}, confidence: 1.0 },
      durationMs: 50,
      grantFound: false,
      allowed: true,
    });

    const result = await callLLMWithTools(baseParams);

    // Should have made 6 calls: 5 tool iterations + 1 final
    expect(mockCallModel).toHaveBeenCalledTimes(6);
    // Tool executed 5 times (once per iteration)
    expect(mockExecuteToolWithGrants).toHaveBeenCalledTimes(5);
    expect(result.toolCalls).toHaveLength(5);
  });

  it("appends tool results as messages for model context", async () => {
    mockCallModel
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { name: "get_account_balance", arguments: { accountCode: "1000" } },
        ],
        tokensUsed: { input: 100, output: 30, total: 130 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 300,
      })
      .mockResolvedValueOnce({
        content: "Got it.",
        toolCalls: null,
        tokensUsed: { input: 200, output: 40, total: 240 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 400,
      });

    mockExecuteToolWithGrants.mockResolvedValue({
      toolName: "get_account_balance",
      args: { accountCode: "1000" },
      result: { success: true, data: { balance: 50000 }, confidence: 1.0 },
      durationMs: 50,
      grantFound: false,
      allowed: true,
    });

    await callLLMWithTools(baseParams);

    // Second call should have more messages (original + tool call + tool result)
    const secondCallMessages = mockCallModel.mock.calls[1][0].messages;
    expect(secondCallMessages.length).toBeGreaterThan(1);

    // Should contain the tool call message and tool result message
    const toolCallMsg = secondCallMessages.find(
      (m: { role: string; content: string }) =>
        m.role === "assistant" && m.content.includes("toolCalls"),
    );
    const toolResultMsg = secondCallMessages.find(
      (m: { role: string; content: string }) =>
        m.role === "user" && m.content.includes("toolResult"),
    );
    expect(toolCallMsg).toBeDefined();
    expect(toolResultMsg).toBeDefined();
  });

  it("passes tools to callModel when agent has tools", async () => {
    mockCallModel.mockResolvedValue({
      content: "No tools needed.",
      toolCalls: null,
      tokensUsed: { input: 100, output: 50, total: 150 },
      providerId: "anthropic",
      modelId: "haiku-4-5",
      latencyMs: 500,
    });

    await callLLMWithTools(baseParams);

    const callArgs = mockCallModel.mock.calls[0][0];
    expect(callArgs.tools).toBeDefined();
    expect(callArgs.tools.length).toBeGreaterThan(0);
  });

  it("does not pass tools when agent has no tools", async () => {
    mockGetToolsForAgent.mockReturnValueOnce([]);

    mockCallModel.mockResolvedValue({
      content: "I can help with that.",
      toolCalls: null,
      tokensUsed: { input: 100, output: 50, total: 150 },
      providerId: "anthropic",
      modelId: "haiku-4-5",
      latencyMs: 500,
    });

    await callLLMWithTools(baseParams);

    const callArgs = mockCallModel.mock.calls[0][0];
    expect(callArgs.tools).toBeUndefined();
  });

  it("does not mutate original messages array", async () => {
    const originalMessages = [{ role: "user" as const, content: "Hello" }];

    mockCallModel
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { name: "get_account_balance", arguments: { accountCode: "1000" } },
        ],
        tokensUsed: { input: 100, output: 30, total: 130 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 300,
      })
      .mockResolvedValueOnce({
        content: "Done.",
        toolCalls: null,
        tokensUsed: { input: 150, output: 40, total: 190 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 400,
      });

    mockExecuteToolWithGrants.mockResolvedValue({
      toolName: "get_account_balance",
      args: { accountCode: "1000" },
      result: { success: true, data: {}, confidence: 1.0 },
      durationMs: 50,
      grantFound: false,
      allowed: true,
    });

    await callLLMWithTools({ ...baseParams, messages: originalMessages });

    // Original messages should not be mutated
    expect(originalMessages).toHaveLength(1);
    expect(originalMessages[0].content).toBe("Hello");
  });

  it("returns accumulated toolCalls across iterations", async () => {
    mockCallModel
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { name: "get_account_balance", arguments: { accountCode: "1000" } },
        ],
        tokensUsed: { input: 100, output: 30, total: 130 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 300,
      })
      .mockResolvedValueOnce({
        content: "",
        toolCalls: [
          { name: "validate_double_entry", arguments: { lines: [] } },
        ],
        tokensUsed: { input: 150, output: 30, total: 180 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 300,
      })
      .mockResolvedValueOnce({
        content: "All checks passed.",
        toolCalls: null,
        tokensUsed: { input: 200, output: 40, total: 240 },
        providerId: "anthropic",
        modelId: "haiku-4-5",
        latencyMs: 400,
      });

    mockExecuteToolWithGrants
      .mockResolvedValueOnce({
        toolName: "get_account_balance",
        args: { accountCode: "1000" },
        result: { success: true, data: { balance: 50000 }, confidence: 1.0 },
        durationMs: 50,
        grantFound: false,
        allowed: true,
      })
      .mockResolvedValueOnce({
        toolName: "validate_double_entry",
        args: { lines: [] },
        result: { success: true, data: { balanced: true }, confidence: 1.0 },
        durationMs: 30,
        grantFound: false,
        allowed: true,
      });

    const result = await callLLMWithTools(baseParams);

    expect(result.toolCalls).toHaveLength(2);
    expect(result.toolCalls![0].toolName).toBe("get_account_balance");
    expect(result.toolCalls![1].toolName).toBe("validate_double_entry");
  });
});
