// ─── Senegal Tax Rules — demo seed data (parity-guarded) ────────────────────
//
// Single source of truth for the Senegal tax pack installed into the second
// demo entity (Dakar Distribution SARL) by seed/index.ts. It mirrors
// SN_PRESETS in packages/agents/core/tax-presets.ts (the preset catalog).
//
// The seed can't import the catalog itself (@xenboox/agents depends on
// @xenboox/db), so this module holds the data AND
// apps/web/__tests__/tax-preset-seed-parity.test.ts asserts it stays in lock
// step with getTaxPresetsForCountry("SN") — a catalog rate change fails the
// test until the demo seed is updated in the same change.

import type { TaxRateConfig } from "../schema/tax-compliance";

export type SnTaxRuleRow = {
  ruleType: "vat" | "paye" | "social_security" | "withholding" | "corporate";
  name: string;
  description: string;
  appliesTo: "sales" | "purchases" | "payroll" | "income";
  effectiveFrom: string;
  rateOrBands: TaxRateConfig;
  source: string;
};

/** The 5 Senegal rules installed into the SN demo entity by seed/index.ts. */
export const SN_TAX_RULES: SnTaxRuleRow[] = [
  {
    ruleType: "vat",
    name: "TVA (Senegal)",
    description:
      "Standard 18% value-added tax (taxe sur la valeur ajoutée) on goods and services.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.18 },
    source: "Code Général des Impôts du Sénégal; standard TVA 18%",
  },
  {
    ruleType: "paye",
    name: "DGID IRSA (Senegal)",
    description:
      "Progressive monthly income tax on salaries (IRSA) in XOF. Matches the built-in payroll rule.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateOrBands: {
      type: "bands",
      bands: [
        { from: 0, to: 52500, rate: 0 },
        { from: 52501, to: 105000, rate: 0.1 },
        { from: 105001, to: 157500, rate: 0.2 },
        { from: 157501, to: 210000, rate: 0.3 },
        { from: 210001, to: null, rate: 0.4 },
      ],
    },
    source: "CGI Senegal IRSA schedule; matches in-repo STATUTORY_RULES",
  },
  {
    ruleType: "social_security",
    name: "IPRES + CSS (Senegal)",
    description:
      "Pension (IPRES) plus family/occupational (CSS) contributions: 6.25% employee + 19.75% employer.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateOrBands: {
      type: "rate",
      employeeRate: 0.0625,
      employerRate: 0.1975,
    },
    source: "IPRES/CSS contribution schedule; matches in-repo STATUTORY_RULES",
  },
  {
    ruleType: "withholding",
    name: "DGID Withholding Tax (Senegal)",
    description:
      "5% withholding on service payments; dividends 10%, royalties/technical fees up to 20%.",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.05 },
    source: "CGI Senegal withholding schedule; matches in-repo STATUTORY_RULES",
  },
  {
    ruleType: "corporate",
    name: "Senegal Corporate Income Tax",
    description:
      "30% corporate income tax (IS) on taxable profits; minimum flat tax 0.5% of turnover for low-profit companies.",
    appliesTo: "income",
    effectiveFrom: "2025-01-01",
    rateOrBands: { type: "rate", rate: 0.3 },
    source: "CGI Senegal; IS 30%",
  },
];
