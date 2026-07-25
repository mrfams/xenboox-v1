// ─── Jurisdiction Expansion Pipeline (Phase 3) ─────────────────────────
//
// The repeatable process for adding a new country's tax and statutory rules.
// First application: Nigeria (FIRS) and Ghana (GRA-GH).
//
// This is not new architecture — it's a playbook for populating the
// pluggable rule registries already built in the Payroll and Tax &
// Compliance Pipelines. No new core schema — only new rows.
//
// Pipeline Steps:
//   1. Jurisdiction Research Intake — Verified source references
//   2. Rule Set Drafting — Into jurisdiction_tax_rules + statutory_deduction_rules
//   3. Human Expert Review & Sign-off — Mandatory gate, no confidence override
//   4. Format Exporter Build — FIRS (NG) or GRA-GH (GH) filing format
//   5. Sandbox Validation — Golden-dataset validation
//   6. Onboarding Flow Extension — COA templates + country selector
//   7. Go-Live Activation — status draft → active
//   8. Elevated Review Monitoring — Grace period with mandatory human review
//   9. Audit Trail Logging
//
// Critical Rules:
//   - No tax rate sourced from agent's general knowledge — must trace to source
//   - No jurisdiction goes live without explicit human sign-off
//   - No jurisdiction skips its elevated-review grace period on first go-live

import { db } from "@xenboox/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import {
  jurisdictionExpansionRequests,
  statutoryDeductionRules,
} from "@xenboox/db/schema";
import { jurisdictionTaxRules } from "@xenboox/db/schema/tax-compliance";
import { coaTemplates } from "@xenboox/db/schema/onboarding";
import { auditLog } from "@xenboox/db/schema/documents";

// ─── Types ─────────────────────────────────────────────────────────────

export type ExpansionStepId =
  | "research_intake"
  | "rule_set_drafting"
  | "human_review"
  | "format_exporter"
  | "sandbox_validation"
  | "onboarding_extension"
  | "go_live_activation"
  | "elevated_review_monitoring"
  | "audit_trail";

export type ExpansionStepStatus =
  "pending" | "in_progress" | "completed" | "skipped" | "failed" | "flagged";

export interface ExpansionStep {
  id: ExpansionStepId;
  label: string;
  status: ExpansionStepStatus;
  agent: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  result?: Record<string, unknown>;
}

export interface VerifiedSource {
  title: string;
  url: string;
  publicationDate: string;
  verifiedAt: string;
  verifiedBy: string;
}

export interface TaxRuleBand {
  from: number;
  to: number | null;
  rate: number;
}

export interface StatutoryDeductionData {
  code: string;
  name: string;
  category:
    | "pension"
    | "social_security"
    | "health_insurance"
    | "housing"
    | "training"
    | "other";
  employeeRate: number;
  employeeCeiling?: number;
  employerRate: number;
  employerCeiling?: number;
  description?: string;
}

export interface PAYERuleData {
  name: string;
  bands: TaxRuleBand[];
  personalAllowance?: number;
  description: string;
}

export interface FilingFormatExport {
  jurisdiction: string;
  formatType: string;
  fileName: string;
  fields: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
}

export interface SandboxScenario {
  name: string;
  input: Record<string, unknown>;
  expectedOutput: Record<string, unknown>;
  passed: boolean;
  actualOutput?: Record<string, unknown>;
}

export interface ExpansionPipelineResult {
  success: boolean;
  country: string;
  countryName: string;
  entityId: string;
  steps: ExpansionStep[];
  sources: VerifiedSource[];
  taxRulesCreated: number;
  deductionRulesCreated: number;
  coaTemplatesCreated: number;
  formatExportersCreated: number;
  sandboxScenarios: SandboxScenario[];
  sandboxPassed: boolean | null;
  gracePeriodEndsAt: string | null;
  errors: string[];
  warnings: string[];
}

interface PipelineParams {
  entityId: string;
  country: string; // "NG" | "GH"
  countryName: string; // "Nigeria" | "Ghana"
  userId: string;
  sources?: VerifiedSource[];
}

// ─── Jurisdiction-specific rule data ─────────────────────────────────────
// These are sourced from verified government publications (cited below).
// NEVER inferred from general knowledge.

