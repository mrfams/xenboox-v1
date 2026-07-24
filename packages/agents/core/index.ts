// ─── Structured Logger ─────────────────────────
export { logger, setLogContext } from "./logger";
export type { LogEntry, LogLevel } from "./logger";

// ─── Security ──────────────────────────────────
export {
  checkEntityAccess,
  getAgentTier,
  isTaskTypeAllowedForAgent,
  getCredentialVault,
  CredentialVault,
} from "./security";
export type {
  AgentTierLevel,
  EntityAccessCheck,
  CredentialEntry,
} from "./security";

// ─── Observability ─────────────────────────────
export { getLangfuse, langfuse } from "./langfuse";

// ─── OLD LLM System (deprecated — delegates to callModel) ─────
export { getLLMRegistry } from "./llm/registry";
export type { ModelTier, ModelRoute, ProviderName } from "./llm/registry";
export { callLLM, streamLLM } from "./llm/agent-llm";
export type {
  LLMCallParams,
  LLMCallResult,
  LLMStreamCallbacks,
} from "./llm/agent-llm";
export { calculateCost, buildCostEntry } from "./llm/cost-tracker";

// ─── NEW Model Provider System (preferred) ─────
export { callModel, streamModel } from "./models/entry";
export type {
  CallModelParams,
  NormalizedModelResponse,
  NormalizedToolCall,
  ProviderId,
  TaskType,
} from "./models/types";
export { getModelRouter, ModelRouter } from "./models/router";
export {
  getAssignment,
  invalidateAssignment,
  invalidateAllAssignments,
} from "./models/loader";
export type { AssignmentRecord } from "./models/loader";
export {
  runGate1,
  runGate2,
  runGate3,
  runGate4,
  rollbackModel,
  recordShadowComparison,
  recordCanaryMetric,
} from "./models/evaluation";

// ─── State ─────────────────────────────────────
export {
  BaseAgentState,
  AuditEntrySchema,
  AgentMessageSchema,
  createAuditEntry,
} from "./state";
export type { BaseAgentStateType, AuditEntry, AgentMessage } from "./state";

// ─── Accounting Rules ─────────────────────────
export {
  validateDoubleEntry,
  getAccountBalance,
  getJournalEntryLines,
  getRecentJournalEntries,
  getAccountByCode,
} from "./tools";

export {
  postJournalEntryValidation,
  validateDoubleEntry as validateDoubleEntryRule,
  getNormalBalance,
  checkCloseReadiness,
  validateReopenPeriod,
  calculateAgingBucket,
  calculateDepreciation,
  calculateFxGainLoss,
  matchReconciliation,
  validateImprestRetirement,
  validateReconciliationCompleteness,
} from "./accounting-rules";

export type {
  PostJournalEntryResult,
  CloseReadinessResult,
  CloseCondition,
  ReopenPeriodResult,
  FxGainLossResult,
  DepreciationResult,
  MatchReconciliationResult,
  JournalLine,
  JournalLineValidation,
} from "./accounting-rules";

// ─── Confidence ────────────────────────────────
export {
  computeCompositeConfidence,
  computePrecedentMatch,
  computeDataCompleteness,
  computeAmountExactness,
  computeDateProximity,
  computeReferenceSimilarity,
  makeEscalationDecision,
  checkMaterialAmountOverride,
  detectConflictingOutputs,
  computeCalibrationScore,
  DEFAULT_ESCALATION_CONFIG,
} from "./confidence";
export type {
  CompositeConfidence,
  ConfidenceSignal,
  EscalationDecision,
  EscalationConfig,
} from "./confidence";

// ─── Prompts ───────────────────────────────────
export {
  CFO_SYSTEM_PROMPT,
  CONTROLLER_SYSTEM_PROMPT,
  LEDGER_SYSTEM_PROMPT,
} from "./prompts";

// ─── Orchestrator ──────────────────────────────
export {
  orchestrate,
  classifyUserMessage,
  orchestrateHierarchical,
  fanOutToDepartments,
  checkEscalation,
  getAgentGraph,
} from "./orchestrator";
export type {
  AgentTaskType,
  AgentTier,
  AgentId,
  AgentTask,
  AgentResult,
  OrchestrateParams,
  DepartmentResult,
  EscalationAction,
} from "./orchestrator";

