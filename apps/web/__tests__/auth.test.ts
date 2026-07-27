import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "@/server/routers/_app";
import { db } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    query: {
      users: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
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
  })),
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

const caller = appRouter.createCaller({ session: null, headers: {} });

describe("Auth Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("register", () => {
    const validInput = {
      name: "Test User",
      email: "test@example.com",
      password: "Pass123!",
    };

    it("should reject duplicate email", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "existing-user",
        email: "test@example.com",
      } as any);

      await expect(caller.auth.register(validInput)).rejects.toThrow(
        "already exists",
      );
    });

    it("should create user with identity-first flow (no org/entity on signup)", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined as any);

      const mockUser = {
        id: "user-1",
        name: "Test User",
        email: "test@example.com",
      };

      vi.mocked(db.insert).mockImplementation(() => {
        const chain: any = {
          values: vi.fn().mockReturnThis(),
          returning: vi.fn().mockResolvedValue([mockUser]),
        };
        return chain;
      });

      const result = await caller.auth.register(validInput);

      expect(result).toHaveProperty("userId", "user-1");
      // Identity-first: entityId is null after signup (org is created separately)
      expect(result).toHaveProperty("entityId", null);
      expect(result).toHaveProperty("email", "test@example.com");
      // Should NOT create org during registration
      expect(db.insert).toHaveBeenCalledTimes(2); // users + verification_tokens only
    });

    it("should reject short name", async () => {
      await expect(
        caller.auth.register({ ...validInput, name: "A" }),
      ).rejects.toThrow();
    });

    it("should reject short password", async () => {
      await expect(
        caller.auth.register({ ...validInput, password: "short" }),
      ).rejects.toThrow();
    });

    it("should reject invalid email", async () => {
      await expect(
        caller.auth.register({ ...validInput, email: "not-an-email" }),
      ).rejects.toThrow();
    });
  });

  describe("requestPasswordReset", () => {
    it("should return success even if user not found (no enumeration)", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined as any);

      const result = await caller.auth.requestPasswordReset({
        email: "nobody@example.com",
      });

      expect(result).toEqual({
        success: true,
        message: "If the email exists, a reset link has been sent",
      });
    });

    it("should store reset token when user exists", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        email: "test@example.com",
      } as any);

      await caller.auth.requestPasswordReset({ email: "test@example.com" });

      expect(db.update).toHaveBeenCalled();
    });

    it("should reject invalid email format", async () => {
      await expect(
        caller.auth.requestPasswordReset({ email: "bad" }),
      ).rejects.toThrow();
    });
  });

  describe("resetPassword", () => {
    it("should reject invalid token", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue(undefined as any);

      // Password must satisfy strength criteria: uppercase, lowercase, number, special char
      await expect(
        caller.auth.resetPassword({
          token: "bad-token",
          newPassword: "NewPass123!",
        }),
      ).rejects.toThrow("Invalid or expired reset token");
    });

    it("should reject expired token", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        resetPasswordToken: "valid-token",
        resetPasswordExpires: new Date("2020-01-01"),
      } as any);

      // Password must satisfy strength criteria: uppercase, lowercase, number, special char
      await expect(
        caller.auth.resetPassword({
          token: "valid-token",
          newPassword: "NewPass123!",
        }),
      ).rejects.toThrow("expired");
    });

    it("should reject short password", async () => {
      await expect(
        caller.auth.resetPassword({ token: "x", newPassword: "short" }),
      ).rejects.toThrow();
    });

    it("should clear lockout fields on successful reset", async () => {
      vi.mocked(db.query.users.findFirst).mockResolvedValue({
        id: "user-1",
        resetPasswordToken: "valid-token",
        resetPasswordExpires: new Date(Date.now() + 60000),
        failedLoginAttempts: 3,
        lockoutUntil: new Date(),
      } as any);

      await caller.auth.resetPassword({
        token: "valid-token",
        newPassword: "NewPass123!",
      });

      expect(db.update).toHaveBeenCalled();
    });
  });
});