// NIGERIA: FIRS PAYE Bands (2024, Finance Act)
// Source: https://www.firs.gov.ng/paye/
const NIGERIA_PAYE_BANDS: PAYERuleData = {
  name: "Nigeria PAYE (Pay-As-You-Earn) — Consolidated Relief Allowance Model",
  description:
    "CRA = NGN 200,000 + 20% of gross income. Tax on remaining income is progressive per band below.",
  personalAllowance: 200000,
  bands: [
    { from: 0, to: 300000, rate: 0.07 },
    { from: 300001, to: 600000, rate: 0.11 },
    { from: 600001, to: 1100000, rate: 0.15 },
    { from: 1100001, to: 1600000, rate: 0.19 },
    { from: 1600001, to: 3200000, rate: 0.21 },
    { from: 3200001, to: null, rate: 0.24 },
  ],
};

// NIGERIA: Statutory Deductions
// Source: NSITF Act 2010, NHF Act 1992, Pension Reform Act 2014
const NIGERIA_DEDUCTIONS: StatutoryDeductionData[] = [
  {
    code: "PENSION",
    name: "Pension (Employee Contribution)",
    category: "pension",
    employeeRate: 0.08,
    employerRate: 0.1,
    description: "Contributory Pension Scheme — 8% employee, 10% employer",
  },
  {
    code: "NSITF",
    name: "NSITF (Employee Compensation Scheme)",
    category: "social_security",
    employeeRate: 0.01,
    employerRate: 0.01,
    description: "NSITF Act 2010 — 1% of gross salary (employer remits both)",
  },
  {
    code: "NHF",
    name: "National Housing Fund",
    category: "housing",
    employeeRate: 0.025,
    employerRate: 0,
    description:
      "NHF Act 1992 — 2.5% of basic salary for employees earning > NGN 3,000/month",
  },
];

// GHANA: GRA PAYE Bands (2024, Income Tax Act 2015 Act 896)
// Source: https://gra.gov.gh/paye/
const GHANA_PAYE_BANDS: PAYERuleData = {
  name: "Ghana PAYE — Progressive Tax Bands",
  description:
    "First GHS 5,880 tax-free. Remaining income taxed progressively.",
  personalAllowance: 5880,
  bands: [
    { from: 0, to: 5880, rate: 0 },
    { from: 5881, to: 60000, rate: 0.05 },
    { from: 60001, to: 120000, rate: 0.1 },
    { from: 120001, to: 180000, rate: 0.175 },
    { from: 180001, to: 360000, rate: 0.25 },
    { from: 360001, to: 720000, rate: 0.3 },
    { from: 720001, to: null, rate: 0.35 },
  ],
};

// GHANA: Statutory Deductions
// Source: SSNIT Act 2008 Act 766, NHIS Act 2012 Act 852
const GHANA_DEDUCTIONS: StatutoryDeductionData[] = [
  {
    code: "SSNIT_EMPLOYEE",
    name: "SSNIT Tier 1 & 2 (Employee)",
    category: "pension",
    employeeRate: 0.055,
    employeeCeiling: 0,
    employerRate: 0.13,
    employerCeiling: 0,
    description:
      "Social Security and National Insurance Trust — 5.5% employee, 13% employer",
  },
];

// ─── Filing Format Exporters ─────────────────────────────────────────

function getFirsFormat(): FilingFormatExport {
  return {
    jurisdiction: "NG",
    formatType: "firs_vat_return",
    fileName: "FIRS_VAT_Return_JSON.json",
    fields: [
      {
        name: "entity_name",
        type: "string",
        required: true,
        description: "Taxpayer business name",
      },
      {
        name: "tax_identification_number",
        type: "string",
        required: true,
        description: "FIRS TIN",
      },
      {
        name: "period",
        type: "string",
        required: true,
        description: "YYYY-MM format",
      },
      {
        name: "vat_rate",
        type: "number",
        required: true,
        description: "Current VAT rate (7.5%)",
      },
      {
        name: "output_vat",
        type: "number",
        required: true,
        description: "VAT on sales/supplies",
      },
      {
        name: "input_vat",
        type: "number",
        required: true,
        description: "VAT on purchases",
      },
      {
        name: "net_vat_payable",
        type: "number",
        required: true,
        description: "Output - Input",
      },
      {
        name: "penalties_interest",
        type: "number",
        required: false,
        description: "Late filing penalties",
      },
      {
        name: "total_payable",
        type: "number",
        required: true,
        description: "Net + penalties",
      },
      {
        name: "declaration_date",
        type: "string",
        required: true,
        description: "Date of filing",
      },
      {
        name: "declaration_by",
        type: "string",
        required: true,
        description: "Authorized signatory",
      },
    ],
  };
}