// ─── Registry ──────────────────────────────────
export {
  AGENT_REGISTRY,
  TASK_TO_AGENT,
  DEPARTMENT_AGENTS,
  DEPARTMENT_CLOSE_TASK,
  ALL_DEPARTMENTS,
} from "./registry";
export type { AgentDepartment } from "./registry";

// ─── Pipeline (CFO Agent Orchestration) ────────
export {
  runCFOPipeline,
  processChatInput,
  createInputEvent,
  resolveIntent,
  checkPermission,
  evaluateConfidenceGate,
  synthesizeResponse,
  getConfidenceThreshold,
  seedDefaultThresholds,
  pushToApprovalQueue,
  logRoutingDecision,
  DEFAULT_THRESHOLDS,
} from "./pipeline";
export type {
  InputEvent,
  InputChannel,
  IntentType,
  ResolvedIntent,
  SummaryObject,
  ScopedTask,
  PipelineDecision,
  PipelineResponse,
  EscalationItem as PipelineEscalationItem,
} from "./pipeline";

// ─── Session State Management ──────────────────
export {
  getOrCreateSession,
  updateSessionAfterTurn,
  resolveAmbiguousReference,
  resetSession,
} from "./session-state";
export type { SessionContext, ConversationMemory } from "./session-state";

// ─── Close Pipeline (Pipeline 2 of 6) ──────────
export {
  executeClosePipeline,
  getCloseStatus,
  // Enhanced 12-step flow
  openCloseSession,
  collectCloseConfirmations,
  evaluateCloseGate,
  generateClosePackage,
  notifyCloseOwner,
  processPassiveApproval,
  reopenPeriodWithRecovery,
  getReopenDepthGovernor,
  getCloseAuditTrail,
  getCloseSessionStatus,
} from "./close-pipeline";
export type {
  CloseState,
  CloseStep,
  CloseStepId,
  CloseStepStatus,
  CloseTriggerSource,
  // Enhanced types
  CloseSessionStatus,
  CloseConfirmation,
  ClosePackage,
  CloseGateDecision,
  ReopenRequest,
  ReopenDepthGovernor,
  CloseSessionFullStatus,
} from "./close-pipeline";

// ─── Reconciliation Pipeline (Pipeline 3 of 6) ────
export {
  runReconciliationPipeline,
  getReconciliationStatus,
  reviewReconciliationSession,
} from "./reconciliation-pipeline";
export type {
  BankReconciliationResult,
  ReconciliationItemResult,
  ReconciliationPipelineResult,
  MatchTier,
  UnmatchedReason,
  UnmatchedItemDetail,
  AccountToReconcile,
  StatementLineResult,
  MatchResult,
} from "./reconciliation-pipeline";

// ─── Cash & Imprest Pipeline (Pipeline 4 of 6) ────
export {
  runCashPipeline,
  recordCashTransaction,
  processImprestRetirement,
  flagDiscrepancy,
  getDailyReconReport,
  reviewCashSession,
  getVerificationSchedule,
} from "./cash-pipeline";
export type {
  CashPipelineResult,
  CashPosition,
  ImprestStatus,
  DiscrepancyItem,
  TillPosition,
  ImprestRetirementResult,
  DailyReconReport,
} from "./cash-pipeline";

// ─── Reporting Pipeline (Pipeline 5 of 6) ──────────
export {
  runReportingPipeline,
  detectReportablePeriods,
  createReportRequest,
  takeLedgerSnapshot,
  buildProfitAndLoss,
  buildBalanceSheet,
  buildCashFlow,
  checkTrialBalance,
  calculateFxImpact,
  generateNarrative,
  createStatementVersion,
  getReportAuditTrail,
} from "./reporting-pipeline";
export type {
  ReportingPipelineResult,
  ReportData,
  ReportablePeriod,
  ProfitAndLossStatement,
  BalanceSheetStatement,
  CashFlowStatement,
  LedgerSnapshot,
  FxImpact,
  ReportRequestInput,
} from "./reporting-pipeline";

// ─── Onboarding Pipeline (Pipeline 6 of 6) ─────────
export { runOnboardingPipeline } from "./onboarding-pipeline";
export type {
  OnboardingPipelineResult,
  OnboardingStep,
} from "./onboarding-pipeline";
