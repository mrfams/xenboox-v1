/**
 * Command Bar Attention Tests
 *
 * Verifies the command bar is visually prominent as the primary
 * AI interaction point:
 * - Primary-colored border (not muted)
 * - Shadow with primary color
 * - Pulse-glow animation when idle
 * - Visible placeholder text
 * - Prominent send button
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("Command Bar Visual Prominence", () => {
  let bar: string;
  let globals: string;

  beforeAll(() => {
    bar = readFile("components/ai-native-v2/command-bar.tsx");
    globals = readFile("app/globals.css");
  });

  // ─── Border & Shadow ───────────────────────────────────────────────
  describe("Border and shadow use primary color", () => {
    it("has primary-colored border (not just border-border)", () => {
      expect(bar).toContain("border-primary/20");
    });

    it("has primary-colored shadow", () => {
      expect(bar).toContain("shadow-primary/[0.06]");
    });

    it("focus state intensifies border and shadow", () => {
      expect(bar).toContain("focus-within:border-primary/50");
      expect(bar).toContain("focus-within:shadow-primary/[0.12]");
    });

    it("focus state adds ring", () => {
      expect(bar).toContain("focus-within:ring-2");
      expect(bar).toContain("focus-within:ring-primary/20");
    });
  });

  // ─── Pulse Animation ───────────────────────────────────────────────
  describe("Pulse-glow animation when idle", () => {
    it("applies pulse-glow animation when idle", () => {
      expect(bar).toContain("animate-[pulse-glow_3s_ease-in-out_infinite]");
    });

    it("only animates when NOT busy and has no value", () => {
      expect(bar).toContain("!value && !busy");
    });

    it("pulse-glow keyframe exists in globals.css", () => {
      expect(globals).toContain("@keyframes pulse-glow");
    });

    it("pulse-glow animates box-shadow", () => {
      expect(globals).toContain("box-shadow");
    });
  });

  // ─── Placeholder ──────────────────────────────────────────────────
  describe("Placeholder visibility", () => {
    it("placeholder uses higher opacity (not muted-foreground/50)", () => {
      expect(bar).toContain("placeholder:text-foreground/40");
      expect(bar).not.toContain("placeholder:text-muted-foreground/50");
    });
  });

  // ─── Send Button ──────────────────────────────────────────────────
  describe("Send button prominence", () => {
    it("send button has primary-colored shadow", () => {
      expect(bar).toContain("shadow-md shadow-primary/20");
    });

    it("send button hover intensifies shadow", () => {
      expect(bar).toContain("hover:shadow-lg hover:shadow-primary/30");
    });

    it("disabled state is very subtle", () => {
      expect(bar).toContain("disabled:opacity-30");
    });
  });

  // ─── Suggestion Chips ─────────────────────────────────────────────
  describe("Suggestion chip prominence", () => {
    it("chips use primary-colored border", () => {
      expect(bar).toContain("border-primary/15");
    });

    it("chips have primary background tint", () => {
      expect(bar).toContain("bg-primary/5");
    });

    it("chips use font-medium for emphasis", () => {
      expect(bar).toContain("font-medium");
    });

    it("chips hover uses primary color", () => {
      expect(bar).toContain("hover:text-primary");
    });
  });

  // ─── Gradient Accent ──────────────────────────────────────────────
  describe("Gradient accent line", () => {
    it("has gradient accent line at top of input", () => {
      expect(bar).toContain(
        "bg-gradient-to-r from-transparent via-primary/40 to-transparent",
      );
    });

    it("accent line is positioned at top", () => {
      expect(bar).toContain("inset-x-4 top-0 h-px");
    });
  });

  // ─── Overall Styling ──────────────────────────────────────────────
  describe("Overall container styling", () => {
    it("uses bg-card (not bg-muted/30 which blended with background)", () => {
      expect(bar).toContain("bg-card");
      expect(bar).not.toContain("bg-muted/30");
    });

    it("has rounded-2xl for modern look", () => {
      expect(bar).toContain("rounded-2xl");
    });

    it("has group class for hover effects", () => {
      expect(bar).toContain("group relative");
    });

    it("transition-all for smooth state changes", () => {
      expect(bar).toContain("transition-all duration-300");
    });
  });
});
