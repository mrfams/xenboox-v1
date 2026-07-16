# MULTI_LLM_ARCHITECTURE.md — Provider-Agnostic LLM Layer

> Every LLM call in Xenboox must go through a provider registry. No hardcoded model names.
> When a better model drops, we swap the config — not the code.

---

## 1. Design Principles

1. **No vendor lock-in** — Agents don't know which provider they're using. They call `llm.complete()` and the registry routes.
2. **Config-driven model selection** — Which model runs which agent is an environment variable, not code.
3. **Per-task model routing** — Worker agents use cheap/fast models. Management agents use capable models. Strategic agents use the best.
4. **Fallback chains** — If primary provider is down, fall back to secondary. If rate-limited, try next provider.
5. **Cost tracking per provider** — Every call is logged with provider, model, tokens, and cost.
6. **A/B testing** — Run two models on the same task, compare accuracy and cost.

---

## 2. Provider Registry

```typescript
// packages/agents/core/llm/registry.ts

import { ChatAnthropic } from "@langchain/anthropic"
import { ChatOpenAI } from "@langchain/openai"
// Future: import { ChatGoogle } from "@langchain/google-genai"
// Future: import { ChatMistral } from "@langchain/mistralai"

type ProviderName = "anthropic" | "openai" | "google" | "mistral"
type ModelTier = "strategic" | "management" | "worker" | "fast"

interface ProviderConfig {
  name: ProviderName
  apiKey: string
  baseUrl?: string
  models: Record<string, string>  // friendly name → actual model ID
}

interface ModelRoute {
  provider: ProviderName
  model: string
  tier: ModelTier
  maxTokens: number
  temperature: number
}

// ─── ROUTE CONFIGURATION ─────────────────────────
// This is the only place model selection is defined.
// Change this to swap models across the entire platform.

const MODEL_ROUTES: Record<ModelTier, ModelRoute> = {
  // CFO Agent, complex strategic decisions
  strategic: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    tier: "strategic",
    maxTokens: 8192,
    temperature: 0.1
  },

  // Controller, Treasury, Compliance, Reporting
  management: {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    tier: "management",
    maxTokens: 4096,
    temperature: 0.1
  },

  // Ledger, AP, AR, Reconciliation (need accuracy)
  worker: {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    tier: "worker",
    maxTokens: 2048,
    temperature: 0.0
  },

  // Document classification, simple categorization, bulk processing
  fast: {
    provider: "anthropic",
    model: "claude-haiku-4-5",
    tier: "fast",
    maxTokens: 1024,
    temperature: 0.0
  }
}

// ─── FALLBACK CHAINS ─────────────────────────────
// If primary provider fails, try these in order

const FALLBACK_CHAINS: Record<ModelTier, ModelRoute[]> = {
  strategic: [
    MODEL_ROUTES.strategic,
    { provider: "openai", model: "gpt-4o", tier: "strategic", maxTokens: 8192, temperature: 0.1 }
  ],
  management: [
    MODEL_ROUTES.management,
    { provider: "openai", model: "gpt-4o", tier: "management", maxTokens: 4096, temperature: 0.1 }
  ],
  worker: [
    MODEL_ROUTES.worker,
    { provider: "openai", model: "gpt-4o-mini", tier: "worker", maxTokens: 2048, temperature: 0.0 }
  ],
  fast: [
    MODEL_ROUTES.fast,
    { provider: "openai", model: "gpt-4o-mini", tier: "fast", maxTokens: 1024, temperature: 0.0 }
  ]
}

// ─── REGISTRY ────────────────────────────────────

class LLMRegistry {
  private providers: Map<ProviderName, any> = new Map()
  private config: Record<ProviderName, ProviderConfig>

  constructor(config: Record<ProviderName, ProviderConfig>) {
    this.config = config
    this.initializeProviders()
  }

  private initializeProviders() {
    for (const [name, providerConfig] of Object.entries(this.config)) {
      switch (name) {
        case "anthropic":
          this.providers.set("anthropic", new ChatAnthropic({
            apiKey: providerConfig.apiKey,
            model: "claude-sonnet-4-6",  // default, overridden per call
            temperature: 0.1,
            maxTokens: 4096
          }))
          break
        case "openai":
          this.providers.set("openai", new ChatOpenAI({
            apiKey: providerConfig.apiKey,
            model: "gpt-4o",
            temperature: 0.1
          }))
          break
        // Future providers added here
      }
    }
  }

  /**
   * Get a model instance for a given tier.
   * This is the primary API — agents call this, never instantiate models directly.
   */
  async getModel(tier: ModelTier): Promise<{ model: any; route: ModelRoute }> {
    const chain = FALLBACK_CHAINS[tier]

    for (const route of chain) {
      try {
        const provider = this.providers.get(route.provider)
        if (!provider) continue

        const model = provider.bind({
          model: route.model,
          max_tokens: route.maxTokens,
          temperature: route.temperature
        })

        return { model, route }
      } catch (error) {
        console.warn(`Provider ${route.provider} unavailable, trying fallback`)
        continue
      }
    }

    throw new Error(`All providers for tier ${tier} are unavailable`)
  }

  /**
   * Get model directly by provider and model name (for A/B testing)
   */
  getSpecificModel(provider: ProviderName, model: string) {
    return this.providers.get(provider)?.bind({ model })
  }
}

// ─── SINGLETON ───────────────────────────────────

let registry: LLMRegistry | null = null

export function getLLMRegistry(): LLMRegistry {
  if (!registry) {
    registry = new LLMRegistry({
      anthropic: {
        name: "anthropic",
        apiKey: process.env.ANTHROPIC_API_KEY!,
        models: {
          "sonnet-4.6": "claude-sonnet-4-6",
          "haiku-4.5": "claude-haiku-4-5"
        }
      },
      openai: {
        name: "openai",
        apiKey: process.env.OPENAI_API_KEY!,
        models: {
          "gpt-4o": "gpt-4o",
          "gpt-4o-mini": "gpt-4o-mini"
        }
      }
      // Future: google, mistral, etc.
    })
  }
  return registry
}
```

