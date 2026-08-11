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
// from the verified pipeline rules, and GB, ZA as global-coverage examples.
// Add a country by appending entries.

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
    | "property"
    | "capital_gains"
    | "customs"
    | "digital_services"
    | "payroll_tax"
    | "wealth"
    | "environmental"
    | "health"
    | "unemployment"
    | "tourist"
    | "stamp_duty"
    | "gift"
    | "inheritance"
    | "license_fee"
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

// ─── United States — per-state sales tax (all 50 states + DC) ───────────────
//
// One preset per state + DC so the US pack is jurisdiction-complete. Rates are
// the 2025–2026 state base rates; where the base already includes a mandatory
// local share (CA, UT, VA) it is split into named components so the sum still
// equals the statutory base. Local-option add-ons vary by city/county — each
// description carries the local context and a flagship combined example; users
// add their exact jurisdiction as components or per-customer overrides.
//
// Source of the rate data: Tax Foundation 2025 state sales tax reports and
// state revenue departments (LA raised 4.45% → 5.00% Jan 2025; SD is a
// temporary 4.2% reduction from 4.5% that sunsets after 2026).

interface UsSalesTaxRow {
  /** Two-letter state code. */
  code: string;
  /** Full state name. */
  name: string;
  /** State base rate (0 for no-sales-tax states). */
  stateRate: number;
  /** Optional named sub-rates that make up the base (mandatory local splits). */
  components?: Array<{ name: string; rate: number }>;
  /** Local-option context shown in the preset description. */
  localNote: string;
  /** Optional flagship combined-rate example (state + city + county). */
  example?: string;
  /** True when the state has no local sales taxes (skip the add-local guidance). */
  noLocal?: boolean;
}

