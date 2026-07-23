---
name: agent-eval
description: Creates and runs agent evaluation tests against golden datasets for Xenboox agents. Use when evaluating agent performance, creating test scenarios, debugging agent failures, or tracking evaluation scores over time.
license: MIT
metadata:
  author: xenboox
  category: testing
---

## Prerequisites

- Read `AGENTS.md` for agent conventions
- Read the relevant agent spec in `docs/agents/`
- Understand confidence scoring and escalation thresholds

## Overview

Every agent is evaluated against a golden dataset of verified correct accounting scenarios. Tests run before every deployment. Scores are logged to LangFuse for tracking over time.

```
Golden Dataset → Agent Input → Agent Output → Compare to Expected → Score → Log
```

## Steps

### 1. Create Test Scenarios

```typescript
// packages/agents/core/eval/golden-dataset.ts

interface TestScenario {
  id: string;
  agentId: string;
  description: string;
  category: string;

  // Input
  input: {
    entityId: string; // test entity
    taskType: string;
    data: Record<string, unknown>;
  };

  // Expected output
  expected: {
    result: Record<string, unknown>;
    minConfidence: number; // minimum acceptable confidence
    shouldEscalate: boolean; // should this trigger escalation?
    expectedActions: string[]; // sequence of expected actions
  };

  // Tolerance for numerical comparisons
  tolerance: {
    amount: number; // absolute tolerance (e.g., 0.01)
    percentage: number; // percentage tolerance (e.g., 0.01 = 1%)
  };
}
```

### 2. Create the Evaluation Runner

```typescript
// packages/agents/core/eval/runner.ts

import { langfuse } from "../langfuse";

interface EvalResult {
  scenarioId: string;
  passed: boolean;
  confidence: { actual: number; expected: number; passed: boolean };
  actions: { actual: string[]; expected: string[]; passed: boolean };
  result: { actual: unknown; expected: unknown; passed: boolean };
  durationMs: number;
  errors: string[];
}

export async function runEvaluation(
  agentId: string,
  scenarios: TestScenario[],
): Promise<EvalResult[]> {
  const results: EvalResult[] = [];

  for (const scenario of scenarios) {
    const startTime = Date.now();

    // Run agent with test input
    const trace = await langfuse.trace({
      name: `eval-${agentId}`,
      metadata: {
        scenarioId: scenario.id,
        category: scenario.category,
        isEvaluation: true,
      },
    });

    try {
      const agent = getAgent(agentId);
      const output = await agent.invoke(scenario.input);

      // Compare results
      const confidenceCheck =
        output.confidence >= scenario.expected.minConfidence;
      const actionsCheck = arraysEqual(
        output.expectedActions || [],
        scenario.expected.expectedActions,
      );
      const resultCheck = compareResults(
        output.result,
        scenario.expected.result,
        scenario.tolerance,
      );

      const passed =
        confidenceCheck &&
        actionsCheck &&
        (scenario.expected.shouldEscalate ? output.escalatedTo !== null : true);

      results.push({
        scenarioId: scenario.id,
        passed,
        confidence: {
          actual: output.confidence,
          expected: scenario.expected.minConfidence,
          passed: confidenceCheck,
        },
        actions: {
          actual: output.actions || [],
          expected: scenario.expected.expectedActions,
          passed: actionsCheck,
        },
        result: {
          actual: output.result,
          expected: scenario.expected.result,
          passed: resultCheck,
        },
        durationMs: Date.now() - startTime,
        errors: [],
      });

      // Log to LangFuse
      await trace.update({
        output: {
          passed,
          confidence: output.confidence,
          actions: output.actions,
        },
        metadata: { evalResult: passed ? "pass" : "fail" },
      });
    } catch (error) {
      results.push({
        scenarioId: scenario.id,
        passed: false,
        confidence: {
          actual: 0,
          expected: scenario.expected.minConfidence,
          passed: false,
        },
        actions: {
          actual: [],
          expected: scenario.expected.expectedActions,
          passed: false,
        },
        result: {
          actual: null,
          expected: scenario.expected.result,
          passed: false,
        },
        durationMs: Date.now() - startTime,
        errors: [error.message],
      });
    }
  }

  return results;
}
```