---

## 3. Agent Integration Pattern

Agents never import a specific provider. They use the registry:

```typescript
// packages/agents/core/llm/agent-llm.ts

import { getLLMRegistry } from "./registry"
import { langfuse } from "../langfuse"

/**
 * Wrap any LLM call with tracing, cost tracking, and retry.
 */
export async function callLLM(params: {
  tier: "strategic" | "management" | "worker" | "fast"
  systemPrompt: string
  messages: Array<{ role: "user" | "assistant"; content: string }>
  entityId: string
  agentId: string
  traceId?: string
}) {
  const registry = getLLMRegistry()
  const { model, route } = await registry.getModel(params.tier)

  const trace = await langfuse.trace({
    name: `llm-${params.agentId}`,
    metadata: {
      provider: route.provider,
      model: route.model,
      tier: params.tier,
      entityId: params.entityId
    },
    id: params.traceId
  })

  const startTime = Date.now()

  try {
    const response = await model.invoke([
      { role: "system", content: params.systemPrompt },
      ...params.messages
    ])

    const durationMs = Date.now() - startTime
    const usage = response.usageMetadata

    // Log to LangFuse
    await trace.update({
      output: { content: response.content },
      usage: {
        input: usage?.inputTokens || 0,
        output: usage?.outputTokens || 0,
        total: usage?.totalTokens || 0
      },
      metadata: {
        provider: route.provider,
        model: route.model,
        durationMs
      }
    })

    return {
      content: response.content,
      usage: {
        inputTokens: usage?.inputTokens || 0,
        outputTokens: usage?.outputTokens || 0,
        totalTokens: usage?.totalTokens || 0
      },
      provider: route.provider,
      model: route.model,
      durationMs
    }
  } catch (error) {
    await trace.update({
      metadata: { error: error.message }
    })
    throw error
  }
}
```

---

## 4. Configuration via Environment

```bash
# .env — Model routing is config, not code

# Primary provider
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Fallback provider
LLM_FALLBACK_PROVIDER=openai
OPENAI_API_KEY=sk-...

# Per-tier model overrides (optional — defaults to what's in MODEL_ROUTES)
LLM_STRATEGIC_MODEL=claude-sonnet-4-6
LLM_MANAGEMENT_MODEL=claude-sonnet-4-6
LLM_WORKER_MODEL=claude-haiku-4-5
LLM_FAST_MODEL=claude-haiku-4-5

# Cost control
LLM_MONTHLY_BUDGET_CENTS=50000        # $500/month max
LLM_DAILY_TOKEN_LIMIT=1000000          # 1M tokens/day
LLM_PER_ENTITY_MONTHLY_LIMIT=50000     # 50K tokens/entity/month
```

---

## 5. Adding a New Provider

When a new model drops (GPT-5, Gemini Ultra, Mistral Large, etc.):

### Step 1: Install the LangChain integration
```bash
pnpm add @langchain/openai        # for OpenAI models
pnpm add @langchain/google-genai   # for Gemini
pnpm add @langchain/mistralai     # for Mistral
```