function fmtPct(rate: number): string {
  return (rate * 100).toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function usSalesTaxDescription(r: UsSalesTaxRow): string {
  const base =
    r.stateRate === 0
      ? `${r.name} has no state sales tax.`
      : r.components
        ? `${fmtPct(r.stateRate)}% base rate (${r.components
            .map((c) => `${c.name} ${fmtPct(c.rate)}%`)
            .join(" + ")}).`
        : `${fmtPct(r.stateRate)}% state base rate.`;
  const local = r.localNote ? ` ${r.localNote}` : "";
  const example = r.example ? ` e.g. ${r.example}.` : "";
  const guidance = r.noLocal
    ? ""
    : " Local rates vary by jurisdiction — add your exact city/county rates as components or per-customer overrides.";
  return `${base}${local}${example}${guidance}`;
}

const US_SALES_TAX_ROWS: UsSalesTaxRow[] = [
  {
    code: "AL",
    name: "Alabama",
    stateRate: 0.04,
    localNote:
      "Local city/county taxes average ~5.46% — combined rates frequently reach 8–11%.",
    example: "Birmingham 10.00%",
  },
  {
    code: "AK",
    name: "Alaska",
    stateRate: 0,
    localNote:
      "Local-option municipal/borough sales taxes apply (average ~1.82%, some areas up to ~7.85%).",
  },
  {
    code: "AZ",
    name: "Arizona",
    stateRate: 0.056,
    localNote: "Local add-ons average ~2.92%.",
    example: "Phoenix 8.60%",
  },
  {
    code: "AR",
    name: "Arkansas",
    stateRate: 0.065,
    localNote:
      "Local add-ons apply; the state grocery tax ended Jan 2026 (localities may still levy one).",
  },
  {
    code: "CA",
    name: "California",
    stateRate: 0.0725,
    components: [
      { name: "State", rate: 0.06 },
      { name: "Mandatory local", rate: 0.0125 },
    ],
    localNote:
      "The base includes a 1.25% mandatory local add-on; district taxes can add up to ~2.5% more.",
    example: "Los Angeles 9.50%",
  },
  {
    code: "CO",
    name: "Colorado",
    stateRate: 0.029,
    localNote: "Lowest non-zero state base; local add-ons average ~4.99%.",
    example: "Denver 8.81%",
  },
  {
    code: "CT",
    name: "Connecticut",
    stateRate: 0.0635,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "DE",
    name: "Delaware",
    stateRate: 0,
    localNote: "No local-option sales taxes either.",
    noLocal: true,
  },
  {
    code: "FL",
    name: "Florida",
    stateRate: 0.06,
    localNote: "County discretionary surtaxes average ~0.98%.",
    example: "Miami-Dade 7.00%",
  },
  {
    code: "GA",
    name: "Georgia",
    stateRate: 0.04,
    localNote: "Local add-ons average ~3.49%.",
    example: "Atlanta 8.90%",
  },
  {
    code: "HI",
    name: "Hawaii",
    stateRate: 0.04,
    localNote:
      "General Excise Tax (GET) — broad base that includes services; no local add-ons.",
    noLocal: true,
  },
  {
    code: "ID",
    name: "Idaho",
    stateRate: 0.06,
    localNote: "Local add-ons negligible (average ~0.03%).",
  },
  {
    code: "IL",
    name: "Illinois",
    stateRate: 0.0625,
    localNote:
      "Local add-ons average ~2.5%; Chicago-area combined rates reach 10%+.",
    example: "Chicago 10.25%",
  },
  {
    code: "IN",
    name: "Indiana",
    stateRate: 0.07,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "IA",
    name: "Iowa",
    stateRate: 0.06,
    localNote: "Local-option add-ons average ~0.94%.",
  },
  {
    code: "KS",
    name: "Kansas",
    stateRate: 0.065,
    localNote: "Local add-ons average ~2.19%.",
  },
  {
    code: "KY",
    name: "Kentucky",
    stateRate: 0.06,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "LA",
    name: "Louisiana",
    stateRate: 0.05,
    localNote:
      "Raised from 4.45% to 5.00% Jan 2025; the nation's highest local add-ons (average ~5%).",
    example: "New Orleans 9.45%",
  },
  {
    code: "ME",
    name: "Maine",
    stateRate: 0.055,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "MD",
    name: "Maryland",
    stateRate: 0.06,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "MA",
    name: "Massachusetts",
    stateRate: 0.0625,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "MI",
    name: "Michigan",
    stateRate: 0.06,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "MN",
    name: "Minnesota",
    stateRate: 0.06875,
    localNote: "Local add-ons average ~1.26%.",
  },
  {
    code: "MS",
    name: "Mississippi",
    stateRate: 0.07,
    localNote: "Local add-ons negligible (average ~0.06%).",
  },
  {
    code: "MO",
    name: "Missouri",
    stateRate: 0.04225,
    localNote:
      "Local add-ons average ~4.22% — combined rates routinely exceed 8%.",
  },
  {
    code: "MT",
    name: "Montana",
    stateRate: 0,
    localNote: "Limited resort-area local option taxes only.",
  },
  {
    code: "NE",
    name: "Nebraska",
    stateRate: 0.055,
    localNote: "Local add-ons average ~1.48%.",
  },
  {
    code: "NV",
    name: "Nevada",
    stateRate: 0.0685,
    localNote: "The base rate already includes mandatory local components.",
  },
  {
    code: "NH",
    name: "New Hampshire",
    stateRate: 0,
    localNote: "No local-option sales taxes either.",
    noLocal: true,
  },
  {
    code: "NJ",
    name: "New Jersey",
    stateRate: 0.06625,
    localNote:
      "No local add-ons; Urban Enterprise Zones collect at half-rate (3.3125%).",
    noLocal: true,
  },
  {
    code: "NM",
    name: "New Mexico",
    stateRate: 0.04875,
    localNote:
      "Gross Receipts Tax (hybrid, includes services); local portions add on.",
  },
  {
    code: "NY",
    name: "New York",
    stateRate: 0.04,
    localNote: "Local add-ons average ~4.54%.",
    example: "New York City 8.875% (4% state + 4.5% city + 0.375% MCTD)",
  },
  {
    code: "NC",
    name: "North Carolina",
    stateRate: 0.0475,
    localNote:
      "Local add-ons up to 2.75% (2% county + 0.5% transit + 0.25% city).",
    example: "Charlotte 8.25%",
  },
  {
    code: "ND",
    name: "North Dakota",
    stateRate: 0.05,
    localNote: "Local add-ons average ~2.09%.",
  },
  {
    code: "OH",
    name: "Ohio",
    stateRate: 0.0575,
    localNote: "Local add-ons average ~1.54%.",
  },
  {
    code: "OK",
    name: "Oklahoma",
    stateRate: 0.045,
    localNote: "Local add-ons average ~4.56%.",
  },
  {
    code: "OR",
    name: "Oregon",
    stateRate: 0,
    localNote: "No local-option sales taxes either.",
    noLocal: true,
  },
  {
    code: "PA",
    name: "Pennsylvania",
    stateRate: 0.06,
    localNote: "Local add-ons negligible (average ~0.34%).",
  },
  {
    code: "RI",
    name: "Rhode Island",
    stateRate: 0.07,
    localNote: "No local sales taxes.",
    noLocal: true,
  },
  {
    code: "SC",
    name: "South Carolina",
    stateRate: 0.06,
    localNote: "Local add-ons average ~1.49%.",
  },
  {
    code: "SD",
    name: "South Dakota",
    stateRate: 0.042,
    localNote:
      "Temporary reduction from 4.50% (sunsets after 2026); local add-ons apply.",
  },
  {
    code: "TN",
    name: "Tennessee",
    stateRate: 0.07,
    localNote: "Local add-ons average ~2.61%.",
    example: "Nashville 9.25% / Memphis 9.75%",
  },
  {
    code: "TX",
    name: "Texas",
    stateRate: 0.0625,
    localNote: "Local add-ons average ~1.95%.",
    example: "Dallas / Houston 8.25%",
  },
  {
    code: "UT",
    name: "Utah",
    stateRate: 0.061,
    components: [
      { name: "State", rate: 0.0485 },
      { name: "Mandatory local", rate: 0.0125 },
    ],
    localNote:
      "The base includes a 1.25% mandatory local add-on; optional local add-ons on top.",
  },
  {
    code: "VT",
    name: "Vermont",
    stateRate: 0.06,
    localNote: "Local-option add-ons in select towns (average ~0.39%).",
  },
  {
    code: "VA",
    name: "Virginia",
    stateRate: 0.053,
    components: [
      { name: "State", rate: 0.043 },
      { name: "Mandatory local", rate: 0.01 },
    ],
    localNote:
      "The base includes a mandatory 1.00% local add-on; additional regional taxes apply in some areas.",
  },
  {
    code: "WA",
    name: "Washington",
    stateRate: 0.065,
    localNote: "Local add-ons average ~3.01%.",
  },
  {
    code: "WV",
    name: "West Virginia",
    stateRate: 0.06,
    localNote: "Local add-ons average ~0.59%.",
  },
  {
    code: "WI",
    name: "Wisconsin",
    stateRate: 0.05,
    localNote: "County add-ons average ~0.72%.",
  },
  {
    code: "WY",
    name: "Wyoming",
    stateRate: 0.04,
    localNote: "Local add-ons average ~1.56%.",
  },
  {
    code: "DC",
    name: "District of Columbia",
    stateRate: 0.06,
    localNote: "Single district rate; no separate local add-ons.",
    noLocal: true,
  },
];

/** Per-state US sales tax presets — every state + DC (jurisdiction-complete). */
const US_SALES_TAX_PRESETS: TaxPreset[] = US_SALES_TAX_ROWS.map((r) => ({
  id: `us-sales-tax-${r.code.toLowerCase()}`,
  country: "US",
  ruleType: "sales_tax" as const,
  name: `US Sales Tax — ${r.name}`,
  description: usSalesTaxDescription(r),
  appliesTo: "sales" as const,
  effectiveFrom: "2025-01-01",
  rateConfig: r.components
    ? { type: "rate" as const, components: r.components }
    : { type: "rate" as const, rate: r.stateRate },
  source:
    "Tax Foundation 2025 state sales tax rates; state revenue departments",
}));

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

// ─── United Kingdom — HMRC (His Majesty's Revenue & Customs) ────────────────

const GB_PRESETS: TaxPreset[] = [
  {
    id: "gb-vat",
    country: "GB",
    ruleType: "vat",
    name: "HMRC VAT (United Kingdom)",
    description:
      "Standard 20% value-added tax (reduced 5% rate exists for essentials).",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.2 },
    source: "HMRC VAT rates; standard 20%",
  },
  {
    id: "gb-paye",
    country: "GB",
    ruleType: "paye",
    name: "HMRC PAYE (United Kingdom)",
    description:
      "2025/26 monthly income tax bands: 0% up to £1,047, 20% to £4,189, 40% to £10,428, 45% above (approximate monthly slices).",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "bands",
      bands: [
        { from: 0, to: 1047, rate: 0 },
        { from: 1048, to: 4189, rate: 0.2 },
        { from: 4190, to: 10428, rate: 0.4 },
        { from: 10429, to: null, rate: 0.45 },
      ],
    },
    source: "HMRC 2025/26 tax bands (monthly); verify annually",
  },
  {
    id: "gb-nic",
    country: "GB",
    ruleType: "social_security",
    name: "HMRC National Insurance Class 1 (UK)",
    description:
      "Employee 8% + employer 13.8% on earnings up to £4,189/month. Note: the payroll split applies the rate on the capped amount (the £1,048 lower threshold needs a custom band rule — verify annually).",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "rate",
      employeeRate: 0.08,
      employerRate: 0.138,
      ceiling: 4189,
    },
    source: "HMRC Class 1 NIC rates 2025/26; verify annually",
  },
  {
    id: "gb-cit",
    country: "GB",
    ruleType: "corporate",
    name: "UK Corporation Tax",
    description:
      "25% main rate; 19% small-profits rate below £50,000 with marginal relief between.",
    appliesTo: "income",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.25 },
    source: "UK Corporation Tax Act; main rate 25%",
  },
  {
    id: "gb-wht",
    country: "GB",
    ruleType: "withholding",
    name: "HMRC Withholding Tax (UK)",
    description:
      "20% basic-rate withholding on UK-source interest and royalties paid to non-residents.",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.2 },
    source: "HMRC withholding rules; interest/royalties 20%",
  },
];

