// ─── Shared k6 helpers ─────────────────────────────────────────────────────
// Login (CSRF → credentials), session jar, entity header, and the SLO
// thresholds every scenario imports so targets live in one file.

import http from "k6/http";
import { check } from "k6";

export const BASE_URL = __ENV.K6_BASE_URL || "http://localhost:3000";
export const USER_EMAIL = __ENV.K6_USER_EMAIL || "demo@xenboox.com";
export const USER_PASSWORD = __ENV.K6_USER_PASSWORD || "demo1234";
export const ENTITY_ID = __ENV.K6_ENTITY_ID || ""; // set for tRPC calls

// ─── SLO thresholds (§24.2) ────────────────────────────────────────────────
// Core reads p95 < 300ms; writes p99 < 1s; zero HTTP errors.
export const SLO_THRESHOLDS = {
  http_req_failed: ["rate<0.01"], // <1% error rate
  http_req_duration: ["p(95)<300"], // p95 < 300ms (reads)
};

export const WRITE_THRESHOLDS = {
  http_req_failed: ["rate<0.01"],
  http_req_duration: ["p(95)<300", "p(99)<1000"], // writes p99 < 1s
};

// ─── Auth helpers ──────────────────────────────────────────────────────────

/**
 * Auth.js v5 login: fetch the CSRF token, then POST the credentials
 * callback. Returns a cookie jar ready for authenticated requests.
 */
export function loginAndGetCookies() {
  const cookies = http.cookieJar();

  // 1. CSRF token
  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`, {
    cookies: {},
    tags: { name: "auth.csrf" },
  });
  check(csrfRes, {
    "csrf token fetched": (r) =>
      r.status === 200 && (r.json("csrfToken") || "").length > 20,
  });
  const csrfToken = csrfRes.json("csrfToken");

  // 2. Credentials callback
  const loginRes = http.post(
    `${BASE_URL}/api/auth/callback/credentials`,
    {
      csrfToken,
      email: USER_EMAIL,
      password: USER_PASSWORD,
      json: "true",
      redirect: "false",
    },
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: BASE_URL,
      },
      tags: { name: "auth.login" },
    },
  );

  check(loginRes, {
    "login accepted": (r) => r.status === 200 || r.status === 302,
    "session cookie set": () => cookies.get(`${BASE_URL}/`)?.some(
      (c) => c.name.startsWith("authjs.session-token"),
    ),
  });

  return cookies;
}

/** Common authenticated request params (entity header + session). */
export function authedParams(cookies, tags = {}) {
  const headers = { "Content-Type": "application/json" };
  if (ENTITY_ID) headers["X-Entity-Id"] = ENTITY_ID;
  return { headers, cookies, tags };
}
