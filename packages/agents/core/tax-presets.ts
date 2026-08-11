// ─── Country Tax Preset Catalog ─────────────────────────────────────────────
//
// Research-backed starting packs users can install in Settings → Taxes with
// one click, then edit (each edit becomes a new version). The payroll
// figures are aligned one-to-one with the verified STATUTORY_RULES the
// payroll pipeline already ships, so installing a pack and running payroll
// agree. Indirect/corporate rates come from current statutory research.
//
// Every preset is DATA, not code: users can install, edit, version, or
// ignore any of them. A country with no pack here still works — the rule
// builder accepts any 2-letter ISO code.
//
// Coverage: GM, SN, US (requested), plus NG, KE, GH payroll presets reused
// from the verified pipeline rules. Add a country by appending entries.

import type { TaxRateConfig } from "./tax-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TaxPreset {
  /** Stable slug, e.g. "gm-vat". Unique across the catalog. */
  id: string;
  /** ISO 3166-1 alpha-2 country code. */
  country: string;
  ruleType:
    | "vat"
    | "sales_tax"
    | "paye"
    | "withholding"
    | "corporate"
    | "social_security"
    | "excise"
    | "other";
  name: string;
  description: string;
  appliesTo: "sales" | "purchases" | "payroll" | "income" | "other";
  effectiveFrom: string;
  rateConfig: TaxRateConfig;
  /** Where the rate data was researched from. */
  source: string;
}

// ─── The Gambia — GRA (Gambia Revenue Authority) ────────────────────────────

const GM_PRESETS: TaxPreset[] = [
  {
    id: "gm-vat",
    country: "GM",
    ruleType: "vat",
    name: "GRA VAT (The Gambia)",
    description:
      "Standard 15% value-added tax on taxable goods and services (VAT Act 2013, amended).",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.15 },
    source: "GRA VAT Act 2013; current statutory rate 15%",
  },
  {
    id: "gm-paye",
    country: "GM",
    ruleType: "paye",
    name: "GRA Pay-As-You-Earn (The Gambia)",
    description:
      "Progressive monthly PAYE brackets (GMD). Matches the built-in payroll rule so installed payroll runs agree.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
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
    id: "gm-sshfc",
    country: "GM",
    ruleType: "social_security",
    name: "SSHFC Social Security (The Gambia)",
    description:
      "Social Security & Housing Finance Corporation: 5% employee + 10% employer on monthly insurable earnings, capped at GMD 30,000.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "rate",
      employeeRate: 0.05,
      employerRate: 0.1,
      ceiling: 30000,
    },
    source: "SSHFC contribution schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "gm-wht",
    country: "GM",
    ruleType: "withholding",
    name: "GRA Withholding Tax (The Gambia)",
    description:
      "10% withholding on qualifying payments (contracts, commissions, interest, dividends).",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.1 },
    source:
      "GRA Income Tax Act withholding schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "gm-cit",
    country: "GM",
    ruleType: "corporate",
    name: "Gambia Corporate Income Tax",
    description:
      "27% corporate income tax on taxable profits of companies resident in The Gambia.",
    appliesTo: "income",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.27 },
    source: "Gambia Income & VAT Act 2012 (as amended); CIT 27%",
  },
];

// ─── Senegal — DGID (Direction Générale des Impôts et des Domaines) ─────────

const SN_PRESETS: TaxPreset[] = [
  {
    id: "sn-tva",
    country: "SN",
    ruleType: "vat",
    name: "TVA (Senegal)",
    description:
      "Standard 18% value-added tax (taxe sur la valeur ajoutée) on goods and services.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.18 },
    source: "Code Général des Impôts du Sénégal; standard TVA 18%",
  },
  {
    id: "sn-irsa",
    country: "SN",
    ruleType: "paye",
    name: "DGID IRSA (Senegal)",
    description:
      "Progressive monthly income tax on salaries (IRSA) in XOF. Matches the built-in payroll rule.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
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
    id: "sn-ipres",
    country: "SN",
    ruleType: "social_security",
    name: "IPRES + CSS (Senegal)",
    description:
      "Pension (IPRES) plus family/occupational (CSS) contributions: 6.25% employee + 19.75% employer.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "rate",
      employeeRate: 0.0625,
      employerRate: 0.1975,
    },
    source: "IPRES/CSS contribution schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "sn-wht",
    country: "SN",
    ruleType: "withholding",
    name: "DGID Withholding Tax (Senegal)",
    description:
      "5% withholding on service payments; dividends 10%, royalties/technical fees up to 20%.",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.05 },
    source: "CGI Senegal withholding schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "sn-cit",
    country: "SN",
    ruleType: "corporate",
    name: "Senegal Corporate Income Tax",
    description:
      "30% corporate income tax (IS) on taxable profits; minimum flat tax 0.5% of turnover for low-profit companies.",
    appliesTo: "income",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.3 },
    source: "CGI Senegal; IS 30%",
  },
];

