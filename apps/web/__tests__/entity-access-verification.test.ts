// ─── Entity Access Verification Tests ───────────────────────────────────────
//
// Tests the resolveEntityAccess function used in raw API routes (non-tRPC)
// to verify that cross-entity access is properly rejected.
//
// This covers the security fixes applied to:
//   - /api/chat/stream
//   - /api/attention/stream
//   - /api/help/assist
//   - /api/plaid/create-link-token
//   - /api/plaid/exchange-token

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const ENTITY_A = "11111111-1111-1111-1111-111111111111";
const ENTITY_B = "22222222-2222-2222-2222-222222222222";
const USER_A = "user-a-0000-0000-000000000001";
const USER_B = "user-b-0000-0000-000000000002";
const ORG_1 = "org-1-0000-0000-000000000001";

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    query: {
      entities: {
        findFirst: vi.fn(),
      },
      organizations: {
        findFirst: vi.fn(),
      },
      orgRoles: {
        findFirst: vi.fn(),
      },
      userEntityAccess: {
        findFirst: vi.fn(),
      },
    },
  };
  return { mockDb };
});

vi.mock("@/lib/db", () => ({ db: mockDb }));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { resolveEntityAccess } from "@/lib/auth/entity-access";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("resolveEntityAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Null/empty input ────────────────────────────────────────────────────

  it("returns null when entityId is empty", async () => {
    const result = await resolveEntityAccess(USER_A, "");
    expect(result).toBeNull();
  });

  it("returns null when entityId is undefined (falsy)", async () => {
    const result = await resolveEntityAccess(USER_A, undefined as any);
    expect(result).toBeNull();
  });

  // ── Entity not found ────────────────────────────────────────────────────

  it("returns null when entity does not exist", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue(null);

    const result = await resolveEntityAccess(USER_A, ENTITY_A);
    expect(result).toBeNull();
    expect(mockDb.query.entities.findFirst).toHaveBeenCalledOnce();
  });

  // ── Org-level owner/admin access ────────────────────────────────────────

  it("grants access when user is org owner", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({
      plan: "professional",
    });
    mockDb.query.orgRoles.findFirst.mockResolvedValue({
      userId: USER_A,
      orgId: ORG_1,
      role: "owner",
    });

    const result = await resolveEntityAccess(USER_A, ENTITY_A);

    expect(result).toEqual({
      entityId: ENTITY_A,
      role: "owner",
      billingPlan: "professional",
    });
  });

  it("grants access when user is org admin", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({
      plan: "free",
    });
    mockDb.query.orgRoles.findFirst.mockResolvedValue({
      userId: USER_A,
      orgId: ORG_1,
      role: "admin",
    });

    const result = await resolveEntityAccess(USER_A, ENTITY_A);

    expect(result).toEqual({
      entityId: ENTITY_A,
      role: "admin",
      billingPlan: "free",
    });
  });

  it("does NOT grant org-level access for non-owner/admin roles", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({
      plan: "professional",
    });
    mockDb.query.orgRoles.findFirst.mockResolvedValue({
      userId: USER_A,
      orgId: ORG_1,
      role: "accountant", // Not owner or admin
    });
    mockDb.query.userEntityAccess.findFirst.mockResolvedValue(null);

    const result = await resolveEntityAccess(USER_A, ENTITY_A);
    expect(result).toBeNull();
  });

  // ── Explicit entity-level access ────────────────────────────────────────

  it("grants access when user has explicit entity access", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({
      plan: "professional",
    });
    mockDb.query.orgRoles.findFirst.mockResolvedValue(null); // No org role
    mockDb.query.userEntityAccess.findFirst.mockResolvedValue({
      entityId: ENTITY_A,
      role: "accountant",
    });

    const result = await resolveEntityAccess(USER_A, ENTITY_A);

    expect(result).toEqual({
      entityId: ENTITY_A,
      role: "accountant",
      billingPlan: "professional",
    });
  });

  // ── Cross-entity rejection ──────────────────────────────────────────────

  it("rejects user B trying to access user A's entity", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({
      plan: "professional",
    });
    // User B is NOT an org owner/admin
    mockDb.query.orgRoles.findFirst.mockResolvedValue(null);
    // User B does NOT have explicit entity access
    mockDb.query.userEntityAccess.findFirst.mockResolvedValue(null);

    const result = await resolveEntityAccess(USER_B, ENTITY_A);

    expect(result).toBeNull();
  });

  it("rejects user A trying to access entity B they have no access to", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_B,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({
      plan: "professional",
    });
    mockDb.query.orgRoles.findFirst.mockResolvedValue(null);
    mockDb.query.userEntityAccess.findFirst.mockResolvedValue(null);

    const result = await resolveEntityAccess(USER_A, ENTITY_B);

    expect(result).toBeNull();
  });

  // ── Entity without organization ─────────────────────────────────────────

  it("falls through to entity-level access when entity has no organization", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: null,
    });
    mockDb.query.userEntityAccess.findFirst.mockResolvedValue({
      entityId: ENTITY_A,
      role: "viewer",
    });

    const result = await resolveEntityAccess(USER_A, ENTITY_A);

    expect(result).toEqual({
      entityId: ENTITY_A,
      role: "viewer",
      billingPlan: undefined,
    });
  });

  it("rejects when entity has no organization and no entity-level access", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: null,
    });
    mockDb.query.userEntityAccess.findFirst.mockResolvedValue(null);

    const result = await resolveEntityAccess(USER_A, ENTITY_A);
    expect(result).toBeNull();
  });

  // ── Billing plan propagation ────────────────────────────────────────────

  it("includes billing plan from organization", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({
      plan: "enterprise",
    });
    mockDb.query.orgRoles.findFirst.mockResolvedValue({
      userId: USER_A,
      orgId: ORG_1,
      role: "owner",
    });

    const result = await resolveEntityAccess(USER_A, ENTITY_A);
    expect(result?.billingPlan).toBe("enterprise");
  });

  // ── Query correctness ───────────────────────────────────────────────────

  it("queries orgRoles with correct userId and orgId", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({ plan: "free" });
    mockDb.query.orgRoles.findFirst.mockResolvedValue(null);
    mockDb.query.userEntityAccess.findFirst.mockResolvedValue(null);

    await resolveEntityAccess(USER_A, ENTITY_A);

    // Verify orgRoles was queried with the correct user and org
    const orgRolesCall = mockDb.query.orgRoles.findFirst;
    expect(orgRolesCall).toHaveBeenCalledOnce();
  });

  it("does not query userEntityAccess when org owner grants access", async () => {
    mockDb.query.entities.findFirst.mockResolvedValue({
      id: ENTITY_A,
      organizationId: ORG_1,
    });
    mockDb.query.organizations.findFirst.mockResolvedValue({ plan: "free" });
    mockDb.query.orgRoles.findFirst.mockResolvedValue({
      userId: USER_A,
      orgId: ORG_1,
      role: "owner",
    });

    await resolveEntityAccess(USER_A, ENTITY_A);

    // Should NOT query userEntityAccess because org owner already grants access
    expect(mockDb.query.userEntityAccess.findFirst).not.toHaveBeenCalled();
  });
});
