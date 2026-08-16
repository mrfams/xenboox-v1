// ─── §16.2 Realtime surfaces: degraded-mode contract ───────────────────────
//
// The rule: no realtime surface may be silently stale. Every SSE hook must
// reconnect on error, and the DB must always be the backstop. These are
// contract checks on the source so a refactor that drops the reconnect path
// or reintroduces an in-memory-only broadcast fails CI.
//
// Behavioral coverage lives in the hook/route suites; this pins the §16.2
// guarantees at the source level.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

const hooks = {
  agentEvents: readFileSync(
    join(ROOT, "lib/hooks/use-realtime-agent-events.ts"),
    "utf8",
  ),
  notifications: readFileSync(
    join(ROOT, "lib/hooks/use-unread-notifications.ts"),
    "utf8",
  ),
  attention: readFileSync(
    join(ROOT, "lib/hooks/use-attention-signals.ts"),
    "utf8",
  ),
};

describe("§16.2 — every SSE hook reconnects on error (never silently stale)", () => {
  it("use-realtime-agent-events has an EventSource onerror reconnect path", () => {
    expect(hooks.agentEvents).toMatch(/onerror/);
    expect(hooks.agentEvents).toMatch(/reconnectAttempts/);
  });

  it("use-unread-notifications has reconnect AND a polling backstop", () => {
    expect(hooks.notifications).toMatch(/onerror/);
    expect(hooks.notifications).toMatch(/reconnectTimerRef/);
    expect(hooks.notifications).toMatch(/30\s*s\s*poll|30000|poll/);
  });

  it("use-attention-signals piggybacks the agent-events channel (no second source of truth)", () => {
    // The sidebar dots share the agent-run EventSource rather than opening a
    // second connection — one channel, one reconnect path.
    expect(hooks.attention).toMatch(/EventSource|agentEvents|agent-events/i);
  });
});

describe("§16.2 — Redis broadcast degrades to no-op without Redis (DB is the backstop)", () => {
  it("broadcast.ts gates on Redis env presence", () => {
    const b = readFileSync(join(ROOT, "lib/sse/broadcast.ts"), "utf8");
    expect(b).toMatch(/UPSTASH_REDIS_REST_URL/);
    expect(b).toMatch(/hasRedis\(\)/);
  });
});

describe("§16.2 — chat streaming is stateless per request", () => {
  it("/api/chat/stream builds one ReadableStream per request, no in-memory map", () => {
    const s = readFileSync(join(ROOT, "app/api/chat/stream/route.ts"), "utf8");
    expect(s).toMatch(/new ReadableStream/);
    // It must NOT depend on a module-level connection map for delivery.
    expect(s).not.toMatch(/const activeConnections = new Map/);
  });
});
