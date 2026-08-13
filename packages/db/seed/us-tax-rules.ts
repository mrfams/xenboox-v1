// ─── US Tax Rules — demo seed data (parity-guarded) ────────────────────────
//
// Single source of truth for the US sales-tax pack installed into the third
// demo entity (Brooklyn Goods LLC) by seed/index.ts. It mirrors the four
// catalog presets in packages/agents/core/tax-presets.ts that the US demo
// ships: New York (4% state), New York City combined (8.875% = State 4% +
// City 4.5% + MCTD 0.375%), California (7.25% = State 6% + mandatory local
// 1.25%), and Texas (6.25% state).
//
// The seed can't import the catalog itself (@xenboox/agents depends on
// @xenboox/db), so this module holds the data AND
// apps/web/__tests__/tax-preset-seed-parity.test.ts asserts it stays in lock
// step with the matching catalog presets — a catalog rate, component, or name
// change fails the test until the demo seed is updated in the same change.

import type { TaxRateConfig } from "../schema/tax-compliance";

export type UsTaxRuleRow = {
  ruleType: "sales_tax";
  name: string;
  description: string;
  appliesTo: "sales";
  effectiveFrom: string;
  rateOrBands: TaxRateConfig;
  source: string;
};

/** The 4 US sales-tax rules installed into the US demo entity by seed/index.ts. */
export const US_TAX_RULES: UsTaxRuleRow[] = [
  {
    ruleType: "sales_tax",
    name: "US Sales Tax — New York",
    description:
      "4% state base rate. Local add-ons average ~4.54%. e.g. New York City 8.875% (4% state + 4.5% city + 0.375% MCTD). Local rates vary by jurisdiction — add your exact city/county rates as components or per-customer overrides.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.04 },
    source:
      "Tax Foundation 2025 state sales tax rates; state revenue departments",
  },
  {
    ruleType: "sales_tax",
    name: "US Sales Tax — New York City (Combined)",
    description:
      "8.875% combined New York City rate: State 4% + City 4.5% + MCTD 0.375%.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateOrBands: {
      type: "rate",
      components: [
        { name: "State", rate: 0.04 },
        { name: "City", rate: 0.045 },
        { name: "MCTD", rate: 0.00375 },
      ],
    },
    source: "NY State Dept. of Taxation & Finance; NYC combined rate 8.875%",
  },
  {
    ruleType: "sales_tax",
    name: "US Sales Tax — California",
    description:
      "7.25% base rate (State 6% + Mandatory local 1.25%). The base includes a 1.25% mandatory local add-on; district taxes can add up to ~2.5% more. e.g. Los Angeles 9.50%. Local rates vary by jurisdiction — add your exact city/county rates as components or per-customer overrides.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateOrBands: {
      type: "rate",
      components: [
        { name: "State", rate: 0.06 },
        { name: "Mandatory local", rate: 0.0125 },
      ],
    },
    source:
      "Tax Foundation 2025 state sales tax rates; state revenue departments",
  },
  {
    ruleType: "sales_tax",
    name: "US Sales Tax — Texas",
    description:
      "6.25% state base rate. Local add-ons average ~1.95%. e.g. Dallas / Houston 8.25%. Local rates vary by jurisdiction — add your exact city/county rates as components or per-customer overrides.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.0625 },
    source:
      "Tax Foundation 2025 state sales tax rates; state revenue departments",
  },
];
