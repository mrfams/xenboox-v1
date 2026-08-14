// ─── Smoke — is the stack alive? ───────────────────────────────────────────
// Health (live + ready), landing page, and a full login round-trip. Fast,
// 1 VU — the "did the deploy break everything" gate.

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, loginAndGetCookies } from "./lib/common.js";

export const options = {
  vus: 1,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  // Liveness — always 200 if the process is up.
  const live = http.get(`${BASE_URL}/api/health?check=live`, {
    tags: { name: "health.live" },
  });
  check(live, { "liveness 200": (r) => r.status === 200 });

  // Readiness — DB + Redis reachable.
  const ready = http.get(`${BASE_URL}/api/health?check=ready`, {
    tags: { name: "health.ready" },
  });
  check(ready, {
    "readiness 200": (r) => r.status === 200,
    "db pass": (r) => r.json("checks.database.status") === "pass",
    "redis pass": (r) => r.json("checks.redis.status") === "pass",
  });

  // Landing page.
  const home = http.get(`${BASE_URL}/`, { tags: { name: "landing" } });
  check(home, { "landing 200": (r) => r.status === 200 });

  // Full auth round-trip.
  const cookies = loginAndGetCookies();
  const me = http.get(`${BASE_URL}/api/auth/session`, {
    cookies,
    tags: { name: "auth.session" },
  });
  check(me, {
    "session established": (r) =>
      r.status === 200 && Boolean(r.json("user")?.email),
  });

  sleep(1);
}
