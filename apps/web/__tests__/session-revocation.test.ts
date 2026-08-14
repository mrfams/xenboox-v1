// ─── §20.958 Session revocation helper semantics ────────────────────────────
//
// JWT sessions carry a `sid` verified against the sessions table on every
// tRPC request, so deleting rows kills sessions server-side within one
// request. These tests pin the helper query shapes:
// - revokeUserSessions(userId, keepSid?) → WHERE user_id = X AND
//   session_token != keepSid (or just user_id = X when no keepSid)
// - revokeAdminSessions(adminUserId, keepSessionId?) — same pattern

import { describe, it, expect, vi, beforeEach } from "vitest";

type Conditions = unknown[];
const whereArgs: unknown[] = [];
const deleteCalls: unknown[] = [];

vi.mock("@/lib/db", () => ({
  db: {
    delete: vi.fn((target: unknown) => {
      deleteCalls.push(target);
      return {
        where: vi.fn((conditions: unknown) => {
          whereArgs.push(conditions);
          return {
            returning: vi.fn(() =>
              Promise.resolve([{ id: "sess-1" }, { id: "sess-2" }]),
            ),
          };
        }),
      };
    }),
    query: {},
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import {
  revokeUserSessions,
  revokeAdminSessions,
} from "@/lib/auth/session-revocation";
import { sessions } from "@xenboox/db/schema/auth";
import { adminSessions } from "@xenboox/db/schema/admin";

function chunkCount(expr: unknown): number {
  return (expr as { queryChunks: unknown[] }).queryChunks.length;
}

describe("revokeUserSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whereArgs.length = 0;
    deleteCalls.length = 0;
  });

  it("deletes from the sessions table", async () => {
    await revokeUserSessions("user-1");
    expect(deleteCalls[0]).toBe(sessions);
  });

  it("filters by user_id only when no keepSid is given", async () => {
    await revokeUserSessions("user-1");
    expect(whereArgs).toHaveLength(1);
    // and() with a single condition produces one wrapped chunk.
    expect(chunkCount(whereArgs[0])).toBe(1);
  });

  it("adds the keepSid exclusion when one is provided (combined and())", async () => {
    await revokeUserSessions("user-1", "sid-current");
    expect(whereArgs).toHaveLength(1);
    // Two conditions combine into StringChunk + SQL + StringChunk = 3 chunks.
    expect(chunkCount(whereArgs[0])).toBe(3);
  });

  it("returns the number of revoked rows", async () => {
    const count = await revokeUserSessions("user-1");
    expect(count).toBe(2);
  });
});

describe("revokeAdminSessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    whereArgs.length = 0;
    deleteCalls.length = 0;
  });

  it("deletes from the admin_sessions table", async () => {
    await revokeAdminSessions("admin-1");
    expect(deleteCalls[0]).toBe(adminSessions);
  });

  it("filters by admin_user_id only without keepSessionId", async () => {
    await revokeAdminSessions("admin-1");
    expect(chunkCount(whereArgs[0])).toBe(1);
  });

  it("combines with the keepSessionId exclusion when provided", async () => {
    await revokeAdminSessions("admin-1", "sess-keep");
    expect(chunkCount(whereArgs[0])).toBe(3);
  });
});
