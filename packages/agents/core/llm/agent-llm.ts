import { getLLMRegistry, type ModelTier } from "./registry"
import { calculateCost } from "./cost-tracker"
import { langfuse } from "../langfuse"
import { SystemMessage, HumanMessage, AIMessage } from "@langchain/core/messages"
import type { AIMessageChunk } from "@langchain/core/messages"

export type LLMRole = "user" | "assistant" | "system"

export interface LLMCallParams {
  tier: ModelTier
  systemPrompt: string
  messages: Array<{ role: LLMRole; content: string }>
  entityId: string
  agentId: string
  traceId?: string
}

export interface LLMCallResult {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  provider: string
  model: string
  durationMs: number
  costCents: number
}

function toLangChainMessage(role: LLMRole, content: string) {
  switch (role) {
    case "system":
      return new SystemMessage(content)
    case "user":
      return new HumanMessage(content)
    case "assistant":
      return new AIMessage(content)
  }
}

export async function callLLM(params: LLMCallParams): Promise<LLMCallResult> {
  const registry = getLLMRegistry()
  const { model, route } = await registry.getModel(params.tier)

  const trace = await langfuse.trace({
    name: `llm-${params.agentId}`,
    metadata: {
      provider: route.provider,
      model: route.model,
      tier: params.tier,
      entityId: params.entityId,
    },
    id: params.traceId,
  })

  const startTime = Date.now()

  try {
    const messages = [
      new SystemMessage(params.systemPrompt),
      ...params.messages.map((m) => toLangChainMessage(m.role, m.content)),
    ]

    const response = await model.invoke(messages)

    const durationMs = Date.now() - startTime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageMeta = (response as any).usageMetadata as
      | { inputTokens?: number; outputTokens?: number; totalTokens?: number }
      | undefined

    const inputTokens = usageMeta?.inputTokens ?? 0
    const outputTokens = usageMeta?.outputTokens ?? 0
    const totalTokens = usageMeta?.totalTokens ?? 0
    const costCents = calculateCost(route.model, inputTokens, outputTokens)

    const content =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content)

    await trace.update({
      output: { content },
      metadata: {
        provider: route.provider,
        model: route.model,
        durationMs,
        costCents,
        inputTokens,
        outputTokens,
        totalTokens,
      },
    })

    return {
      content,
      usage: { inputTokens, outputTokens, totalTokens },
      provider: route.provider,
      model: route.model,
      durationMs,
      costCents,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ metadata: { error: msg } })
    throw error
  }
}

// ─── Streaming LLM Call ─────────────────────────────────────────────────────

export interface LLMStreamCallbacks {
  onToken: (token: string) => void
  onCompletion: (result: LLMCallResult) => void
  onError: (error: Error) => void
}

/**
 * Stream LLM response token-by-token. Returns an async generator of token strings.
 * Also accepts optional callbacks for side effects (e.g., SSE emission).
 */
export async function* streamLLM(
  params: LLMCallParams
): AsyncGenerator<string, LLMCallResult, unknown> {
  const registry = getLLMRegistry()
  const { model, route } = await registry.getModel(params.tier)

  const trace = await langfuse.trace({
    name: `llm-stream-${params.agentId}`,
    metadata: {
      provider: route.provider,
      model: route.model,
      tier: params.tier,
      entityId: params.entityId,
      streaming: true,
    },
    id: params.traceId,
  })

  const startTime = Date.now()

  try {
    const messages = [
      new SystemMessage(params.systemPrompt),
      ...params.messages.map((m) => toLangChainMessage(m.role, m.content)),
    ]

    const stream = await model.stream(messages)
    let fullContent = ""
    let lastChunk: AIMessageChunk | null = null

    for await (const chunk of stream) {
      lastChunk = chunk
      const token =
        typeof chunk.content === "string" ? chunk.content : ""
      if (token) {
        fullContent += token
        yield token
      }
    }

    const durationMs = Date.now() - startTime
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const usageMeta = (lastChunk as any)?.usageMetadata as
      | { inputTokens?: number; outputTokens?: number; totalTokens?: number }
      | undefined

    const inputTokens = usageMeta?.inputTokens ?? 0
    const outputTokens = usageMeta?.outputTokens ?? 0
    const totalTokens = usageMeta?.totalTokens ?? 0
    const costCents = calculateCost(route.model, inputTokens, outputTokens)

    await trace.update({
      output: { content: fullContent },
      metadata: {
        provider: route.provider,
        model: route.model,
        durationMs,
        costCents,
        inputTokens,
        outputTokens,
        totalTokens,
      },
    })

    const result: LLMCallResult = {
      content: fullContent,
      usage: { inputTokens, outputTokens, totalTokens },
      provider: route.provider,
      model: route.model,
      durationMs,
      costCents,
    }

    return result
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    await trace.update({ metadata: { error: msg } })
    throw error
  }
}
