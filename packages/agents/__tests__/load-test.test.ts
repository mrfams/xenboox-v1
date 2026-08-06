/**
 * Load Testing Framework — P5
 *
 * Measures agent pipeline performance under concurrent load.
 * Run with: pnpm test --filter=@xenboox/agents -- --testPathPattern=load-test
 *
 * This is a local load test (not k6) that measures:
 * - Throughput: requests/second under load
 * - Latency: p50, p95, p99 response times
 * - Error rate: percentage of failed requests
 * - Concurrency: behavior under parallel execution
 *
 * For production load testing, use the k6 scripts in packages/agents/load-tests/.
 */

import { describe, it, expect } from "vitest";

// ─── Types ────────────────────────────────────────────────────────────────

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number;
  latency: {
    min: number;
    max: number;
    mean: number;
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: number; // requests per second
  duration: number; // total duration in ms
}

interface LoadTestConfig {
  concurrency: number;
  totalRequests: number;
  warmupRequests: number;
  timeout: number; // per-request timeout in ms
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function measureLatencies(latencies: number[]): LoadTestResult["latency"] {
  const sorted = [...latencies].sort((a, b) => a - b);
  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1),
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
  };
}

// ─── Scenarios ────────────────────────────────────────────────────────────

async function runConcurrentLoad(
  task: () => Promise<{ success: boolean; latency: number }>,
  config: LoadTestConfig,
): Promise<LoadTestResult> {
  const allLatencies: number[] = [];
  let successes = 0;
  let failures = 0;

  const startTime = Date.now();

  // Warmup phase
  for (let i = 0; i < config.warmupRequests; i++) {
    try {
      await task();
    } catch {
      // Ignore warmup errors
    }
  }

  // Load phase — run requests in batches of `concurrency`
  const batches = Math.ceil(config.totalRequests / config.concurrency);

  for (let batch = 0; batch < batches; batch++) {
    const batchSize = Math.min(
      config.concurrency,
      config.totalRequests - batch * config.concurrency,
    );

    const promises = Array.from({ length: batchSize }, async () => {
      const start = Date.now();
      try {
        const result = await Promise.race([
          task(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), config.timeout),
          ),
        ]);
        const latency = Date.now() - start;
        allLatencies.push(latency);
        if (result.success) successes++;
        else failures++;
      } catch {
        const latency = Date.now() - start;
        allLatencies.push(latency);
        failures++;
      }
    });

    await Promise.all(promises);
  }

  const duration = Date.now() - startTime;
  const latency = measureLatencies(allLatencies);

  return {
    totalRequests: successes + failures,
    successfulRequests: successes,
    failedRequests: failures,
    errorRate: failures / (successes + failures || 1),
    latency,
    throughput: (successes + failures) / (duration / 1000),
    duration,
  };
}

// ─── Test Scenarios ───────────────────────────────────────────────────────

describe("Agent Pipeline Load Tests", () => {
  const defaultConfig: LoadTestConfig = {
    concurrency: 5,
    totalRequests: 50,
    warmupRequests: 5,
    timeout: 30000,
  };

  it("Scoring functions handle concurrent load", async () => {
    // Test that scoring functions are thread-safe and fast under load
    const { scoreExactMatch, scoreConfidenceInRange } = await import(
      "../core/eval/scoring"
    );

    const result = await runConcurrentLoad(async () => {
      const start = Date.now();
      scoreExactMatch({ a: 1, b: "test" }, { a: 1, b: "test" });
      scoreConfidenceInRange(0.95, [0.9, 1.0]);
      return { success: true, latency: Date.now() - start };
    }, defaultConfig);

    expect(result.errorRate).toBe(0);
    expect(result.latency.p99).toBeLessThan(100); // Should be sub-millisecond
    expect(result.throughput).toBeGreaterThan(100); // >100 ops/sec
  });

  it("Security scanning handles concurrent load", async () => {
    const { scanForSecrets, sanitizeInput } = await import(
      "../core/security-hardening"
    );

    const texts = [
      "Normal text about accounting",
      "sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456",
      "<script>alert('xss')</script>",
      "Email: john@example.com",
      "1 UNION SELECT * FROM users",
    ];

    const result = await runConcurrentLoad(
      async () => {
        const text = texts[Math.floor(Math.random() * texts.length)];
        const start = Date.now();
        scanForSecrets(text);
        sanitizeInput(text);
        return { success: true, latency: Date.now() - start };
      },
      { ...defaultConfig, concurrency: 10, totalRequests: 100 },
    );

    expect(result.errorRate).toBe(0);
    expect(result.latency.p99).toBeLessThan(50);
  });

  it("Mixed workload simulation", async () => {
    // Simulate a realistic mix of operations
    const { scoreExactMatch, buildEvalResult } = await import(
      "../core/eval/scoring"
    );
    const { scanForSecrets, detectPii } = await import(
      "../core/security-hardening"
    );

    const result = await runConcurrentLoad(
      async () => {
        const start = Date.now();
        const op = Math.random();

        if (op < 0.3) {
          // 30% — eval scoring
          scoreExactMatch({ status: "posted" }, { status: "posted" });
        } else if (op < 0.6) {
          // 30% — security scanning
          scanForSecrets("Check this text for secrets");
        } else if (op < 0.8) {
          // 20% — PII detection
          detectPii("Contact john@example.com for info");
        } else {
          // 20% — eval result building
          buildEvalResult(
            {
              id: "test",
              category: "happy_path",
              description: "Test",
              agentId: "ledger",
              taskType: "post",
              input: {},
              expectedOutput: null,
              expectedConfidenceRange: [0.9, 1.0],
              expectedEscalation: "none",
              expectedEscalationTarget: null,
              source: "synthetic",
            },
            { confidence: 0.95, result: null, errors: [] },
            10,
            "exact_match",
          );
        }

        return { success: true, latency: Date.now() - start };
      },
      { ...defaultConfig, concurrency: 10, totalRequests: 200 },
    );

    expect(result.errorRate).toBe(0);
    expect(result.latency.p95).toBeLessThan(100);

    // Report metrics
    console.log("\n── Mixed Workload Results ──");
    console.log(`  Total: ${result.totalRequests} requests`);
    console.log(`  Success: ${result.successfulRequests}`);
    console.log(`  Error rate: ${(result.errorRate * 100).toFixed(1)}%`);
    console.log(`  Throughput: ${result.throughput.toFixed(0)} req/s`);
    console.log(`  Latency p50: ${result.latency.p50.toFixed(1)}ms`);
    console.log(`  Latency p95: ${result.latency.p95.toFixed(1)}ms`);
    console.log(`  Latency p99: ${result.latency.p99.toFixed(1)}ms`);
  });
});

// ─── Threshold Assertions ─────────────────────────────────────────────────

describe("Performance Thresholds", () => {
  it("Scoring functions: < 1ms p99 latency", async () => {
    const { scoreExactMatch } = await import("../core/eval/scoring");
    const iterations = 1000;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      scoreExactMatch(
        { a: i, b: "test", nested: { c: true } },
        { a: i, b: "test", nested: { c: true } },
      );
      latencies.push(performance.now() - start);
    }

    const sorted = latencies.sort((a, b) => a - b);
    const p99 = percentile(sorted, 99);
    expect(p99).toBeLessThan(1); // Sub-millisecond p99
  });

  it("Security scanning: < 5ms per 1KB text", async () => {
    const { scanForSecrets } = await import("../core/security-hardening");
    const text =
      "a".repeat(1024) + " sk-ant-api03-abcdefghijklmnopqrstuvwxyz123456";

    const start = performance.now();
    scanForSecrets(text);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
  });
});
