import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────
// Follows the tax-config-router test convention: mock @/lib/db and @/lib/auth,
// then drive the REAL appRouter via createCaller so zod validation, entity
// scoping, and role gating all run for real.

const { selectWhere, updateWhere, deleteWhere } = vi.hoisted(() => ({
  selectWhere: vi.fn().mockResolvedValue([{ count: 0 }]),
  updateWhere: vi.fn().mockResolvedValue(undefined),
  deleteWhere: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({ where: selectWhere }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: updateWhere }),
    }),
    delete: vi.fn().mockReturnValue({ where: deleteWhere }),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
    query: {
      organizations: { findFirst: vi.fn() },
      entities: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
      orgRoles: { findFirst: vi.fn(), findMany: vi.fn() },
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "session-1" }) },
      users: { findFirst: vi.fn() },
      notifications: { findFirst: vi.fn(), findMany: vi.fn() },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appRouter } from "@/server/routers/_app";

const entityId = "entity-1";

function makeCaller() {
  return appRouter.createCaller({
    session: {
      user: { id: "user-1", email: "test@test.com" },
      expires: "2099",
    },
    entityId,
    headers: {},
  });
}

describe("notificationsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectWhere.mockResolvedValue([{ count: 0 }]);
    updateWhere.mockResolvedValue(undefined);
    deleteWhere.mockResolvedValue(undefined);
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as never);
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: entityId,
      organizationId: "org-1",
    } as never);
    vi.mocked(db.query.orgRoles.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      userId: "user-1",
      entityId,
      role: "admin",
    } as never);
    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "org-1",
    } as never);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
      emailVerified: new Date(),
    } as never);
  });

  describe("unreadCount — the badge must reflect the REAL count", () => {
    it("returns the full unread count (regression: findFirst capped at 1)", async () => {
      selectWhere.mockResolvedValue([{ count: 7 }]);
      const result = await makeCaller().notifications.unreadCount();
      expect(result).toEqual({ count: 7 });
    });

    it("returns 0 when nothing is unread", async () => {
      selectWhere.mockResolvedValue([{ count: 0 }]);
      const result = await makeCaller().notifications.unreadCount();
      expect(result).toEqual({ count: 0 });
    });

    it("returns 0 for a single unread row (existence probe shape)", async () => {
      // The old findFirst-based implementation would have returned { count: 1 }
      // for any number of rows — a count(*) of 1 must stay 1, not collapse.
      selectWhere.mockResolvedValue([{ count: 1 }]);
      const result = await makeCaller().notifications.unreadCount();
      expect(result).toEqual({ count: 1 });
    });

    it("falls back to 0 when the DB query throws", async () => {
      selectWhere.mockRejectedValue(new Error("db down"));
      const result = await makeCaller().notifications.unreadCount();
      expect(result).toEqual({ count: 0 });
    });
  });

  describe("mutations", () => {
    it("marks a notification read through the entity-scoped update", async () => {
      const result = await makeCaller().notifications.markAsRead({ id: "n1" });
      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
      expect(updateWhere).toHaveBeenCalled();
    });

    it("marks all notifications read", async () => {
      const result = await makeCaller().notifications.markAllAsRead();
      expect(result).toEqual({ success: true });
      expect(db.update).toHaveBeenCalled();
    });

    it("deletes a notification through the entity-scoped delete", async () => {
      const result = await makeCaller().notifications.delete({ id: "n1" });
      expect(result).toEqual({ success: true });
      expect(db.delete).toHaveBeenCalled();
      expect(deleteWhere).toHaveBeenCalled();
    });
  });
});
