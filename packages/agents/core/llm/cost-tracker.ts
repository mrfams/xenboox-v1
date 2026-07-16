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

const PRICING: Record<string, { input: number; output: number }> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0 },
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
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

  return Math.round((inputCost + outputCost) * 100)
}

export function buildCostEntry(params: {
  entityId: string
  agentId: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
}): CostEntry {
  return {
    timestamp: new Date().toISOString(),
    ...params,
    costCents: calculateCost(params.model, params.inputTokens, params.outputTokens),
  }
}
