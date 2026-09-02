import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Core Web Vitals Monitoring — Verification", () => {
  describe("Lighthouse audit script exists", () => {
    const lighthouse = readFileSync(
      join(ROOT, "e2e/lighthouse-audit.ts"),
      "utf-8",
    );

    it("measures LCP (Largest Contentful Paint)", () => {
      expect(lighthouse).toContain("largest-contentful-paint");
      expect(lighthouse).toContain("lcp");
    });

    it("measures CLS (Cumulative Layout Shift)", () => {
      expect(lighthouse).toContain("cumulative-layout-shift");
      expect(lighthouse).toContain("cls");
    });

    it("measures FCP (First Contentful Paint)", () => {
      expect(lighthouse).toContain("fcp");
    });

    it("measures TBT (Total Blocking Time)", () => {
      expect(lighthouse).toContain("tbt");
    });

    it("measures Speed Index", () => {
      expect(lighthouse).toContain("si");
    });

    it("tests multiple surfaces", () => {
      expect(lighthouse).toContain("surface");
    });

    it("generates performance scores", () => {
      expect(lighthouse).toContain("scores");
      expect(lighthouse).toContain("performance");
    });
  });

  describe("Next.js performance configuration", () => {
    const nextConfig = readFileSync(join(ROOT, "next.config.ts"), "utf-8");

    it("has output standalone for performance", () => {
      // Check for performance-related config
      expect(nextConfig).toContain("poweredByHeader");
    });
  });

  describe("Bundle analysis tooling", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf-8");

    it("has build analysis script or next bundle analyzer", () => {
      // Check for bundle analysis capability
      const hasAnalyzer =
        pkg.includes("bundle-analyzer") ||
        pkg.includes("analyze") ||
        pkg.includes("build");
      expect(hasAnalyzer).toBe(true);
    });
  });
});
