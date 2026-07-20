import type {
  EvalCase,
  EvalResult,
  SingleAgentEvalSummary,
  EvalSuiteSummary,
  FlowStepResult,
  FlowEvalResult,
} from "./types";

export function scoreExactMatch(
  actual: unknown,
  expected: unknown | null,
): boolean {
  if (expected === null) return actual === null;
  if (typeof expected !== typeof actual) return false;
  if (typeof expected === "object" && expected !== null && actual !== null) {
    return deepEqual(expected, actual);
  }
  return expected === actual;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, idx) => deepEqual(val, b[idx]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as Record<string, unknown>);
    const bKeys = Object.keys(b as Record<string, unknown>);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }
  return false;
}

export function scoreEscalationMatch(
  expected: string,
  actual: string,
): boolean {
  return expected === actual;
}

export function scoreConfidenceInRange(
  actual: number,
  range: [number, number],
): boolean {
  return actual >= range[0] && actual <= range[1];
}

export function buildEvalResult(
  testCase: EvalCase,
  agentResponse: {
    confidence: number;
    result: unknown;
    escalation?: { type: string; target: string | null };
    errors?: string[];
  },
  duration: number,
  scoringMethod: "exact_match" | "llm_graded",
): EvalResult {
  const outputMatch = scoreExactMatch(
    agentResponse.result,
    testCase.expectedOutput,
  );
  const confidenceInRange = scoreConfidenceInRange(
    agentResponse.confidence,
    testCase.expectedConfidenceRange,
  );

  const actualEscalationType = agentResponse.escalation?.type ?? "none";
  const escalationMatch = actualEscalationType === testCase.expectedEscalation;

  const actualEscalationTarget = agentResponse.escalation?.target ?? null;
  const escalationTargetMatch =
    actualEscalationTarget === testCase.expectedEscalationTarget;

  const passed =
    outputMatch &&
    confidenceInRange &&
    escalationMatch &&
    escalationTargetMatch &&
    (agentResponse.errors ?? []).length === 0;

  return {
    caseId: testCase.id,
    agentId: testCase.agentId,
    passed,
    confidence: agentResponse.confidence,
    expectedConfidenceRange: testCase.expectedConfidenceRange,
    confidenceInRange,
    actualOutput: agentResponse.result,
    expectedOutput: testCase.expectedOutput,
    outputMatch,
    actualEscalation:
      actualEscalationType as import("./types").EvalEscalationType,
    expectedEscalation: testCase.expectedEscalation,
    escalationMatch,
    expectedEscalationTarget: testCase.expectedEscalationTarget,
    actualEscalationTarget: actualEscalationTarget,
    escalationTargetMatch,
    errors: agentResponse.errors ?? [],
    duration,
    scoringMethod,
    category: testCase.category,
  };
}

export function buildSingleAgentSummary(
  agentId: string,
  results: EvalResult[],
): SingleAgentEvalSummary {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const exactMatch = results.filter((r) => r.scoringMethod === "exact_match");
  const llmGraded = results.filter((r) => r.scoringMethod === "llm_graded");

  const exactMatchRate =
    exactMatch.length > 0
      ? exactMatch.filter((r) => r.outputMatch).length / exactMatch.length
      : 0;

  const llmGradedPassRate =
    llmGraded.length > 0
      ? llmGraded.filter((r) => r.passed).length / llmGraded.length
      : 0;

  const calibrationScore = computeCalibrationScore(results);

  const escalationFalseNegatives = results.filter(
    (r) => r.expectedEscalation !== "none" && r.actualEscalation === "none",
  ).length;

  const escalationFalsePositives = results.filter(
    (r) => r.expectedEscalation === "none" && r.actualEscalation !== "none",
  ).length;

  const categoryFailures = (cat: string) =>
    results.filter((r) => r.category === cat && !r.passed).length;

  const totalCases = ["happy_path", "edge_case", "adversarial", "ambiguous"];

  const categoryCounts: Record<string, number> = {};
  for (const c of totalCases) {
    categoryCounts[c] = results.filter((r) => r.category === c).length;
  }

  const minHappy = categoryCounts.happy_path >= 10;
  const minEdge = categoryCounts.edge_case >= 8;
  const minAdversarial = categoryCounts.adversarial >= 5;
  const minAmbiguous = categoryCounts.ambiguous >= 5;
  const minTotal = total >= 28;

  const ledgerReconciliation =
    agentId === "ledger" || agentId === "reconciliation";
  const ledgerMinHappy = categoryCounts.happy_path >= 20;
  const ledgerMinEdge = categoryCounts.edge_case >= 15;
  const ledgerMinAdv = categoryCounts.adversarial >= 10;
  const ledgerMinAmb = categoryCounts.ambiguous >= 10;
  const ledgerMinTotal = total >= 55;

  const coverageSufficient = ledgerReconciliation
    ? ledgerMinHappy &&
      ledgerMinEdge &&
      ledgerMinAdv &&
      ledgerMinAmb &&
      ledgerMinTotal
    : minHappy && minEdge && minAdversarial && minAmbiguous && minTotal;

  return {
    agentId,
    totalCases: total,
    passed,
    failed: total - passed,
    exactMatchRate,
    llmGradedPassRate,
    calibrationScore,
    escalationFalseNegatives,
    escalationFalsePositives,
    happyPathFailures: categoryFailures("happy_path"),
    edgeCaseFailures: categoryFailures("edge_case"),
    adversarialFailures: categoryFailures("adversarial"),
    ambiguousFailures: categoryFailures("ambiguous"),
    coverageSufficient,
    results,
    duration: results.reduce((sum, r) => sum + r.duration, 0),
  };
}

