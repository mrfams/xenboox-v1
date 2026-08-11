// ─── Gambia Tax Rules — demo seed data (parity-guarded) ────────────────────
//
// Single source of truth for the Gambia tax pack installed into the demo
// entity by seed/index.ts. It mirrors GM_PRESETS in
// packages/agents/core/tax-presets.ts (the preset catalog).
//
// The seed can't import the catalog itself (@xenboox/agents depends on
// @xenboox/db), so this module holds the data AND
// apps/web/__tests__/tax-preset-seed-parity.test.ts asserts it stays in lock
// step with getTaxPresetsForCountry("GM") — a catalog rate change fails the
// test until the demo seed is updated in the same change.

import type { TaxRateConfig } from "../schema/tax-compliance";

export type GmTaxRuleRow = {
  ruleType: "vat" | "paye" | "social_security" | "withholding" | "corporate";
  name: string;
  description: string;
  appliesTo: "sales" | "purchases" | "payroll" | "income";
  effectiveFrom: string;
  rateOrBands: TaxRateConfig;
  source: string;
};

/** The 5 Gambia rules installed into the demo entity by seed/index.ts. */
export const GM_TAX_RULES: GmTaxRuleRow[] = [
  {
    ruleType: "vat",
    name: "GRA VAT (The Gambia)",
    description:
      "Standard 15% value-added tax on taxable goods and services (VAT Act 2013, amended).",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.15 },
    source: "GRA VAT Act 2013; current statutory rate 15%",
  },
  {
    ruleType: "paye",
    name: "GRA Pay-As-You-Earn (The Gambia)",
    description:
      "Progressive monthly PAYE brackets (GMD). Matches the built-in payroll rule so installed payroll runs agree.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateOrBands: {
      type: "bands",
      bands: [
        { from: 0, to: 3000, rate: 0 },
        { from: 3001, to: 6000, rate: 0.1 },
        { from: 6001, to: 12000, rate: 0.15 },
        { from: 12001, to: 30000, rate: 0.2 },
        { from: 30001, to: null, rate: 0.3 },
      ],
    },
    source: "GRA PAYE schedule; matches in-repo STATUTORY_RULES",
  },
  {
    ruleType: "social_security",
    name: "SSHFC Social Security (The Gambia)",
    description:
      "Social Security & Housing Finance Corporation: 5% employee + 10% employer on monthly insurable earnings, capped at GMD 30,000.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateOrBands: {
      type: "rate",
      employeeRate: 0.05,
      employerRate: 0.1,
      ceiling: 30000,
    },
    source: "SSHFC contribution schedule; matches in-repo STATUTORY_RULES",
  },
  {
    ruleType: "withholding",
    name: "GRA Withholding Tax (The Gambia)",
    description:
      "10% withholding on qualifying payments (contracts, commissions, interest, dividends).",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.1 },
    source:
      "GRA Income Tax Act withholding schedule; matches in-repo STATUTORY_RULES",
  },
  {
    ruleType: "corporate",
    name: "Gambia Corporate Income Tax",
    description:
      "27% corporate income tax on taxable profits of companies resident in The Gambia.",
    appliesTo: "income",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.27 },
    source: "Gambia Income & VAT Act 2012 (as amended); CIT 27%",
  },
];
