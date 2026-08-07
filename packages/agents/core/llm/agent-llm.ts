/**
 * Agent LLM — Model calls with tool execution loop.
 *
 * This module provides:
 * 1. `callLLM()` — backward-compatible wrapper around callModel()
 * 2. `callLLMWithTools()` — new function that includes tool execution loop
 * 3. `streamLLM()` — streaming wrapper
 *
 * The tool execution loop:
 *   1. Call callModel() with tools
 *   2. If response has toolCalls, execute them via tool executor
 *   3. Append tool results as messages
 *   4. Repeat until no more tool calls (max 5 iterations)
 */

import { callModel } from "@xenboox/models";
import type { TaskType } from "@xenboox/models";
import { getToolsForAgent } from "../tool-registry";
import { executeTool as executeToolWithGrants } from "../tool-executor";
import type { ToolExecutionContext, ToolCallResult } from "../tool-contract";
import { langfuse } from "../langfuse";

export type LLMRole = "user" | "assistant" | "system";

export interface LLMCallParams {
  tier: string;
  systemPrompt: string;
  messages: Array<{ role: LLMRole; content: string }>;
  entityId: string;
  agentId: string;
  traceId?: string;
}

export interface LLMCallResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  provider: string;
  model: string;
  durationMs: number;
  costCents: number;
  /** Tool calls made during this call (if any) */
  toolCalls?: ToolCallResult[];
}

/** Map old tier names to task types for the new callModel() */
const TIER_TO_TASK: Record<string, TaskType> = {
  strategic: "strategic_planning",
  management: "approval_decision",
  worker: "invoice_matching",
  fast: "chat_response",
};

const MAX_TOOL_ITERATIONS = 5;

/**
 * @deprecated Use `callModel()` from `@xenboox/models` instead.
 * This delegates to callModel() internally.
 */
export async function callLLM(params: LLMCallParams): Promise<LLMCallResult> {
  const taskType = TIER_TO_TASK[params.tier] ?? "chat_response";

  const result = await callModel({
    agentName: params.agentId,
    taskType,
    entityId: params.entityId,
    systemPrompt: params.systemPrompt,
    messages: params.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    traceId: params.traceId,
  });

  return {
    content: result.content,
    usage: {
      inputTokens: result.tokensUsed.input,
      outputTokens: result.tokensUsed.output,
      totalTokens: result.tokensUsed.total,
    },
    provider: result.providerId,
    model: result.modelId,
    durationMs: result.latencyMs,
    costCents: 0,
  };
}

/**
 * Call the LLM with tool execution loop.
 * The model can request tool calls, which are executed and fed back.
 * Loop continues until the model produces a final text response.
 */
export async function callLLMWithTools(params: {
  systemPrompt: string;
  messages: Array<{ role: LLMRole; content: string }>;
  entityId: string;
  agentId: string;
  traceId?: string;
  /** Callback for streaming tool events */
  onToolCall?: (toolName: string, args: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, success: boolean, data?: unknown) => void;
}): Promise<LLMCallResult> {
  const startTime = Date.now();
  const allToolCalls: ToolCallResult[] = [];

  // Build tool context
  const toolCtx: ToolExecutionContext = {
    entityId: params.entityId,
    agentName: params.agentId,
    traceId: params.traceId,
    timestamp: new Date(),
  };

  // Get available tools for this agent
  const tools = getToolsForAgent(params.agentId);

  // Copy messages (don't mutate original)
  const messages = [...params.messages];

  // Tool execution loop
  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
    const response = await callModel({
      agentName: params.agentId,
      taskType: "chat_response",
      entityId: params.entityId,
      systemPrompt: params.systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      traceId: params.traceId,
    });

    // If no tool calls, we have the final response
    if (!response.toolCalls || response.toolCalls.length === 0) {
      return {
        content: response.content,
        usage: {
          inputTokens: response.tokensUsed.input,
          outputTokens: response.tokensUsed.output,
          totalTokens: response.tokensUsed.total,
        },
        provider: response.providerId,
        model: response.modelId,
        durationMs: Date.now() - startTime,
        costCents: 0,
        toolCalls: allToolCalls,
      };
    }

    // Execute each tool call
    for (const tc of response.toolCalls) {
      // Notify callback
      params.onToolCall?.(tc.name, tc.arguments);

      // Execute via tool executor (with grant enforcement)
      const result = await executeToolWithGrants(
        tc.name,
        tc.arguments,
        toolCtx,
      );

      allToolCalls.push(result);

      // Notify callback
      params.onToolResult?.(tc.name, result.result.success, result.result.data);

      // Log to LangFuse
      langfuse.event({
        name: `tool_execution:${tc.name}`,
        metadata: {
          agentId: params.agentId,
          success: result.result.success,
          durationMs: result.durationMs,
          grantFound: result.grantFound,
          allowed: result.allowed,
        },
      });

      // Append tool call and result as messages
      messages.push({
        role: "assistant",
        content: JSON.stringify({
          toolCalls: [{ name: tc.name, arguments: tc.arguments }],
        }),
      });

      messages.push({
        role: "user",
        content: JSON.stringify({
          toolResult: {
            toolName: tc.name,
            success: result.result.success,
            data: result.result.data,
            error: result.result.error,
          },
        }),
      });
    }
  }

  // Max iterations reached — return last response
  const lastResponse = await callModel({
    agentName: params.agentId,
    taskType: "chat_response",
    entityId: params.entityId,
    systemPrompt: params.systemPrompt,
    messages,
    traceId: params.traceId,
  });

  return {
    content: lastResponse.content,
    usage: {
      inputTokens: lastResponse.tokensUsed.input,
      outputTokens: lastResponse.tokensUsed.output,
      totalTokens: lastResponse.tokensUsed.total,
    },
    provider: lastResponse.providerId,
    model: lastResponse.modelId,
    durationMs: Date.now() - startTime,
    costCents: 0,
    toolCalls: allToolCalls,
  };
}

export interface LLMStreamCallbacks {
  onToken: (token: string) => void;
  onCompletion: (result: LLMCallResult) => void;
  onError: (error: Error) => void;
}

/**
 * @deprecated Use `streamModel()` from `@xenboox/models` instead.
 * This delegates to streamModel() internally.
 */
export async function* streamLLM(
  params: LLMCallParams,
): AsyncGenerator<string, LLMCallResult, unknown> {
  const taskType = TIER_TO_TASK[params.tier] ?? "chat_response";

  const result = await callModel({
    agentName: params.agentId,
    taskType,
    entityId: params.entityId,
    systemPrompt: params.systemPrompt,
    messages: params.messages.map((m) => ({
      role: m.role as "user" | "assistant" | "system",
      content: m.content,
    })),
    traceId: params.traceId,
  });

  yield result.content;

  return {
    content: result.content,
    usage: {
      inputTokens: result.tokensUsed.input,
      outputTokens: result.tokensUsed.output,
      totalTokens: result.tokensUsed.total,
    },
    provider: result.providerId,
    model: result.modelId,
    durationMs: result.latencyMs,
    costCents: 0,
  };
}
