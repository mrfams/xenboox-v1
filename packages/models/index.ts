// ─── Model Provider Layer ──────────────────────────────────────────
// Single entry point for all model provider functionality.
// This is the model control plane — the ONLY place application code
// may interact with model providers. No other code path may call a
// provider SDK or HTTP endpoint directly.

// Router & Entry Points
export { getModelRouter, ModelRouter } from "./router";
export type { RouterConfig } from "./router";
export { callModel, streamModel } from "./entry";

// AI Gateway — per-tenant budgets, kill-switch, spend alerts (§22.1)
export {
  AiGateway,
  AiBudgetExceededError,
  aiGateway,
  estimateCostUsd,
} from "./gateway";
export type { SpendAlert, UsageSnapshot } from "./gateway";

// Semantic cache — repeated-question dedup for chat surfaces (§22.1)
export { SemanticCache, semanticCache } from "./semantic-cache";
export type { SemanticCacheLookup } from "./semantic-cache";
export {
  getAssignment,
  invalidateAssignment,
  invalidateAllAssignments,
} from "./loader";

// Provider Adapters
export { getProviderAdapters, getAdapter } from "./adapters";
export {
  AnthropicAdapter,
  OpenAIAdapter,
  BedrockAdapter,
  VertexAdapter,
  OpenWeightAdapter,
} from "./adapters";

// Evaluation Pipeline (Gates 1-4)
export {
  runGate1,
  runGate2,
  runGate3,
  runGate4,
  rollbackModel,
  recordShadowComparison,
  recordCanaryMetric,
} from "./evaluation";

// Observability
export { getLangfuse, langfuse } from "./langfuse";
export { recordAgentActivity, rollupDailyCosts } from "./telemetry";

// Task-Policy (tier-based model authorization)
export { getAgentTier, isTaskTypeAllowedForAgent } from "./task-policy";
export type { AgentTierLevel } from "./task-policy";

// Types
export type {
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
  ModelTier,
  TaskType,
  CallModelParams,
  ProviderAdapter,
  ProviderRoute,
  ModelAssignmentRecord,
  ModelRegistryEntry,
  RouteHealth,
} from "./types";
