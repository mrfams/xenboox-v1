import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    query: {
      users: { findFirst: vi.fn() },
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/email", () => ({
  sendPaymentReceivedEmail: vi.fn(),
  sendPaymentSentEmail: vi.fn(),
}))

import { appRouter } from "@/server/routers/_app"

const caller = appRouter.createCaller({ session: null, headers: {} })

describe("Input Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("auth.register zod validation", () => {
    it("rejects empty name", async () => {
      await expect(
        caller.auth.register({
          name: "",
          email: "a@b.com",
          password: "password123",
          organizationName: "Org",
        })
      ).rejects.toThrow()
    })

    it("rejects invalid email", async () => {
      await expect(
        caller.auth.register({
          name: "User",
          email: "not-email",
          password: "password123",
          organizationName: "Org",
        })
      ).rejects.toThrow()
    })

    it("rejects password under 8 chars", async () => {
      await expect(
        caller.auth.register({
          name: "User",
          email: "a@b.com",
          password: "1234567",
          organizationName: "Org",
        })
      ).rejects.toThrow()
    })

    it("rejects empty organization name", async () => {
      await expect(
        caller.auth.register({
          name: "User",
          email: "a@b.com",
          password: "password123",
          organizationName: "",
        })
      ).rejects.toThrow()
    })
  })

  describe("auth.requestPasswordReset validation", () => {
    it("rejects invalid email", async () => {
      await expect(
        caller.auth.requestPasswordReset({ email: "bad" })
      ).rejects.toThrow()
    })
  })

  describe("auth.resetPassword validation", () => {
    it("rejects empty token", async () => {
      await expect(
        caller.auth.resetPassword({ token: "", newPassword: "password123" })
      ).rejects.toThrow()
    })

    it("rejects short password", async () => {
      await expect(
        caller.auth.resetPassword({ token: "x", newPassword: "short" })
      ).rejects.toThrow()
    })
  })

  describe("health endpoint", () => {
    it("should return ok", async () => {
      const result = await caller.health()
      expect(result).toEqual({ status: "ok" })
    })
  })
})
