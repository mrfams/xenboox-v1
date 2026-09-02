import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Bundle Analysis — Verification", () => {
  describe("Bundle analyzer installed", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf-8");

    it("has @next/bundle-analyzer dependency", () => {
      expect(pkg).toContain("@next/bundle-analyzer");
    });
  });

  describe("Next.js config uses bundle analyzer", () => {
    const nextConfig = readFileSync(join(ROOT, "next.config.ts"), "utf-8");

    it("imports or uses bundle analyzer", () => {
      expect(nextConfig.toLowerCase()).toContain("bundle");
    });
  });

  describe("Build output analysis", () => {
    const pkg = readFileSync(join(ROOT, "package.json"), "utf-8");

    it("has build script", () => {
      expect(pkg).toContain('"build"');
    });

    it("has analyze script or bundle analyzer configured", () => {
      const hasAnalysis =
        pkg.includes("analyze") || pkg.includes("bundle-analyzer");
      expect(hasAnalysis).toBe(true);
    });
  });
});