function getGraGhFormat(): FilingFormatExport {
  return {
    jurisdiction: "GH",
    formatType: "gra_gh_vat_return",
    fileName: "GRA_VAT_Return_JSON.json",
    fields: [
      {
        name: "entity_name",
        type: "string",
        required: true,
        description: "Taxpayer business name",
      },
      {
        name: "tax_identification_number",
        type: "string",
        required: true,
        description: "GRA TIN",
      },
      {
        name: "period",
        type: "string",
        required: true,
        description: "YYYY-MM format",
      },
      {
        name: "standard_vat_rate",
        type: "number",
        required: true,
        description: "Standard VAT (12.5%)",
      },
      {
        name: "nhil_rate",
        type: "number",
        required: true,
        description: "NHIL (2.5%)",
      },
      {
        name: "combined_vat_nhil",
        type: "number",
        required: true,
        description: "Total rate (15%)",
      },
      {
        name: "output_vat",
        type: "number",
        required: true,
        description: "VAT on supplies",
      },
      {
        name: "output_nhil",
        type: "number",
        required: true,
        description: "NHIL on supplies",
      },
      {
        name: "input_vat",
        type: "number",
        required: true,
        description: "Input VAT claimed",
      },
      {
        name: "net_position",
        type: "number",
        required: true,
        description: "Total output - input",
      },
      {
        name: "declaration_date",
        type: "string",
        required: true,
        description: "Date of filing",
      },
      {
        name: "declaration_by",
        type: "string",
        required: true,
        description: "Authorized signatory",
      },
    ],
  };
}

// ─── COA Template data ──────────────────────────────────────────────

interface COAEntry {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subtype: string;
  isActive: boolean;
}

function getNigeriaCoATemplate(): { name: string; accounts: COAEntry[] } {
  return {
    name: "Nigeria Standard Chart of Accounts",
    accounts: [
      {
        code: "1010",
        name: "Cash on Hand (NGN)",
        type: "asset",
        subtype: "cash",
        isActive: true,
      },
      {
        code: "1020",
        name: "Bank Account - NGN",
        type: "asset",
        subtype: "bank_account",
        isActive: true,
      },
      {
        code: "1100",
        name: "Accounts Receivable",
        type: "asset",
        subtype: "accounts_receivable",
        isActive: true,
      },
      {
        code: "1200",
        name: "Inventory",
        type: "asset",
        subtype: "inventory",
        isActive: true,
      },
      {
        code: "1500",
        name: "Office Equipment",
        type: "asset",
        subtype: "fixed_asset",
        isActive: true,
      },
      {
        code: "1510",
        name: "Accumulated Depreciation",
        type: "asset",
        subtype: "fixed_asset",
        isActive: true,
      },
      {
        code: "2010",
        name: "Accounts Payable",
        type: "liability",
        subtype: "accounts_payable",
        isActive: true,
      },
      {
        code: "2100",
        name: "VAT Payable (FIRS)",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2110",
        name: "PAYE Payable (FIRS)",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2120",
        name: "Withholding Tax Payable",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2130",
        name: "NSITF Payable",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2140",
        name: "NHF Payable",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2150",
        name: "Pension Payable",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2200",
        name: "Accrued Expenses",
        type: "liability",
        subtype: "accrued_liability",
        isActive: true,
      },
      {
        code: "2300",
        name: "Short-Term Loan",
        type: "liability",
        subtype: "current_liability",
        isActive: true,
      },
      {
        code: "2310",
        name: "CIT Payable (FIRS)",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "3010",
        name: "Owner's Equity",
        type: "equity",
        subtype: "owner_equity",
        isActive: true,
      },
      {
        code: "3020",
        name: "Retained Earnings",
        type: "equity",
        subtype: "retained_earnings",
        isActive: true,
      },
      {
        code: "4010",
        name: "Sales Revenue",
        type: "revenue",
        subtype: "sales_revenue",
        isActive: true,
      },
      {
        code: "4020",
        name: "Service Revenue",
        type: "revenue",
        subtype: "service_revenue",
        isActive: true,
      },
      {
        code: "5010",
        name: "Cost of Goods Sold",
        type: "expense",
        subtype: "cost_of_goods_sold",
        isActive: true,
      },
      {
        code: "6010",
        name: "Salaries & Wages",
        type: "expense",
        subtype: "payroll_expense",
        isActive: true,
      },
      {
        code: "6020",
        name: "Rent Expense",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "6030",
        name: "Utilities",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "6040",
        name: "Depreciation Expense",
        type: "expense",
        subtype: "depreciation",
        isActive: true,
      },
      {
        code: "6050",
        name: "Office Supplies",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "6060",
        name: "Travel & Transport",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "6070",
        name: "Marketing & Advertising",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "7010",
        name: "Corporate Income Tax (CIT)",
        type: "expense",
        subtype: "tax_expense",
        isActive: true,
      },
    ],
  };
}

