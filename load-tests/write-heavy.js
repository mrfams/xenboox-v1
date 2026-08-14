// ─── Write-heavy — journal posting (constraint-checked, money movement) ────
// Exercises the double-entry CHECK constraints, idempotency keys, RLS, and
// audit-log triggers — the most expensive write path. Thresholds: p99 < 1s.
//
// Each iteration mints a UNIQUE idempotency key + a balanced journal entry
// (debits === credits) so the DB never rejects the payload itself.

import http from "k6/http";
import { check } from "k6";
import {
  BASE_URL,
  WRITE_THRESHOLDS,
  authedParams,
  loginAndGetCookies,
} from "./lib/common.js";

export const options = {
  scenarios: {
    writes_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "3m",
      exec: "writeFlow",
    },
    writes_1k: {
      executor: "constant-vus",
      vus: 1000,
      duration: "3m",
      exec: "writeFlow",
    },
  },
  thresholds: WRITE_THRESHOLDS,
};

// k6's __VU and __ITER guarantee uniqueness per iteration.
function idempotencyKey() {
  return `load-${__VU}-${__ITER}-${Date.now()}`;
}

function balancedEntry() {
  const amount = 100 + (__ITER % 5000);
  return {
    0: {
      date: new Date().toISOString().slice(0, 10),
      description: `k6 load entry VU${__VU} iter${__ITER}`,
      lines: [
        { accountId: "cash", debit: amount, credit: 0 },
        { accountId: "revenue", debit: 0, credit: amount },
      ],
    },
  };
}

export function writeFlow() {
  const cookies = loginAndGetCookies();
  const params = authedParams(cookies, { name: "journal.post" });
  params.headers["x-idempotency-key"] = idempotencyKey();

  const res = http.post(
    `${BASE_URL}/api/trpc/journal.post?batch=1`,
    JSON.stringify({ 0: balancedEntry() }),
    params,
  );
  check(res, {
    "journal post accepted": (r) => r.status === 200,
    "journal post no error": (r) => !(r.body || "").includes("TRPC_ERROR"),
  });

  return cookies;
}
