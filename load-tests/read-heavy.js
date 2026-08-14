// ─── Read-heavy — authenticated tRPC reads ─────────────────────────────────
// The core dashboard surfaces: notifications, chart of accounts, recent
// journal entries. Thresholds enforce p95 < 300ms (SLO §24.2).
//
// NOTE: the tRPC batch URL shape follows the httpBatchLink convention:
//   /api/trpc/<router>.<procedure>?batch=1&input=%7B%220%22%3A%7B%7D%7D
// Adjust the router/procedure + input encoding to match the staging deploy.

import http from "k6/http";
import { check } from "k6";
import {
  BASE_URL,
  SLO_THRESHOLDS,
  authedParams,
  loginAndGetCookies,
} from "./lib/common.js";

export const options = {
  scenarios: {
    reads_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "3m",
      exec: "readFlow",
    },
    reads_1k: {
      executor: "constant-vus",
      vus: 1000,
      duration: "3m",
      exec: "readFlow",
    },
  },
  thresholds: SLO_THRESHOLDS,
};

const input = encodeURIComponent('{"0":{}}');

function trpcGet(cookies, path, name) {
  const res = http.get(
    `${BASE_URL}/api/trpc/${path}?batch=1&input=${input}`,
    authedParams(cookies, { name }),
  );
  check(res, {
    [`${name} 200`]: (r) => r.status === 200,
    [`${name} no trpc error`]: (r) => !(r.body || "").includes("TRPC_ERROR"),
  });
  return res;
}

export function readFlow() {
  const cookies = loginAndGetCookies();

  // Core reads — swap paths to the real routers on the staging build.
  trpcGet(cookies, "notification.list", "read.notifications");
  trpcGet(cookies, "coa.list", "read.coa");
  trpcGet(cookies, "journal.listEntries", "read.journal");

  // Every iteration reuses the session jar (no re-login per request) —
  // the auth-flow scenario covers login churn separately.
  return cookies;
}
