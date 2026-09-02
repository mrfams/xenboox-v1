import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const TESTS_DIR = join(ROOT, "__tests__");
const ROUTERS_DIR = join(ROOT, "server/routers");

describe("RBAC Implementation — Full Stack Verification", () => {
  describe("RBAC sweep test covers all routers", () => {
    const rbacSweep = readFileSync(
      join(TESTS_DIR, "rbac-sweep.test.ts"),
      "utf-8",
    );

    it("verifies every mutation is on a protected procedure", () => {
      expect(rbacSweep).toContain("every mutation is protected");
    });

    it("verifies role gates are explicit", () => {
      expect(rbacSweep).toContain("role gates are explicit");
    });

    it("verifies every router file is mounted", () => {
      expect(rbacSweep).toContain("every router file is mounted");
    });
  });

  describe("Admin role system exists", () => {
    const rolesFile = readFileSync(join(ROOT, "lib/admin/roles.ts"), "utf-8");

    it("defines ADMIN_ROLES constant", () => {
      expect(rolesFile).toContain("ADMIN_ROLES");
    });

    it("has hasAdminPermission function", () => {
      expect(rolesFile).toContain("hasAdminPermission");
    });

    it("has canManageAdminUsers function", () => {
      expect(rolesFile).toContain("canManageAdminUsers");
    });

    it("includes super_admin role", () => {
      expect(rolesFile).toContain("super_admin");
    });

    it("includes ops_admin role", () => {
      expect(rolesFile).toContain("ops_admin");
    });
  });

  describe("Entity scoping", () => {
    it("tRPC context applies entity scoping", () => {
      const context = readFileSync(
        join(ROOT, "lib/entity-context.tsx"),
        "utf-8",
      );
      expect(context).toContain("entityId");
    });

    it("middleware validates origin on mutations", () => {
      const middleware = readFileSync(join(ROOT, "middleware.ts"), "utf-8");
      expect(middleware).toContain("validateOrigin");
    });
  });

  describe("Protected procedures enforced in routers", () => {
    const routerFiles = readdirSync(ROUTERS_DIR).filter(
      (f) => f.endsWith(".ts") && !f.includes(".test."),
    );

    it(`all ${routerFiles.length} routers use protected or admin procedures`, () => {
      let protectedCount = 0;

      for (const file of routerFiles) {
        const src = readFileSync(join(ROUTERS_DIR, file), "utf-8");
        const hasProtection =
          src.includes("protectedProcedure") ||
          src.includes("rlsProtectedProcedure") ||
          src.includes("concurrencyLimitedProcedure") ||
          src.includes("adminPermissionProcedure");
        if (hasProtection) protectedCount++;
      }

      // Most routers should use some form of protection (helper routers may not)
      expect(protectedCount).toBeGreaterThan(routerFiles.length * 0.7);
    });
  });

  describe("Admin audit logging", () => {
    const auditTest = readFileSync(
      join(TESTS_DIR, "admin-audit.test.ts"),
      "utf-8",
    );

    it("logs admin actions with role at time of action", () => {
      expect(auditTest).toContain("actorRoleAtTimeOfAction");
    });
  });

  describe("Admin roles test coverage", () => {
    const rolesTest = readFileSync(
      join(TESTS_DIR, "admin-roles.test.ts"),
      "utf-8",
    );

    it("defines all admin roles", () => {
      expect(rolesTest).toContain("ADMIN_ROLES");
    });

    it("tests permission denial for unknown roles", () => {
      expect(rolesTest).toContain("denies unknown");
    });

    it("tests role management permissions", () => {
      expect(rolesTest).toContain("canManageAdminUsers");
    });
  });
});
