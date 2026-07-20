import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import type {
  EvalCase,
  EvalResult,
  SingleAgentEvalSummary,
  EvalSuiteSummary,
  EvalConfig,
  FlowStepResult,
  FlowEvalResult,
} from "./types";
import {
  buildEvalResult,
  buildSingleAgentSummary,
  buildSuiteSummary,
  buildFlowStepResult,
  buildFlowResult,
} from "./scoring";

export { EvalRunner } from "./runner";

const AGENTS_PKG_DIR = process.cwd();
const DATASETS_DIR = join(AGENTS_PKG_DIR, "datasets");
const FLOWS_DIR = join(AGENTS_PKG_DIR, "flows");

export function loadGoldenDataset(agentId: string): EvalCase[] {
  const filePath = join(DATASETS_DIR, `${agentId}-golden.yaml`);
  if (!existsSync(filePath)) {
    console.warn(
      `[eval] No golden dataset found for ${agentId} at ${filePath}`,
    );
    return [];
  }
  const raw = readFileSync(filePath, "utf-8");
  const parsed = parseYaml(raw);
  const cases: EvalCase[] = (parsed.cases ?? []).filter(
    (c: EvalCase) => !c.deprecated,
  );
  return cases.map((c: EvalCase) => ({
    ...c,
    agentId,
  }));
}

export function loadAllDatasets(agentIds?: string[]): Map<string, EvalCase[]> {
  const datasets = new Map<string, EvalCase[]>();

  if (agentIds) {
    for (const id of agentIds) {
      const cases = loadGoldenDataset(id);
      if (cases.length > 0) datasets.set(id, cases);
    }
    return datasets;
  }

  if (!existsSync(DATASETS_DIR)) return datasets;

  const files = readdirSync(DATASETS_DIR).filter((f) =>
    f.endsWith("-golden.yaml"),
  );
  for (const file of files) {
    const agentId = file.replace("-golden.yaml", "");
    const cases = loadGoldenDataset(agentId);
    if (cases.length > 0) datasets.set(agentId, cases);
  }

  return datasets;
}

export interface LoadedFlow {
  flowId: string;
  description: string;
  version: number;
  steps: Array<{
    step: number;
    agentId: string;
    action: string;
    input: Record<string, unknown>;
    expectedOutput: unknown;
    expectedConfidenceRange: [number, number];
    handoffCheck: string;
  }>;
  finalStateCheck: Record<string, unknown>;
  expectedHumanTouchpoints: number;
}

export function loadFlow(flowId: string): LoadedFlow | null {
  const filePath = join(FLOWS_DIR, `${flowId}.yaml`);
  if (!existsSync(filePath)) {
    console.warn(`[eval] No flow definition found for ${flowId}`);
    return null;
  }
  const raw = readFileSync(filePath, "utf-8");
  return parseYaml(raw) as LoadedFlow;
}

export function loadAllFlows(flowIds?: string[]): LoadedFlow[] {
  if (flowIds) {
    return flowIds.map((id) => loadFlow(id)).filter(Boolean) as LoadedFlow[];
  }
  if (!existsSync(FLOWS_DIR)) return [];

  const files = readdirSync(FLOWS_DIR).filter((f) => f.endsWith("-flow.yaml"));
  return files
    .map((f) => loadFlow(f.replace("-flow.yaml", "")))
    .filter(Boolean) as LoadedFlow[];
}

export interface RunnerAgent {
  invoke(params: {
    taskType: string;
    entityId: string;
    entityName: string;
    currency: string;
    input: Record<string, unknown>;
  }): Promise<{
    confidence: number;
    result: unknown;
    errors: string[];
    escalation?: { type: string; target: string | null };
  }>;
}

export class EvalSuite {
  private agentRunner: RunnerAgent | null = null;
  private flowRunner: RunnerAgent | null = null;

  constructor(private config: EvalConfig = { mode: "suite" }) {}

  setAgentRunner(runner: RunnerAgent): void {
    this.agentRunner = runner;
  }

  setFlowRunner(runner: RunnerAgent): void {
    this.flowRunner = runner;
  }

  async runSingleAgent(
    agentId: string,
    cases: EvalCase[],
  ): Promise<SingleAgentEvalSummary> {
    if (!this.agentRunner) {
      throw new Error(
        "Agent runner not set. Call setAgentRunner() before running.",
      );
    }

    const results: EvalResult[] = [];

    for (const testCase of cases) {
      const startTime = Date.now();

      try {
        const response = await this.agentRunner.invoke({
          taskType: testCase.taskType,
          entityId: "00000000-0000-0000-0000-000000000001",
          entityName: "Test Entity",
          currency: "GHS",
          input: testCase.input,
        });

        const duration = Date.now() - startTime;

        const isDeterministic =
          testCase.category === "happy_path" ||
          (testCase.category === "adversarial" &&
            testCase.expectedOutput !== null &&
            typeof testCase.expectedOutput !== "string");

        const result = buildEvalResult(
          testCase,
          {
            confidence: response.confidence,
            result: response.result,
            escalation: response.escalation,
            errors: response.errors,
          },
          duration,
          isDeterministic ? "exact_match" : "llm_graded",
        );

        results.push(result);
      } catch (error) {
        const duration = Date.now() - startTime;
        results.push({
          caseId: testCase.id,
          agentId,
          passed: false,
          confidence: 0,
          expectedConfidenceRange: testCase.expectedConfidenceRange,
          confidenceInRange: false,
          actualOutput: null,
          expectedOutput: testCase.expectedOutput,
          outputMatch: false,
          actualEscalation: "block",
          expectedEscalation: testCase.expectedEscalation,
          escalationMatch: false,
          expectedEscalationTarget: testCase.expectedEscalationTarget,
          actualEscalationTarget: "orchestrator",
          escalationTargetMatch: false,
          errors: [(error as Error).message],
          duration,
          scoringMethod: "exact_match",
          category: testCase.category,
        });
      }
    }

    return buildSingleAgentSummary(agentId, results);
  }