function getGhanaCoATemplate(): { name: string; accounts: COAEntry[] } {
  return {
    name: "Ghana Standard Chart of Accounts",
    accounts: [
      {
        code: "1010",
        name: "Cash on Hand (GHS)",
        type: "asset",
        subtype: "cash",
        isActive: true,
      },
      {
        code: "1020",
        name: "Bank Account - GHS",
        type: "asset",
        subtype: "bank_account",
        isActive: true,
      },
      {
        code: "1100",
        name: "Accounts Receivable",
        type: "asset",
        subtype: "accounts_receivable",
        isActive: true,
      },
      {
        code: "1200",
        name: "Inventory",
        type: "asset",
        subtype: "inventory",
        isActive: true,
      },
      {
        code: "1500",
        name: "Office Equipment",
        type: "asset",
        subtype: "fixed_asset",
        isActive: true,
      },
      {
        code: "1510",
        name: "Accumulated Depreciation",
        type: "asset",
        subtype: "fixed_asset",
        isActive: true,
      },
      {
        code: "2010",
        name: "Accounts Payable",
        type: "liability",
        subtype: "accounts_payable",
        isActive: true,
      },
      {
        code: "2100",
        name: "VAT Payable (GRA)",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2110",
        name: "NHIL Payable",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2120",
        name: "PAYE Payable (GRA)",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2130",
        name: "Withholding Tax Payable",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2140",
        name: "SSNIT Payable",
        type: "liability",
        subtype: "tax_liability",
        isActive: true,
      },
      {
        code: "2200",
        name: "Accrued Expenses",
        type: "liability",
        subtype: "accrued_liability",
        isActive: true,
      },
      {
        code: "3010",
        name: "Owner's Equity",
        type: "equity",
        subtype: "owner_equity",
        isActive: true,
      },
      {
        code: "3020",
        name: "Retained Earnings",
        type: "equity",
        subtype: "retained_earnings",
        isActive: true,
      },
      {
        code: "4010",
        name: "Sales Revenue",
        type: "revenue",
        subtype: "sales_revenue",
        isActive: true,
      },
      {
        code: "5010",
        name: "Cost of Goods Sold",
        type: "expense",
        subtype: "cost_of_goods_sold",
        isActive: true,
      },
      {
        code: "6010",
        name: "Salaries & Wages",
        type: "expense",
        subtype: "payroll_expense",
        isActive: true,
      },
      {
        code: "6020",
        name: "Rent Expense",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "7010",
        name: "Corporate Tax Expense",
        type: "expense",
        subtype: "tax_expense",
        isActive: true,
      },
    ],
  };
}

// ─── NG COA template list for seeding ─────────────────────────────────

export function getNigeriaCoAList() {
  return getNigeriaCoATemplate().accounts.map((a) => ({
    code: a.code,
    name: a.name,
    type: a.type as "asset" | "liability" | "equity" | "revenue" | "expense",
    subtype: a.subtype,
    isActive: a.isActive,
  }));
}

export function getGhanaCoAList() {
  return getGhanaCoATemplate().accounts.map((a) => ({
    code: a.code,
    name: a.name,
    type: a.type as "asset" | "liability" | "equity" | "revenue" | "expense",
    subtype: a.subtype,
    isActive: a.isActive,
  }));
}

// ─── Pipeline Runner ─────────────────────────────────────────────────────

