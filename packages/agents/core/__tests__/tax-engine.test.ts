// ─── Configurable Tax Engine — Unit Tests ──────────────────────────────────
//
// The engine is the single computation path for ALL tax rules the user can
// configure: flat percentage, fixed amount, progressive bands, conditional
// rates, exemption thresholds, ceilings, and employer/employee split
// contributions. Regressions here are tax-correctness bugs.

import { describe, it, expect } from "vitest";

import {
  calculateTax,
  calculateSplitContribution,
  resolveRateOverride,
  type TaxContext,
  type TaxRateConfig,
  type RateOverrideInput,
} from "../tax-engine";

// ─── Flat rate ──────────────────────────────────────────────────────────────

describe("flat rate taxes", () => {
  const vat15: TaxRateConfig = { type: "rate", rate: 0.15 };

  it("applies the percentage to the amount", () => {
    expect(calculateTax(vat15, 1000).amount).toBe(150);
    // Half-up money rounding: 37.575 → 37.58
    expect(calculateTax(vat15, 250.5).amount).toBe(37.58);
  });

  it("is zero on a zero amount", () => {
    expect(calculateTax(vat15, 0).amount).toBe(0);
  });

  it("honours an exemption threshold", () => {
    const config: TaxRateConfig = { type: "rate", rate: 0.1, threshold: 100 };
    expect(calculateTax(config, 50).amount).toBe(0);
    expect(calculateTax(config, 150).amount).toBeCloseTo(15, 2);
  });

  it("honours a ceiling on the taxable base", () => {
    const config: TaxRateConfig = { type: "rate", rate: 0.05, ceiling: 30000 };
    expect(calculateTax(config, 50000).amount).toBe(1500);
    expect(calculateTax(config, 20000).amount).toBe(1000);
  });
});

// ─── Fixed amount ───────────────────────────────────────────────────────────

describe("fixed amount taxes", () => {
  it("charges the fixed amount per transaction", () => {
    const config: TaxRateConfig = { type: "fixed", fixedAmount: 50 };
    expect(calculateTax(config, 1000).amount).toBe(50);
    // Without an explicit threshold the fixed charge applies per transaction,
    // even on a zero-amount line (e.g. stamp duty on a document).
    expect(calculateTax(config, 0).amount).toBe(50);
  });

  it("skips the fixed charge below the exemption threshold", () => {
    const config: TaxRateConfig = {
      type: "fixed",
      fixedAmount: 50,
      threshold: 200,
    };
    expect(calculateTax(config, 100).amount).toBe(0);
    expect(calculateTax(config, 500).amount).toBe(50);
  });
});

// ─── Progressive bands ──────────────────────────────────────────────────────

describe("banded taxes", () => {
  // Clean contiguous boundaries (0→3000, 3000→6000, …) so each band taxes
  // exactly the slice that falls inside it — the progressive-bracket shape.
  const paye: TaxRateConfig = {
    type: "bands",
    bands: [
      { from: 0, to: 3000, rate: 0 },
      { from: 3000, to: 6000, rate: 0.1 },
      { from: 6000, to: 12000, rate: 0.15 },
      { from: 12000, to: null, rate: 0.2 },
    ],
  };

  it("taxes only the portion inside each band (progressive)", () => {
    // 8,000: 3,000@0 + 3,000@10% (300) + 2,000@15% (300) = 600
    expect(calculateTax(paye, 8000).amount).toBeCloseTo(600, 2);
    // 5,000: 3,000@0 + 2,000@10% = 200
    expect(calculateTax(paye, 5000).amount).toBeCloseTo(200, 2);
  });

  it("handles amounts above the top band", () => {
    // 20,000: 0 + 300 + 900 + 8,000@20% (1,600) = 2,800
    expect(calculateTax(paye, 20000).amount).toBeCloseTo(2800, 2);
  });

  it("returns zero below the first taxable band", () => {
    expect(calculateTax(paye, 2500).amount).toBe(0);
  });

  it("supports a single catch-all band (flat rate shape)", () => {
    const flat: TaxRateConfig = {
      type: "bands",
      bands: [{ from: 0, to: null, rate: 0.1 }],
    };
    expect(calculateTax(flat, 500).amount).toBe(50);
  });
});

// ─── Conditional rates ──────────────────────────────────────────────────────

