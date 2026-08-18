/**
 * Enterprise-Grade Tool Execution Loop Tests
 *
 * Covers:
 * - Basic flow: model requests tool → execute → feed back → final response
 * - Provider failures: timeout, rate limit, 5xx, network errors mid-loop
 * - Malformed responses: invalid tool names, bad arguments, null toolCalls
 * - Concurrency: multiple agents calling tools simultaneously
 * - Max iterations: safety valve at 5 iterations
 * - Message integrity: no mutation, correct appending
 * - Callbacks: onToolCall, onToolResult fire correctly
 * - Audit: tool calls tracked in result
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────

const mockCallModel = vi.fn();
vi.mock("@xenboox/models", () => ({
  callModel: (...args: unknown[]) => mockCallModel(...args),
}));

const mockExecuteToolWithGrants = vi.fn();
vi.mock("../core/tool-executor", () => ({
  executeTool: (...args: unknown[]) => mockExecuteToolWithGrants(...args),
}));

const mockGetToolsForAgent = vi.fn().mockReturnValue([
  { name: "validate_double_entry", description: "Validate", inputSchema: {} },
  { name: "get_account_balance", description: "Get balance", inputSchema: {} },
]);
vi.mock("../core/tool-registry", () => ({
  getToolsForAgent: (...args: unknown[]) => mockGetToolsForAgent(...args),
}));

vi.mock("../core/langfuse", () => ({
  langfuse: { event: vi.fn(), span: vi.fn(), trace: vi.fn() },
}));

vi.mock("@xenboox/db", () => ({
  db: {
    query: { toolGrants: { findFirst: vi.fn().mockResolvedValue(null) } },
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) }),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

function modelResponse(content: string, toolCalls: unknown[] | null = null) {
  return {
    content,
    toolCalls,
    tokensUsed: { input: 100, output: 50, total: 150 },
    providerId: "anthropic",
    modelId: "haiku-4-5",
    latencyMs: 300,
  };
}

function toolCall(name: string, args: Record<string, unknown>) {
  return { name, arguments: args };
}

function toolResult(
  name: string,
  success: boolean,
  data?: unknown,
  error?: string,
) {
  return {
    toolName: name,
    args: {},
    result: { success, data, error, confidence: success ? 1.0 : 0 },
    durationMs: 50,
    grantFound: false,
    allowed: true,
  };
}

const BASE_PARAMS = {
  systemPrompt: "You are a CFO agent.",
  messages: [{ role: "user" as const, content: "What is the cash balance?" }],
  entityId: "entity-1",
  agentId: "cfo",
  traceId: "trace-1",
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe("callLLMWithTools — Enterprise Execution Loop", () => {
  let callLLMWithTools: typeof import("../core/llm/agent-llm").callLLMWithTools;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("../core/llm/agent-llm");
    callLLMWithTools = mod.callLLMWithTools;
  });

  // ─── Basic Flow ──────────────────────────────────────────────────────

  describe("Basic Flow", () => {
    it("returns direct response when model has no tool calls", async () => {
      mockCallModel.mockResolvedValue(
        modelResponse("The cash balance is GMD 50,000."),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.content).toBe("The cash balance is GMD 50,000.");
      expect(result.toolCalls).toHaveLength(0);
      expect(mockCallModel).toHaveBeenCalledTimes(1);
    });

    it("executes tool call and feeds result back to model", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Balance is GMD 50,000."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, { balance: 50000 }),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.content).toBe("Balance is GMD 50,000.");
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0].toolName).toBe("get_account_balance");
      expect(mockCallModel).toHaveBeenCalledTimes(2);
    });

    it("handles multiple sequential tool calls in one iteration", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
            toolCall("validate_double_entry", { lines: [] }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Both checks passed."));

      mockExecuteToolWithGrants
        .mockResolvedValueOnce(
          toolResult("get_account_balance", true, { balance: 50000 }),
        )
        .mockResolvedValueOnce(
          toolResult("validate_double_entry", true, { balanced: true }),
        );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.toolCalls).toHaveLength(2);
      expect(mockExecuteToolWithGrants).toHaveBeenCalledTimes(2);
    });

    it("accumulates toolCalls across multiple iterations", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(
          modelResponse("", [toolCall("validate_double_entry", { lines: [] })]),
        )
        .mockResolvedValueOnce(modelResponse("All done."));

      mockExecuteToolWithGrants
        .mockResolvedValueOnce(toolResult("get_account_balance", true, {}))
        .mockResolvedValueOnce(toolResult("validate_double_entry", true, {}));

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls![0].toolName).toBe("get_account_balance");
      expect(result.toolCalls![1].toolName).toBe("validate_double_entry");
    });
  });

  // ─── Provider Failures ───────────────────────────────────────────────

  describe("Provider Failures", () => {
    it("throws when callModel fails on first call (no tools requested yet)", async () => {
      mockCallModel.mockRejectedValue(new Error("API key invalid"));

      await expect(callLLMWithTools(BASE_PARAMS)).rejects.toThrow(
        "API key invalid",
      );
    });

    it("throws when callModel fails during tool iteration", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockRejectedValue(new Error("Rate limit exceeded"));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, {}),
      );

      await expect(callLLMWithTools(BASE_PARAMS)).rejects.toThrow(
        "Rate limit exceeded",
      );
    });

    it("throws when callModel fails on final iteration after max tool calls", async () => {
      // 5 iterations of tool calls, then 6th call fails
      for (let i = 0; i < 5; i++) {
        mockCallModel.mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        );
      }
      // 6th call (final after max iterations) fails
      mockCallModel.mockRejectedValue(new Error("Provider 503"));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, {}),
      );

      await expect(callLLMWithTools(BASE_PARAMS)).rejects.toThrow(
        "Provider 503",
      );
    });

    it("tool execution failure does NOT crash the loop (returns error result)", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(
          modelResponse("Tool failed, but I'll answer anyway."),
        );

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", false, undefined, "Database timeout"),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.content).toBe("Tool failed, but I'll answer anyway.");
      expect(result.toolCalls![0].result.success).toBe(false);
      expect(result.toolCalls![0].result.error).toBe("Database timeout");
    });
  });

  // ─── Max Iterations Safety ───────────────────────────────────────────

  describe("Max Iterations Safety", () => {
    it("stops after 5 iterations even if model keeps calling tools", async () => {
      // 5 iterations of tool calls
      for (let i = 0; i < 5; i++) {
        mockCallModel.mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        );
      }
      // 6th call: final response
      mockCallModel.mockResolvedValueOnce(
        modelResponse("Max iterations reached."),
      );

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, {}),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(mockCallModel).toHaveBeenCalledTimes(6); // 5 tool + 1 final
      expect(mockExecuteToolWithGrants).toHaveBeenCalledTimes(5);
      expect(result.toolCalls).toHaveLength(5);
    });

    it("makes final call after max iterations to get text response", async () => {
      for (let i = 0; i < 5; i++) {
        mockCallModel.mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        );
      }
      mockCallModel.mockResolvedValueOnce(
        modelResponse("Summary after 5 tool calls."),
      );

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, {}),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.content).toBe("Summary after 5 tool calls.");
    });
  });

  // ─── Message Integrity ───────────────────────────────────────────────

  describe("Message Integrity", () => {
    it("does not mutate original messages array", async () => {
      const original = [{ role: "user" as const, content: "Hello" }];

      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Done."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, {}),
      );

      await callLLMWithTools({ ...BASE_PARAMS, messages: original });

      expect(original).toHaveLength(1);
      expect(original[0].content).toBe("Hello");
    });

    it("appends tool call and result as messages for model context", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Got it."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, { balance: 50000 }),
      );

      await callLLMWithTools(BASE_PARAMS);

      const secondCallMessages = mockCallModel.mock.calls[1][0].messages;

      // Should have: original user + assistant tool call + user tool result = 3
      expect(secondCallMessages.length).toBe(3);

      // Tool call message (assistant)
      const toolCallMsg = secondCallMessages.find(
        (m: { role: string; content: string }) =>
          m.role === "assistant" && m.content.includes("toolCalls"),
      );
      expect(toolCallMsg).toBeDefined();

      // Tool result message (user) — wrapped in the injection-defense
      // envelope (<tool_result_data>...</tool_result_data>).
      const toolResultMsg = secondCallMessages.find(
        (m: { role: string; content: string }) =>
          m.role === "user" && m.content.includes("<tool_result_data>"),
      );
      expect(toolResultMsg).toBeDefined();
    });

    it("passes tools to callModel when agent has tools", async () => {
      mockCallModel.mockResolvedValue(modelResponse("No tools needed."));

      await callLLMWithTools(BASE_PARAMS);

      const callArgs = mockCallModel.mock.calls[0][0];
      expect(callArgs.tools).toBeDefined();
      expect(callArgs.tools.length).toBeGreaterThan(0);
    });

    it("does not pass tools when agent has no tools", async () => {
      mockGetToolsForAgent.mockReturnValueOnce([]);

      mockCallModel.mockResolvedValue(modelResponse("I can help."));

      await callLLMWithTools(BASE_PARAMS);

      const callArgs = mockCallModel.mock.calls[0][0];
      expect(callArgs.tools).toBeUndefined();
    });
  });

  // ─── Callbacks ───────────────────────────────────────────────────────

  describe("Callbacks", () => {
    it("fires onToolCall with correct arguments", async () => {
      const onToolCall = vi.fn();

      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Done."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, { balance: 50000 }),
      );

      await callLLMWithTools({ ...BASE_PARAMS, onToolCall });

      expect(onToolCall).toHaveBeenCalledWith("get_account_balance", {
        accountCode: "1000",
      });
    });

    it("fires onToolResult with success and data", async () => {
      const onToolResult = vi.fn();

      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Done."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, { balance: 50000 }),
      );

      await callLLMWithTools({ ...BASE_PARAMS, onToolResult });

      expect(onToolResult).toHaveBeenCalledWith("get_account_balance", true, {
        balance: 50000,
      });
    });

    it("fires onToolResult with failure when tool fails", async () => {
      const onToolResult = vi.fn();

      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Tool failed."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", false, undefined, "DB error"),
      );

      await callLLMWithTools({ ...BASE_PARAMS, onToolResult });

      expect(onToolResult).toHaveBeenCalledWith(
        "get_account_balance",
        false,
        undefined,
      );
    });

    it("fires callbacks for multiple tool calls in sequence", async () => {
      const onToolCall = vi.fn();
      const onToolResult = vi.fn();

      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
            toolCall("validate_double_entry", { lines: [] }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Done."));

      mockExecuteToolWithGrants
        .mockResolvedValueOnce(toolResult("get_account_balance", true, {}))
        .mockResolvedValueOnce(toolResult("validate_double_entry", true, {}));

      await callLLMWithTools({ ...BASE_PARAMS, onToolCall, onToolResult });

      expect(onToolCall).toHaveBeenCalledTimes(2);
      expect(onToolResult).toHaveBeenCalledTimes(2);
    });
  });

  // ─── Malformed Responses ─────────────────────────────────────────────

  describe("Malformed Model Responses", () => {
    it("handles null toolCalls array (treats as no tools)", async () => {
      mockCallModel.mockResolvedValue(
        modelResponse("Here's your answer.", null),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.content).toBe("Here's your answer.");
      expect(result.toolCalls).toHaveLength(0);
    });

    it("handles empty toolCalls array (treats as no tools)", async () => {
      mockCallModel.mockResolvedValue(modelResponse("Answer.", []));

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.content).toBe("Answer.");
      expect(result.toolCalls).toHaveLength(0);
    });

    it("handles tool call with unknown tool name (executor returns error)", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [toolCall("nonexistent_tool", { foo: "bar" })]),
        )
        .mockResolvedValueOnce(modelResponse("Tool not found, moving on."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult(
          "nonexistent_tool",
          false,
          undefined,
          'Tool "nonexistent_tool" not found',
        ),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0].result.success).toBe(false);
      expect(result.content).toBe("Tool not found, moving on.");
    });

    it("handles tool call with empty arguments", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [toolCall("get_account_balance", {})]),
        )
        .mockResolvedValueOnce(modelResponse("Let me try again."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult(
          "get_account_balance",
          false,
          undefined,
          "Missing accountCode",
        ),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls![0].result.success).toBe(false);
    });

    it("handles empty content with tool calls", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Got the balance."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, { balance: 50000 }),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.content).toBe("Got the balance.");
    });
  });

  // ─── Concurrent Agents ───────────────────────────────────────────────

  describe("Concurrent Agent Access", () => {
    it("handles 10 concurrent callLLMWithTools invocations", async () => {
      const agents = Array.from({ length: 10 }, (_, i) => ({
        ...BASE_PARAMS,
        agentId: `agent-${i}`,
        messages: [{ role: "user" as const, content: `Question ${i}` }],
      }));

      // Each agent gets a direct response (no tools)
      for (const _ of agents) {
        mockCallModel.mockResolvedValueOnce(modelResponse("Answer."));
      }

      const results = await Promise.all(
        agents.map((params) => callLLMWithTools(params)),
      );

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.content === "Answer.")).toBe(true);
      expect(mockCallModel).toHaveBeenCalledTimes(10);
    });

    it("handles concurrent agents with different tool call patterns", async () => {
      // Agent 1: tool call → response (use mockImplementationOnce to handle any call order)
      let callCount = 0;
      mockCallModel.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // First concurrent call gets a tool call
          return modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]);
        }
        // All subsequent calls get direct responses
        return modelResponse(`result-${callCount}`);
      });

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, {}),
      );

      const params1 = { ...BASE_PARAMS, agentId: "agent-1" };
      const params2 = { ...BASE_PARAMS, agentId: "agent-2" };

      const [r1, r2] = await Promise.all([
        callLLMWithTools(params1),
        callLLMWithTools(params2),
      ]);

      // Both should complete successfully
      expect(r1.content).toBeTruthy();
      expect(r2.content).toBeTruthy();
      // At least one should have tool calls
      const totalToolCalls =
        (r1.toolCalls?.length ?? 0) + (r2.toolCalls?.length ?? 0);
      expect(totalToolCalls).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Audit & Metadata ────────────────────────────────────────────────

  describe("Audit & Metadata", () => {
    it("returns toolCalls array in result for audit trail", async () => {
      mockCallModel
        .mockResolvedValueOnce(
          modelResponse("", [
            toolCall("get_account_balance", { accountCode: "1000" }),
          ]),
        )
        .mockResolvedValueOnce(modelResponse("Done."));

      mockExecuteToolWithGrants.mockResolvedValue(
        toolResult("get_account_balance", true, { balance: 50000 }),
      );

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.toolCalls).toBeDefined();
      expect(result.toolCalls![0]).toEqual(
        expect.objectContaining({
          toolName: "get_account_balance",
          result: expect.objectContaining({ success: true }),
          durationMs: expect.any(Number),
        }),
      );
    });

    it("returns provider and model info for telemetry", async () => {
      mockCallModel.mockResolvedValue(modelResponse("Answer."));

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.provider).toBe("anthropic");
      expect(result.model).toBe("haiku-4-5");
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("returns token usage for cost tracking", async () => {
      mockCallModel.mockResolvedValue(modelResponse("Answer."));

      const result = await callLLMWithTools(BASE_PARAMS);

      expect(result.usage).toEqual({
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      });
    });
  });
});
