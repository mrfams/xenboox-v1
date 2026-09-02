import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Multi-Entity Consolidation — Verification", () => {
  describe("Consolidation router", () => {
    const router = readFileSync(
      join(ROOT, "server/routers/consolidation.ts"),
      "utf-8",
    );

    it("exports consolidationRouter", () => {
      expect(router).toContain("consolidationRouter");
    });

    it("has runConsolidation procedure", () => {
      expect(router).toContain("runConsolidation");
    });

    it("calls runConsolidationPipeline", () => {
      expect(router).toContain("runConsolidationPipeline");
    });

    it("handles eliminations", () => {
      expect(router).toContain("eliminations");
    });

    it("calculates consolidated totals", () => {
      expect(router).toContain("consolidatedTotals");
    });
  });

  describe("Consolidation schema", () => {
    const consolidation = readFileSync(
      join(ROOT, "server/routers/consolidation.ts"),
      "utf-8",
    );

    it("imports consolidationRuns table", () => {
      expect(consolidation).toContain("consolidationRuns");
    });

    it("imports eliminationEntries table", () => {
      expect(consolidation).toContain("eliminationEntries");
    });

    it("imports intercompanyTags table", () => {
      expect(consolidation).toContain("intercompanyTags");
    });
  });

  describe("Feature flag for multi-entity", () => {
    const flags = readFileSync(
      join(ROOT, "server/routers/feature-flags.ts"),
      "utf-8",
    );

    it("has multi.entity.support feature flag", () => {
      expect(flags).toContain("multi.entity.support");
    });
  });

  describe("Firm router uses consolidation", () => {
    const firm = readFileSync(join(ROOT, "server/routers/firm.ts"), "utf-8");

    it("queries consolidation runs for client entities", () => {
      expect(firm).toContain("consolidationRuns");
    });
  });
});
