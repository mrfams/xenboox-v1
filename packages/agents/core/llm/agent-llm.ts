/**
 * @deprecated This module is preserved for backward compatibility.
 * All new agent code should use `callModel()` from `core/models/entry.ts`.
 *
 * This implementation now delegates to `callModel()` internally,
 * so existing agent code transparently benefits from the new
 * provider-agnostic routing, traffic splitting, and evaluation pipeline.
 *
 * Migrate agent code when convenient:
 *   import { callLLM } from "..."
 *   → import { callModel } from "../../core/models/entry"
 */

import { callModel } from "../models/entry";
import type { TaskType } from "../models/types";

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
}

/** Map old tier names to task types for the new callModel() */
const TIER_TO_TASK: Record<string, TaskType> = {
  strategic: "strategic_planning",
  management: "approval_decision",
  worker: "invoice_matching",
  fast: "chat_response",
};

/**
 * @deprecated Use `callModel()` from `core/models/entry` instead.
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
    costCents: 0, // Cost tracking moved to model_cost_tracking table
  };
}

export interface LLMStreamCallbacks {
  onToken: (token: string) => void;
  onCompletion: (result: LLMCallResult) => void;
  onError: (error: Error) => void;
}

/**
 * @deprecated Use `streamModel()` from `core/models/entry` instead.
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
