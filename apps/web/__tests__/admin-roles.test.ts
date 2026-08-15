import { describe, it, expect } from "vitest";

import {
  ADMIN_ROLES,
  hasAdminPermission,
  canManageAdminUsers,
  canRevokeAnySession,
  ADMIN_EPICS,
  type AdminRole,
  type AdminEpic,
} from "@/lib/admin/roles";

describe("admin roles matrix", () => {
  it("defines all five roles", () => {
    expect(ADMIN_ROLES).toEqual([
      "super_admin",
      "ops_admin",
      "finance_admin",
      "support_agent",
      "read_only_auditor",
    ]);
  });

  it("super_admin can write every epic", () => {
    for (const epic of ADMIN_EPICS) {
      expect(hasAdminPermission("super_admin", epic, "write")).toBe(true);
    }
  });

  it("read_only_auditor can read every epic but write none", () => {
    for (const epic of ADMIN_EPICS) {
      expect(hasAdminPermission("read_only_auditor", epic, "read")).toBe(true);
      expect(hasAdminPermission("read_only_auditor", epic, "write")).toBe(
        false,
      );
    }
  });

  it("ops_admin writes control-plane epics and reads sessions/audit", () => {
    expect(
      hasAdminPermission("ops_admin", "model_control_plane", "write"),
    ).toBe(true);
    expect(hasAdminPermission("ops_admin", "eval_pipeline", "write")).toBe(
      true,
    );
    expect(hasAdminPermission("ops_admin", "admin_sessions", "read")).toBe(
      true,
    );
    expect(hasAdminPermission("ops_admin", "admin_sessions", "write")).toBe(
      false,
    );
  });

  it("finance_admin is limited to billing/cost/audit", () => {
    expect(hasAdminPermission("finance_admin", "billing", "write")).toBe(true);
    expect(hasAdminPermission("finance_admin", "cost", "read")).toBe(true);
    expect(
      hasAdminPermission("finance_admin", "model_control_plane", "write"),
    ).toBe(false);
    expect(hasAdminPermission("finance_admin", "admin_users", "write")).toBe(
      false,
    );
  });

  it("support_agent is limited to impersonation/customer_audit read", () => {
    expect(hasAdminPermission("support_agent", "impersonation", "read")).toBe(
      true,
    );
    expect(hasAdminPermission("support_agent", "customer_audit", "read")).toBe(
      true,
    );
    expect(hasAdminPermission("support_agent", "impersonation", "write")).toBe(
      false,
    );
    expect(hasAdminPermission("support_agent", "audit_log", "write")).toBe(
      false,
    );
  });

  it("hasAdminPermission denies unknown epics and roles", () => {
    expect(
      hasAdminPermission("super_admin", "not_an_epic" as AdminEpic, "write"),
    ).toBe(false);
    expect(
      hasAdminPermission("not_a_role" as AdminRole, "audit_log", "read"),
    ).toBe(false);
  });
});

describe("role guards", () => {
  it("only super_admin can manage admin users", () => {
    expect(canManageAdminUsers("super_admin")).toBe(true);
    for (const role of ADMIN_ROLES.filter((r) => r !== "super_admin")) {
      expect(canManageAdminUsers(role as AdminRole)).toBe(false);
    }
  });

  it("only super_admin can revoke arbitrary sessions", () => {
    expect(canRevokeAnySession("super_admin")).toBe(true);
    expect(canRevokeAnySession("ops_admin")).toBe(false);
  });
});
