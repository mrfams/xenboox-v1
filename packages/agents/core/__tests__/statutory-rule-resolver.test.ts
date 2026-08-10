// ─── Statutory Rule Resolver — Unit Tests ──────────────────────────────────
//
// Bridges the user-configured jurisdiction_tax_rules (the Settings UI writes
// these) into the StatutoryRule shape the payroll pipeline computes with.
// Entity-configured rules WIN over the built-in STATUTORY_RULES; countries
// the user hasn't configured fall back to the built-in set so payroll keeps
// working out of the box.

import { describe, it, expect } from "vitest";

import {
  mapTaxRuleToStatutory,
  mergeConfiguredRules,
  type ConfiguredStatutoryRules,
} from "../statutory-rule-resolver";

describe("mapTaxRuleToStatutory", () => {
  it("maps a banded PAYE rule with a personal relief threshold", () => {
    const mapped = mapTaxRuleToStatutory({
      id: "rule-1",
      country: "GM",
      ruleType: "paye",
      version: 3,
      name: "GRA PAYE (edited)",
      rateOrBands: {
        type: "bands",
        bands: [
          { from: 0, to: 3000, rate: 0 },
          { from: 3000, to: 6000, rate: 0.1 },
          { from: 6000, to: 12000, rate: 0.15 },
          { from: 12000, to: null, rate: 0.2 },
        ],
        threshold: 300,
      },
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
    });

    expect(mapped).toMatchObject({
      id: "rule-1",
      jurisdiction: "GM",
      ruleType: "paye",
      personalRelief: 300,
      effectiveFrom: "2026-01-01",
    });
    expect(mapped.bands.length).toBe(4);
    expect(mapped.bands[1]).toEqual({
      from: 3000,
      to: 6000,
      rate: 0.1,
      cumulative: false,
    });
  });

  it("maps a split social-security rule with employee/employer rates + ceiling", () => {
    const mapped = mapTaxRuleToStatutory({
      id: "rule-2",
      country: "GM",
      ruleType: "social_security",
      version: 2,
      name: "SSHFC (company pays employee share)",
      rateOrBands: {
        type: "rate",
        rate: 0.05,
        employeeRate: 0.0, // company picked up the employee share
        employerRate: 0.15,
        ceiling: 30000,
      },
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
    });

    expect(mapped.ruleType).toBe("social_security");
    expect(mapped.employeeContributionRate).toBe(0);
    expect(mapped.employerContributionRate).toBe(0.15);
    expect(mapped.ceiling).toBe(30000);
  });

  it("falls back to a flat-rate single band when no bands are configured", () => {
    const mapped = mapTaxRuleToStatutory({
      id: "rule-3",
      country: "NG",
      ruleType: "withholding",
      version: 1,
      name: "WHT",
      rateOrBands: { type: "rate", rate: 0.1 },
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
    });
    expect(mapped.bands).toEqual([
      { from: 0, to: null, rate: 0.1, cumulative: false },
    ]);
  });
});

describe("mergeConfiguredRules", () => {
  const configured: ConfiguredStatutoryRules = {
    GM: {
      paye: {
        id: "c-paye-gm",
        jurisdiction: "GM",
        ruleType: "paye",
        name: "Edited GM PAYE",
        bands: [
          { from: 0, to: 3000, rate: 0, cumulative: false },
          { from: 3000, to: null, rate: 0.12, cumulative: false },
        ],
        personalRelief: 500,
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
      },
      socialSecurity: {
        id: "c-ss-gm",
        jurisdiction: "GM",
        ruleType: "social_security",
        name: "Edited SSHFC",
        bands: [{ from: 0, to: null, rate: 0.05, cumulative: false }],
        employeeContributionRate: 0.05,
        employerContributionRate: 0.12,
        ceiling: 30000,
        effectiveFrom: "2026-01-01",
        effectiveTo: null,
      },
    },
  };

  it("uses configured rules and keeps built-in fallback for unconfigured parts", () => {
    const merged = mergeConfiguredRules(configured, "GM");

    // Configured parts win.
    expect(merged.paye.id).toBe("c-paye-gm");
    expect(merged.paye.bands[1]?.rate).toBe(0.12);
    expect(merged.socialSecurity.employerContributionRate).toBe(0.12);

    // Unconfigured parts fall back to built-ins.
    expect(merged.withholdingTax).toBeDefined();
    expect(merged.withholdingTax.bands[0]?.rate).toBe(0.1); // GM built-in
  });

  it("keeps the built-in set entirely for unconfigured jurisdictions", () => {
    const merged = mergeConfiguredRules(configured, "NG");
    expect(merged.paye.id).toBe("paye-ng");
    expect(merged.socialSecurity.id).toBe("ss-ng");
  });
});
