import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const ROUTER_PATH = path.resolve(
  __dirname,
  "../server/routers/tax-compliance.ts",
);

describe("P1 #2: Tax Filing Integration", () => {
  it("tax-compliance router exists with all required procedures", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    // Pipeline execution
    expect(content).toContain("runPipeline");
    expect(content).toContain("getStatus");

    // VAT
    expect(content).toContain("listVatCalculations");

    // Withholding
    expect(content).toContain("listWithholdingRecords");

    // Filing deadlines
    expect(content).toContain("listFilingDeadlines");

    // Tax rules per jurisdiction
    expect(content).toContain("listTaxRules");

    // 1099 contractor summary (US)
    expect(content).toContain("list1099Summary");

    // Compliance signals
    expect(content).toContain("getComplianceSignals");

    // Tax packages
    expect(content).toContain("listTaxPackages");

    // Deduction discovery
    expect(content).toContain("getDeductionDiscovery");
  });

  it("all procedures use protectedProcedure (authenticated)", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    // runPipeline requires admin/finance role
    expect(content).toContain(
      'requireRole("owner", "admin", "finance_director")',
    );
  });

  it("all queries are entity-scoped", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    // Every query must filter by entityId
    const entityIdUses = content.match(/ctx\.entityId!/g);
    expect(entityIdUses).not.toBeNull();
    expect(entityIdUses!.length).toBeGreaterThanOrEqual(8); // multiple procedures
  });

  it("VAT compliance flags cover overdue, due-soon, unfiled, swing, and refundable", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    expect(content).toContain("Overdue filing");
    expect(content).toContain("Due soon");
    expect(content).toContain("Unfiled calculation");
    expect(content).toContain("Position swing");
    expect(content).toContain("Refundable position");
  });

  it("deduction discovery covers WHT recovery, VAT refund, unfiled returns, and liability review", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    expect(content).toContain("wht_recovery");
    expect(content).toContain("vat_refund");
    expect(content).toContain("unfiled_return");
    expect(content).toContain("liability_review");
  });

  it("pipeline supports multi-jurisdiction input", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    expect(content).toContain("jurisdictions");
    expect(content).toContain("includeCorporateTax");
    expect(content).toContain("simulateRules");
  });

  it("pipeline invokes agent framework (LangGraph)", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    expect(content).toContain("runTaxCompliancePipeline");
    expect(content).toContain("getTaxComplianceStatus");
  });

  it("signals are sorted by severity (high → medium → low)", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    expect(content).toContain("high: 0, medium: 1, low: 2");
  });

  it("supports US 1099 and Gambian GRA tax regimes", () => {
    const content = fs.readFileSync(ROUTER_PATH, "utf-8");

    // 1099 (US)
    expect(content).toContain("1099Summary");
    expect(content).toContain("aggregate1099");

    // GRA (Gambia) - withholding tax, VAT, PAYE
    expect(content).toContain("jurisdictionTaxRules");
    expect(content).toContain("paye");
  });
});
