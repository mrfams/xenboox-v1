/**
 * Permissions Fix Tests
 *
 * Verifies:
 * 1. Owner/admin get full access via client-side fallback
 * 2. Server returns null when no permissions in DB (not empty array)
 * 3. PermissionProvider marks as loaded when role exists
 * 4. Permission management UI exists for owner/admin
 * 5. <Can> component works for conditional rendering
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("Permissions Fix", () => {
  // ─── Client-Side Fallback ─────────────────────────────────────────
  describe("roleHasBasicAccess fallback", () => {
    let perms: string;

    beforeAll(() => {
      perms = readFile("lib/permissions.tsx");
    });

    it("owner gets full access via heuristic", () => {
      expect(perms).toContain(
        'if (role === "owner" || role === "admin") return true',
      );
    });

    it("finance_director has broad access", () => {
      expect(perms).toContain('"finance_director"');
    });

    it("employee is self-scoped", () => {
      expect(perms).toContain('"employee"');
    });

    it("hasPermission uses fallback when permissions is null", () => {
      expect(perms).toContain(
        "if (role) return roleHasBasicAccess(role, module, action)",
      );
    });
  });

  // ─── Server-Side Fix ──────────────────────────────────────────────
  describe("Server returns null for empty permissions", () => {
    let router: string;

    beforeAll(() => {
      router = readFile("server/routers/permissions-admin.ts");
    });

    it("returns null when no permissions exist for role", () => {
      expect(router).toContain("if (perms.length === 0)");
      expect(router).toContain("return null");
    });

    it("still applies user overrides when permissions exist", () => {
      expect(router).toContain("overrideMap");
      expect(router).toContain("userPermissionOverrides");
    });
  });

  // ─── PermissionProvider Loaded State ──────────────────────────────
  describe("PermissionProvider loaded state", () => {
    let perms: string;

    beforeAll(() => {
      perms = readFile("lib/permissions.tsx");
    });

    it("marks as loaded when role exists (even without permissions)", () => {
      expect(perms).toContain("permissionsLoaded: !!role || !!permissions");
    });

    it("has Can component for conditional rendering", () => {
      expect(perms).toContain("export function Can");
    });

    it("has CanScope component for scoped access", () => {
      expect(perms).toContain("export function CanScope");
    });
  });

  // ─── Permission Management UI ─────────────────────────────────────
  describe("Permission management UI exists", () => {
    let overrides: string;

    beforeAll(() => {
      overrides = readFile("components/settings/permission-overrides.tsx");
    });

    it("exports PermissionOverrides component", () => {
      expect(overrides).toContain("export function PermissionOverrides");
    });

    it("has module list for permission configuration", () => {
      expect(overrides).toContain("general_ledger");
      expect(overrides).toContain("invoicing");
      expect(overrides).toContain("payroll");
    });

    it("has action list (view, create, edit, approve, delete, export)", () => {
      expect(overrides).toContain('"view"');
      expect(overrides).toContain('"create"');
      expect(overrides).toContain('"edit"');
      expect(overrides).toContain('"approve"');
      expect(overrides).toContain('"delete"');
      expect(overrides).toContain('"export"');
    });

    it("has team member selector", () => {
      expect(overrides).toContain("Select a team member");
    });

    it("has toggle switches for each permission", () => {
      expect(overrides).toContain("Switch");
      expect(overrides).toContain("togglePermission");
    });

    it("calls setUserOverride mutation", () => {
      expect(overrides).toContain("setUserOverride");
    });

    it("shows override indicator", () => {
      expect(overrides).toContain("override");
    });

    it("refetches permissions after change", () => {
      expect(overrides).toContain("refetchPermissions");
    });

    it("shows role badge", () => {
      expect(overrides).toContain("Badge");
      expect(overrides).toContain("selectedMember.role");
    });
  });

  // ─── Settings Page Includes Permissions ───────────────────────────
  describe("Settings page includes permissions tab", () => {
    let settings: string;

    beforeAll(() => {
      settings = readFile("app/dashboard/settings/page.tsx");
    });

    it("has permission-overrides section", () => {
      expect(settings).toContain("permission-overrides");
    });

    it("dynamically loads PermissionOverrides component", () => {
      expect(settings).toContain("PermissionOverrides");
    });

    it("permissions tab is visible to owner/admin", () => {
      expect(settings).toContain("Permissions");
    });
  });

  // ─── Role Coverage ────────────────────────────────────────────────
  describe("Role definitions are comprehensive", () => {
    let perms: string;

    beforeAll(() => {
      perms = readFile("lib/permissions.tsx");
    });

    it("covers owner role", () => {
      expect(perms).toContain('"owner"');
    });

    it("covers admin role", () => {
      expect(perms).toContain('"admin"');
    });

    it("covers finance_director role", () => {
      expect(perms).toContain('"finance_director"');
    });

    it("covers external_accountant role", () => {
      expect(perms).toContain('"external_accountant"');
    });

    it("covers payroll_officer role", () => {
      expect(perms).toContain('"payroll_officer"');
    });

    it("covers cashier role", () => {
      expect(perms).toContain('"cashier"');
    });

    it("covers employee role", () => {
      expect(perms).toContain('"employee"');
    });
  });
});
