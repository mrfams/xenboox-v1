// ─── Payroll Conditional Statutory Rules — Unit Tests ──────────────────────
//
// Covers the per-employee resolution path: a user-configured CONDITIONAL tax
// rule (e.g. non-citizen / non-resident PAYE or social-security rates) is
// evaluated against each employee's tax status before the payroll pipeline
// computes deductions. This is what makes "non-citizens pay a different rate"
// real without any code change.

import { describe, it, expect } from "vitest";

import type { TaxRateConfig } from "@xenboox/db/schema/tax-compliance";
import {
  conditionalStatutoryRuleOverride,
  calculatePayeForJurisdiction,
  calculateSocialSecurityForJurisdiction,
  STATUTORY_RULES,
} from "../payroll-pipeline";

const nonResidentPaye: TaxRateConfig = {
  type: "conditional",
  conditions: [
    { field: "tax_status", operator: "eq", value: "non_resident", rate: 0.25 },
  ],
  rate: 0.1, // resident default
};

describe("conditionalStatutoryRuleOverride", () => {
  it("returns an override with the employee's matched rate", () => {
    const override = conditionalStatutoryRuleOverride(
      STATUTORY_RULES.GM.paye,
      nonResidentPaye,
      { taxStatus: "non_resident" },
    );
    expect(override?.bands[0]?.rate).toBe(0.25);
  });

  it("returns the default rate when nothing matches (residents)", () => {
    const override = conditionalStatutoryRuleOverride(
      STATUTORY_RULES.GM.paye,
      nonResidentPaye,
      { taxStatus: "resident" },
    );
    expect(override?.bands[0]?.rate).toBe(0.1);
  });

  it("returns undefined for non-conditional configs (no per-employee split)", () => {
    const override = conditionalStatutoryRuleOverride(
      STATUTORY_RULES.GM.paye,
      { type: "rate", rate: 0.1 },
      { taxStatus: "resident" },
    );
    expect(override).toBeUndefined();
  });

  it("keeps the built-in personal relief unless the config overrides it", () => {
    const override = conditionalStatutoryRuleOverride(
      STATUTORY_RULES.GM.paye,
      nonResidentPaye,
      { taxStatus: "non_resident" },
    );
    expect(override?.personalRelief).toBe(
      STATUTORY_RULES.GM.paye.personalRelief,
    );
  });
});

describe("conditional rules drive payroll statutory calculation", () => {
  it("non-resident PAYE rate flows through calculatePayeForJurisdiction", () => {
    const override = conditionalStatutoryRuleOverride(
      STATUTORY_RULES.GM.paye,
      nonResidentPaye,
      { taxStatus: "non_resident" },
    )!;
    // 10,000 @ 25% = 2,500, minus the built-in GM relief of 300.
    const tax = calculatePayeForJurisdiction(10000, "GM", override);
    expect(tax).toBe(2200);
  });

  it("non-citizen social-security employee rate is applied while the company share is kept", () => {
    const override = conditionalStatutoryRuleOverride(
      STATUTORY_RULES.GM.socialSecurity,
      {
        type: "conditional",
        conditions: [
          {
            field: "tax_status",
            operator: "eq",
            value: "non_citizen",
            rate: 0.03,
          },
        ],
        rate: 0.05,
      },
      { taxStatus: "non_citizen" },
    )!;
    const ss = calculateSocialSecurityForJurisdiction(20000, "GM", override);
    expect(ss.employee).toBe(600); // 20,000 × 3% (non-citizen rate)
    expect(ss.employer).toBe(2000); // 20,000 × 10% (company share kept)
  });
});
