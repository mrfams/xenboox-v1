export type EvalCaseCategory =
  "happy_path" | "edge_case" | "adversarial" | "ambiguous";

export type EvalCaseSource =
  "synthetic" | "anonymized_real" | "disagreement_derived";

export type EvalEscalationType = "none" | "notify" | "flag" | "block";

export interface EvalCase {
  id: string;
  category: EvalCaseCategory;
  description: string;
  agentId: string;
  taskType: string;
  input: Record<string, unknown>;
  expectedOutput: unknown | null;
  expectedConfidenceRange: [number, number];
  expectedEscalation: EvalEscalationType;
  expectedEscalationTarget: string | null;
  source: EvalCaseSource;
  notes?: string;
  deprecated?: boolean;
  deprecatedReason?: string;
}

export interface EvalResult {
  caseId: string;
  agentId: string;
  passed: boolean;
  confidence: number;
  expectedConfidenceRange: [number, number];
  confidenceInRange: boolean;
  actualOutput: unknown;
  expectedOutput: unknown | null;
  outputMatch: boolean;
  actualEscalation: EvalEscalationType;
  expectedEscalation: EvalEscalationType;
  escalationMatch: boolean;
  expectedEscalationTarget: string | null;
  actualEscalationTarget: string | null;
  escalationTargetMatch: boolean;
  errors: string[];
  duration: number;
  scoringMethod: "exact_match" | "llm_graded";
  category: EvalCaseCategory;
}

export interface SingleAgentEvalSummary {
  agentId: string;
  totalCases: number;
  passed: number;
  failed: number;
  exactMatchRate: number;
  llmGradedPassRate: number;
  calibrationScore: number;
  escalationFalseNegatives: number;
  escalationFalsePositives: number;
  happyPathFailures: number;
  edgeCaseFailures: number;
  adversarialFailures: number;
  ambiguousFailures: number;
  coverageSufficient: boolean;
  results: EvalResult[];
  duration: number;
}

export interface EvalSuiteSummary {
  agentSummaries: SingleAgentEvalSummary[];
  totalCasesRun: number;
  totalPassed: number;
  totalFailed: number;
  overallPassRate: number;
  totalCalibrationScore: number;
  totalEscalationFalseNegatives: number;
  blockingFailures: string[];
  suiteDuration: number;
  coverageSufficient: boolean;
  timestamp: string;
}

export interface FlowStepResult {
  step: number;
  agentId: string;
  action: string;
  passed: boolean;
  confidence: number;
  expectedConfidenceRange: [number, number];
  confidenceInRange: boolean;
  outputMatch: boolean;
  handoffCheckPassed: boolean;
  errors: string[];
  duration: number;
}

export interface FlowEvalResult {
  flowId: string;
  description: string;
  passed: boolean;
  finalStateCheckPassed: boolean;
  actualHumanTouchpoints: number;
  expectedHumanTouchpoints: number;
  humanTouchpointsMatch: boolean;
  escalationFalseNegatives: boolean;
  stepResults: FlowStepResult[];
  allStepsPass: boolean;
  allHandoffsPass: boolean;
  errors: string[];
  duration: number;
}

export interface EvalConfig {
  mode: "single" | "suite" | "flow";
  agentIds?: string[];
  flowIds?: string[];
  threshold?: {
    exactMatchRateMin?: number;
    llmGradedPassRateMin?: number;
    calibrationScoreMin?: number;
    escalationFalseNegativesMax?: number;
    escalationFalsePositivesMax?: number;
  };
  reportDir?: string;
}
