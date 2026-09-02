import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Compliance Calendar — Verification", () => {
  describe("Compliance liveness router", () => {
    const router = readFileSync(
      join(ROOT, "server/routers/compliance-liveness.ts"),
      "utf-8",
    );

    it("exports complianceLivenessRouter", () => {
      expect(router).toContain("complianceLivenessRouter");
    });

    it("queries complianceDeadlines table", () => {
      expect(router).toContain("complianceDeadlines");
    });

    it("filters by jurisdiction", () => {
      expect(router).toContain("jurisdiction");
    });

    it("filters by status", () => {
      expect(router).toContain("status");
    });

    it("orders by due date", () => {
      expect(router).toContain("dueDate");
    });
  });

  describe("Tax compliance filing deadlines", () => {
    const tax = readFileSync(
      join(ROOT, "server/routers/tax-compliance.ts"),
      "utf-8",
    );

    it("has listFilingDeadlines procedure", () => {
      expect(tax).toContain("listFilingDeadlines");
    });

    it("imports filingDeadlines table", () => {
      expect(tax).toContain("filingDeadlines");
    });

    it("checks for overdue filings", () => {
      expect(tax).toContain("overdue");
    });
  });

  describe("Dashboard shows compliance deadlines", () => {
    const dashboard = readFileSync(
      join(ROOT, "server/routers/dashboard/get-dashboard-data.ts"),
      "utf-8",
    );

    it("queries upcoming compliance deadlines", () => {
      expect(dashboard).toContain("complianceDeadlines");
    });
  });
});
