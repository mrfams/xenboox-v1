import { describe, it, expect, vi, beforeEach } from "vitest"
import { db } from "@/lib/db"

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    query: {
      suppliers: { findMany: vi.fn().mockResolvedValue([]), findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}))

vi.mock("@/lib/email", () => ({}))

vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: vi.fn() } },
  EMAIL_FROM: "test@test.com",
}))

import { auth } from "@/lib/auth"
import { createTRPCContext } from "@/lib/trpc/server"
import { appRouter } from "@/server/routers/_app"

describe("Entity Scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function mockAuthSession(userId: string) {
    vi.mocked(auth).mockResolvedValue({
      user: { id: userId, name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as any)
  }

  it("should reject requests without session", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)

    const caller = appRouter.createCaller({
      session: null,
      entityId: "entity-1",
      headers: {},
    })

    await expect(
      caller.ap.listSuppliers()
    ).rejects.toThrow("logged in")
  })

  it("should reject requests without entityId", async () => {
    mockAuthSession("user-1")

    const caller = appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099" },
      entityId: undefined,
      headers: {},
    })

    await expect(
      caller.ap.listSuppliers()
    ).rejects.toThrow("Entity ID is required")
  })

  it("should reject requests where user lacks entity access", async () => {
    mockAuthSession("user-1")
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue(undefined as any)

    const caller = appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099" },
      entityId: "entity-other",
      headers: {},
    })

    await expect(
      caller.ap.listSuppliers()
    ).rejects.toThrow("do not have access")
  })

  it("should pass when user has valid entity access", async () => {
    mockAuthSession("user-1")
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      userId: "user-1",
      entityId: "entity-1",
      role: "admin",
    } as any)
    vi.mocked(db.query.suppliers.findMany).mockResolvedValue([])

    const caller = appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099" },
      entityId: "entity-1",
      headers: {},
    })

    const result = await caller.ap.listSuppliers()
    expect(result).toEqual([])
  })

  it("should scope queries to the provided entityId", async () => {
    mockAuthSession("user-1")
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      userId: "user-1",
      entityId: "entity-1",
      role: "admin",
    } as any)

    const mockSuppliers = [
      { id: "s1", name: "Supplier A", entityId: "entity-1" },
      { id: "s2", name: "Supplier B", entityId: "entity-1" },
    ]
    vi.mocked(db.query.suppliers.findMany).mockResolvedValue(mockSuppliers as any)

    const caller = appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099" },
      entityId: "entity-1",
      headers: {},
    })

    const result = await caller.ap.listSuppliers()
    expect(result).toHaveLength(2)
    expect(result.every((s: any) => s.entityId === "entity-1")).toBe(true)
  })
})