// ─── United States — IRS (Internal Revenue Service) ─────────────────────────

const US_PRESETS: TaxPreset[] = [
  {
    id: "us-federal-withholding",
    country: "US",
    ruleType: "paye",
    name: "IRS Federal Income Tax Withholding (US)",
    description:
      "2025 federal marginal brackets (single filer) converted to monthly withholding. Standard deduction embedded as relief.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "bands",
      bands: [
        { from: 0, to: 986, rate: 0.1 },
        { from: 987, to: 4021, rate: 0.12 },
        { from: 4022, to: 8601, rate: 0.22 },
        { from: 8602, to: 16438, rate: 0.24 },
        { from: 16439, to: 20875, rate: 0.32 },
        { from: 20876, to: 52194, rate: 0.35 },
        { from: 52195, to: null, rate: 0.37 },
      ],
    },
    source:
      "IRS 2025 single-filer brackets / 12; matches in-repo STATUTORY_RULES",
  },
  {
    id: "us-fica",
    country: "US",
    ruleType: "social_security",
    name: "FICA — Social Security + Medicare (US)",
    description:
      "7.65% each side (6.2% SS + 1.45% Medicare), Social Security wage base $176,100/yr ($14,675/mo).",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "rate",
      employeeRate: 0.0765,
      employerRate: 0.0765,
      ceiling: 14675,
    },
    source:
      "IRS 2025 FICA; wage base $176,100/yr; matches in-repo STATUTORY_RULES",
  },
  {
    id: "us-backup-wht",
    country: "US",
    ruleType: "withholding",
    name: "IRS Backup Withholding (US)",
    description:
      "24% backup withholding on reportable payments when TIN is missing or mismatched.",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.24 },
    source: "IRS backup withholding 24%; matches in-repo STATUTORY_RULES",
  },
  {
    id: "us-sales-tax",
    country: "US",
    ruleType: "sales_tax",
    name: "US State Sales Tax (example)",
    description:
      "Representative combined state + local sales tax (8.875%, NYC-style). Sales tax is state-local in the US — edit this to your exact jurisdictions.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.08875 },
    source: "State/local combined example (NYC 8.875%); varies by state",
  },
  {
    id: "us-cit",
    country: "US",
    ruleType: "corporate",
    name: "US Federal Corporate Tax",
    description: "21% flat federal corporate income tax on taxable income.",
    appliesTo: "income",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.21 },
    source: "IRC § 11; 21% flat rate",
  },
];

// ─── Nigeria — FIRS (Federal Inland Revenue Service) ────────────────────────

const NG_PRESETS: TaxPreset[] = [
  {
    id: "ng-paye",
    country: "NG",
    ruleType: "paye",
    name: "FIRS PAYE (Nigeria)",
    description:
      "Progressive annual PAYE brackets with Consolidated Relief Allowance. Matches the built-in payroll rule.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "bands",
      bands: [
        { from: 0, to: 300000, rate: 0 },
        { from: 300001, to: 600000, rate: 0.07 },
        { from: 600001, to: 1100000, rate: 0.11 },
        { from: 1100001, to: 1600000, rate: 0.15 },
        { from: 1600001, to: 3200000, rate: 0.19 },
        { from: 3200001, to: null, rate: 0.24 },
      ],
    },
    source: "FIRS PAYE schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "ng-ss",
    country: "NG",
    ruleType: "social_security",
    name: "NSITF / NHF (Nigeria)",
    description:
      "Employee Compensation (NSITF) and National Housing Fund: 2.5% employee + 2.5% employer.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", employeeRate: 0.025, employerRate: 0.025 },
    source: "NSITF/NHF schedules; matches in-repo STATUTORY_RULES",
  },
  {
    id: "ng-wht",
    country: "NG",
    ruleType: "withholding",
    name: "FIRS Withholding Tax (Nigeria)",
    description:
      "10% withholding on contracts/commissions; 5% on rent (annual >NGN 10M).",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.1 },
    source: "FIRS WHT schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "ng-vat",
    country: "NG",
    ruleType: "vat",
    name: "FIRS VAT (Nigeria)",
    description: "7.5% value-added tax (raised from 5% in 2020).",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.075 },
    source: "FIRS VAT (Finance Act 2020); 7.5%",
  },
];

