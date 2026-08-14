// ─── Breakpoint ramp — find where the stack gives up ───────────────────────
// Linear ramp 0 → 10K VUs over 15 minutes on the hottest read path. The
// intent is NOT a pass/fail gate: it documents the breaking point (pooler
// saturation, function concurrency, latency cliff) per §25.1. Capture the
// k6 summary JSON and record the p95/p99 at each stage in BUILD_LOG.

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, authedParams, loginAndGetCookies } from "./lib/common.js";

export const options = {
  scenarios: {
    ramp_to_10k: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "2m", target: 100 },
        { duration: "3m", target: 1000 },
        { duration: "5m", target: 5000 },
        { duration: "5m", target: 10000 },
      ],
      exec: "readFlow",
      gracefulRampDown: "1m",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.10"], // informational at breakpoint
  },
};

const input = encodeURIComponent('{"0":{}}');

export function readFlow() {
  const cookies = loginAndGetCookies();
  const params = authedParams(cookies, { name: "ramp.read" });
  const res = http.get(
    `${BASE_URL}/api/trpc/notification.list?batch=1&input=${input}`,
    params,
  );
  check(res, {
    "read 200": (r) => r.status === 200,
  });
  sleep(1);
}
