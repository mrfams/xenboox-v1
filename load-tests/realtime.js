// ─── Realtime — SSE connection budget ──────────────────────────────────────
// N concurrent EventSource connections per entity (agent-events). The SSE
// endpoint DB-polls every 3s; the load concern is open-connection pressure on
// the function + Upstash list drain, NOT request churn. Thresholds are loose
// (the point is the connections hold, not that they're fast).

import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, ENTITY_ID } from "./lib/common.js";

export const options = {
  scenarios: {
    sse_100_per_entity: {
      executor: "per-vu-iterations",
      vus: 100,
      iterations: 1,
      maxDuration: "3m",
      exec: "openSse",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"], // tolerate reconnects
  },
};

export function openSse() {
  const params = {
    headers: { Accept: "text/event-stream" },
    tags: { name: "sse.agent-events" },
  };
  if (ENTITY_ID) params.headers["x-entity-id"] = ENTITY_ID;

  const res = http.get(`${BASE_URL}/api/agent-events`, params);
  check(res, {
    "sse opened": (r) => r.status === 200,
    "sse content-type": (r) =>
      (r.headers["Content-Type"] || "").includes("text/event-stream"),
  });

  // Hold the connection open (the endpoint streams while the request is
  // active; the 3s DB poll keeps it alive) then close.
  sleep(30);
}