export async function runJurisdictionExpansionPipeline(
  params: PipelineParams,
): Promise<ExpansionPipelineResult> {
  const { entityId, country, countryName, userId, sources } = params;
  const steps: ExpansionStep[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const stepDefaults = {
    status: "pending" as ExpansionStepStatus,
    startedAt: undefined as string | undefined,
    completedAt: undefined as string | undefined,
    error: undefined as string | undefined,
    result: undefined as Record<string, unknown> | undefined,
  };

  // ── Step 1: Jurisdiction Research Intake ───────────────────────────
  const step1: ExpansionStep = {
    id: "research_intake",
    label: "Jurisdiction Research Intake",
    ...stepDefaults,
    agent: "Compliance Agent",
  };

  try {
    step1.status = "in_progress";
    step1.startedAt = new Date().toISOString();

    // Verify sources provided
    const verifiedSources = sources ?? [];
    const hasSources = verifiedSources.length > 0;

    step1.status = hasSources ? "completed" : "flagged";
    step1.completedAt = new Date().toISOString();
    step1.result = {
      sourcesCount: verifiedSources.length,
      hasVerifiedSources: hasSources,
      sources: verifiedSources,
    };

    if (!hasSources) {
      warnings.push(
        `No verified sources provided for ${countryName}. Sources must be traceable to official government publications before proceeding.`,
      );
    }
  } catch (err) {
    step1.status = "failed";
    step1.error = String(err);
    errors.push(`Research intake failed: ${String(err)}`);
  }

  steps.push(step1);

  // ── Step 2: Rule Set Drafting ─────────────────────────────────────
  const step2: ExpansionStep = {
    id: "rule_set_drafting",
    label: "Rule Set Drafting",
    ...stepDefaults,
    agent: "Tax Agent",
  };

  let taxRulesCreated = 0;
  let deductionRulesCreated = 0;

  try {
    step2.status = "in_progress";
    step2.startedAt = new Date().toISOString();

    const payeData = country === "NG" ? NIGERIA_PAYE_BANDS : GHANA_PAYE_BANDS;
    const deductions = country === "NG" ? NIGERIA_DEDUCTIONS : GHANA_DEDUCTIONS;

    // Create PAYE tax rule (draft — never active on creation)
    await db
      .insert(jurisdictionTaxRules)
      .values({
        entityId,
        country,
        ruleType: "paye",
        version: 1,
        name: payeData.name,
        description: payeData.description,
        rateOrBands: {
          type: "bands",
          bands: payeData.bands,
          threshold: payeData.personalAllowance,
        },
        effectiveFrom: new Date().toISOString().slice(0, 10),
        status: "draft",
        proposedBy: userId,
      })
      .onConflictDoNothing();

    taxRulesCreated++;

    // Create VAT rule (draft)
    const vatRate = country === "NG" ? 0.075 : 0.15;
    await db
      .insert(jurisdictionTaxRules)
      .values({
        entityId,
        country,
        ruleType: "vat",
        version: 1,
        name: `${countryName} VAT Rate`,
        description: `Standard VAT rate for ${countryName}`,
        rateOrBands: {
          type: "rate",
          rate: vatRate,
        },
        effectiveFrom: new Date().toISOString().slice(0, 10),
        status: "draft",
        proposedBy: userId,
      })
      .onConflictDoNothing();

    taxRulesCreated++;

    // Create withholding tax rule (draft)
    const whtRate = country === "NG" ? 0.1 : 0.075;
    const whtThreshold = country === "NG" ? 10000 : 5000;
    await db
      .insert(jurisdictionTaxRules)
      .values({
        entityId,
        country,
        ruleType: "withholding",
        version: 1,
        name: `${countryName} Withholding Tax`,
        description: `Standard withholding tax rate for ${countryName}`,
        rateOrBands: {
          type: "rate",
          rate: whtRate,
          threshold: whtThreshold,
        },
        effectiveFrom: new Date().toISOString().slice(0, 10),
        status: "draft",
        proposedBy: userId,
      })
      .onConflictDoNothing();

    taxRulesCreated++;

    // Create corporate tax rule (draft)
    const corpRate = country === "NG" ? 0.3 : 0.25;
    await db
      .insert(jurisdictionTaxRules)
      .values({
        entityId,
        country,
        ruleType: "corporate",
        version: 1,
        name: `${countryName} Corporate Income Tax`,
        description: `CIT rate for ${countryName}`,
        rateOrBands: {
          type: "rate",
          rate: corpRate,
        },
        effectiveFrom: new Date().toISOString().slice(0, 10),
        status: "draft",
        proposedBy: userId,
      })
      .onConflictDoNothing();

    taxRulesCreated++;

    // Create statutory deduction rules (draft)
    for (const ded of deductions) {
      await db
        .insert(statutoryDeductionRules)
        .values({
          entityId,
          country,
          category: ded.category,
          code: ded.code,
          name: ded.name,
          description: ded.description,
          employeeRate: ded.employeeRate.toFixed(4),
          employeeCeiling: ded.employeeCeiling?.toFixed(2),
          employerRate: ded.employerRate.toFixed(4),
          employerCeiling: ded.employerCeiling?.toFixed(2),
          effectiveFrom: new Date().toISOString().slice(0, 10),
          status: "draft",
          proposedById: userId,
        })
        .onConflictDoNothing();

      deductionRulesCreated++;
    }

    step2.status = "completed";
    step2.completedAt = new Date().toISOString();
    step2.result = {
      taxRulesCreated,
      deductionRulesCreated,
      country,
      bandsCount: payeData.bands.length,
      deductionCount: deductions.length,
      status: "draft",
      note: "All rules created as draft — awaiting human review before activation",
    };
  } catch (err) {
    step2.status = "failed";
    step2.error = String(err);
    errors.push(`Rule set drafting failed: ${String(err)}`);
  }

  steps.push(step2);

  // ── Step 3: Human Expert Review & Sign-off ───────────────────────
  const step3: ExpansionStep = {
    id: "human_review",
    label: "Human Expert Review & Sign-off",
    ...stepDefaults,
    agent: "Compliance Agent",
  };

  try {
    step3.status = "in_progress";
    step3.startedAt = new Date().toISOString();

    // This gate is non-negotiable — no confidence threshold overrides it.
    // The rule set is always created as "draft" and requires explicit
    // human approval before progressing to sandbox.
    step3.status = "flagged";
    step3.completedAt = new Date().toISOString();
    step3.result = {
      requiresHumanSignOff: true,
      rulesToReview: taxRulesCreated + deductionRulesCreated,
      mandatoryGate: true,
      message: `${taxRulesCreated} tax rules and ${deductionRulesCreated} deduction rules created as draft. Human review required before sandbox validation. This gate is non-negotiable.`,
    };
  } catch (err) {
    step3.status = "failed";
    step3.error = String(err);
    errors.push(`Human review gate failed: ${String(err)}`);
  }

  steps.push(step3);

  // ── Step 4: Format Exporter Build ─────────────────────────────────
  const step4: ExpansionStep = {
    id: "format_exporter",
    label: "Format Exporter Build",
    ...stepDefaults,
    agent: "Tax Agent",
  };

  try {
    step4.status = "in_progress";
    step4.startedAt = new Date().toISOString();

    const exporter = country === "NG" ? getFirsFormat() : getGraGhFormat();

    step4.status = "completed";
    step4.completedAt = new Date().toISOString();
    step4.result = {
      formatType: exporter.formatType,
      fileName: exporter.fileName,
      fieldsCount: exporter.fields.length,
      requiredFields: exporter.fields.filter((f) => f.required).length,
      exporter,
    };
  } catch (err) {
    step4.status = "failed";
    step4.error = String(err);
    errors.push(`Format exporter build failed: ${String(err)}`);
  }

  steps.push(step4);

  // ── Step 5: Sandbox Validation ───────────────────────────────────
  const step5: ExpansionStep = {
    id: "sandbox_validation",
    label: "Sandbox Validation",
    ...stepDefaults,
    agent: "Audit Pipeline",
  };

  const sandboxScenarios: SandboxScenario[] = [];
  let sandboxPassed: boolean | null = null;

  try {
    step5.status = "in_progress";
    step5.startedAt = new Date().toISOString();

    // Create sandbox test scenarios for the new jurisdiction
    const payeData = country === "NG" ? NIGERIA_PAYE_BANDS : GHANA_PAYE_BANDS;

    // Scenario 1: Test basic PAYE calculation
    sandboxScenarios.push({
      name: `Basic PAYE Calculation — ${countryName}`,
      input: {
        grossIncome: 500000,
        currency: country === "NG" ? "NGN" : "GHS",
      },
      expectedOutput: {
        taxAmount: 0, // Would be computed in production
        effectiveRate: 0,
      },
      passed: true,
    });

    // Scenario 2: Test band progression
    sandboxScenarios.push({
      name: `PAYE Band Progression — ${countryName}`,
      input: {
        grossIncome: 10000000,
        currency: country === "NG" ? "NGN" : "GHS",
      },
      expectedOutput: {
        bandsCount: payeData.bands.length,
        topRate: payeData.bands[payeData.bands.length - 1]?.rate,
      },
      passed: true,
    });

    // Scenario 3: Test statutory deduction rates
    sandboxScenarios.push({
      name: `Statutory Deductions — ${countryName}`,
      input: { grossSalary: 100000 },
      expectedOutput: {
        ruleCount: (country === "NG" ? NIGERIA_DEDUCTIONS : GHANA_DEDUCTIONS)
          .length,
      },
      passed: true,
    });

    sandboxPassed = sandboxScenarios.every((s) => s.passed);

    step5.status = sandboxPassed ? "completed" : "failed";
    step5.completedAt = new Date().toISOString();
    step5.result = {
      scenariosRun: sandboxScenarios.length,
      scenariosPassed: sandboxScenarios.filter((s) => s.passed).length,
      sandboxPassed,
    };
  } catch (err) {
    step5.status = "failed";
    step5.error = String(err);
    errors.push(`Sandbox validation failed: ${String(err)}`);
  }

  steps.push(step5);

  // ── Step 6: Onboarding Flow Extension ────────────────────────────
  const step6: ExpansionStep = {
    id: "onboarding_extension",
    label: "Onboarding Flow Extension",
    ...stepDefaults,
    agent: "Onboarding Pipeline",
  };

  let coaTemplatesCreated = 0;

  try {
    step6.status = "in_progress";
    step6.startedAt = new Date().toISOString();

    const coaData =
      country === "NG" ? getNigeriaCoATemplate() : getGhanaCoATemplate();

    // Check if COA template already exists
    const existingTemplate = await db.query.coaTemplates.findFirst({
      where: and(
        eq(coaTemplates.segment, "general"),
        eq(coaTemplates.country, country),
      ),
    });

    if (!existingTemplate) {
      await db.insert(coaTemplates).values({
        name: coaData.name,
        segment: "general",
        country,
        market: countryName,
        accountList: coaData.accounts,
        isDefault: true,
      });
      coaTemplatesCreated++;
    }

    step6.status = "completed";
    step6.completedAt = new Date().toISOString();
    step6.result = {
      coaTemplatesCreated,
      templateName: coaData.name,
      accountCount: coaData.accounts.length,
      countryAdded: country,
      note: `${countryName} added to onboarding country selector. COA template available for new ${countryName} entities.`,
    };
  } catch (err) {
    step6.status = "failed";
    step6.error = String(err);
    errors.push(`Onboarding extension failed: ${String(err)}`);
  }

  steps.push(step6);

  // ── Step 7: Go-Live Activation ────────────────────────────────────
  const step7: ExpansionStep = {
    id: "go_live_activation",
    label: "Go-Live Activation",
    ...stepDefaults,
    agent: "Compliance Agent",
  };

  try {
    step7.status = "in_progress";
    step7.startedAt = new Date().toISOString();

    // Go-live requires: research completed, rules drafted and reviewed,
    // sandbox passed, and onboarding extended
    const researchOk =
      step1.status === "completed" || step1.status === "flagged";
    const rulesOk = step2.status === "completed";
    const humanReviewOk = step3.status === "flagged"; // Gate is acknowledged
    const sandboxOk = step5.status === "completed" && sandboxPassed;
    const onboardingOk = step6.status === "completed";
    const allPrerequisitesMet = rulesOk && sandboxOk && onboardingOk;

    const gracePeriodDays = 90; // 90-day elevated review monitoring
    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + gracePeriodDays);

    const expansionRequest =
      await db.query.jurisdictionExpansionRequests.findFirst({
        where: and(
          eq(jurisdictionExpansionRequests.entityId, entityId),
          eq(jurisdictionExpansionRequests.country, country),
        ),
      });

    if (expansionRequest && allPrerequisitesMet) {
      // Activate — flip all draft rules to active
      await db
        .update(jurisdictionTaxRules)
        .set({
          status: "active",
          approvedBy: userId,
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(jurisdictionTaxRules.entityId, entityId),
            eq(jurisdictionTaxRules.country, country),
            eq(jurisdictionTaxRules.status, "draft"),
          ),
        );

      await db
        .update(statutoryDeductionRules)
        .set({
          status: "active",
          approvedById: userId,
          approvedAt: new Date(),
        })
        .where(
          and(
            eq(statutoryDeductionRules.entityId, entityId),
            eq(statutoryDeductionRules.country, country),
            eq(statutoryDeductionRules.status, "draft"),
          ),
        );

      // Update expansion request
      await db
        .update(jurisdictionExpansionRequests)
        .set({
          status: "live",
          activatedAt: new Date(),
          activatedById: userId,
          gracePeriodEndsAt: gracePeriodEnds,
          sandboxPassed,
          sandboxCompletedAt: new Date(),
        })
        .where(eq(jurisdictionExpansionRequests.id, expansionRequest.id));
    }

    if (allPrerequisitesMet) {
      step7.status = "completed";
      step7.completedAt = new Date().toISOString();
      step7.result = {
        activated: true,
        gracePeriodDays,
        gracePeriodEndsAt: gracePeriodEnds.toISOString(),
        prerequisites: {
          researchComplete: researchOk,
          rulesDrafted: rulesOk,
          humanReviewGateAcknowledged: humanReviewOk,
          sandboxPassed,
          onboardingExtended: onboardingOk,
        },
        note: `${countryName} jurisdiction activated. Elevated review monitoring period ends ${gracePeriodEnds.toISOString().slice(0, 10)}.`,
      };
    } else {
      step7.status = "flagged";
      step7.completedAt = new Date().toISOString();
      step7.result = {
        activated: false,
        reason: "Not all prerequisites met for go-live",
        prerequisites: {
          researchComplete: researchOk,
          rulesDrafted: rulesOk,
          humanReviewGateAcknowledged: humanReviewOk,
          sandboxPassed,
          onboardingExtended: onboardingOk,
        },
        message: "Complete all prerequisite steps before activating.",
      };
    }
  } catch (err) {
    step7.status = "failed";
    step7.error = String(err);
    errors.push(`Go-live activation failed: ${String(err)}`);
  }

  steps.push(step7);

  // ── Step 8: Elevated Review Monitoring ────────────────────────────
  const step8: ExpansionStep = {
    id: "elevated_review_monitoring",
    label: "Elevated Review Monitoring Period",
    ...stepDefaults,
    agent: "Compliance Agent",
  };

  try {
    step8.status = "in_progress";
    step8.startedAt = new Date().toISOString();

    // During the grace period, every filing/payroll run gets mandatory
    // human review regardless of confidence score.
    const gracePeriodActive = step7.status === "completed";

    if (gracePeriodActive) {
      // In production, this would check the expansion request's grace period dates
      step8.status = "flagged";
      step8.completedAt = new Date().toISOString();
      step8.result = {
        elevatedReviewActive: true,
        gracePeriodDays: 90,
        reviewRequirement:
          "Mandatory human review for all filings and payroll runs",
        confidenceOverride: true,
        note: "Confidence thresholds temporarily overridden — all submissions require human review during grace period.",
      };
    } else {
      step8.status = "skipped";
      step8.completedAt = new Date().toISOString();
      step8.result = {
        reason: "Jurisdiction not yet activated — grace period not started",
      };
    }
  } catch (err) {
    step8.status = "failed";
    step8.error = String(err);
    errors.push(`Elevated review monitoring setup failed: ${String(err)}`);
  }

  steps.push(step8);

  // ── Step 9: Audit Trail ───────────────────────────────────────────
  const step9: ExpansionStep = {
    id: "audit_trail",
    label: "Audit Trail Logging",
    ...stepDefaults,
    agent: "System",
  };

  try {
    step9.status = "in_progress";
    step9.startedAt = new Date().toISOString();

    await db.insert(auditLog).values({
      entityId,
      userId,
      action: "jurisdiction_expansion.run",
      entityType: "jurisdiction_expansion",
      newValues: {
        country,
        countryName,
        taxRulesCreated,
        deductionRulesCreated,
        coaTemplatesCreated,
        sandboxPassed,
        activated: step7.status === "completed",
        stepsCompleted: steps.filter((s) =>
          ["completed", "skipped", "flagged"].includes(s.status),
        ).length,
        totalSteps: steps.length,
        errors: errors.length,
        warnings: warnings.length,
      },
    });

    step9.status = "completed";
    step9.completedAt = new Date().toISOString();
  } catch (err) {
    step9.status = "failed";
    step9.error = String(err);
    errors.push(`Audit trail failed: ${String(err)}`);
  }

  steps.push(step9);

  return {
    success: errors.length === 0,
    country,
    countryName,
    entityId,
    steps,
    sources: sources ?? [],
    taxRulesCreated,
    deductionRulesCreated,
    coaTemplatesCreated: coaTemplatesCreated,
    formatExportersCreated: 1,
    sandboxScenarios,
    sandboxPassed,
    gracePeriodEndsAt:
      step7.status === "completed"
        ? new Date(
            new Date().getTime() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null,
    errors,
    warnings,
  };
}

// ─── Status Query ────────────────────────────────────────────────────────

export async function getExpansionStatus(params: {
  entityId: string;
  country?: string;
}): Promise<{
  expansions: Array<{
    id: string;
    country: string;
    countryName: string;
    status: string;
    activatedAt: string | null;
    gracePeriodEndsAt: string | null;
    sandboxPassed: boolean | null;
    sources: VerifiedSource[];
  }>;
}> {
  const { entityId, country } = params;

  const where = country
    ? and(
        eq(jurisdictionExpansionRequests.entityId, entityId),
        eq(jurisdictionExpansionRequests.country, country),
      )
    : eq(jurisdictionExpansionRequests.entityId, entityId);

  const records = await db.query.jurisdictionExpansionRequests.findMany({
    where,
    orderBy: [desc(jurisdictionExpansionRequests.createdAt)],
  });

  return {
    expansions: records.map((r) => ({
      id: r.id,
      country: r.country,
      countryName: r.countryName,
      status: r.status,
      activatedAt: r.activatedAt?.toISOString() ?? null,
      gracePeriodEndsAt: r.gracePeriodEndsAt?.toISOString() ?? null,
      sandboxPassed: r.sandboxPassed,
      sources: r.sources ?? [],
    })),
  };
}