  async runSuite(): Promise<EvalSuiteSummary> {
    const datasets = loadAllDatasets(this.config.agentIds);
    const summaries: SingleAgentEvalSummary[] = [];

    for (const [agentId, cases] of datasets) {
      console.log(`[eval] Running ${cases.length} cases for ${agentId}...`);
      const summary = await this.runSingleAgent(agentId, cases);
      summaries.push(summary);
      console.log(
        `[eval] ${agentId}: ${summary.passed}/${summary.totalCases} passed (calibration: ${summary.calibrationScore.toFixed(3)})`,
      );
    }

    return buildSuiteSummary(summaries, new Date().toISOString());
  }

  async runFlow(flow: LoadedFlow): Promise<FlowEvalResult> {
    if (!this.flowRunner) {
      throw new Error(
        "Flow runner not set. Call setFlowRunner() before running.",
      );
    }

    const stepResults: FlowStepResult[] = [];

    for (const step of flow.steps) {
      const startTime = Date.now();

      try {
        const response = await this.flowRunner.invoke({
          taskType: step.action,
          entityId: "00000000-0000-0000-0000-000000000001",
          entityName: "Test Entity",
          currency: "GHS",
          input: step.input,
        });

        const duration = Date.now() - startTime;

        const outputJson = JSON.stringify(response.result);
        const expectedJson = JSON.stringify(step.expectedOutput);
        const outputMatch = outputJson === expectedJson;

        const stepResult = buildFlowStepResult({
          step: step.step,
          agentId: step.agentId,
          action: step.action,
          confidence: response.confidence,
          expectedConfidenceRange: step.expectedConfidenceRange,
          outputMatch,
          handoffCheckPassed: true,
          errors: response.errors,
          duration,
        });

        stepResults.push(stepResult);
      } catch (error) {
        stepResults.push({
          step: step.step,
          agentId: step.agentId,
          action: step.action,
          passed: false,
          confidence: 0,
          expectedConfidenceRange: step.expectedConfidenceRange,
          confidenceInRange: false,
          outputMatch: false,
          handoffCheckPassed: false,
          errors: [(error as Error).message],
          duration: Date.now() - startTime,
        });
      }
    }

    const allPassed = stepResults.every((s) => s.passed);
    const hasEscalationFN = stepResults.some(
      (s) => s.errors.length > 0 && !s.passed,
    );

    return buildFlowResult({
      flowId: flow.flowId,
      description: flow.description,
      stepResults,
      finalStateCheckPassed: allPassed,
      actualHumanTouchpoints: 0,
      expectedHumanTouchpoints: flow.expectedHumanTouchpoints,
      escalationFalseNegatives: hasEscalationFN,
      errors: stepResults.flatMap((s) => s.errors),
      duration: stepResults.reduce((s, r) => s + r.duration, 0),
    });
  }

  async runFlows(): Promise<FlowEvalResult[]> {
    const flows = loadAllFlows(this.config.flowIds);
    return Promise.all(flows.map((flow) => this.runFlow(flow)));
  }

  report(summary: EvalSuiteSummary): string {
    const lines: string[] = [
      "=".repeat(60),
      `EVAL SUITE REPORT — ${summary.timestamp}`,
      "=".repeat(60),
      "",
      `Overall: ${summary.totalPassed}/${summary.totalCasesRun} passed (${summary.overallPassRate}%)`,
      `Calibration: ${summary.totalCalibrationScore.toFixed(3)}`,
      `Escalation False Negatives: ${summary.totalEscalationFalseNegatives}`,
      `Coverage Sufficient: ${summary.coverageSufficient}`,
      `Blocking Failures: ${summary.blockingFailures.length}`,
      "",
    ];

    if (summary.blockingFailures.length > 0) {
      lines.push("BLOCKING FAILURES:");
      for (const bf of summary.blockingFailures) {
        lines.push(`  ❌ ${bf}`);
      }
      lines.push("");
    }

    for (const s of summary.agentSummaries) {
      const status = s.passed === s.totalCases ? "✅" : "⚠️";
      lines.push(
        `${status} ${s.agentId}: ${s.passed}/${s.totalCases} passed | ` +
          `exact-match: ${(s.exactMatchRate * 100).toFixed(0)}% | ` +
          `calibration: ${s.calibrationScore.toFixed(3)} | ` +
          `FN: ${s.escalationFalseNegatives} FP: ${s.escalationFalsePositives} | ` +
          `coverage: ${s.coverageSufficient}`,
      );
    }

    lines.push("");
    lines.push("=".repeat(60));

    return lines.join("\n");
  }

  writeReport(summary: EvalSuiteSummary, dir?: string): string {
    const outputDir = dir ?? this.config.reportDir ?? "./eval-reports";
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    const filePath = join(outputDir, `eval-report-${Date.now()}.json`);
    writeFileSync(filePath, JSON.stringify(summary, null, 2), "utf-8");
    return filePath;
  }
}
