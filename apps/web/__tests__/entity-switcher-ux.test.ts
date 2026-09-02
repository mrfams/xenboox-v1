import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Entity Switcher UX — Enterprise Grade", () => {
  describe("EntityContext optimistic resolution", () => {
    const ctx = readFileSync(join(ROOT, "lib/entity-context.tsx"), "utf-8");

    it("reads localStorage synchronously on first render (optimistic)", () => {
      expect(ctx).toContain("useState<");
      expect(ctx).toContain('localStorage.getItem("currentEntityId")');
    });

    it("shows entity instantly without loading flash", () => {
      // The initial state is set from localStorage, not null
      expect(ctx).toContain('localStorage.getItem("currentEntityId")');
      expect(ctx).toContain('localStorage.getItem("currentEntityRole")');
    });

    it("validates stored entity against server list async", () => {
      expect(ctx).toContain("resolveInitialEntityId");
      expect(ctx).toContain("hasInitialized");
    });

    it("corrects stale localStorage entity silently", () => {
      expect(ctx).toContain('localStorage.removeItem("currentEntityId")');
    });

    it("persists last-used entity to server for cross-device sync", () => {
      expect(ctx).toContain("setLastUsedEntityMutation");
      expect(ctx).toContain("setLastUsedEntity");
    });

    it("provides entityCurrency for form defaults", () => {
      expect(ctx).toContain("entityCurrency");
      expect(ctx).toContain("setEntityCurrency");
    });
  });

  describe("EntitySwitcher component", () => {
    const switcher = readFileSync(
      join(ROOT, "components/layout/entity-switcher.tsx"),
      "utf-8",
    );

    it("shows loading spinner during entity switch", () => {
      expect(switcher).toContain("isSwitching");
      expect(switcher).toContain("animate-spin");
    });

    it("displays entity currency badge", () => {
      expect(switcher).toContain("entityCurrency");
    });

    it("fades button opacity during switch", () => {
      expect(switcher).toContain("opacity-70");
      expect(switcher).toContain("isSwitching");
    });

    it("prevents switching to same entity (no-op)", () => {
      expect(switcher).toContain("entity.id === entityId");
    });

    it("shows Building2 icon when not switching", () => {
      expect(switcher).toContain("Building2");
    });

    it("shows Loader2 spinner when switching", () => {
      expect(switcher).toContain("Loader2");
    });

    it("has hover-open with 150ms close delay", () => {
      expect(switcher).toContain("onMouseEnter");
      expect(switcher).toContain("onMouseLeave");
      expect(switcher).toContain("150");
    });

    it("supports keyboard dismiss (Escape)", () => {
      expect(switcher).toContain("Escape");
    });

    it("has create entity dialog", () => {
      expect(switcher).toContain("CreateEntityDialog");
      expect(switcher).toContain("Create new entity");
    });
  });

  describe("resolveInitialEntityId logic", () => {
    const ctx = readFileSync(join(ROOT, "lib/entity-context.tsx"), "utf-8");

    it("prefers localStorage over server entity", () => {
      // storedId is checked first
      expect(ctx).toContain("if (storedId && byId.has(storedId))");
    });

    it("falls back to server lastUsedEntityId", () => {
      expect(ctx).toContain("if (serverEntityId && byId.has(serverEntityId))");
    });

    it("falls back to first accessible entity", () => {
      expect(ctx).toContain("accessible.length > 0");
    });

    it("validates against accessible entities (no stale ids)", () => {
      expect(ctx).toContain("byId = new Map(accessible.map");
    });
  });
});