describe("conditional taxes", () => {
  const conditional: TaxRateConfig = {
    type: "conditional",
    conditions: [
      { field: "product_category", operator: "eq", value: "books", rate: 0 },
      { field: "product_category", operator: "eq", value: "luxury", rate: 0.2 },
      { field: "customer_type", operator: "eq", value: "exempt_ngo", rate: 0 },
      { field: "amount", operator: "gte", value: 100000, rate: 0.18 },
      { field: "location", operator: "in", value: ["BM", "WK"], rate: 0.16 },
    ],
    rate: 0.15, // default when no condition matches
  };

  it("picks the matching condition by context field", () => {
    expect(
      calculateTax(conditional, 1000, { productCategory: "books" }).amount,
    ).toBe(0);
    expect(
      calculateTax(conditional, 1000, { productCategory: "luxury" }).amount,
    ).toBe(200);
  });

  it("falls back to the default rate when no condition matches", () => {
    expect(
      calculateTax(conditional, 1000, { productCategory: "electronics" })
        .amount,
    ).toBeCloseTo(150, 2);
  });

  it("matches an amount threshold condition", () => {
    expect(calculateTax(conditional, 200000, {}).amount).toBeCloseTo(36000, 2);
    // Below the threshold, falls back to default
    expect(calculateTax(conditional, 50000, {}).amount).toBeCloseTo(7500, 2);
  });

  it("matches an 'in' list condition on location", () => {
    expect(calculateTax(conditional, 1000, { location: "BM" }).amount).toBe(
      160,
    );
    expect(calculateTax(conditional, 1000, { location: "KS" }).amount).toBe(
      150,
    );
  });
});

// ─── Employer / employee split contributions ────────────────────────────────

describe("split contributions (social security, pension)", () => {
  it("computes employee and employer shares with a ceiling", () => {
    const config: TaxRateConfig = {
      type: "rate",
      employeeRate: 0.05,
      employerRate: 0.1,
      ceiling: 30000,
    };
    const { employee, employer } = calculateSplitContribution(config, 50000);
    expect(employee).toBe(1500); // 30,000 * 5%
    expect(employer).toBe(3000); // 30,000 * 10%
  });

  it("uses the full amount when below the ceiling", () => {
    const config: TaxRateConfig = {
      type: "rate",
      employeeRate: 0.05,
      employerRate: 0.1,
      ceiling: 30000,
    };
    const { employee, employer } = calculateSplitContribution(config, 20000);
    expect(employee).toBe(1000);
    expect(employer).toBe(2000);
  });

  it("returns zeros when no split rates are configured", () => {
    const config: TaxRateConfig = { type: "rate", rate: 0.15 };
    const { employee, employer } = calculateSplitContribution(config, 1000);
    expect(employee).toBe(0);
    expect(employer).toBe(0);
  });
});

// ─── Per-person / per-item rate overrides ───────────────────────────────────

describe("rate overrides", () => {
  const overrides: RateOverrideInput[] = [
    {
      taxRuleId: "rule-1",
      appliesToType: "customer",
      appliesToId: "cus-01",
      rate: 0.05,
    },
    {
      taxRuleId: "rule-1",
      appliesToType: "employee",
      appliesToId: "emp-07",
      rate: 0.02,
    },
    {
      taxRuleId: "rule-2",
      appliesToType: "product_category",
      appliesToId: "books",
      rate: 0,
    },
  ];

  it("finds an override for a specific person and rule", () => {
    const override = resolveRateOverride({
      overrides,
      taxRuleId: "rule-1",
      appliesToType: "customer",
      appliesToId: "cus-01",
    });
    expect(override?.rate).toBe(0.05);
    expect(override?.appliesToType).toBe("customer");
  });

  it("returns null when no override matches", () => {
    const override = resolveRateOverride({
      overrides,
      taxRuleId: "rule-1",
      appliesToType: "customer",
      appliesToId: "cus-99",
    });
    expect(override).toBeNull();
  });

  it("does not leak an override across tax rules", () => {
    const override = resolveRateOverride({
      overrides,
      taxRuleId: "rule-2",
      appliesToType: "customer",
      appliesToId: "cus-01",
    });
    expect(override).toBeNull();
  });
});

// ─── Engine-level edge cases ────────────────────────────────────────────────

describe("engine edge cases", () => {
  it("applies an override rate on top of a banded rule", () => {
    const paye: TaxRateConfig = {
      type: "bands",
      bands: [{ from: 0, to: null, rate: 0.2 }],
    };
    const context: TaxContext = {
      overrides: [
        {
          taxRuleId: "rule-x",
          appliesToType: "employee",
          appliesToId: "emp-1",
          rate: 0.1,
        },
      ],
      appliesToType: "employee",
      appliesToId: "emp-1",
      taxRuleId: "rule-x",
    };
    // Override replaces the band rate entirely for that person.
    expect(calculateTax(paye, 1000, context).amount).toBe(100);
  });

  it("never returns a negative tax", () => {
    const config: TaxRateConfig = { type: "rate", rate: -0.1 };
    expect(calculateTax(config, 1000).amount).toBe(0);
  });

  it("is deterministic across repeated calls", () => {
    const config: TaxRateConfig = { type: "rate", rate: 0.15 };
    expect(calculateTax(config, 1000).amount).toBe(
      calculateTax(config, 1000).amount,
    );
  });
});
