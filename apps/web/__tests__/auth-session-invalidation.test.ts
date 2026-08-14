// ─── §20.958 Router wiring — password flows trigger session revocation ──────
//
// changePassword must kill every session except the actor's current one;
// resetPassword must kill all of them (token-driven, no actor session).

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth/session-revocation", () => ({
  revokeUserSessions: vi.fn().mockResolvedValue(1),
  revokeAdminSessions: vi.fn().mockResolvedValue(1),
}));

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
    query: {
      users: { findFirst: vi.fn() },
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "sess-1" }) },
      entities: {
        findFirst: vi
          .fn()
          .mockResolvedValue({ id: "entity-1", organizationId: "org-1" }),
      },
      userEntityAccess: {
        findFirst: vi.fn().mockResolvedValue({
          userId: "user-1",
          entityId: "entity-1",
          role: "member",
        }),
      },
      orgRoles: { findFirst: vi.fn().mockResolvedValue(null) },
      organizations: { findFirst: vi.fn().mockResolvedValue({ plan: "free" }) },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
    hash: vi.fn().mockResolvedValue("new-hash"),
  },
  compare: vi.fn().mockResolvedValue(true),
  hash: vi.fn().mockResolvedValue("new-hash"),
}));

vi.mock("@/lib/email", () => ({}));
vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: vi.fn() } },
  EMAIL_FROM: "test@test.com",
}));
vi.mock("@/lib/security/rate-limiter", () => ({
  getRateLimiter: vi.fn(() => ({
    checkAuthRegisterRateLimit: vi.fn().mockResolvedValue({ success: true }),
    checkAuthPasswordRateLimit: vi.fn().mockResolvedValue({ success: true }),
    checkApiRateLimit: vi.fn().mockResolvedValue({ success: true }),
  })),
}));
vi.mock("@xenboox/db/schema/permissions", () => ({
  rolePermissions: {
    id: "id",
    role: "role",
    module: "module",
    action: "action",
    scope: "scope",
  },
  rbacModuleEnum: vi.fn(() => ({ notNull: vi.fn().mockReturnThis() })),
  rbacActionEnum: vi.fn(() => ({ notNull: vi.fn().mockReturnThis() })),
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

import { appRouter } from "@/server/routers/_app";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revokeUserSessions } from "@/lib/auth/session-revocation";

const session = {
  user: { id: "user-1", email: "u@example.com", name: "U" },
  sid: "sid-current",
} as any;

const caller = appRouter.createCaller({
  session,
  entityId: "entity-1",
  headers: {},
} as any);

describe("changePassword — session invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(session);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
      passwordHash: "old-hash",
    } as any);
  });

  it("keeps the actor's current session but revokes all others", async () => {
    await caller.auth.changePassword({
      currentPassword: "OldPass123!",
      newPassword: "NewPass456!",
      confirmPassword: "NewPass456!",
    });

    expect(revokeUserSessions).toHaveBeenCalledWith("user-1", "sid-current");
  });

  it("rejects mismatched confirmation without revoking", async () => {
    await expect(
      caller.auth.changePassword({
        currentPassword: "OldPass123!",
        newPassword: "NewPass456!",
        confirmPassword: "Different456!",
      }),
    ).rejects.toThrow("do not match");
    expect(revokeUserSessions).not.toHaveBeenCalled();
  });

  it("rejects weak new passwords before touching sessions", async () => {
    await expect(
      caller.auth.changePassword({
        currentPassword: "OldPass123!",
        newPassword: "weak",
        confirmPassword: "weak",
      }),
    ).rejects.toThrow();
    expect(revokeUserSessions).not.toHaveBeenCalled();
  });
});

describe("resetPassword — session invalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
      resetPasswordToken: "token-1",
      resetPasswordExpires: new Date(Date.now() + 60000),
      failedLoginAttempts: 0,
    } as any);
  });

  it("revokes EVERY session (no keepSid) on successful reset", async () => {
    await caller.auth.resetPassword({
      token: "token-1",
      newPassword: "NewPass456!",
    });
    expect(revokeUserSessions).toHaveBeenCalledWith("user-1");
    expect(revokeUserSessions).toHaveBeenCalledTimes(1);
  });
});