// ─── South Africa — SARS (South African Revenue Service) ────────────────────

const ZA_PRESETS: TaxPreset[] = [
  {
    id: "za-vat",
    country: "ZA",
    ruleType: "vat",
    name: "SARS VAT (South Africa)",
    description: "Standard 15% value-added tax on taxable supplies.",
    appliesTo: "sales",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.15 },
    source: "VAT Act 89 of 1991; standard rate 15%",
  },
  {
    id: "za-paye",
    country: "ZA",
    ruleType: "paye",
    name: "SARS PAYE (South Africa)",
    description:
      "2025/26 monthly PAYE brackets (R): 0% to R19,758, 18% to R30,875, 26% to R42,733, 31% to R56,083, 36% to R71,492, 39% to R151,417, 41% above.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "bands",
      bands: [
        { from: 0, to: 19758, rate: 0 },
        { from: 19759, to: 30875, rate: 0.18 },
        { from: 30876, to: 42733, rate: 0.26 },
        { from: 42734, to: 56083, rate: 0.31 },
        { from: 56084, to: 71492, rate: 0.36 },
        { from: 71493, to: 151417, rate: 0.39 },
        { from: 151418, to: null, rate: 0.41 },
      ],
    },
    source: "SARS 2025/26 tax tables (monthly); verify annually",
  },
  {
    id: "za-uif",
    country: "ZA",
    ruleType: "social_security",
    name: "UIF (South Africa)",
    description:
      "Unemployment Insurance Fund: 1% employee + 1% employer on earnings up to R17,711/month.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: {
      type: "rate",
      employeeRate: 0.01,
      employerRate: 0.01,
      ceiling: 17711,
    },
    source: "UIF Act 63 of 2001; 1%+1%, ceiling R17,711",
  },
  {
    id: "za-sdl",
    country: "ZA",
    ruleType: "payroll_tax",
    name: "Skills Development Levy (South Africa)",
    description: "1% employer payroll levy on total remuneration.",
    appliesTo: "payroll",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.01 },
    source: "Skills Development Levies Act; 1% employer",
  },
  {
    id: "za-cit",
    country: "ZA",
    ruleType: "corporate",
    name: "South Africa Corporate Income Tax",
    description: "27% corporate income tax on taxable income.",
    appliesTo: "income",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.27 },
    source: "SARS corporate rate; 27%",
  },
  {
    id: "za-wht",
    country: "ZA",
    ruleType: "withholding",
    name: "SARS Withholding Tax (South Africa)",
    description:
      "20% dividends withholding on distributions to shareholders; 15% on interest to non-residents.",
    appliesTo: "purchases",
    effectiveFrom: "2025-01-01",
    rateConfig: { type: "rate", rate: 0.2 },
    source: "DWT Act 2012 (20%); Interest WHT 15% non-residents",
  },
];

// ─── Catalog ────────────────────────────────────────────────────────────────

/** Every preset pack across all supported countries. */
export const TAX_PRESET_CATALOG: TaxPreset[] = [
  ...GM_PRESETS,
  ...SN_PRESETS,
  ...US_PRESETS,
  ...US_SALES_TAX_PRESETS,
  ...NG_PRESETS,
  ...KE_PRESETS,
  ...GH_PRESETS,
  ...GB_PRESETS,
  ...ZA_PRESETS,
];

/** Presets available for a single country (empty array = no pack yet). */
export function getTaxPresetsForCountry(country: string): TaxPreset[] {
  return TAX_PRESET_CATALOG.filter((p) => p.country === country);
}

/** Countries that ship a preset pack. */
export const PRESET_COUNTRIES: string[] = Array.from(
  new Set(TAX_PRESET_CATALOG.map((p) => p.country)),
).sort();
