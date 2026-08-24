// @vitest-environment node
//
// ─── §20.2 / §16.1 agent-events route hardening ─────────────────────────────
//
// Locks in the three security guarantees added to /api/agent-events:
//
//   1. ENTITY ACCESS (IDOR fix): GET now verifies org-level (owner/admin) or
//      entity-level access via resolveEntityAccess BEFORE opening the stream.
//      Previously any authenticated user could read another tenant's runs and
//      notifications by passing a guessed entity UUID.
//
//   2. ADMIN GATE (POST): the old check read `session.user.role`, which the
//      customer session never carries — admin broadcast silently 403'd for
//      everyone. Now it uses the separate admin control-plane auth
//      (admin_users / admin_sessions), with a DB-backed session re-check.
//
//   3. CONNECTION BUDGET (§16.1): a user+entity pair may hold at most
//      MAX_CONNECTIONS_PER_USER_ENTITY open streams. Exceeding it rejects the
//      stream instead of leaking an unbounded connection.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  authResult: { user: { id: "user-1", name: "Test User" } } as {
    user: { id: string; name: string };
  } | null,
  accessResult: null as { entityId: string; role: string } | null,
  adminAuthResult: null as {
    admin: { id: string; role?: string };
    adminSid?: string;
  } | null,
  adminUserRow: { id: "admin-1", isActive: true } as {
    id: string;
    isActive: boolean;
  },
  adminSessionRow: { id: "sess-1", lastActiveAt: new Date() } as {
    id: string;
    lastActiveAt: Date;
  } | null,
  publishCalls: [] as { entityId: string; event: unknown }[],
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => mocks.authResult),
}));

vi.mock("@/lib/auth/entity-access", () => ({
  resolveEntityAccess: vi.fn(async (_userId: string, _entityId: string) => {
    return mocks.accessResult;
  }),
}));

// The route lazily imports adminAuth for POST. Mock it so next-auth never
// loads in the node test env (same reason the tRPC server lazy-imports it).
vi.mock("@/lib/auth/admin", () => ({
  adminAuth: vi.fn(async () => mocks.adminAuthResult),
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      adminUsers: {
        findFirst: vi.fn(async () => mocks.adminUserRow),
      },
      adminSessions: {
        findFirst: vi.fn(async () => mocks.adminSessionRow),
      },
    },
  },
}));

vi.mock("@/lib/sse/broadcast", () => ({
  publishSseEvent: vi.fn(async (entityId: string, event: unknown) => {
    mocks.publishCalls.push({ entityId, event });
  }),
  drainSseEvents: vi.fn(async () => []),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn() },
}));

import { GET, POST } from "@/app/api/agent-events/route";

function makeReq(
  url = "http://localhost/api/agent-events?entityId=entity-1",
  signal?: AbortSignal,
) {
  return new NextRequest(url, { signal });
}

/** Opens a probe stream (with signal) and returns { response, abort }. */
async function openProbe(
  url?: string,
): Promise<{ res: Response; abort: () => void }> {
  const ac = new AbortController();
  const res = await GET(makeReq(url, ac.signal));
  return { res, abort: () => ac.abort() };
}

/**
 * Opens a stream and reads the first frame but KEEPS the connection open
 * (no abort) so the connection slot stays held — used to exhaust the §16.1
 * budget deliberately.
 */
async function holdStreamOpen(ac: AbortController): Promise<string> {
  const res = await GET(
    new NextRequest("http://localhost/api/agent-events?entityId=entity-1", {
      signal: ac.signal,
    }),
  );
  expect(res.status).toBe(200);
  const reader = res.body!.getReader();
  const { value } = await reader.read();
  return new TextDecoder().decode(value);
}

describe("§20.2 /api/agent-events entity scoping (IDOR fix)", () => {
  beforeEach(() => {
    mocks.authResult = { user: { id: "user-1", name: "Test User" } };
    mocks.accessResult = { entityId: "entity-1", role: "owner" };
    mocks.publishCalls = [];
  });

  it("returns 401 when unauthenticated", async () => {
    mocks.authResult = null;
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when the user has no access to the requested entity", async () => {
    mocks.accessResult = null;
    const res = await GET(
      makeReq("http://localhost/api/agent-events?entityId=other-entity"),
    );
    expect(res.status).toBe(403);
  });

  it("opens an SSE stream when access is verified", async () => {
    const { res, abort } = await openProbe();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain('"connected"');
    await reader.cancel();
    abort();
  });

  it("scopes the stream to the VERIFIED entity, not the requested one", async () => {
    // User asks for entity-B but only has access to entity-A → the resolved
    // entity is what the stream serves (fail-closed on verified access).
    mocks.accessResult = { entityId: "entity-a", role: "member" };
    const { res, abort } = await openProbe(
      "http://localhost/api/agent-events?entityId=entity-b",
    );
    expect(res.status).toBe(200);
    const reader = res.body!.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain('"connected"');
    await reader.cancel();
    abort();
  });
});

