// ─── Model Provider Layer ──────────────────────────────────────────
// Single entry point for all model provider functionality.
// See XENBOOX_MODEL_PROVIDER_LAYER.md for the full specification.

// Router & Entry Points
export { getModelRouter, ModelRouter } from "./router";
export { callModel, streamModel } from "./entry";
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
