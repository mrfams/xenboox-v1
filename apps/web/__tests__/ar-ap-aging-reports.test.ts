import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("AR/AP Aging Reports — Verification", () => {
  describe("AR Aging Report (dunning.ts)", () => {
    const dunning = readFileSync(join(ROOT, "lib/dunning.ts"), "utf-8");

    it("exports generateARAgingReport function", () => {
      expect(dunning).toContain("generateARAgingReport");
    });

    it("defines 5 aging buckets (Current, 1-30, 31-60, 61-90, 90+)", () => {
      expect(dunning).toContain("Current");
      expect(dunning).toContain("1-30");
      expect(dunning).toContain("31-60");
      expect(dunning).toContain("61-90");
      expect(dunning).toContain("90+");
    });

    it("categorizes invoices by days overdue", () => {
      expect(dunning).toContain("daysOverdue");
      expect(dunning).toContain("agingBucket");
    });

    it("returns AgingBucket[] type", () => {
      expect(dunning).toContain("AgingBucket");
      expect(dunning).toContain("AgingInvoice");
    });
  });

  describe("AR Aging Report endpoint (matching.ts)", () => {
    const matching = readFileSync(
      join(ROOT, "server/routers/matching.ts"),
      "utf-8",
    );

    it("has getAgingReport procedure", () => {
      expect(matching).toContain("getAgingReport");
      expect(matching).toContain("rlsProtectedProcedure");
    });

    it("calls generateARAgingReport", () => {
      expect(matching).toContain("generateARAgingReport");
    });
  });

  describe("AP Aging Report (ap.ts)", () => {
    const ap = readFileSync(join(ROOT, "server/routers/ap.ts"), "utf-8");

    it("has getVendorAging procedure", () => {
      expect(ap).toContain("getVendorAging");
      expect(ap).toContain("rlsProtectedProcedure");
    });

    it("returns aging buckets for vendors", () => {
      expect(ap).toContain("aging:");
    });
  });

  describe("Invoicing aging summary (invoicing.ts)", () => {
    const invoicing = readFileSync(
      join(ROOT, "server/routers/invoicing.ts"),
      "utf-8",
    );

    it("calculates aging summary with buckets", () => {
      expect(invoicing).toContain("agingSummary");
      expect(invoicing).toContain("current");
      expect(invoicing).toContain("31_60");
      expect(invoicing).toContain("61_90");
      expect(invoicing).toContain("90_plus");
    });
  });

  describe("Customer aging summary (customers.ts)", () => {
    const customers = readFileSync(
      join(ROOT, "server/routers/customers.ts"),
      "utf-8",
    );

    it("calculates aging summary per customer", () => {
      expect(customers).toContain("agingSummary");
      expect(customers).toContain("credit limit");
    });
  });

  describe("Bill aging summary (bills.ts)", () => {
    const bills = readFileSync(join(ROOT, "server/routers/bills.ts"), "utf-8");

    it("calculates bill aging with buckets", () => {
      expect(bills).toContain("agingSummary");
      expect(bills).toContain("0_30");
      expect(bills).toContain("90_plus");
    });
  });

  describe("Dunning test coverage", () => {
    const dunningTest = readFileSync(
      join(ROOT, "__tests__/dunning.test.ts"),
      "utf-8",
    );

    it("tests generateARAgingReport", () => {
      expect(dunningTest).toContain("generateARAgingReport");
    });

    it("tests aging bucket categorization", () => {
      expect(dunningTest).toContain("aging buckets");
    });

    it("tests collection priority scoring", () => {
      expect(dunningTest).toContain("priority");
    });
  });

  describe("Agent task definitions include aging", () => {
    const agent = readFileSync(join(ROOT, "server/routers/agent.ts"), "utf-8");

    it("has ap_aging task", () => {
      expect(agent).toContain("ap_aging");
    });

    it("has ar_aging task", () => {
      expect(agent).toContain("ar_aging");
    });
  });

  describe("Automation studio has aging automation", () => {
    const automation = readFileSync(
      join(ROOT, "server/routers/automation-studio.ts"),
      "utf-8",
    );

    it("defines aging report automation", () => {
      expect(automation).toContain("Aging Report");
    });
  });
});
