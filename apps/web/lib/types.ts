export type AIProvider =
  | "anthropic"
  | "openai"
  | "azure"
  | "deepseek"
  | "glm"
  | "minimax"
  | "qwen"
  | "kiwi"
  | "self-hosted"
  | "cohere"
  | "mistral"
  | "together"
  | "replicate";

export type DeploymentMode = "api" | "self-hosted" | "hybrid";

export type HostingProvider =
  | "aws"
  | "gcp"
  | "azure"
  | "lambda"
  | "modal"
  | "replicate"
  | "together"
  | "runpod"
  | "vastai";

export type AIComparison = {
  provider: AIProvider;
  model: string;
  deploymentMode: DeploymentMode;
  costPerMTokens: number;
  selfHostCostPerMonth: number;
  hostingProvider?: HostingProvider;
  /** Observed average latency — null when no real usage has been recorded. */
  avgLatencyMs: number | null;
  /** Observed success rate — null when no real usage has been recorded. */
  successRate: number | null;
  monthlySpend: number;
  monthlyTokens: number;
  budgetLimit: number;
  threshold80: number;
  recommendedAt80: number;
  recommendedAt90: number;
  utilization: number;
  breakEvenTokens: number;
  recommendation: "api" | "self-host" | "hybrid";
  totalCost?: number;
  /** True when real usage data exists for this model in the last 30 days. */
  hasUsage?: boolean;
};

export type SelfHostedModel = {
  provider: "self-hosted";
  model: string;
  costPer1kTokens: number;
  selfHostCostPerMonth: number;
  avgLatencyMs: number;
  successRate: number;
  monthlySpend: number;
  monthlyTokens: number;
  budgetLimit: number;
  utilization: number;
  breakEvenTokens: number;
  recommendation: "self-host";
};

export type CostComparison = {
  provider: AIProvider;
  model: string;
  apiCost: number;
  selfHostCost: number;
  totalTokens: number;
  breakEvenPoint: number;
  recommendation: "api" | "self-host" | "hybrid";
  monthlySavings: number;
};

export type SpendAlert = {
  provider: AIProvider;
  model: string;
  currentSpend: number;
  budgetLimit: number;
  percentage: number;
  alertLevel: "low" | "warning" | "critical";
};
