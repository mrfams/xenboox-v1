import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

import { paginationSchema } from "@/lib/trpc/server";

describe("paginationSchema", () => {
  it("provides default limit of 25 when not specified", () => {
    const result = paginationSchema.parse({});
    expect(result.limit).toBe(25);
    expect(result.offset).toBe(0);
  });

  it("accepts valid limit and offset", () => {
    const result = paginationSchema.parse({ limit: 50, offset: 100 });
    expect(result.limit).toBe(50);
    expect(result.offset).toBe(100);
  });

  it("rejects limit above 100", () => {
    expect(() => paginationSchema.parse({ limit: 200 })).toThrow();
  });

  it("rejects limit below 1", () => {
    expect(() => paginationSchema.parse({ limit: 0 })).toThrow();
  });

  it("rejects negative offset", () => {
    expect(() => paginationSchema.parse({ offset: -1 })).toThrow();
  });
});

vi.mock("@xenboox/db/schema/organization", () => ({
  organizations: { id: "id", ownerId: "owner_id", name: "name" },
  entities: { id: "id", organizationId: "organization_id", name: "name" },
  userEntityAccess: {
    userId: "user_id",
    entityId: "entity_id",
    role: "role",
  },
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      customers: { findMany: vi.fn().mockResolvedValue([]) },
      salesInvoices: { findMany: vi.fn().mockResolvedValue([]) },
      paymentsAr: { findMany: vi.fn().mockResolvedValue([]) },
      userEntityAccess: {
        findFirst: vi.fn().mockResolvedValue({ id: "access-1" }),
      },
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "session-1" }) },
    },
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    execute: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/email", () => ({}));
vi.mock("@/lib/resend", () => ({
  resend: { emails: { send: vi.fn() } },
  EMAIL_FROM: "test@test.com",
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

describe("AR listCustomers with pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as any);
  });

  it("passes limit and offset to the database query", async () => {
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      id: "access-1",
    } as any);
    vi.mocked(db.query.customers.findMany).mockResolvedValue([]);

    const caller = appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099-01-01" },
      entityId: "entity-1",
      headers: {},
    } as any);

    await caller.ar.listCustomers({ limit: 10, offset: 0 });

    const callArgs = vi.mocked(db.query.customers.findMany).mock
      .calls[0]?.[0] as any;
    expect(callArgs.limit).toBe(10);
    expect(callArgs.offset).toBe(0);
  });

  it("defaults to limit 25 when not provided", async () => {
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      id: "access-1",
    } as any);
    vi.mocked(db.query.customers.findMany).mockResolvedValue([]);

    const caller = appRouter.createCaller({
      session: { user: { id: "user-1" }, expires: "2099-01-01" },
      entityId: "entity-1",
      headers: {},
    } as any);

    await caller.ar.listCustomers({});

    const callArgs = vi.mocked(db.query.customers.findMany).mock
      .calls[0]?.[0] as any;
    expect(callArgs.limit).toBe(25);
    expect(callArgs.offset).toBe(0);
  });
});
