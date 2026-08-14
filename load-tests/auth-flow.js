// ─── Auth flow — the hottest path ──────────────────────────────────────────
// CSRF fetch → credentials login → session check, at 100 then 1K concurrent
// VUs. This is where brute-force attackers and botnets land first; it also
// exercises the edge rate limiter (auth: 5/60s per IP — see §1.5).

import { sleep } from "k6";
import { BASE_URL, SLO_THRESHOLDS, loginAndGetCookies } from "./lib/common.js";

export const options = {
  scenarios: {
    soak_100: {
      executor: "constant-vus",
      vus: 100,
      duration: "2m",
      exec: "authFlow",
      tags: { scenario: "auth-100" },
    },
    soak_1k: {
      executor: "constant-vus",
      vus: 1000,
      duration: "2m",
      exec: "authFlow",
      tags: { scenario: "auth-1k" },
      // Warm the pool first: 1K cold VUs would skew p95 with connection setup.
      startVUs: 100,
    },
  },
  thresholds: SLO_THRESHOLDS,
};

export function authFlow() {
  loginAndGetCookies();
  sleep(1);
}

// Re-export BASE_URL so the module is self-describing in k6 output.
export { BASE_URL };