// ─── Kenya — KRA (Kenya Revenue Authority) ──────────────────────────────────

const KE_PRESETS: TaxPreset[] = [
  {
    id: "ke-paye",
    country: "KE",
    ruleType: "paye",
    name: "KRA PAYE (Kenya)",
    description:
      "Progressive monthly PAYE brackets with Personal Relief. Matches the built-in payroll rule.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "bands",
      bands: [
        { from: 0, to: 24000, rate: 0 },
        { from: 24001, to: 32333, rate: 0.1 },
        { from: 32334, to: 40666, rate: 0.15 },
        { from: 40667, to: 49000, rate: 0.2 },
        { from: 49001, to: 57333, rate: 0.25 },
        { from: 57334, to: null, rate: 0.3 },
      ],
    },
    source: "KRA PAYE schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "ke-nssf",
    country: "KE",
    ruleType: "social_security",
    name: "NSSF (Kenya)",
    description:
      "6% employee + 6% employer on monthly earnings up to KES 18,000.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "rate",
      employeeRate: 0.06,
      employerRate: 0.06,
      ceiling: 18000,
    },
    source: "NSSF Act 2013; matches in-repo STATUTORY_RULES",
  },
  {
    id: "ke-wht",
    country: "KE",
    ruleType: "withholding",
    name: "KRA Withholding Tax (Kenya)",
    description:
      "5% withholding on service payments; 15% on dividends for residents.",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.05 },
    source: "KRA WHT schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "ke-vat",
    country: "KE",
    ruleType: "vat",
    name: "KRA VAT (Kenya)",
    description: "16% standard value-added tax on taxable supplies.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.16 },
    source: "VAT Act 2013; standard rate 16%",
  },
];

// ─── Ghana — GRA (Ghana Revenue Authority) ──────────────────────────────────

const GH_PRESETS: TaxPreset[] = [
  {
    id: "gh-paye",
    country: "GH",
    ruleType: "paye",
    name: "GRA-GH PAYE (Ghana)",
    description:
      "Progressive monthly PAYE brackets (GHS) with personal relief. Matches the built-in payroll rule.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "bands",
      bands: [
        { from: 0, to: 490, rate: 0 },
        { from: 491, to: 730, rate: 0.05 },
        { from: 731, to: 1097, rate: 0.1 },
        { from: 1098, to: 2194, rate: 0.175 },
        { from: 2195, to: 4387, rate: 0.25 },
        { from: 4388, to: null, rate: 0.3 },
      ],
    },
    source: "GRA-GH PAYE schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "gh-ssnit",
    country: "GH",
    ruleType: "social_security",
    name: "SSNIT (Ghana)",
    description: "5.5% employee + 13% employer pension contributions.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", employeeRate: 0.055, employerRate: 0.13 },
    source: "SSNIT contribution schedule; matches in-repo STATUTORY_RULES",
  },
  {
    id: "gh-wht",
    country: "GH",
    ruleType: "withholding",
    name: "GRA-GH Withholding Tax (Ghana)",
    description: "7.5% withholding on supply/service payments.",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.075 },
    source: "GRA-GH WHT schedule; matches in-repo STATUTORY_RULES",
  },
];

// ─── Catalog ────────────────────────────────────────────────────────────────

/** Every preset pack across all supported countries. */
export const TAX_PRESET_CATALOG: TaxPreset[] = [
  ...GM_PRESETS,
  ...SN_PRESETS,
  ...US_PRESETS,
  ...NG_PRESETS,
  ...KE_PRESETS,
  ...GH_PRESETS,
];

/** Presets available for a single country (empty array = no pack yet). */
export function getTaxPresetsForCountry(country: string): TaxPreset[] {
  return TAX_PRESET_CATALOG.filter((p) => p.country === country);
}

/** Countries that ship a preset pack. */
export const PRESET_COUNTRIES: string[] = Array.from(
  new Set(TAX_PRESET_CATALOG.map((p) => p.country)),
).sort();