function computeCalibrationScore(results: EvalResult[]): number {
  const predictions = results
    .filter((r) => r.scoringMethod === "exact_match")
    .map((r) => ({
      stated: r.confidence,
      correct: r.outputMatch,
    }));

  if (predictions.length < 5) return 0.5;

  const buckets = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
  let totalError = 0;
  let bucketCount = 0;

  for (let i = 0; i < buckets.length - 1; i++) {
    const lower = buckets[i];
    const upper = buckets[i + 1];
    const inBucket = predictions.filter(
      (p) => p.stated >= lower && p.stated < upper,
    );
    if (inBucket.length < 2) continue;

    const accuracy = inBucket.filter((p) => p.correct).length / inBucket.length;
    const midPoint = (lower + upper) / 2;
    totalError += Math.abs(accuracy - midPoint);
    bucketCount++;
  }

  const calibrationError = bucketCount > 0 ? totalError / bucketCount : 0.5;
  return Math.max(0, 1 - calibrationError);
}

export function buildSuiteSummary(
  summaries: SingleAgentEvalSummary[],
  timestamp: string,
): EvalSuiteSummary {
  const totalCasesRun = summaries.reduce((s, a) => s + a.totalCases, 0);
  const totalPassed = summaries.reduce((s, a) => s + a.passed, 0);
  const totalFailed = summaries.reduce((s, a) => s + a.failed, 0);

  const totalCalibrationScore =
    summaries.reduce((s, a) => s + a.calibrationScore, 0) / summaries.length;

  const totalEscalationFalseNegatives = summaries.reduce(
    (s, a) => s + a.escalationFalseNegatives,
    0,
  );

  const blockingFailures: string[] = [];

  for (const s of summaries) {
    if (s.escalationFalseNegatives > 0) {
      blockingFailures.push(
        `${s.agentId}: ${s.escalationFalseNegatives} escalation false negative(s)`,
      );
    }
    for (const r of s.results) {
      if (
        (r.category === "happy_path" || r.category === "edge_case") &&
        r.scoringMethod === "exact_match" &&
        !r.outputMatch
      ) {
        blockingFailures.push(
          `${s.agentId} case ${r.caseId}: exact-match failure on ${r.category}`,
        );
      }
    }
  }

  const coverageSufficient = summaries.every((s) => s.coverageSufficient);

  return {
    agentSummaries: summaries,
    totalCasesRun,
    totalPassed,
    totalFailed,
    overallPassRate:
      totalCasesRun > 0
        ? Math.round((totalPassed / totalCasesRun) * 10000) / 100
        : 0,
    totalCalibrationScore,
    totalEscalationFalseNegatives,
    blockingFailures,
    suiteDuration: summaries.reduce((s, a) => s + a.duration, 0),
    coverageSufficient,
    timestamp,
  };
}

export function buildFlowStepResult(params: {
  step: number;
  agentId: string;
  action: string;
  confidence: number;
  expectedConfidenceRange: [number, number];
  outputMatch: boolean;
  handoffCheckPassed: boolean;
  errors: string[];
  duration: number;
}): FlowStepResult {
  const confidenceInRange = scoreConfidenceInRange(
    params.confidence,
    params.expectedConfidenceRange,
  );
  return {
    ...params,
    confidenceInRange,
    passed:
      params.outputMatch &&
      confidenceInRange &&
      params.handoffCheckPassed &&
      params.errors.length === 0,
  };
}

export function buildFlowResult(params: {
  flowId: string;
  description: string;
  stepResults: FlowStepResult[];
  finalStateCheckPassed: boolean;
  actualHumanTouchpoints: number;
  expectedHumanTouchpoints: number;
  escalationFalseNegatives: boolean;
  errors: string[];
  duration: number;
}): FlowEvalResult {
  const allStepsPass = params.stepResults.every((s) => s.passed);
  const allHandoffsPass = params.stepResults.every((s) => s.handoffCheckPassed);
  const humanTouchpointsMatch =
    params.actualHumanTouchpoints === params.expectedHumanTouchpoints;

  return {
    flowId: params.flowId,
    description: params.description,
    passed:
      allStepsPass &&
      allHandoffsPass &&
      params.finalStateCheckPassed &&
      humanTouchpointsMatch &&
      !params.escalationFalseNegatives,
    finalStateCheckPassed: params.finalStateCheckPassed,
    actualHumanTouchpoints: params.actualHumanTouchpoints,
    expectedHumanTouchpoints: params.expectedHumanTouchpoints,
    humanTouchpointsMatch,
    escalationFalseNegatives: params.escalationFalseNegatives,
    stepResults: params.stepResults,
    allStepsPass,
    allHandoffsPass,
    errors: params.errors,
    duration: params.duration,
  };
}
