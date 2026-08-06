/**
 * k6 Load Test — Agent Pipeline
 *
 * Production load test for agent pipelines using k6.
 * Run with: k6 run packages/agents/load-tests/agent-pipeline.js
 *
 * Scenarios:
 * - Steady load: 10 VUs for 60s
 * - Ramp up: 0→20 VUs over 30s, hold 20 VUs for 60s, ramp down
 * - Spike: 0→50 VUs in 5s, hold 30s, ramp down
 *
 * Thresholds:
 * - p(95) < 5000ms (95% of requests under 5s)
 * - p(99) < 10000ms (99% of requests under 10s)
 * - error rate < 5%
 */

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend, Counter } from "k6/metrics";

// ─── Custom Metrics ───────────────────────────────────────────────────────

const errorRate = new Rate("errors");
const pipelineLatency = new Trend("pipeline_latency", true);
const requestsTotal = new Counter("requests_total");

// ─── Configuration ────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const AUTH_TOKEN = __ENV.AUTH_TOKEN || "";

export const options = {
  scenarios: {
    // Scenario 1: Steady load
    steady: {
      executor: "constant-vus",
      vus: 10,
      duration: "60s",
      startTime: "0s",
    },
    // Scenario 2: Ramp up
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "60s", target: 20 },
        { duration: "30s", target: 0 },
      ],
      startTime: "70s",
    },
    // Scenario 3: Spike test
    spike: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "5s", target: 50 },
        { duration: "30s", target: 50 },
        { duration: "10s", target: 0 },
      ],
      startTime: "190s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<5000", "p(99)<10000"],
    errors: ["rate<0.05"],
    pipeline_latency: ["p(95)<5000", "p(99)<10000"],
  },
};

// ─── Test Data ────────────────────────────────────────────────────────────

const TEST_MESSAGES = [
  "What is the current cash balance?",
  "Show me the outstanding invoices for this month",
  "Generate a profit and loss statement for Q1",
  "How much do we owe to suppliers?",
  "What is the accounts receivable aging?",
  "Reconcile the bank statement for July",
  "Calculate payroll for the engineering team",
  "What are the top 5 expenses this month?",
];

const ENTITY_ID = "00000000-0000-0000-0000-000000000001";

// ─── Setup ────────────────────────────────────────────────────────────────

export function setup() {
  console.log(`\n🚀 Starting load test against ${BASE_URL}`);
  console.log(`   VUs: steady=10, ramp=0→20, spike=0→50`);
  console.log(`   Duration: ~220s total\n`);

  return { startTime: Date.now() };
}

// ─── Main Test ────────────────────────────────────────────────────────────

export default function () {
  const message = TEST_MESSAGES[Math.floor(Math.random() * TEST_MESSAGES.length)];

  const headers = {
    "Content-Type": "application/json",
  };

  if (AUTH_TOKEN) {
    headers["Authorization"] = `Bearer ${AUTH_TOKEN}`;
  }

  // Test 1: Chat endpoint (simulated)
  const chatPayload = JSON.stringify({
    message,
    entityId: ENTITY_ID,
  });

  const chatStart = Date.now();
  const chatRes = http.post(`${BASE_URL}/api/chat`, chatPayload, {
    headers,
    timeout: "30s",
  });
  const chatDuration = Date.now() - chatStart;

  pipelineLatency.add(chatDuration);
  requestsTotal.add(1);

  const chatSuccess = check(chatRes, {
    "chat: status is 200": (r) => r.status === 200,
    "chat: response time < 5s": (r) => r.timings.duration < 5000,
    "chat: has response body": (r) => r.body && r.body.length > 0,
  });

  errorRate.add(!chatSuccess);

  sleep(Math.random() * 2 + 1); // 1-3s think time

  // Test 2: Agent status endpoint
  const statusRes = http.get(`${BASE_URL}/api/trpc/agent.list`, {
    headers,
    timeout: "10s",
  });

  requestsTotal.add(1);

  const statusSuccess = check(statusRes, {
    "status: returns 200 or 401": (r) => r.status === 200 || r.status === 401,
    "status: response time < 2s": (r) => r.timings.duration < 2000,
  });

  errorRate.add(!statusSuccess);

  sleep(Math.random() * 1 + 0.5); // 0.5-1.5s think time
}

// ─── Teardown ─────────────────────────────────────────────────────────────

export function teardown(data) {
  const duration = ((Date.now() - data.startTime) / 1000).toFixed(1);
  console.log(`\n✅ Load test completed in ${duration}s`);
}
