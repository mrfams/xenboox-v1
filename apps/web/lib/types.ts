export type AIProvider = "anthropic" | "openai" | "azure" | "self-hosted"
export type DeploymentMode = "api" | "self-hosted" | "hybrid"

export type AIComparison = {
  provider: AIProvider
  model: string
  deploymentMode: DeploymentMode
  costPer1kTokens: number
  selfHostCostPerMonth: number
  avgLatencyMs: number
  successRate: number
  monthlySpend: number
  monthlyTokens: number
  budgetLimit: number
  threshold80: number
  recommendedAt80: number
  recommendedAt90: number
  utilization: number
  breakEvenTokens: number
  recommendation: "api" | "self-host" | "hybrid"
  totalCost?: number
}

export type SelfHostedModel = {
  provider: "self-hosted"
  model: string
  costPer1kTokens: number
  selfHostCostPerMonth: number
  avgLatencyMs: number
  successRate: number
  monthlySpend: number
  monthlyTokens: number
  budgetLimit: number
  utilization: number
  breakEvenTokens: number
  recommendation: "self-host"
}

export type CostComparison = {
  provider: AIProvider
  model: string
  apiCost: number
  selfHostCost: number
  totalTokens: number
  breakEvenPoint: number
  recommendation: "api" | "self-host" | "hybrid"
  monthlySavings: number
}

export type SpendAlert = {
  provider: AIProvider
  model: string
  currentSpend: number
  budgetLimit: number
  percentage: number
  alertLevel: "low" | "warning" | "critical"
}