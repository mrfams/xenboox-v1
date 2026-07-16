import { ChatAnthropic } from "@langchain/anthropic"
import { ChatOpenAI } from "@langchain/openai"

export type ProviderName = "anthropic" | "openai"
export type ModelTier = "strategic" | "management" | "worker" | "fast"

export interface ModelRoute {
  provider: ProviderName
  model: string
  tier: ModelTier
  maxTokens: number
  temperature: number
}

const MODEL_ROUTES: Record<ModelTier, ModelRoute> = {
  strategic: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    tier: "strategic",
    maxTokens: 8192,
    temperature: 0.1,
  },
  management: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    tier: "management",
    maxTokens: 4096,
    temperature: 0.1,
  },
  worker: {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    tier: "worker",
    maxTokens: 2048,
    temperature: 0.0,
  },
  fast: {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    tier: "fast",
    maxTokens: 1024,
    temperature: 0.0,
  },
}

const FALLBACK_CHAINS: Record<ModelTier, ModelRoute[]> = {
  strategic: [
    MODEL_ROUTES.strategic,
    { provider: "openai", model: "gpt-4o", tier: "strategic", maxTokens: 8192, temperature: 0.1 },
  ],
  management: [
    MODEL_ROUTES.management,
    { provider: "openai", model: "gpt-4o", tier: "management", maxTokens: 4096, temperature: 0.1 },
  ],
  worker: [
    MODEL_ROUTES.worker,
    { provider: "openai", model: "gpt-4o-mini", tier: "worker", maxTokens: 2048, temperature: 0.0 },
  ],
  fast: [
    MODEL_ROUTES.fast,
    { provider: "openai", model: "gpt-4o-mini", tier: "fast", maxTokens: 1024, temperature: 0.0 },
  ],
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyModel = ChatAnthropic | ChatOpenAI

function createModel(route: ModelRoute): AnyModel {
  if (route.provider === "anthropic") {
    return new ChatAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: route.model,
      maxTokens: route.maxTokens,
      temperature: route.temperature,
    })
  }

  if (route.provider === "openai") {
    return new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: route.model,
      temperature: route.temperature,
      maxTokens: route.maxTokens,
    })
  }

  throw new Error(`Unknown provider: ${route.provider}`)
}

class LLMRegistry {
  private models: Map<string, AnyModel> = new Map()

  async getModel(tier: ModelTier): Promise<{ model: AnyModel; route: ModelRoute }> {
    const chain = FALLBACK_CHAINS[tier]

    for (const route of chain) {
      try {
        const key = `${route.provider}:${route.model}`
        let model = this.models.get(key)

        if (!model) {
          const apiKey =
            route.provider === "anthropic"
              ? process.env.ANTHROPIC_API_KEY
              : process.env.OPENAI_API_KEY

          if (!apiKey) continue

          model = createModel(route)
          this.models.set(key, model)
        }

        return { model, route }
      } catch {
        console.warn(`[llm] Provider ${route.provider} unavailable, trying fallback`)
        continue
      }
    }

    throw new Error(`All providers for tier ${tier} are unavailable`)
  }
}

let registry: LLMRegistry | null = null

export function getLLMRegistry(): LLMRegistry {
  if (!registry) {
    registry = new LLMRegistry()
  }
  return registry
}
