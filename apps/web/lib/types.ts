export type AIProvider = "anthropic" | "openai" | "azure"

export type AIComparison = {
  provider: AIProvider
  model: string
  costPer1kTokens: number
  avgLatencyMs: number
  successRate: number
  monthlySpend: number
  budgetLimit: number
  threshold80: number
  utilization: number
}

export type SpendAlert = {
  provider: AIProvider
  model: string
  currentSpend: number
  budgetLimit: number
  percentage: number
  alertLevel: "low" | "warning" | "critical"
}