### Step 2: Add to the registry
```typescript
// In registry.ts — add provider initialization
case "google":
  this.providers.set("google", new ChatGoogleGenerativeAI({
    apiKey: providerConfig.apiKey,
    model: "gemini-2.5-pro"
  }))
  break
```

### Step 3: Add to fallback chains
```typescript
strategic: [
  MODEL_ROUTES.strategic,  // primary: Claude
  { provider: "google", model: "gemini-2.5-pro", tier: "strategic", ... },
  { provider: "openai", model: "gpt-4o", tier: "strategic", ... }
]
```

### Step 4: Update environment variables
```bash
LLM_STRATEGIC_MODEL=gemini-2.5-pro  # swap globally
```

**That's it. No agent code changes. No prompt changes. Just config.**

---

## 6. A/B Testing Models

```typescript
// packages/agents/core/llm/ab-test.ts

import { getLLMRegistry } from "./registry"

/**
 * Run the same prompt through two models, return both results.
 * Use for evaluation and comparison.
 */
export async function abTest(params: {
  systemPrompt: string
  messages: Array<{ role: "user" | "content": string }>
  modelA: { provider: string; model: string }
  modelB: { provider: string; model: string }
}) {
  const registry = getLLMRegistry()

  const [resultA, resultB] = await Promise.all([
    registry.getSpecificModel(params.modelA.provider, params.modelA.model)
      .invoke([
        { role: "system", content: params.systemPrompt },
        ...params.messages
      ]),
    registry.getSpecificModel(params.modelB.provider, params.modelB.model)
      .invoke([
        { role: "system", content: params.systemPrompt },
        ...params.messages
      ])
  ])

  return {
    modelA: { ...params.modelA, result: resultA },
    modelB: { ...params.modelB, result: resultB }
  }
}
```

---

## 7. Cost Tracking Per Provider

```typescript
// packages/agents/core/llm/cost-tracker.ts

interface CostEntry {
  timestamp: string
  entityId: string
  agentId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  costCents: number
}

// Pricing per million tokens (update when prices change)
const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6":  { input: 3.00,  output: 15.00 },
  "claude-haiku-4-5":   { input: 1.00,  output: 5.00 },
  "gpt-4o":             { input: 2.50,  output: 10.00 },
  "gpt-4o-mini":        { input: 0.15,  output: 0.60 },
  "gemini-2.5-pro":     { input: 1.25,  output: 10.00 },
  "gemini-2.0-flash":   { input: 0.10,  output: 0.40 }
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model]
  if (!pricing) return 0

  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output

  return Math.round((inputCost + outputCost) * 100)  // return cents
}

export function logCost(entry: CostEntry) {
  // Store in database for tracking
  // Alert if approaching budget limits
}
```

---

## 8. Model Upgrade Checklist

When upgrading models across the platform:

- [ ] Test new model with golden dataset (run `pnpm agents:eval`)
- [ ] Compare accuracy vs current model
- [ ] Compare cost per token
- [ ] Test prompt compatibility (some prompts may need tweaks)
- [ ] Run A/B test on 100 real transactions
- [ ] Check latency impact
- [ ] Update PRICING table
- [ ] Update .env defaults
- [ ] Deploy to staging first
- [ ] Monitor for 48 hours before production
- [ ] Update docs (this file + LLM_COST_MODEL.md)

---

## 9. Current Model Mapping (July 2026)

| Agent | Tier | Current Model | Why |
|-------|------|---------------|-----|
| CFO Agent | strategic | Claude Sonnet 4.6 | Complex reasoning, human-facing |
| Controller Agent | management | Claude Sonnet 4.6 | GL integrity requires capability |
| Treasury Agent | management | Claude Sonnet 4.6 | Cash management requires accuracy |
| Ledger Agent | worker | Claude Haiku 4.5 | Deterministic rules, speed matters |
| Reconciliation Agent | worker | Claude Haiku 4.5 | Pattern matching, high volume |
| Cash Agent | worker | Claude Haiku 4.5 | Simple calculations |
| Mobile Money Agent | worker | Claude Haiku 4.5 | Statement parsing |
| AP Agent | worker | Claude Haiku 4.5 | Invoice categorization |
| AR Agent | worker | Claude Haiku 4.5 | Invoice creation |
| Reporting Agent | management | Claude Sonnet 4.6 | Narrative summaries |
| Document Agent | fast | Claude Haiku 4.5 | OCR classification |

**When to upgrade a tier:**
- If Haiku 5 drops → upgrade worker and fast tiers
- If Sonnet 5 drops → upgrade strategic and management tiers
- If a new model beats Haiku on accuracy AND cost → upgrade worker tier
- If a new model beats Sonnet on reasoning → upgrade strategic tier

---

*Last updated: July 2026*
