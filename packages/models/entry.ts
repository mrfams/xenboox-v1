import { getModelRouter } from "./router";
import { getLangfuse } from "./langfuse";
import { redactPii } from "@xenboox/agents/core/security/injection-defense";
import { recordAgentActivity } from "./telemetry";
import { aiGateway } from "./gateway";
import { semanticCache } from "./semantic-cache";

// Boot: surface spend alerts as in-app notifications (idempotent — the
// gateway is a singleton, so re-registering the default handler is a no-op).
aiGateway.enableNotificationAlerts();
import type {
  CallModelParams,
  NormalizedModelResponse,
  ProviderId,
} from "./types";
import { isTaskTypeAllowedForAgent } from "./task-policy";

// Map task types to model tiers for default assignment when DB has no row
const _TASK_TO_DEFAULT_MODEL: Record<
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
  // Embeddings
  text_embedding: { model: "text-embedding-3-small", provider: "openai" },
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

  // ─── AI gateway: per-tenant budget + kill-switch (hard backstop) ──
  aiGateway.assertBudgetAllowed(params.entityId);

  // ─── Semantic cache (§22.1): repeated questions skip inference ─────
  // Only for read-style chat tasks, no tools (tool-assisted calls are
  // stateful — their answers depend on live DB state, not just the
  // question). The cache is entity-scoped and TTL-bounded.
  const cacheableTask =
    params.taskType === "chat_response" || params.taskType === "summarization";
  const userQuestion = lastUserMessage(params.messages);
  if (cacheableTask && !params.tools?.length && userQuestion) {
    const cached = semanticCache.lookup(params.entityId, userQuestion);
    if (cached.hit && cached.answer) {
      return {
        content: cached.answer,
        toolCalls: [],
        confidence: 1.0,
        tokensUsed: { input: 0, output: 0, total: 0 },
        latencyMs: 0,
        modelId: cached.model ?? "cache",
        providerId: (cached.provider as ProviderId) ?? "anthropic",
      };
    }
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
    const result = await router.execute(
      params.agentName,
      params.taskType,
      params.entityId,
      {
        systemPrompt: params.systemPrompt,
        messages: params.messages,
        tools: params.tools,
        toolChoice: params.toolChoice,
        maxTokens: params.maxTokens,
        temperature: params.temperature,
      },
    );

    const durationMs = Date.now() - startTime;

    await span.update({
      output: {
        // §22.2 — PII discipline: even the 500-char output snippet is scrubbed
        // before it reaches LangFuse (model output can echo account numbers,
        // tax IDs, phones back verbatim). LangFuse must never carry raw PII.
        content: redactPii(result.content.substring(0, 500)).text,
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

    // ─── Semantic cache: store the answer for repeated questions ────
    if (
      cacheableTask &&
      !params.tools?.length &&
      userQuestion &&
      result.content
    ) {
      semanticCache.store(
        params.entityId,
        userQuestion,
        result.content,
        result.model,
        result.provider,
      );
    }

    // ─── AI gateway: record spend + fire threshold alerts ───────────
    aiGateway.recordUsage(
      params.entityId,
      result.model,
      result.tokensUsed.input,
      result.tokensUsed.output,
    );

    // §4.4 — Record agent activity with model telemetry
    await recordAgentActivity({
      entityId: params.entityId,
      agentName: params.agentName,
      action: params.taskType,
      input: {
        messagesCount: params.messages.length,
        toolsCount: params.tools?.length ?? 0,
      },
      output: {
        contentLength: result.content.length,
        toolCallsCount: result.toolCalls.length,
      },
      confidence: result.fromCache ? 1.0 : 0.95,
      durationMs,
      modelId: result.model,
      provider: result.provider,
      inputTokens: result.tokensUsed.input,
      outputTokens: result.tokensUsed.output,
      fromCache: result.fromCache,
      langfuseTraceId: trace.id,
      status: "success",
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

    // §4.4 — Record failed agent activity
    await recordAgentActivity({
      entityId: params.entityId,
      agentName: params.agentName,
      action: params.taskType,
      input: { messagesCount: params.messages.length },
      durationMs: Date.now() - startTime,
      langfuseTraceId: trace.id,
      status: "error",
      errorMessage: msg,
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

  // ─── AI gateway: per-tenant budget + kill-switch (hard backstop) ──
  aiGateway.assertBudgetAllowed(params.entityId);

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
      toolChoice: params.toolChoice,
      maxTokens: params.maxTokens,
      temperature: params.temperature,
    },
  );

  // ─── AI gateway: record spend + fire threshold alerts ───────────
  aiGateway.recordUsage(
    params.entityId,
    result.model,
    result.tokensUsed.input,
    result.tokensUsed.output,
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

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract the last user message as plain text (the question to cache).
 * Returns undefined when the last user message is a content block (tool call)
 * or the message array is empty.
 */
function lastUserMessage(
  messages: CallModelParams["messages"],
): string | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    if (typeof m.content === "string") return m.content;
    // Content blocks: take the first text block if present, else skip.
    if (Array.isArray(m.content)) {
      const text = m.content.find(
        (b) =>
          b &&
          typeof b === "object" &&
          (b as { type?: string }).type === "text" &&
          typeof (b as { text?: unknown }).text === "string",
      );
      if (text) return (text as { text: string }).text;
    }
  }
  return undefined;
}
