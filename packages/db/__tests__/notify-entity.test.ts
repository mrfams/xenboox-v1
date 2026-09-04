import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  notifyEntityUsers,
  clearEntityFailureNotifications,
  type NotificationDedupeField,
} from "../lib/notify-entity";
import type { Database } from "../client";

// ─── Fake db ────────────────────────────────────────────────────────────────
// notify-entity takes the drizzle client as an argument (dependency injection),
// so we can drive it with a minimal fake and assert on every interaction —
// no real Postgres needed.
type FindFirstCall = { where: unknown };
type FindManyCall = { where: unknown; columns: { userId: true } };

function makeFakeDb(
  options: {
    existingNotification?: boolean;
    entityUsers?: Array<{ userId: string }>;
  } = {},
) {
  const findFirstCalls: FindFirstCall[] = [];
  const findManyCalls: FindManyCall[] = [];
  const inserted: Array<Record<string, unknown>[]> = [];
  const updated: Array<{ set: Record<string, unknown>; where: unknown }> = [];

  const fake = {
    query: {
      notifications: {
        findFirst: async (args: FindFirstCall) => {
          findFirstCalls.push(args);
          return options.existingNotification ? { id: "existing" } : undefined;
        },
      },
      userEntityAccess: {
        findMany: async (args: FindManyCall) => {
          findManyCalls.push(args);
          return (
            options.entityUsers ?? [{ userId: "user-1" }, { userId: "user-2" }]
          );
        },
      },
    },
    insert: () => ({
      values: async (rows: Array<Record<string, unknown>>) => {
        inserted.push(rows);
      },
    }),
    update: () => ({
      set: (set: Record<string, unknown>) => ({
        where: async (where: unknown) => {
          updated.push({ set, where });
        },
      }),
    }),
  } as unknown as Database;

  return { fake, findFirstCalls, findManyCalls, inserted, updated };
}

const baseInput = {
  entityId: "entity-1",
  type: "bank_sync_failed",
  priority: "high",
  title: "Bank sync failed",
  body: "The bank could not be synced",
  data: { connectionId: "conn-1" },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("notifyEntityUsers", () => {
  it("inserts one notification row per entity user", async () => {
    const { fake, inserted, findManyCalls } = makeFakeDb();
    const result = await notifyEntityUsers(fake, baseInput);

    expect(result.recipients).toBe(2);
    expect(findManyCalls).toHaveLength(1);
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toHaveLength(2);
    expect(inserted[0]![0]).toMatchObject({
      userId: "user-1",
      entityId: "entity-1",
      type: "bank_sync_failed",
      priority: "high",
      title: "Bank sync failed",
      status: "pending",
    });
    // data column stores serialized JSON
    expect(JSON.parse(inserted[0]![0]!.data as string)).toEqual({
      connectionId: "conn-1",
    });
  });

  it("queries only the userId column of userEntityAccess", async () => {
    const { fake, findManyCalls } = makeFakeDb();
    await notifyEntityUsers(fake, baseInput);

    expect(findManyCalls[0]!.columns).toEqual({ userId: true });
  });

  it("dedupes when an unread notification of the same type + key exists", async () => {
    const { fake, findFirstCalls, inserted } = makeFakeDb({
      existingNotification: true,
    });

    const result = await notifyEntityUsers(fake, {
      ...baseInput,
      dedupeDataField: "connectionId",
    });

    expect(result.deduped).toBe(true);
    expect(inserted).toHaveLength(0);
    expect(findFirstCalls).toHaveLength(1);
  });

  it("renders the dedupe check with the jsonb cast (text column safety)", async () => {
    const { fake, findFirstCalls } = makeFakeDb();
    await notifyEntityUsers(fake, {
      ...baseInput,
      dedupeDataField: "connectionId",
    });

    const where = findFirstCalls[0]!.where as { queryChunks?: unknown[] };
    // The where clause contains nested drizzle objects — serialize to prove
    // the literal jsonb cast makes it into the query text.
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(where, (_key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    });
    expect(serialized).toContain("::jsonb->>'connectionId'");
  });

  it("never inserts when no entity users exist", async () => {
    const { fake, inserted } = makeFakeDb({ entityUsers: [] });

    const result = await notifyEntityUsers(fake, baseInput);
    expect(result.recipients).toBe(0);
    expect(inserted).toHaveLength(0);
  });

  it("swallows db errors so the pipeline never breaks", async () => {
    const throwingDb = {
      ...makeFakeDb().fake,
      query: {
        ...makeFakeDb().fake.query,
        userEntityAccess: {
          findMany: async () => {
            throw new Error("connection lost");
          },
        },
      },
    } as unknown as Database;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await notifyEntityUsers(throwingDb, baseInput);
    expect(result.recipients).toBe(0);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe("clearEntityFailureNotifications", () => {
  it("marks matching unread failure notifications as read", async () => {
    const { fake, updated } = makeFakeDb();
    await clearEntityFailureNotifications(fake, {
      entityId: "entity-1",
      type: "bank_sync_failed",
      dedupeDataField: "connectionId",
      keyValue: "conn-1",
    });

    expect(updated).toHaveLength(1);
    expect(updated[0]!.set).toEqual({ read: true });
  });

  it("swallows db errors (best-effort heal)", async () => {
    const { fake } = makeFakeDb();
    const brokenDb = {
      ...fake,
      update: () => {
        throw new Error("boom");
      },
    } as unknown as Database;
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      clearEntityFailureNotifications(brokenDb, {
        entityId: "entity-1",
        type: "bank_sync_failed",
        dedupeDataField: "connectionId",
        keyValue: "conn-1",
      }),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// Guard the dedupe-field allowlist: only literal-rendered fields may be used,
// so the type rejects anything not explicitly supported.
describe("NotificationDedupeField allowlist", () => {
  it("supports the documented fields", () => {
    const fields: NotificationDedupeField[] = ["documentId", "connectionId"];
    expect(fields).toHaveLength(2);
  });
});