describe("§16.1 connection budget", () => {
  beforeEach(() => {
    mocks.authResult = { user: { id: "user-1", name: "Test User" } };
    mocks.accessResult = { entityId: "entity-1", role: "owner" };
  });

  it("rejects a stream once the user+entity budget is exhausted", async () => {
    // Hold 8 open streams (MAX_CONNECTIONS_PER_USER_ENTITY) for user-1 +
    // entity-1, then the 9th GET must fail to open.
    const controllers: AbortController[] = [];
    for (let i = 0; i < 8; i++) {
      const ac = new AbortController();
      controllers.push(ac);
      const frame = await holdStreamOpen(ac);
      expect(frame).toContain('"connected"');
    }

    // 9th stream: the budget is exhausted — a real 429 + Retry-After is
    // returned BEFORE any stream is created, so the client can back off.
    const ninth = new NextRequest(
      "http://localhost/api/agent-events?entityId=entity-1",
    );
    const res = await GET(ninth);
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("10");

    // A slot freed by a client disconnect lets a new stream open (and a
    // reconnect after abort must never be stuck behind the budget).
    controllers.forEach((ac) => ac.abort());
    await new Promise((r) => setTimeout(r, 10));
    const { res: again, abort: againAbort } = await openProbe();
    expect(again.status).toBe(200);
    const reader = again.body!.getReader();
    const { value } = await reader.read();
    expect(new TextDecoder().decode(value)).toContain('"connected"');
    await reader.cancel();
    againAbort();
  });
});

describe("POST admin gate", () => {
  beforeEach(() => {
    mocks.adminAuthResult = null;
    mocks.adminUserRow = { id: "admin-1", isActive: true };
    mocks.adminSessionRow = { id: "sess-1", lastActiveAt: new Date() };
    mocks.publishCalls = [];
  });

  it("returns 401 when not signed in as an admin", async () => {
    mocks.adminAuthResult = null;
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 401 when the admin JWT lacks a session id", async () => {
    mocks.adminAuthResult = { admin: { id: "admin-1" }, adminSid: undefined };
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 403 when the DB session row is missing (revoked)", async () => {
    mocks.adminAuthResult = {
      admin: { id: "admin-1", role: "super_admin" },
      adminSid: "sess-ghost",
    };
    mocks.adminSessionRow = null;
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it("returns 403 when the admin user is deactivated", async () => {
    mocks.adminAuthResult = {
      admin: { id: "admin-1", role: "super_admin" },
      adminSid: "sess-1",
    };
    mocks.adminUserRow = { id: "admin-1", isActive: false };
    const res = await POST(makeReq());
    expect(res.status).toBe(403);
  });

  it("broadcasts when the admin session is valid", async () => {
    mocks.adminAuthResult = {
      admin: { id: "admin-1", role: "super_admin" },
      adminSid: "sess-1",
    };
    const res = await POST(
      new NextRequest("http://localhost/api/agent-events", {
        method: "POST",
        body: JSON.stringify({
          entityId: "entity-1",
          event: {
            type: "run_started",
            runId: "r1",
            agentName: "cfo",
            timestamp: new Date().toISOString(),
          },
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(mocks.publishCalls.length).toBe(1);
    expect(mocks.publishCalls[0].entityId).toBe("entity-1");
  });

  it("rejects invalid event types", async () => {
    mocks.adminAuthResult = {
      admin: { id: "admin-1", role: "super_admin" },
      adminSid: "sess-1",
    };
    const res = await POST(
      new NextRequest("http://localhost/api/agent-events", {
        method: "POST",
        body: JSON.stringify({
          entityId: "entity-1",
          event: { type: "not_a_real_event" },
        }),
      }),
    );
    expect(res.status).toBe(400);
  });
});
