import { EvalSuite } from "./harness";
import { loadAllDatasets, loadAllFlows } from "./harness";
import type { EvalConfig } from "./types";

export class EvalRunner {
  private suite: EvalSuite;

  constructor(config: EvalConfig = { mode: "suite" }) {
    this.suite = new EvalSuite(config);
  }

  async run(): Promise<{ exitCode: number; report: string }> {
    const startTime = Date.now();

    const mode = this.loadMode();
    if (mode === "flow") {
      return this.runFlows(startTime);
    }

    return this.runSuite(startTime);
  }

  private loadMode(): "single" | "suite" | "flow" {
    if (this.suite["config"].mode === "flow") return "flow";
    if (
      this.suite["config"].agentIds &&
      this.suite["config"].agentIds.length === 1
    ) {
      return "single";
    }
    return "suite";
  }

  private async runSuite(startTime: number) {
    console.log("[eval] Loading datasets...");
    const datasets = loadAllDatasets(this.suite["config"].agentIds);

    let totalCases = 0;
    for (const [, cases] of datasets) totalCases += cases.length;
    console.log(
      `[eval] Loaded ${totalCases} cases across ${datasets.size} agents`,
    );

    if (totalCases === 0) {
      return {
        exitCode: 0,
        report: "No golden datasets found. Run mode: report-only.\n",
      };
    }

    if (!this.suite["agentRunner"]) {
      console.warn(
        "[eval] No agent runner configured — running in report-only mode",
      );
      return {
        exitCode: 0,
        report: this.suite["config"].agentIds
          ? `Loaded ${totalCases} cases for agents: ${this.suite["config"].agentIds.join(", ")}\n`
          : `Loaded ${totalCases} cases across ${datasets.size} agents\n`,
      };
    }

    console.log("[eval] Running suite...");
    const summary = await this.suite.runSuite();
    const duration = Date.now() - startTime;

    const report = this.suite.report(summary);
    console.log(report);
    console.log(`\nTotal duration: ${(duration / 1000).toFixed(1)}s`);

    const reportPath = this.suite.writeReport(summary);
    console.log(`Report written to: ${reportPath}`);

    const exitCode = summary.blockingFailures.length > 0 ? 1 : 0;
    return { exitCode, report };
  }

  private async runFlows(startTime: number) {
    console.log("[eval] Loading flow definitions...");
    const flows = loadAllFlows(this.suite["config"].flowIds);
    console.log(`[eval] Loaded ${flows.length} flow definitions`);

    if (flows.length === 0) {
      return { exitCode: 0, report: "No flow definitions found.\n" };
    }

    if (!this.suite["flowRunner"]) {
      console.warn("[eval] No flow runner configured — listing flows only");
      const flowList = flows
        .map((f) => `  - ${f.flowId}: ${f.description}`)
        .join("\n");
      return { exitCode: 0, report: `Loaded flows:\n${flowList}\n` };
    }

    console.log("[eval] Running flows...");
    const flowResults = await this.suite.runFlows();
    const duration = Date.now() - startTime;

    const passed = flowResults.filter((r) => r.passed).length;
    const failed = flowResults.length - passed;

    const lines = [
      "=".repeat(60),
      "FLOW EVAL RESULTS",
      "=".repeat(60),
      "",
      `Passed: ${passed}/${flowResults.length}`,
      `Duration: ${(duration / 1000).toFixed(1)}s`,
      "",
    ];

    for (const r of flowResults) {
      const status = r.passed ? "✅" : "❌";
      lines.push(
        `${status} ${r.flowId}: allSteps=${r.allStepsPass} handoffs=${r.allHandoffsPass} finalState=${r.finalStateCheckPassed}`,
      );
      if (r.errors.length > 0) {
        lines.push(`   errors: ${r.errors.join("; ")}`);
      }
    }

    const report = lines.join("\n");
    console.log(report);

    const exitCode = failed > 0 ? 1 : 0;
    return { exitCode, report };
  }
}

export async function runEval(argv: string[] = process.argv.slice(2)) {
  const config: EvalConfig = { mode: "suite" };

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--agent":
      case "-a":
        config.agentIds = (config.agentIds ?? []).concat(argv[++i]);
        break;
      case "--flow":
      case "-f":
        config.mode = "flow";
        config.flowIds = (config.flowIds ?? []).concat(argv[++i]);
        break;
      case "--report-dir":
      case "-o":
        config.reportDir = argv[++i];
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: tsx core/eval/runner.ts [options]

Options:
  -a, --agent <id>    Run eval for specific agent(s) only (repeatable)
  -f, --flow <id>     Run specific flow(s) (repeatable, sets mode to flow)
  -o, --report-dir    Output directory for JSON reports (default: ./eval-reports)
  -h, --help          Show this help

Examples:
  tsx core/eval/runner.ts                          # Run all agent evals
  tsx core/eval/runner.ts -a ledger -a ap          # Run ledger and AP evals
  tsx core/eval/runner.ts -f supplier-invoice      # Run specific flow
`);
        return { exitCode: 0, report: "" };
    }
  }

  const runner = new EvalRunner(config);
  return runner.run();
}