### 3. Generate Evaluation Report

```typescript
// packages/agents/core/eval/report.ts

interface EvalReport {
  agentId: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  passRate: number;
  averageConfidence: number;
  averageDurationMs: number;
  failures: Array<{
    scenarioId: string;
    description: string;
    reason: string;
  }>;
  timestamp: string;
}

export function generateReport(
  agentId: string,
  results: EvalResult[],
): EvalReport {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;

  return {
    agentId,
    totalScenarios: results.length,
    passed,
    failed,
    passRate: passed / results.length,
    averageConfidence:
      results.reduce((sum, r) => sum + r.confidence.actual, 0) / results.length,
    averageDurationMs:
      results.reduce((sum, r) => sum + r.durationMs, 0) / results.length,
    failures: results
      .filter((r) => !r.passed)
      .map((r) => ({
        scenarioId: r.scenarioId,
        description: getScenarioDescription(r.scenarioId),
        reason:
          r.errors.length > 0
            ? r.errors[0]
            : !r.confidence.passed
              ? `Confidence ${r.confidence.actual} below threshold ${r.confidence.expected}`
              : "Output mismatch",
      })),
    timestamp: new Date().toISOString(),
  };
}
```

### 4. Run via CLI

```bash
# Run all evaluations
pnpm agents:eval

# Run evaluations for specific agent
pnpm agents:eval --agent=ledger-agent

# Run with verbose output
pnpm agents:eval --verbose

# Run specific category
pnpm agents:eval --category=journal_entry
```

### 5. Track Scores Over Time

```typescript
// packages/agents/core/eval/tracking.ts

// Store evaluation results in database
export async function trackEvalResult(report: EvalReport) {
  await db.insert(evalResults).values({
    agentId: report.agentId,
    passRate: report.passRate,
    averageConfidence: report.averageConfidence,
    averageDurationMs: report.averageDurationMs,
    totalScenarios: report.totalScenarios,
    passed: report.passed,
    failed: report.failed,
    failures: report.failures,
    timestamp: report.timestamp,
  });

  // Alert if pass rate drops below threshold
  if (report.passRate < 0.9) {
    await sendAlert({
      level: "warning",
      message: `Agent ${report.agentId} eval pass rate dropped to ${(report.passRate * 100).toFixed(1)}%`,
      details: report.failures,
    });
  }
}
```

## Evaluation Criteria by Agent

### Ledger Agent

- Double-entry always balances
- Correct account selection
- Proper entity scoping
- Audit trail logged

### AP Agent

- Correct vendor identification
- Proper expense categorization
- PO matching accuracy
- Escalation on ambiguity

### Reconciliation Agent

- Match accuracy (correct bank-to-ledger matches)
- Unmatched item flagging
- Timing difference detection
- Never closes with unresolved items

### Cash Agent

- Imprest tracking accuracy
- Balance calculations
- Discrepancy detection
- Receipt matching

### Reporting Agent

- P&L accuracy (matches GL)
- Balance sheet accuracy
- Narrative summary quality
- Correct period selection

## Common Pitfalls

1. **Not testing edge cases** — Include: empty data, zero amounts, negative amounts, multi-currency.
2. **Hardcoded test entity** — Use a dedicated test entity, never production data.
3. **Ignoring confidence scores** — Low confidence in tests means the agent needs work.
4. **Not running before deploy** — Every deployment must pass eval first.
5. **Missing regression tests** — When a bug is found, add a test for it.
6. **Overly strict tolerances** — Financial amounts need small tolerances (0.01) but not zero.
7. **Forgetting to log to LangFuse** — Evaluation results must be tracked over time.

## Verification

1. `pnpm agents:eval` — all tests pass
2. `pnpm agents:eval --verbose` — see individual test results
3. Check LangFuse dashboard for eval traces
4. Compare pass rate to previous run — should not decrease
5. All scenarios with `shouldEscalate: true` actually escalate
