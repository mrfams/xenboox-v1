import { ModelRouter, getModelRouter } from "./router";
import { getLangfuse } from "../langfuse";
import type {
  CallModelParams,
  NormalizedModelResponse,
  ProviderId,
  TaskType,
} from "./types";
import { getAssignment } from "./loader";
import { isTaskTypeAllowedForAgent } from "../security";

// Map task types to model tiers for default assignment when DB has no row
const TASK_TO_DEFAULT_MODEL: Record<
  string,
  { model: string; provider: ProviderId }
> = {
  // Strategic
  strategic_planning: { model: "claude-sonnet-4-6", provider: "anthropic" },
  financial_analysis: { model: "claude-sonnet-4-6", provider: "anthropic" },
  executive_summary: { model: "claude-sonnet-4-6", provider: "anthropic" },
  risk_assessment: { model: "claude-sonnet-4-6", provider: "anthropic" },
  // Management
  approval_decision: { model: "claude-sonnet-4-6", provider: "anthropic" },
  cash_flow_forecast: { model: "claude-sonnet-4-6", provider: "anthropic" },
  payroll_calculation: { model: "claude-haiku-4-5", provider: "anthropic" },
  compliance_check: { model: "claude-sonnet-4-6", provider: "anthropic" },
  reconciliation_review: { model: "claude-sonnet-4-6", provider: "anthropic" },
  // Worker
  invoice_matching: { model: "claude-haiku-4-5", provider: "anthropic" },
  payment_scheduling: { model: "claude-haiku-4-5", provider: "anthropic" },
  journal_posting: { model: "claude-sonnet-4-6", provider: "anthropic" },
  cash_reconciliation: { model: "claude-haiku-4-5", provider: "anthropic" },
  tax_calculation: { model: "claude-sonnet-4-6", provider: "anthropic" },
  filing_preparation: { model: "claude-sonnet-4-6", provider: "anthropic" },
  report_generation: { model: "claude-sonnet-4-6", provider: "anthropic" },
  // Platform
  ocr_field_extraction: { model: "claude-haiku-4-5", provider: "anthropic" },
  document_classification: { model: "claude-haiku-4-5", provider: "anthropic" },
  structured_extraction: { model: "claude-sonnet-4-6", provider: "anthropic" },
  budget_variance_analysis: {
    model: "claude-sonnet-4-6",
    provider: "anthropic",
  },
  anomaly_detection: { model: "claude-sonnet-4-6", provider: "anthropic" },
  // Chat
  chat_response: { model: "claude-sonnet-4-6", provider: "anthropic" },
  summarization: { model: "claude-haiku-4-5", provider: "anthropic" },
  translation: { model: "claude-haiku-4-5", provider: "anthropic" },
};

/**
 * callModel — THE single entry point for all agent inference.
 *
 * Every one of the 19 agents calls this. No agent code contains a
 * provider SDK import directly. The function:
 * 1. Looks up the live model assignment for (agentName, taskType)
 *    from the model_assignments table (or falls back to defaults)
 * 2. Routes through the ModelRouter which handles traffic splitting,
 *    provider-pool load balancing, and caching
 * 3. Logs the call to LangFuse with full telemetry
 * 4. Returns a NormalizedModelResponse regardless of which provider
 *    actually served the request
 *
 * The downstream code (confidence checks, escalation, accounting rules)
 * never needs to know which provider answered.
 */
export async function callModel(
  params: CallModelParams,
): Promise<NormalizedModelResponse> {
  // ─── Security guard: entityId is required ──────────────────────────
  if (!params.entityId) {
    throw new Error(
      "entityId is required for all model calls — entity scoping is non-negotiable",
    );
  }

  // ─── Security guard: agent task type authorization ────────────────
  const authCheck = isTaskTypeAllowedForAgent(
    params.agentName,
    params.taskType,
  );
  if (!authCheck.allowed) {
    throw new Error(`Agent security violation: ${authCheck.reason}`);
  }

  const router = getModelRouter();
  const langfuse = getLangfuse();

  const trace = await langfuse.trace({
    name: `callModel-${params.agentName}-${params.taskType}`,
    metadata: {
      agentName: params.agentName,
      taskType: params.taskType,
      entityId: params.entityId,
      fallbackAllowed: params.fallbackAllowed,
      traceId: params.traceId,
    },
  });

  const span = trace.span({
    name: "model-inference",
    metadata: {
      messages: params.messages.length,
      tools: params.tools?.length ?? 0,
      systemPromptLength: params.systemPrompt.length,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    },
  });

  const startTime = Date.now();

  try {
    // Look up assignment from DB or use defaults
    const defaultConfig = TASK_TO_DEFAULT_MODEL[params.taskType];
    const assignment = await getAssignment(params.agentName, params.taskType);
    const effectiveModel =
      assignment?.liveModelId ?? defaultConfig?.model ?? "claude-haiku-4-5";
    const effectiveProvider =
      assignment?.liveProvider ?? defaultConfig?.provider ?? "anthropic";

    const result = await router.execute(
      params.agentName,
      params.taskType,
      params.entityId,
      {
        systemPrompt: params.systemPrompt,
        messages: params.messages,
        tools: params.tools,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      },
    );

    const durationMs = Date.now() - startTime;

    await span.update({
      output: {
        content: result.content.substring(0, 500),
        toolCalls: result.toolCalls.length,
        provider: result.provider,
        model: result.model,
        fromCache: result.fromCache,
      },
      metadata: {
        provider: result.provider,
        model: result.model,
        durationMs,
        tokensUsed: result.tokensUsed,
        fromCache: result.fromCache,
      },
    });

    return {
      content: result.content,
      toolCalls: result.toolCalls,
      confidence: result.fromCache ? 1.0 : 0.95,
      tokensUsed: result.tokensUsed,
      latencyMs: result.latencyMs,
      modelId: result.model,
      providerId: result.provider,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);

    await span.update({
      metadata: {
        error: msg,
        durationMs: Date.now() - startTime,
      },
    });

    throw error;
  }
}

/**
 * Stream version of callModel. Returns tokens via callback and
 * final result via promise resolution.
 */
export async function streamModel(
  params: CallModelParams & {
    onToken: (token: string) => void;
    onToolCall?: (tc: {
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }) => void;
  },
): Promise<NormalizedModelResponse> {
  if (!params.entityId) {
    throw new Error(
      "entityId is required for all model calls — entity scoping is non-negotiable",
    );
  }

  const authCheck = isTaskTypeAllowedForAgent(
    params.agentName,
    params.taskType,
  );
  if (!authCheck.allowed) {
    throw new Error(`Agent security violation: ${authCheck.reason}`);
  }

  const router = getModelRouter();

  // For streaming, we still use the router's execute path but
  // with streaming-aware adapters. Currently the router.execute
  // uses the non-streaming path; this will be enhanced once
  // all adapters support streaming natively through the router.

  const result = await router.execute(
    params.agentName,
    params.taskType,
    params.entityId,
    {
      systemPrompt: params.systemPrompt,
      messages: params.messages,
      tools: params.tools,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    },
  );

  // Emit accumulated content as if streamed
  params.onToken(result.content);

  return {
    content: result.content,
    toolCalls: result.toolCalls,
    confidence: 0.95,
    tokensUsed: result.tokensUsed,
    latencyMs: result.latencyMs,
    modelId: result.model,
    providerId: result.provider,
  };
}
