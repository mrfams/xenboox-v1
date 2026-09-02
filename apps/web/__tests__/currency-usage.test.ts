/**
 * Currency Usage Tests
 *
 * Verifies:
 * 1. useFormatCurrency hook exists and uses entity currency
2. formatCurrency calls pass entity currency (not default USD)
 * 3. Currency symbol map covers major currencies
 * 4. Entity switcher shows currency badge
 * 5. Multi-currency support (transaction currency vs entity currency)
 */
import { readFileSync } from "fs";
import { join } from "path";

function readFile(relPath: string): string {
  return readFileSync(join(process.cwd(), relPath), "utf-8");
}

describe("Currency Usage", () => {
  // ─── useFormatCurrency Hook ────────────────────────────────────────
  describe("useFormatCurrency hook", () => {
    let hook: string;

    beforeAll(() => {
      hook = readFile("lib/hooks/use-currency.ts");
    });

    it("exports useFormatCurrency function", () => {
      expect(hook).toContain("export function useFormatCurrency");
    });

    it("uses entityCurrency from EntityContext", () => {
      expect(hook).toContain("useEntity");
      expect(hook).toContain("entityCurrency");
    });

    it("defaults to USD when no entity currency", () => {
      expect(hook).toContain('entityCurrency ?? "USD"');
    });

    it("supports override currency for multi-currency", () => {
      expect(hook).toContain("overrideCurrency");
    });

    it("exports getCurrencySymbol function", () => {
      expect(hook).toContain("export function getCurrencySymbol");
    });

    it("has formatWithSymbol for cross-currency display", () => {
      expect(hook).toContain("formatWithSymbol");
    });

    it("has getSymbol helper", () => {
      expect(hook).toContain("getSymbol");
    });

    it("handles invalid currency codes gracefully", () => {
      expect(hook).toContain("catch");
      expect(hook).toContain("Fallback");
    });
  });

  // ─── Currency Symbol Map ──────────────────────────────────────────
  describe("Currency symbol map", () => {
    let hook: string;

    beforeAll(() => {
      hook = readFile("lib/hooks/use-currency.ts");
    });

    it("covers USD", () => {
      expect(hook).toContain('USD: "$"');
    });

    it("covers EUR", () => {
      expect(hook).toContain('EUR: "€"');
    });

    it("covers GBP", () => {
      expect(hook).toContain('GBP: "£"');
    });

    it("covers GMD (Gambian Dalasi)", () => {
      expect(hook).toContain('GMD: "D"');
    });

    it("covers NGN (Nigerian Naira)", () => {
      expect(hook).toContain('NGN: "₦"');
    });

    it("covers KES (Kenyan Shilling)", () => {
      expect(hook).toContain('KES: "KSh"');
    });

    it("covers GHS (Ghanaian Cedi)", () => {
      expect(hook).toContain('GHS: "GH₵"');
    });

    it("covers major African currencies (XOF, XAF, ZAR)", () => {
      expect(hook).toContain('XOF: "CFA"');
      expect(hook).toContain('ZAR: "R"');
    });

    it("covers Asian currencies (JPY, INR, THB)", () => {
      expect(hook).toContain('JPY: "¥"');
      expect(hook).toContain('INR: "₹"');
      expect(hook).toContain('THB: "฿"');
    });
  });

  // ─── Financial Pulse Uses Entity Currency ──────────────────────────
  describe("Financial Pulse page uses entity currency", () => {
    let page: string;

    beforeAll(() => {
      page = readFile("app/dashboard/financial-pulse/page.tsx");
    });

    it("has displayCurrency variable from entityCurrency", () => {
      expect(page).toContain('displayCurrency = entityCurrency || "USD"');
    });

    it("passes displayCurrency to formatCurrency calls", () => {
      const formatCalls = page.match(/formatCurrency\([^)]+\)/g);
      expect(formatCalls).not.toBeNull();
      // Most calls should include displayCurrency
      const withCurrency = formatCalls!.filter((c) =>
        c.includes("displayCurrency"),
      );
      expect(withCurrency.length).toBeGreaterThan(5);
    });

    it("formatCurrency import exists", () => {
      expect(page).toContain("import { cn, formatCurrency }");
    });
  });

  // ─── Entity Switcher Shows Currency ────────────────────────────────
  describe("Entity switcher shows currency", () => {
    let switcher: string;

    beforeAll(() => {
      switcher = readFile("components/layout/entity-switcher.tsx");
    });

    it("Entity type includes currency field", () => {
      expect(switcher).toContain("currency?: string");
    });

    it("dropdown shows currency badge", () => {
      expect(switcher).toContain("entity.currency");
    });

    it("currency badge uses tabular-nums for alignment", () => {
      expect(switcher).toContain("tabular-nums");
    });

    it("current entity button shows currency", () => {
      expect(switcher).toContain("entityCurrency");
    });
  });

  // ─── Multi-Currency Support ───────────────────────────────────────
  describe("Multi-currency support", () => {
    let hook: string;

    beforeAll(() => {
      hook = readFile("lib/hooks/use-currency.ts");
    });

    it("formatWithSymbol accepts fromCurrency parameter", () => {
      expect(hook).toContain("fromCurrency: string");
    });

    it("formatWithSymbol accepts toCurrency parameter", () => {
      expect(hook).toContain("toCurrency?: string");
    });

    it("format accepts overrideCurrency parameter", () => {
      expect(hook).toContain("overrideCurrency?: string");
    });
  });
});
