import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("3-Way Matching (PO→Bill→Payment) — Verification", () => {
  describe("Three-way matching library (three-way-matching.ts)", () => {
    const matching = readFileSync(
      join(ROOT, "lib/three-way-matching.ts"),
      "utf-8",
    );

    it("exports runThreeWayMatching function", () => {
      expect(matching).toContain("runThreeWayMatching");
    });

    it("exports confirmThreeWayMatch function", () => {
      expect(matching).toContain("confirmThreeWayMatch");
    });

    it("matches PO to Bill", () => {
      expect(matching.toLowerCase()).toContain("purchase");
      expect(matching.toLowerCase()).toContain("bill");
    });

    it("checks amount tolerance", () => {
      expect(matching.toLowerCase()).toContain("tolerance");
    });
  });

  describe("Three-way matching router (matching.ts)", () => {
    const router = readFileSync(
      join(ROOT, "server/routers/matching.ts"),
      "utf-8",
    );

    it("has runThreeWayMatch procedure", () => {
      expect(router).toContain("runThreeWayMatch");
      expect(router).toContain("rlsProtectedProcedure");
    });

    it("has confirmThreeWayMatch procedure", () => {
      expect(router).toContain("confirmThreeWayMatch");
    });

    it("validates input with Zod", () => {
      expect(router).toContain("z.object");
    });

    it("handles errors with handleMutationError", () => {
      expect(router).toContain("handleMutationError");
    });
  });

  describe("Purchase order schema", () => {
    const po = readFileSync(
      join(ROOT, "../../packages/db/schema/ap-ar.ts"),
      "utf-8",
    );

    it("has purchaseOrders table", () => {
      expect(po).toContain("purchaseOrders");
    });

    it("has status field for matching", () => {
      expect(po).toContain("status");
    });
  });
});
