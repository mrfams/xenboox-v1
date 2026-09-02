/**
 * Entity Switch Overlay Tests
 *
 * Verifies:
 * 1. EntityContext exposes isSwitching and switchingToName
 * 2. EntitySwitchOverlay renders full-screen blur
 * 3. Overlay shows target entity name
 * 4. Overlay has loading indicator
 * 5. Overlay mounts in dashboard layout
 * 6. Overlay uses z-[200] (above other modals)
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("Entity Switch Overlay", () => {
  // ─── EntityContext ─────────────────────────────────────────────────
  describe("EntityContext exposes switching state", () => {
    let ctx: string;

    beforeAll(() => {
      ctx = readFile("lib/entity-context.tsx");
    });

    it("defines isSwitching in context type", () => {
      expect(ctx).toContain("isSwitching: boolean");
    });

    it("defines switchingToName in context type", () => {
      expect(ctx).toContain("switchingToName: string | null");
    });

    it("initializes isSwitching as false in context default", () => {
      expect(ctx).toContain("isSwitching: false");
    });

    it("initializes switchingToName as null in context default", () => {
      expect(ctx).toContain("switchingToName: null");
    });

    it("has useState for isSwitching", () => {
      expect(ctx).toContain("useState(false)");
    });

    it("has useState for switchingToName", () => {
      expect(ctx).toContain("useState<string | null>(null)");
    });

    it("passes isSwitching and switchingToName to provider", () => {
      expect(ctx).toContain("isSwitching,");
      expect(ctx).toContain("switchingToName,");
    });

    it("setEntityId triggers switching when entity changes", () => {
      // Should check if id !== entityId before showing overlay
      expect(ctx).toContain("id !== entityId");
    });

    it("setEntityId looks up target entity name", () => {
      expect(ctx).toContain("targetName");
    });

    it("auto-dismisses overlay after timeout", () => {
      expect(ctx).toContain("setTimeout");
      expect(ctx).toContain("setIsSwitching(false)");
    });
  });

  // ─── Overlay Component ─────────────────────────────────────────────
  describe("EntitySwitchOverlay component", () => {
    let overlay: string;

    beforeAll(() => {
      overlay = readFile("components/shared/entity-switch-overlay.tsx");
    });

    it("exports EntitySwitchOverlay function", () => {
      expect(overlay).toContain("export function EntitySwitchOverlay");
    });

    it("renders full-screen backdrop with blur", () => {
      expect(overlay).toContain("fixed inset-0");
      expect(overlay).toContain("backdrop-blur-md");
    });

    it("uses z-[200] to appear above other modals", () => {
      expect(overlay).toContain("z-[200]");
    });

    it("shows target entity name", () => {
      expect(overlay).toContain("switchingToName");
    });

    it("has 'Switching to' label", () => {
      expect(overlay).toContain("Switching to");
    });

    it("has loading spinner", () => {
      expect(overlay).toContain("Loader2");
      expect(overlay).toContain("animate-spin");
    });

    it("has Building2 icon", () => {
      expect(overlay).toContain("Building2");
    });

    it("has bounce animation dots", () => {
      expect(overlay).toContain("animate-bounce");
    });

    it("has aria-label for accessibility", () => {
      expect(overlay).toContain("aria-label={`Switching to");
    });

    it("has role=status for accessibility", () => {
      expect(overlay).toContain('role="status"');
    });

    it("returns null when not switching", () => {
      expect(overlay).toContain(
        "if (!isSwitching || !switchingToName) return null",
      );
    });
  });

  // ─── Dashboard Layout ──────────────────────────────────────────────
  describe("Dashboard layout mounts overlay", () => {
    let layout: string;

    beforeAll(() => {
      layout = readFile("app/dashboard/layout.tsx");
    });

    it("imports EntitySwitchOverlay", () => {
      expect(layout).toContain("import { EntitySwitchOverlay }");
      expect(layout).toContain("entity-switch-overlay");
    });

    it("renders EntitySwitchOverlay in layout", () => {
      expect(layout).toContain("<EntitySwitchOverlay />");
    });
  });
});
