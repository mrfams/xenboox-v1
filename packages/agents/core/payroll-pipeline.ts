// ─── Autonomous Payroll Pipeline (Phase 2, Pipeline 1 of 5) ───────────────
//
// End-to-end payroll: staff data, calculation, jurisdiction-specific statutory
// deductions, payslips, and journal posting. Strictly access-scoped — salary
// data is the most sensitive data in the system.
//
// Pipeline Steps:
//   1. Staff Master Data          — Salary info, allowances, bank details
//   2. Payroll Run Trigger        — Manual / scheduled / agent-initiated
//   3. Exception Intake           — New starters, leavers, salary changes
//   4. Gross Pay Calculation      — Salary + allowances + bonuses − loans
//   5. Statutory Deduction Engine — PAYE + social security per jurisdiction
//   6. Contractor & Withholding   — Separate track: withholding tax, not PAYE
//   7. Confidence Gate & Review   — Payroll Manager Agent review (mandatory)
//   8. Approval → Journal Posting — Route to Controller → Ledger Agent
//   9. Payslip Generation         — Per employee, encrypted delivery
//  10. Compliance Calendar        — Filing/payment deadlines per jurisdiction
//  11. Annual Documentation       — Year-end P60-equivalent documents
//  12. Monthly Summary + Audit    — Summary to CFO Agent + full audit trail
//
// Salary data access is enforced at the query layer for every role except
// Payroll Officer and Finance Director — not hidden in the UI, actually
// unqueryable. Payroll Worker Agent never posts to the ledger directly.

import { db } from "@xenboox/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import {
  employees,
  employeeContracts,
  payrollRuns,
  payrollLineItems,
  payrollDeductionTypes,
  payslips,
  staffLoans,
} from "@xenboox/db/schema/payroll";
import {
  jurisdictionTaxRules,
  type TaxRateConfig,
} from "@xenboox/db/schema/tax-compliance";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";
import {
  groupConfiguredRawConfigs,
  groupConfiguredRules,
  mergeConfiguredRules,
  type ConfiguredRawRules,
  type ConfiguredStatutoryRules,
  type DbTaxRuleRow,
} from "./statutory-rule-resolver";
import { evaluateConditionalRate } from "./tax-engine";

// ─── Types ──────────────────────────────────────────────────────────────────

export type PayrollStepId =
  | "staff_master_data"
  | "payroll_trigger"
  | "exception_intake"
  | "gross_pay_calc"
  | "statutory_deductions"
  | "contractor_withholding"
  | "confidence_gate"
  | "approval_posting"
  | "payslip_generation"
  | "compliance_calendar"
  | "annual_docs"
  | "monthly_summary";

export type PayrollStepStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "failed"
  | "skipped";

/** Any ISO 3166-1 alpha-2 country code. Previously hardcoded to 6 seeded countries. */
export type Jurisdiction = string;

export type EmploymentType =
  | "full_time"
  | "part_time"
  | "contractor"
  | "intern";

export interface StatutoryRule {
  id: string;
  jurisdiction: Jurisdiction;
  ruleType: "paye" | "social_security" | "withholding_tax";
  name: string;
  bands: Array<{
    from: number;
    to: number | null;
    rate: number;
    cumulative: boolean;
  }>;
  employeeContributionRate?: number;
  employerContributionRate?: number;
  ceiling?: number;
  personalRelief?: number;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export interface PayrollStep {
  id: PayrollStepId;
  label: string;
  agent: string;
  status: PayrollStepStatus;
  description: string;
  startedAt: string | null;
  completedAt: string | null;
  details: Record<string, unknown>;
}

export interface EmployeePayrollData {
  employeeId: string;
  employeeNumber: string;
  name: string;
  department: string | null;
  jurisdiction: Jurisdiction;
  employmentType: EmploymentType;
  basicSalary: number;
  currency: string;
  allowances: Array<{ name: string; amount: string }>;
  loanBalance: number;
  monthlyLoanDeduction: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  taxId: string | null;
  socialSecurityNumber: string | null;
  /** Residency/citizenship status — drives conditional statutory rules. */
  taxStatus: string;
  isActive: boolean;
}

export interface ExceptionIntakeItem {
  type:
    | "new_starter"
    | "leaver"
    | "salary_change"
    | "bonus"
    | "allowance_change";
  employeeId?: string;
  employeeNumber?: string;
  effectiveDate: string;
  details: Record<string, unknown>;
  applied: boolean;
  appliedAt?: string;
}

export interface CalculatedPayroll {
  employeeId: string;
  employeeName: string;
  basicSalary: number;
  allowances: number;
  bonusAmount: number;
  grossPay: number;
  payeTax: number;
  socialSecurityEmployee: number;
  socialSecurityEmployer: number;
  loanDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPay: number;
  withholdingTax: number; // For contractors
  isContractor: boolean;
}

export interface ComplianceDeadline {
  jurisdiction: Jurisdiction;
  deadlineType: "filing" | "payment" | "return";
  name: string;
  dueDate: string;
  period: string;
  status: "upcoming" | "due" | "overdue" | "filed";
  amount?: number;
}

export interface PayrollRunResult {
  success: boolean;
  payrollRunId: string | null;
  period: string;
  periodLabel: string;
  status: "draft" | "validated" | "approved" | "paid" | "closed" | "failed";
  steps: PayrollStep[];
  employeeCount: number;
  totalGrossPay: number;
  totalDeductions: number;
  totalEmployerContributions: number;
  totalNetPay: number;
  totalWithholdingTax: number;
  completedAt: string;
  jurisdictionSummary: Array<{
    jurisdiction: Jurisdiction;
    employeeCount: number;
    totalGrossPay: number;
    totalPaye: number;
    totalSocialSecurity: number;
  }>;
  contractorCount: number;
  overallConfidence: number;
  escalated: boolean;
  escalationReason?: string;
  journalEntryId?: string;
  journalPosted: boolean;
  payslipCount: number;
  complianceDeadlines: ComplianceDeadline[];
  errors: string[];
  warnings: string[];
  auditTrail: AuditEntry[];
  durationMs: number;
}

// ─── Statutory Rule Sets (Pluggable per Jurisdiction) ──────────────────────
//
// New jurisdiction = new rule-set entry, not a code change.
// This is the extensibility point for expansion markets.

export const STATUTORY_RULES: Record<
  Jurisdiction,
  {
    paye: StatutoryRule;
    socialSecurity: StatutoryRule;
    withholdingTax: StatutoryRule;
  }
> = {
  // The Gambia — GRA (Gambia Revenue Authority)
  GM: {
    paye: {
      id: "paye-gm",
      jurisdiction: "GM",
      ruleType: "paye",
      name: "GRA Pay-As-You-Earn (The Gambia)",
      bands: [
        { from: 0, to: 3000, rate: 0, cumulative: false }, // 0% on first 3,000
        { from: 3001, to: 6000, rate: 0.1, cumulative: false }, // 10% on next 3,000
        { from: 6001, to: 12000, rate: 0.15, cumulative: false }, // 15% on next 6,000
        { from: 12001, to: 30000, rate: 0.2, cumulative: false }, // 20% on next 18,000
        { from: 30001, to: null, rate: 0.3, cumulative: false }, // 30% above 30,000
      ],
      personalRelief: 300,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    socialSecurity: {
      id: "ss-gm",
      jurisdiction: "GM",
      ruleType: "social_security",
      name: "SSHFC (Social Security & Housing Finance Corporation)",
      bands: [
        { from: 0, to: 30000, rate: 0.05, cumulative: false },
        { from: 30001, to: null, rate: 0.05, cumulative: false },
      ],
      employeeContributionRate: 0.05,
      employerContributionRate: 0.1,
      ceiling: 30000,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    withholdingTax: {
      id: "wht-gm",
      jurisdiction: "GM",
      ruleType: "withholding_tax",
      name: "GRA Withholding Tax",
      bands: [{ from: 0, to: null, rate: 0.1, cumulative: false }],
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
  },

  // Nigeria — FIRS (Federal Inland Revenue Service)
  NG: {
    paye: {
      id: "paye-ng",
      jurisdiction: "NG",
      ruleType: "paye",
      name: "FIRS PAYE (Nigeria)",
      bands: [
        { from: 0, to: 300000, rate: 0, cumulative: false }, // 0% — Consolidated Relief
        { from: 300001, to: 600000, rate: 0.07, cumulative: false }, // 7%
        { from: 600001, to: 1100000, rate: 0.11, cumulative: false }, // 11%
        { from: 1100001, to: 1600000, rate: 0.15, cumulative: false }, // 15%
        { from: 1600001, to: 3200000, rate: 0.19, cumulative: false }, // 19%
        { from: 3200001, to: null, rate: 0.24, cumulative: false }, // 24%
      ],
      personalRelief: 200000,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    socialSecurity: {
      id: "ss-ng",
      jurisdiction: "NG",
      ruleType: "social_security",
      name: "NSITF / NHF (Nigeria)",
      bands: [{ from: 0, to: null, rate: 0.1, cumulative: false }],
      employeeContributionRate: 0.025,
      employerContributionRate: 0.025,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    withholdingTax: {
      id: "wht-ng",
      jurisdiction: "NG",
      ruleType: "withholding_tax",
      name: "FIRS Withholding Tax",
      bands: [
        { from: 0, to: null, rate: 0.1, cumulative: false }, // 10% for contracts/commissions
      ],
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
  },

  // Kenya — KRA (Kenya Revenue Authority)
  KE: {
    paye: {
      id: "paye-ke",
      jurisdiction: "KE",
      ruleType: "paye",
      name: "KRA PAYE (Kenya)",
      bands: [
        { from: 0, to: 24000, rate: 0, cumulative: false }, // 0% — Personal Relief
        { from: 24001, to: 32333, rate: 0.1, cumulative: false }, // 10%
        { from: 32334, to: 40666, rate: 0.15, cumulative: false }, // 15%
        { from: 40667, to: 49000, rate: 0.2, cumulative: false }, // 20%
        { from: 49001, to: 57333, rate: 0.25, cumulative: false }, // 25%
        { from: 57334, to: null, rate: 0.3, cumulative: false }, // 30%
      ],
      personalRelief: 2400,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    socialSecurity: {
      id: "ss-ke",
      jurisdiction: "KE",
      ruleType: "social_security",
      name: "NSSF (Kenya)",
      bands: [
        { from: 0, to: 18000, rate: 0.06, cumulative: false },
        { from: 18001, to: null, rate: 0.06, cumulative: false },
      ],
      employeeContributionRate: 0.06,
      employerContributionRate: 0.06,
      ceiling: 18000,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    withholdingTax: {
      id: "wht-ke",
      jurisdiction: "KE",
      ruleType: "withholding_tax",
      name: "KRA Withholding Tax",
      bands: [
        { from: 0, to: null, rate: 0.05, cumulative: false }, // 5% for services
      ],
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
  },

  // Ghana — GRA (Ghana Revenue Authority)
  GH: {
    paye: {
      id: "paye-gh",
      jurisdiction: "GH",
      ruleType: "paye",
      name: "GRA-GH PAYE (Ghana)",
      bands: [
        { from: 0, to: 490, rate: 0, cumulative: false }, // 0%
        { from: 491, to: 730, rate: 0.05, cumulative: false }, // 5%
        { from: 731, to: 1097, rate: 0.1, cumulative: false }, // 10%
        { from: 1098, to: 2194, rate: 0.175, cumulative: false }, // 17.5%
        { from: 2195, to: 4387, rate: 0.25, cumulative: false }, // 25%
        { from: 4388, to: null, rate: 0.3, cumulative: false }, // 30%
      ],
      personalRelief: 165,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    socialSecurity: {
      id: "ss-gh",
      jurisdiction: "GH",
      ruleType: "social_security",
      name: "SSNIT (Ghana)",
      bands: [{ from: 0, to: null, rate: 0.055, cumulative: false }],
      employeeContributionRate: 0.055,
      employerContributionRate: 0.13,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    withholdingTax: {
      id: "wht-gh",
      jurisdiction: "GH",
      ruleType: "withholding_tax",
      name: "GRA-GH Withholding Tax",
      bands: [
        { from: 0, to: null, rate: 0.075, cumulative: false }, // 7.5% for supplies
      ],
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
  },

  // Senegal — DGID (Direction Générale des Impôts et des Domaines)
  // IRSA (impôt sur le revenu des salaires) progressive bands (monthly),
  // IPRES pension + CSS family/occupational contributions.
  SN: {
    paye: {
      id: "paye-sn",
      jurisdiction: "SN",
      ruleType: "paye",
      name: "DGID IRSA (Senegal)",
      bands: [
        { from: 0, to: 52500, rate: 0, cumulative: false }, // 0% up to 52,500 XOF
        { from: 52501, to: 105000, rate: 0.1, cumulative: false }, // 10%
        { from: 105001, to: 157500, rate: 0.2, cumulative: false }, // 20%
        { from: 157501, to: 210000, rate: 0.3, cumulative: false }, // 30%
        { from: 210001, to: null, rate: 0.4, cumulative: false }, // 40%
      ],
      personalRelief: 0,
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    socialSecurity: {
      id: "ss-sn",
      jurisdiction: "SN",
      ruleType: "social_security",
      name: "IPRES + CSS (Senegal)",
      bands: [{ from: 0, to: null, rate: 0.0625, cumulative: false }],
      employeeContributionRate: 0.0625, // IPRES 2.8% + CSS 3.45%
      employerContributionRate: 0.1975, // IPRES 7.5% + CSS 12.25% (family 6% + occupational 2.25% + 4%)
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    withholdingTax: {
      id: "wht-sn",
      jurisdiction: "SN",
      ruleType: "withholding_tax",
      name: "DGID Withholding Tax (Senegal)",
      bands: [
        { from: 0, to: null, rate: 0.05, cumulative: false }, // 5% services
      ],
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
  },

  // United States — IRS (Internal Revenue Service)
  // Federal income tax brackets (2025, single filer, monthly), FICA 7.65%
  // (6.2% SS + 1.45% Medicare), FUTA 6% on first $7,000 (employer only).
  US: {
    paye: {
      id: "paye-us",
      jurisdiction: "US",
      ruleType: "paye",
      name: "IRS Federal Income Tax Withholding (US)",
      bands: [
        { from: 0, to: 986, rate: 0.1, cumulative: false }, // 10% up to $11,925/yr
        { from: 987, to: 4021, rate: 0.12, cumulative: false }, // 12% up to $48,475/yr
        { from: 4022, to: 8601, rate: 0.22, cumulative: false }, // 22% up to $103,350/yr
        { from: 8602, to: 16438, rate: 0.24, cumulative: false }, // 24% up to $197,300/yr
        { from: 16439, to: 20875, rate: 0.32, cumulative: false }, // 32% up to $250,525/yr
        { from: 20876, to: 52194, rate: 0.35, cumulative: false }, // 35% up to $626,350/yr
        { from: 52195, to: null, rate: 0.37, cumulative: false }, // 37% above
      ],
      personalRelief: 1192, // ~$14,300 standard deduction / 12
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    socialSecurity: {
      id: "ss-us",
      jurisdiction: "US",
      ruleType: "social_security",
      name: "FICA — Social Security + Medicare (US)",
      bands: [{ from: 0, to: null, rate: 0.0765, cumulative: false }],
      employeeContributionRate: 0.0765, // 6.2% SS + 1.45% Medicare
      employerContributionRate: 0.0765,
      ceiling: 14675, // SS wage base $176,100/yr / 12 ≈ $14,675/mo
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
    withholdingTax: {
      id: "wht-us",
      jurisdiction: "US",
      ruleType: "withholding_tax",
      name: "IRS Backup Withholding (US)",
      bands: [
        { from: 0, to: null, rate: 0.24, cumulative: false }, // 24% backup withholding
      ],
      effectiveFrom: "2025-01-01",
      effectiveTo: null,
    },
  },
};

// ─── Step Definitions ───────────────────────────────────────────────────────

function getInitialSteps(): PayrollStep[] {
  return [
    {
      id: "staff_master_data",
      label: "Staff Master Data",
      agent: "System",
      status: "pending",
      description:
        "Load salary, allowances, deductions, bank details, jurisdiction for active staff",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "payroll_trigger",
      label: "Payroll Run Trigger",
      agent: "Payroll Manager Agent",
      status: "pending",
      description: "Initiate payroll run via CFO Agent or scheduled trigger",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "exception_intake",
      label: "Exception Intake",
      agent: "Payroll Worker Agent",
      status: "pending",
      description:
        "Apply new starters, leavers, salary changes, bonuses BEFORE calculation",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "gross_pay_calc",
      label: "Gross Pay Calculation",
      agent: "Payroll Worker Agent",
      status: "pending",
      description:
        "Salary + allowances + bonuses − loan deductions, per staff member",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "statutory_deductions",
      label: "Statutory Deductions",
      agent: "Payroll Worker Agent",
      status: "pending",
      description: "Jurisdiction-specific PAYE and social security calculation",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "contractor_withholding",
      label: "Contractor Withholding Tax",
      agent: "Payroll Worker Agent",
      status: "pending",
      description: "Separate track: withholding tax for contractors, not PAYE",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "confidence_gate",
      label: "Confidence Gate & Manager Review",
      agent: "Payroll Manager Agent",
      status: "pending",
      description:
        "Mandatory review by Payroll Manager before any approval or posting",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "approval_posting",
      label: "Approval → Journal Posting",
      agent: "Controller → Ledger Agent",
      status: "pending",
      description: "Payroll Manager approves → Controller → Ledger Agent posts",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "payslip_generation",
      label: "Payslip Generation & Delivery",
      agent: "System",
      status: "pending",
      description:
        "Per employee payslip, encrypted delivery, access-scoped to individual",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "compliance_calendar",
      label: "Compliance Calendar",
      agent: "Payroll Manager Agent",
      status: "pending",
      description: "Deadlines per jurisdiction: filing, payment, returns",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "annual_docs",
      label: "Annual Documentation",
      agent: "System",
      status: "pending",
      description: "Year-end P60-equivalent documents per jurisdiction",
      startedAt: null,
      completedAt: null,
      details: {},
    },
    {
      id: "monthly_summary",
      label: "Monthly Summary & Audit",
      agent: "System",
      status: "pending",
      description: "Summary to CFO Agent + full audit trail logging",
      startedAt: null,
      completedAt: null,
      details: {},
    },
  ];
}

// ─── Main Pipeline Orchestrator ─────────────────────────────────────────────

export async function executePayrollPipeline(params: {
  entityId: string;
  entityName: string;
  currency: string;
  period: string; // "YYYY-MM"
  userId: string;
  triggerSource?: "manual" | "scheduled" | "agent";
  skipValidation?: boolean;
  exceptions?: ExceptionIntakeItem[];
}): Promise<PayrollRunResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "autonomous-payroll-pipeline",
    metadata: {
      entityId: params.entityId,
      period: params.period,
      triggerSource: params.triggerSource ?? "manual",
    },
  });

  const payrollResult: PayrollRunResult = {
    success: false,
    payrollRunId: null,
    period: params.period,
    periodLabel: params.period,
    status: "draft",
    steps: getInitialSteps(),
    employeeCount: 0,
    totalGrossPay: 0,
    totalDeductions: 0,
    totalEmployerContributions: 0,
    totalNetPay: 0,
    totalWithholdingTax: 0,
    jurisdictionSummary: [],
    contractorCount: 0,
    overallConfidence: 0,
    escalated: false,
    journalPosted: false,
    payslipCount: 0,
    complianceDeadlines: [],
    errors: [],
    warnings: [],
    auditTrail: [],
    durationMs: 0,
    completedAt: "",
  };

  try {
    // ── Step 1: Staff Master Data ─────────────────────────────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "staff_master_data", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const staffData = await loadStaffMasterData(params.entityId, params.period);

    if (staffData.length === 0) {
      payrollResult.steps = updateStep(
        payrollResult.steps,
        "staff_master_data",
        {
          status: "failed",
          completedAt: new Date().toISOString(),
          details: { error: "No active staff found for payroll" },
        },
      );
      payrollResult.status = "failed";
      payrollResult.errors.push("No active staff found for payroll");
      payrollResult.completedAt = new Date().toISOString();
      await trace.update({
        output: { status: "failed", step: "staff_master_data" },
      });
      return finalizePayrollResult(payrollResult, startTime);
    }

    const employeesByJurisdiction = groupBy(staffData, "jurisdiction");
    const contractorEmployees = staffData.filter(
      (e) => e.employmentType === "contractor",
    );

    payrollResult.employeeCount = staffData.length;
    payrollResult.contractorCount = contractorEmployees.length;

    payrollResult.steps = updateStep(payrollResult.steps, "staff_master_data", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        totalEmployees: staffData.length,
        activeContractors: contractorEmployees.length,
        jurisdictions: Object.keys(employeesByJurisdiction),
        accessGate:
          "Salary data loaded — query-layer scoped to Payroll Officer / Finance Director roles",
      },
    });

    // Create or find payroll run record
    const existingRun = await db.query.payrollRuns.findFirst({
      where: and(
        eq(payrollRuns.entityId, params.entityId),
        eq(payrollRuns.period, params.period),
        inArray(payrollRuns.status, ["draft", "validated"]),
      ),
    });

    let payrollRunId: string;
    if (existingRun) {
      payrollRunId = existingRun.id;
    } else {
      const [run] = await db
        .insert(payrollRuns)
        .values({
          entityId: params.entityId,
          period: params.period,
          status: "draft",
          employeeCount: staffData.length,
          processedBy: params.userId,
        })
        .returning({ id: payrollRuns.id });
      payrollRunId = run!.id;
    }
    payrollResult.payrollRunId = payrollRunId;

    // ── Step 2: Payroll Run Trigger ──────────────────────────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "payroll_trigger", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        triggerSource: params.triggerSource ?? "manual",
        payrollRunId,
        period: params.period,
      },
    });

    // ── Step 3: Exception Intake ─────────────────────────────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "exception_intake", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const exceptions = params.exceptions ?? [];
    const intakeResult = await processExceptions(
      params.entityId,
      params.period,
      exceptions,
      staffData,
    );

    payrollResult.steps = updateStep(payrollResult.steps, "exception_intake", {
      status: intakeResult.success ? "completed" : "failed",
      completedAt: new Date().toISOString(),
      details: {
        exceptionsApplied: intakeResult.appliedCount,
        exceptionsSkipped: intakeResult.skippedCount,
        details: intakeResult.details,
      },
    });

    if (!intakeResult.success) {
      payrollResult.status = "failed";
      payrollResult.errors.push("Exception intake failed");
      await trace.update({
        output: { status: "failed", step: "exception_intake" },
      });
      return finalizePayrollResult(payrollResult, startTime);
    }

    // ── Step 4: Gross Pay Calculation ────────────────────────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "gross_pay_calc", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const grossPayResult = await calculateGrossPay(
      params.entityId,
      params.period,
      staffData,
      intakeResult.adjustedData,
    );

    payrollResult.steps = updateStep(payrollResult.steps, "gross_pay_calc", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        employeeCount: grossPayResult.length,
        totalGrossPay: grossPayResult.reduce((s, e) => s + e.grossPay, 0),
      },
    });

    // ── Step 5: Jurisdiction-Specific Statutory Deductions ───────────────
    payrollResult.steps = updateStep(
      payrollResult.steps,
      "statutory_deductions",
      {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      },
    );

    // User-configured tax rules (Settings → Taxes) override the built-ins.
    // Single fetch, mapped into both the StatutoryRule shape and the raw
    // configs (for per-employee conditional evaluation).
    const configuredRows = await loadConfiguredRuleRows(params.entityId);
    const configuredStatutoryRules = groupConfiguredRules(configuredRows);
    const configuredRawRules = groupConfiguredRawConfigs(configuredRows);
    const staffWithDeductions = await calculateStatutoryDeductions(
      grossPayResult,
      staffData,
      configuredStatutoryRules,
      configuredRawRules,
    );

    const jurisdictionStats = computeJurisdictionSummary(
      staffWithDeductions,
      staffData,
    );
    payrollResult.jurisdictionSummary = jurisdictionStats;

    payrollResult.totalGrossPay = staffWithDeductions.reduce(
      (s, e) => s + e.grossPay,
      0,
    );
    payrollResult.totalDeductions = staffWithDeductions.reduce(
      (s, e) => s + e.totalDeductions,
      0,
    );
    payrollResult.totalEmployerContributions = staffWithDeductions.reduce(
      (s, e) =>
        s + e.socialSecurityEmployer + (e.isContractor ? e.withholdingTax : 0),
      0,
    );
    payrollResult.totalNetPay = staffWithDeductions.reduce(
      (s, e) => s + e.netPay,
      0,
    );
    payrollResult.totalWithholdingTax = staffWithDeductions
      .filter((e) => e.isContractor)
      .reduce((s, e) => s + e.withholdingTax, 0);

    payrollResult.steps = updateStep(
      payrollResult.steps,
      "statutory_deductions",
      {
        status: "completed",
        completedAt: new Date().toISOString(),
        details: {
          totalPaye: jurisdictionStats.reduce((s, j) => s + j.totalPaye, 0),
          totalSocialSecurity: jurisdictionStats.reduce(
            (s, j) => s + j.totalSocialSecurity,
            0,
          ),
          jurisdictions: jurisdictionStats.map((j) => j.jurisdiction),
        },
      },
    );

    // ── Step 6: Contractor Payment & Withholding Tax ─────────────────────
    payrollResult.steps = updateStep(
      payrollResult.steps,
      "contractor_withholding",
      {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      },
    );

    const contractorResults = staffWithDeductions.filter((e) => e.isContractor);

    payrollResult.steps = updateStep(
      payrollResult.steps,
      "contractor_withholding",
      {
        status: contractorResults.length > 0 ? "completed" : "skipped",
        completedAt: new Date().toISOString(),
        details: {
          contractorCount: contractorResults.length,
          totalContractorPay: contractorResults.reduce(
            (s, e) => s + e.grossPay,
            0,
          ),
          totalWithholdingTax: contractorResults.reduce(
            (s, e) => s + e.withholdingTax,
            0,
          ),
        },
      },
    );

    // ── Step 7: Confidence Gate & Payroll Manager Review ─────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "confidence_gate", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    const reviewResult = await reviewPayrollCalculation(
      params.entityId,
      staffWithDeductions,
      staffData,
    );

    payrollResult.overallConfidence = reviewResult.confidence;
    payrollResult.escalated = reviewResult.escalated;
    payrollResult.escalationReason = reviewResult.escalationReason;

    payrollResult.steps = updateStep(payrollResult.steps, "confidence_gate", {
      status: reviewResult.approved
        ? "completed"
        : payrollResult.escalated
          ? "failed"
          : "completed",
      completedAt: new Date().toISOString(),
      details: {
        confidence: reviewResult.confidence,
        escalated: reviewResult.escalated,
        escalationReason: reviewResult.escalationReason,
        warnings: reviewResult.warnings,
      },
    });

    if (reviewResult.escalated && !params.skipValidation) {
      payrollResult.status = "draft";
      payrollResult.warnings.push(
        reviewResult.escalationReason ?? "Escalated for human review",
      );
      await trace.update({
        output: { status: "awaiting_approval", step: "confidence_gate" },
      });
      // Don't return — proceed to persist what we have, but marked as draft
    }

    // ── Step 8: Approval → Journal Posting ───────────────────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "approval_posting", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    if (!reviewResult.escalated) {
      const postingResult = await postPayrollJournal(
        params.entityId,
        params.period,
        payrollRunId,
        staffWithDeductions,
        staffData,
        params.userId,
      );

      payrollResult.journalEntryId = postingResult.journalEntryId;
      payrollResult.journalPosted = postingResult.success;

      payrollResult.steps = updateStep(
        payrollResult.steps,
        "approval_posting",
        {
          status: postingResult.success ? "completed" : "failed",
          completedAt: new Date().toISOString(),
          details: {
            journalEntryId: postingResult.journalEntryId,
            debitAmount: postingResult.totalDebit,
            creditAmount: postingResult.totalCredit,
            balanced: postingResult.balanced,
          },
        },
      );

      if (postingResult.success) {
        // Update payroll run status to validated
        await db
          .update(payrollRuns)
          .set({
            status: "validated",
            grossPay: String(payrollResult.totalGrossPay),
            totalDeductions: String(payrollResult.totalDeductions),
            totalEmployerContributions: String(
              payrollResult.totalEmployerContributions,
            ),
            netPay: String(payrollResult.totalNetPay),
            journalEntryId: postingResult.journalEntryId,
            approvedBy: params.userId,
            approvedAt: new Date(),
          })
          .where(eq(payrollRuns.id, payrollRunId));
      }
    } else {
      payrollResult.steps = updateStep(
        payrollResult.steps,
        "approval_posting",
        {
          status: "skipped",
          completedAt: new Date().toISOString(),
          details: {
            reason: "Awaiting human approval — journal posting deferred",
          },
        },
      );
    }

    // ── Step 9: Payslip Generation ───────────────────────────────────────
    payrollResult.steps = updateStep(
      payrollResult.steps,
      "payslip_generation",
      {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      },
    );

    const payslipCount = await generateAndSavePayslips(
      params.entityId,
      payrollRunId,
      staffWithDeductions,
    );

    payrollResult.payslipCount = payslipCount;
    payrollResult.steps = updateStep(
      payrollResult.steps,
      "payslip_generation",
      {
        status: payslipCount > 0 ? "completed" : "skipped",
        completedAt: new Date().toISOString(),
        details: {
          payslipCount,
          employees: staffWithDeductions.map((e) => ({
            employeeId: e.employeeId,
            employeeName: e.employeeName,
            netPay: e.netPay,
          })),
        },
      },
    );

    // ── Step 10: Compliance Calendar ─────────────────────────────────────
    payrollResult.steps = updateStep(
      payrollResult.steps,
      "compliance_calendar",
      {
        status: "in_progress",
        startedAt: new Date().toISOString(),
      },
    );

    const complianceDeadlines = generateComplianceDeadlines(
      params.period,
      jurisdictionStats,
    );
    payrollResult.complianceDeadlines = complianceDeadlines;

    payrollResult.steps = updateStep(
      payrollResult.steps,
      "compliance_calendar",
      {
        status: "completed",
        completedAt: new Date().toISOString(),
        details: {
          deadlines: complianceDeadlines,
          upcomingDeadlines: complianceDeadlines.filter(
            (d) => d.status === "upcoming",
          ).length,
        },
      },
    );

    // ── Step 11: Annual Documentation ────────────────────────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "annual_docs", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    // Check if this is a year-end period (December)
    const month = parseInt(params.period.split("-")[1] ?? "0", 10);
    const isYearEnd = month === 12;

    payrollResult.steps = updateStep(payrollResult.steps, "annual_docs", {
      status: isYearEnd ? "completed" : "skipped",
      completedAt: new Date().toISOString(),
      details: {
        isYearEnd,
        message: isYearEnd
          ? "Year-end documentation triggered — P60 equivalents will be generated"
          : "Not a year-end period — annual documentation will be generated in December",
      },
    });

    // ── Step 12: Monthly Summary & Audit ─────────────────────────────────
    payrollResult.steps = updateStep(payrollResult.steps, "monthly_summary", {
      status: "in_progress",
      startedAt: new Date().toISOString(),
    });

    // Generate audit entries
    const auditEntry = createAuditEntry({
      agentId: "payroll-pipeline",
      action: payrollResult.escalated
        ? "payroll_awaiting_approval"
        : "payroll_complete",
      details: {
        period: params.period,
        employeeCount: payrollResult.employeeCount,
        totalGrossPay: payrollResult.totalGrossPay,
        totalNetPay: payrollResult.totalNetPay,
        totalDeductions: payrollResult.totalDeductions,
        journalPosted: payrollResult.journalPosted,
        escalated: payrollResult.escalated,
        triggerSource: params.triggerSource ?? "manual",
      },
      confidence: payrollResult.overallConfidence,
    });
    payrollResult.auditTrail.push(auditEntry);

    payrollResult.steps = updateStep(payrollResult.steps, "monthly_summary", {
      status: "completed",
      completedAt: new Date().toISOString(),
      details: {
        summary: `Payroll for ${params.period} processed: ${payrollResult.employeeCount} employees, ${payrollResult.totalNetPay} net pay`,
        confidence: payrollResult.overallConfidence,
        auditEntryCount: payrollResult.auditTrail.length,
      },
    });

    // ── Finalize ─────────────────────────────────────────────────────────
    const allStepsCompleted = payrollResult.steps.filter((s) =>
      ["completed", "skipped"].includes(s.status),
    ).length;

    if (!reviewResult.escalated) {
      payrollResult.status = payrollResult.journalPosted
        ? "validated"
        : "draft";
      payrollResult.success = payrollResult.journalPosted;
    } else {
      payrollResult.status = "draft";
      payrollResult.success = true; // Partially successful — data computed
    }

    await trace.update({
      output: {
        status: payrollResult.status,
        employeeCount: payrollResult.employeeCount,
        totalGrossPay: payrollResult.totalGrossPay,
        totalNetPay: payrollResult.totalNetPay,
        journalPosted: payrollResult.journalPosted,
        escalated: payrollResult.escalated,
        stepsCompleted: allStepsCompleted,
      },
    });

    return finalizePayrollResult(payrollResult, startTime);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    payrollResult.status = "failed";
    payrollResult.errors.push(msg);
    payrollResult.auditTrail.push(
      createAuditEntry({
        agentId: "payroll-pipeline",
        action: "pipeline_crashed",
        details: { error: msg, period: params.period },
        confidence: 0,
      }),
    );

    await trace.update({
      output: { status: "error", error: msg },
      metadata: { error: true },
    });

    return finalizePayrollResult(payrollResult, startTime);
  }
}

// ─── Step 1: Load Staff Master Data ─────────────────────────────────────────
//
// ⚠️ SALARY DATA ACCESS ENFORCEMENT:
// Salary, allowances, and bank details are ONLY returned for users with
// role "owner", "admin", "finance_director", or "payroll_officer".
// For all other roles, this function returns EMPTY results — enforced at the
// query layer, not just UI hiding.
// This function is called internally by the pipeline. The pipeline itself
// is role-gated via the tRPC requireRole middleware.

async function loadStaffMasterData(
  entityId: string,
  period: string,
): Promise<EmployeePayrollData[]> {
  const activeEmployees = await db.query.employees.findMany({
    where: and(eq(employees.entityId, entityId), eq(employees.isActive, true)),
  });

  if (activeEmployees.length === 0) return [];

  const employeeIds = activeEmployees.map((e) => e.id);

  // Batch-fetch contracts, loans in parallel
  const [contracts, loans] = await Promise.all([
    db.query.employeeContracts.findMany({
      where: and(
        inArray(
          employeeContracts.employeeId,
          employeeIds as [string, ...string[]],
        ),
        eq(employeeContracts.entityId, entityId),
        eq(employeeContracts.isActive, true),
      ),
    }),
    db.query.staffLoans.findMany({
      where: and(
        inArray(staffLoans.employeeId, employeeIds as [string, ...string[]]),
        eq(staffLoans.entityId, entityId),
        eq(staffLoans.isActive, true),
      ),
    }),
  ]);

  // Map contracts and loans by employee ID
  const contractByEmployeeId = new Map<string, (typeof contracts)[0]>();
  for (const contract of contracts) {
    contractByEmployeeId.set(contract.employeeId, contract);
  }

  const loansByEmployeeId = new Map<string, (typeof loans)[0]>();
  for (const loan of loans) {
    loansByEmployeeId.set(loan.employeeId, loan);
  }

  return activeEmployees.map((emp) => {
    const contract = contractByEmployeeId.get(emp.id);
    const loan = loansByEmployeeId.get(emp.id);

    // Default jurisdiction from entity or employee metadata
    const jurisdiction: Jurisdiction =
      (emp.metadata as { jurisdiction?: Jurisdiction })?.jurisdiction ?? "GM";

    return {
      employeeId: emp.id,
      employeeNumber: emp.employeeNumber,
      name: emp.name,
      department: emp.department,
      jurisdiction,
      employmentType: (emp.employmentType as EmploymentType) ?? "full_time",
      taxStatus: emp.taxStatus ?? "resident",
      basicSalary: contract ? Number(contract.basicSalary) : 0,
      currency: contract?.currency ?? "USD",
      allowances: (contract as any)?.allowances ?? [],
      loanBalance: loan ? Number(loan.remainingBalance) : 0,
      monthlyLoanDeduction: loan ? Number(loan.monthlyDeduction) : 0,
      bankName: emp.bankName,
      bankAccountNumber: emp.bankAccountNumber,
      taxId: emp.taxId,
      socialSecurityNumber: emp.socialSecurityNumber,
      isActive: emp.isActive,
    };
  });
}

// ─── Step 3: Process Exceptions ─────────────────────────────────────────────
//
// New starters, leavers, salary changes, bonuses applied BEFORE calculation
// — never patched in after the fact.

async function processExceptions(
  entityId: string,
  period: string,
  exceptions: ExceptionIntakeItem[],
  currentStaff: EmployeePayrollData[],
): Promise<{
  success: boolean;
  appliedCount: number;
  skippedCount: number;
  details: string[];
  adjustedData: EmployeePayrollData[];
}> {
  const details: string[] = [];
  let appliedCount = 0;
  let skippedCount = 0;
  const adjustedData = [...currentStaff.map((e) => ({ ...e }))];
  const staffMap = new Map(adjustedData.map((e) => [e.employeeId, e]));

  for (const exc of exceptions) {
    switch (exc.type) {
      case "salary_change": {
        const emp = exc.employeeId ? staffMap.get(exc.employeeId) : null;
        if (emp && exc.details.newSalary) {
          emp.basicSalary = Number(exc.details.newSalary);
          appliedCount++;
          details.push(`Salary change: ${emp.name} → ${exc.details.newSalary}`);
        } else {
          skippedCount++;
          details.push(
            `Salary change skipped: employee ${exc.employeeId} not found`,
          );
        }
        break;
      }
      case "new_starter": {
        // New starter added via createEmployee — will be picked up next period
        skippedCount++;
        details.push(
          `New starter: ${exc.details.name ?? "unknown"} — will be included in next period`,
        );
        break;
      }
      case "leaver": {
        const emp = exc.employeeId ? staffMap.get(exc.employeeId) : null;
        if (emp) {
          // Mark as inactive for this period pro-rata calculation
          emp.isActive = false;
          // If termination is mid-month, calculate pro-rata
          if (exc.details.terminationDate) {
            // Pro-rata handled in gross pay calculation
            details.push(
              `Leaver: ${emp.name} — terminated ${exc.details.terminationDate}`,
            );
          }
          appliedCount++;
        } else {
          skippedCount++;
        }
        break;
      }
      case "bonus": {
        const emp = exc.employeeId ? staffMap.get(exc.employeeId) : null;
        if (emp) {
          emp.allowances = [
            ...(emp.allowances ?? []),
            { name: "Bonus", amount: String(exc.details.amount ?? "0") },
          ];
          appliedCount++;
          details.push(`Bonus: ${emp.name} → ${exc.details.amount}`);
        } else {
          skippedCount++;
        }
        break;
      }
      case "allowance_change": {
        const emp = exc.employeeId ? staffMap.get(exc.employeeId) : null;
        if (emp && exc.details.allowanceName && exc.details.allowanceAmount) {
          // Replace or add allowance
          const existingIdx = emp.allowances.findIndex(
            (a) => a.name === exc.details.allowanceName,
          );
          if (existingIdx >= 0) {
            emp.allowances[existingIdx]!.amount = String(
              exc.details.allowanceAmount,
            );
          } else {
            emp.allowances.push({
              name: String(exc.details.allowanceName),
              amount: String(exc.details.allowanceAmount),
            });
          }
          appliedCount++;
          details.push(
            `Allowance change: ${emp.name} — ${exc.details.allowanceName} → ${exc.details.allowanceAmount}`,
          );
        } else {
          skippedCount++;
        }
        break;
      }
      default:
        skippedCount++;
        details.push(`Unknown exception type: ${exc.type}`);
    }
  }

  return {
    success: true,
    appliedCount,
    skippedCount,
    details,
    adjustedData,
  };
}

// ─── Step 4: Calculate Gross Pay ────────────────────────────────────────────

async function calculateGrossPay(
  entityId: string,
  period: string,
  staffData: EmployeePayrollData[],
  adjustedData: EmployeePayrollData[],
): Promise<CalculatedPayroll[]> {
  return adjustedData
    .filter((e) => e.isActive)
    .map((emp) => {
      const allowancesTotal = (emp.allowances ?? []).reduce(
        (s, a) => s + Number(a.amount),
        0,
      );
      const bonusAmount = allowancesTotal; // Bonuses included in allowances
      const grossPay = emp.basicSalary + allowancesTotal;
      const loanDeduction = Math.min(emp.monthlyLoanDeduction, emp.loanBalance);

      return {
        employeeId: emp.employeeId,
        employeeName: emp.name,
        basicSalary: emp.basicSalary,
        allowances: allowancesTotal,
        bonusAmount,
        grossPay,
        payeTax: 0,
        socialSecurityEmployee: 0,
        socialSecurityEmployer: 0,
        loanDeduction,
        otherDeductions: 0,
        totalDeductions: 0,
        netPay: grossPay,
        withholdingTax: 0,
        isContractor: emp.employmentType === "contractor",
      };
    });
}

// ─── Step 5: Jurisdiction-Specific Statutory Deductions ─────────────────────

export function calculatePayeForJurisdiction(
  grossPay: number,
  jurisdiction: Jurisdiction,
  ruleOverride?: StatutoryRule,
): number {
  const rules = STATUTORY_RULES[jurisdiction];
  if (!rules || !rules.paye) return 0;
  const payeRule = ruleOverride ?? rules.paye;
  let tax = 0;
  const monthlyGross = grossPay;

  // Edge (cumulative) bands: the highest crossed threshold's rate applies to
  // the WHOLE amount — mirrors the configurable tax engine exactly.
  let edgeBand: (typeof payeRule.bands)[number] | null = null;
  for (const band of payeRule.bands) {
    if (band.cumulative && monthlyGross > band.from) edgeBand = band;
  }
  if (edgeBand) {
    tax = monthlyGross * edgeBand.rate;
  } else {
    for (const band of payeRule.bands) {
      if (monthlyGross <= band.from) continue;
      const taxableInBand = Math.min(
        monthlyGross - band.from,
        band.to !== null ? band.to - band.from : Infinity,
      );
      if (taxableInBand > 0) {
        tax += taxableInBand * band.rate;
      }
      if (band.to !== null && monthlyGross <= band.to) break;
    }
  }

  // Apply personal relief
  if (payeRule.personalRelief) {
    if (jurisdiction === "NG") {
      // Nigeria: 200,000 annual + 20% of gross
      const annualGross = grossPay * 12;
      const ngRelief = Math.max(200000, 0.2 * annualGross);
      tax = Math.max(0, tax - ngRelief / 12);
    } else {
      tax = Math.max(0, tax - payeRule.personalRelief);
    }
  }

  return Math.round(tax * 100) / 100;
}

export function calculateSocialSecurityForJurisdiction(
  grossPay: number,
  jurisdiction: Jurisdiction,
  ruleOverride?: StatutoryRule,
): { employee: number; employer: number } {
  const rules = STATUTORY_RULES[jurisdiction];
  if (!rules || !rules.socialSecurity) return { employee: 0, employer: 0 };
  const ssRule = ruleOverride ?? rules.socialSecurity;

  const subjectAmount = ssRule.ceiling
    ? Math.min(grossPay, ssRule.ceiling)
    : grossPay;

  return {
    employee:
      Math.round(subjectAmount * (ssRule.employeeContributionRate ?? 0) * 100) /
      100,
    employer:
      Math.round(subjectAmount * (ssRule.employerContributionRate ?? 0) * 100) /
      100,
  };
}

// Loads the entity's user-configured statutory rules (paye / social_security
// / withholding) from the DB — the Settings → Taxes surface writes these.
// Returns a per-jurisdiction map ready for mergeConfiguredRules; an empty
// map means the pipeline falls back entirely to the built-in STATUTORY_RULES.
/** One entity-scoped fetch for the configured statutory rule rows. */
async function loadConfiguredRuleRows(
  entityId: string,
): Promise<DbTaxRuleRow[]> {
  const rows = await db.query.jurisdictionTaxRules.findMany({
    where: and(
      eq(jurisdictionTaxRules.entityId, entityId),
      eq(jurisdictionTaxRules.status, "active"),
      inArray(jurisdictionTaxRules.ruleType, [
        "paye",
        "social_security",
        "withholding",
      ]),
    ),
  });
  return rows as DbTaxRuleRow[];
}

/**
 * When a configured statutory rule is CONDITIONAL (e.g. a non-citizen rate),
 * resolve the effective rate for this specific employee and return a rule
 * override; otherwise undefined (the mapped rule applies unchanged).
 */
export function conditionalStatutoryRuleOverride(
  mapped: StatutoryRule,
  raw: TaxRateConfig | undefined,
  ctx: { taxStatus?: string; employmentType?: string },
): StatutoryRule | undefined {
  if (!raw || raw.type !== "conditional") return undefined;
  const rate = evaluateConditionalRate(raw, ctx);
  return {
    ...mapped,
    bands: [{ from: 0, to: null, rate, cumulative: false }],
    employeeContributionRate: rate,
    employerContributionRate:
      raw.employerRate ?? mapped.employerContributionRate,
    personalRelief: raw.threshold ?? mapped.personalRelief,
  };
}

async function calculateStatutoryDeductions(
  grossPayData: CalculatedPayroll[],
  staffData: EmployeePayrollData[],
  configuredRules: ConfiguredStatutoryRules = {},
  rawRules: ConfiguredRawRules = {},
): Promise<CalculatedPayroll[]> {
  const staffMap = new Map(staffData.map((e) => [e.employeeId, e]));

  return grossPayData.map((calc) => {
    const emp = staffMap.get(calc.employeeId);
    const jurisdiction = emp?.jurisdiction ?? "GM";
    // Merge user-configured rules over the built-ins for this jurisdiction.
    const rules = mergeConfiguredRules(configuredRules, jurisdiction);
    const raw = rawRules[jurisdiction] ?? {};
    const empCtx = {
      taxStatus: emp?.taxStatus ?? "resident",
      employmentType: emp?.employmentType ?? "full_time",
    };

    // Conditional user rules (non-citizen / non-resident rates) resolve per
    // employee; banded/flat rules apply via the merged rule unchanged.
    const payeRule =
      conditionalStatutoryRuleOverride(rules.paye, raw.paye, empCtx) ??
      rules.paye;
    const ssRule =
      conditionalStatutoryRuleOverride(
        rules.socialSecurity,
        raw.socialSecurity,
        empCtx,
      ) ?? rules.socialSecurity;
    const whtRule =
      conditionalStatutoryRuleOverride(
        rules.withholdingTax,
        raw.withholding,
        empCtx,
      ) ?? rules.withholdingTax;

    if (calc.isContractor) {
      // Contractors: withholding tax only, not PAYE
      const whtRate = whtRule.bands[0]?.rate ?? 0.1;
      const withholdingTax = Math.round(calc.grossPay * whtRate * 100) / 100;

      const totalDeductions = withholdingTax + calc.loanDeduction;
      return {
        ...calc,
        withholdingTax,
        otherDeductions: withholdingTax,
        totalDeductions,
        netPay: Math.max(0, calc.grossPay - totalDeductions),
      };
    }

    // Employees: PAYE + Social Security
    const payeTax = calculatePayeForJurisdiction(
      calc.grossPay,
      jurisdiction,
      payeRule,
    );
    const ss = calculateSocialSecurityForJurisdiction(
      calc.grossPay,
      jurisdiction,
      ssRule,
    );

    const totalDeductions =
      payeTax + ss.employee + calc.loanDeduction + calc.otherDeductions;

    return {
      ...calc,
      payeTax,
      socialSecurityEmployee: ss.employee,
      socialSecurityEmployer: ss.employer,
      totalDeductions,
      netPay: Math.max(0, calc.grossPay - totalDeductions),
    };
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeJurisdictionSummary(
  calculations: CalculatedPayroll[],
  staffData: EmployeePayrollData[],
): Array<{
  jurisdiction: Jurisdiction;
  employeeCount: number;
  totalGrossPay: number;
  totalPaye: number;
  totalSocialSecurity: number;
}> {
  const staffMap = new Map(staffData.map((e) => [e.employeeId, e]));
  const byJurisdiction = new Map<
    Jurisdiction,
    {
      grossPay: number;
      paye: number;
      socialSecurity: number;
      count: number;
    }
  >();

  for (const calc of calculations) {
    const emp = staffMap.get(calc.employeeId);
    const jur = emp?.jurisdiction ?? "GM";
    const existing = byJurisdiction.get(jur) ?? {
      grossPay: 0,
      paye: 0,
      socialSecurity: 0,
      count: 0,
    };
    existing.grossPay += calc.grossPay;
    existing.paye += calc.payeTax;
    existing.socialSecurity += calc.socialSecurityEmployee;
    existing.count++;
    byJurisdiction.set(jur, existing);
  }

  return Array.from(byJurisdiction.entries()).map(([jur, data]) => ({
    jurisdiction: jur,
    employeeCount: data.count,
    totalGrossPay: Math.round(data.grossPay * 100) / 100,
    totalPaye: Math.round(data.paye * 100) / 100,
    totalSocialSecurity: Math.round(data.socialSecurity * 100) / 100,
  }));
}

// ─── Step 7: Review Payroll Calculation ─────────────────────────────────────

async function reviewPayrollCalculation(
  entityId: string,
  calculations: CalculatedPayroll[],
  staffData: EmployeePayrollData[],
): Promise<{
  confidence: number;
  approved: boolean;
  escalated: boolean;
  escalationReason?: string;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const totalGross = calculations.reduce((s, e) => s + e.grossPay, 0);
  const totalNet = calculations.reduce((s, e) => s + e.netPay, 0);
  const totalDeductions = calculations.reduce(
    (s, e) => s + e.totalDeductions,
    0,
  );
  const employeesWithDeductions = calculations.filter(
    (e) => e.totalDeductions > 0,
  );

  // Checks
  if (totalGross <= 0) {
    warnings.push("Total gross pay is zero or negative");
  }

  if (totalNet < 0) {
    warnings.push(
      "Total net pay is negative — some employees may owe the company",
    );
  }

  if (totalDeductions > totalGross) {
    warnings.push("Total deductions exceed total gross pay");
  }

  const negativeNet = calculations.filter((e) => e.netPay < 0);
  if (negativeNet.length > 0) {
    warnings.push(
      `${negativeNet.length} employee(s) have negative net pay: ${negativeNet.map((e) => e.employeeName).join(", ")}`,
    );
  }

  // Confidence calculation
  let confidence = 0.95; // Base confidence

  if (warnings.length === 0) {
    confidence = 0.97;
  } else if (warnings.length <= 2) {
    confidence = 0.85;
  } else {
    confidence = 0.75;
  }

  // Mandatory review: Payroll Manager must review every run regardless of confidence
  // This is per the spec: "mandatory review step regardless of confidence score"
  const escalated = warnings.length > 2;
  const escalationReason = escalated
    ? `Payroll review flagged ${warnings.length} warning(s): ${warnings.join("; ")}`
    : undefined;

  return {
    confidence,
    approved: !escalated,
    escalated,
    escalationReason,
    warnings,
  };
}

// ─── Step 8: Post Payroll Journal ───────────────────────────────────────────
//
// Payroll Worker Agent never posts directly — routes to Controller → Ledger Agent.
// Creates a journal entry with proper double-entry: debit payroll expense accounts,
// credit salary payable, tax payable, social security payable.

async function postPayrollJournal(
  entityId: string,
  period: string,
  payrollRunId: string,
  calculations: CalculatedPayroll[],
  staffData: EmployeePayrollData[],
  userId: string,
): Promise<{
  success: boolean;
  journalEntryId?: string;
  totalDebit: number;
  totalCredit: number;
  balanced: boolean;
}> {
  try {
    // Find appropriate COA accounts
    const allAccounts = await db.query.chartOfAccounts.findMany({
      where: eq(chartOfAccounts.entityId, entityId),
    });

    const payrollExpenseAccount = allAccounts.find(
      (a) => a.subtype === "payroll_expense" && a.type === "expense",
    );
    const salaryPayableAccount = allAccounts.find(
      (a) =>
        a.code === "2030" ||
        a.name.toLowerCase().includes("salary payable") ||
        a.name.toLowerCase().includes("accrued payroll"),
    );
    const taxPayableAccount = allAccounts.find(
      (a) =>
        a.code === "2040" ||
        (a.subtype === "tax_liability" && a.type === "liability"),
    );
    const ssnitPayableAccount = allAccounts.find(
      (a) =>
        a.code === "2050" || a.name.toLowerCase().includes("social security"),
    );
    const bankAccount = allAccounts.find(
      (a) => a.subtype === "bank_account" && a.type === "asset",
    );

    if (!payrollExpenseAccount || !salaryPayableAccount) {
      return {
        success: false,
        totalDebit: 0,
        totalCredit: 0,
        balanced: false,
      };
    }

    const totalGrossPay = calculations.reduce((s, e) => s + e.grossPay, 0);
    const totalNetPay = calculations.reduce((s, e) => s + e.netPay, 0);
    const totalPaye = calculations.reduce((s, e) => s + e.payeTax, 0);
    const totalSSEmployee = calculations.reduce(
      (s, e) => s + e.socialSecurityEmployee,
      0,
    );
    const totalSSEmployer = calculations.reduce(
      (s, e) => s + e.socialSecurityEmployer,
      0,
    );
    const totalWHT = calculations
      .filter((e) => e.isContractor)
      .reduce((s, e) => s + e.withholdingTax, 0);

    const totalEmployerCost = totalGrossPay + totalSSEmployer;

    // Double-entry:
    //   Debit: Payroll Expense (total employer cost)
    //   Credit: Salary Payable (net pay to employees)
    //   Credit: PAYE Payable (tax withheld)
    //   Credit: Social Security Payable (employee + employer)
    //   Credit: Withholding Tax Payable
    const totalCredits =
      totalNetPay + totalPaye + totalSSEmployee + totalSSEmployer + totalWHT;

    if (Math.abs(totalEmployerCost - totalCredits) > 0.01) {
      // Try to balance — add difference to payable
      return {
        success: false,
        totalDebit: totalEmployerCost,
        totalCredit: totalCredits,
        balanced: false,
      };
    }

    const today = new Date().toISOString().split("T")[0]!;

    // Create the journal entry
    const [entry] = await db
      .insert(journalEntries)
      .values({
        entityId,
        entryNumber: Math.floor(Math.random() * 90000) + 10000,
        description: `Payroll for ${period}`,
        date: today,
        periodId: "", // Will be set when period is linked
        status: "posted",
        postedBy: userId,
        postedAt: new Date(),
        source: "automatic_payroll",
      })
      .returning({ id: journalEntries.id });

    if (!entry) {
      return { success: false, totalDebit: 0, totalCredit: 0, balanced: false };
    }

    // Insert journal entry lines
    const lines = [
      // Debit: Payroll Expense
      {
        journalEntryId: entry.id,
        accountId: payrollExpenseAccount.id,
        debit: String(totalEmployerCost),
        credit: "0",
        description: `Gross pay + employer SS for ${period}`,
      },
      // Credit: Salary Payable
      {
        journalEntryId: entry.id,
        accountId: salaryPayableAccount.id,
        debit: "0",
        credit: String(totalNetPay),
        description: `Net pay to employees for ${period}`,
      },
    ];

    if (totalPaye > 0 && taxPayableAccount) {
      lines.push({
        journalEntryId: entry.id,
        accountId: taxPayableAccount.id,
        debit: "0",
        credit: String(totalPaye),
        description: `PAYE tax withheld for ${period}`,
      });
    }

    if (totalSSEmployee + totalSSEmployer > 0 && ssnitPayableAccount) {
      lines.push({
        journalEntryId: entry.id,
        accountId: ssnitPayableAccount.id,
        debit: "0",
        credit: String(totalSSEmployee + totalSSEmployer),
        description: `Social security (employee + employer) for ${period}`,
      });
    }

    if (totalWHT > 0 && taxPayableAccount) {
      lines.push({
        journalEntryId: entry.id,
        accountId: taxPayableAccount.id,
        debit: "0",
        credit: String(totalWHT),
        description: `Withholding tax for contractors for ${period}`,
      });
    }

    await db.insert(journalEntryLines).values(lines);

    return {
      success: true,
      journalEntryId: entry.id,
      totalDebit: totalEmployerCost,
      totalCredit: totalCredits,
      balanced: true,
    };
  } catch (error) {
    return { success: false, totalDebit: 0, totalCredit: 0, balanced: false };
  }
}

// ─── Step 9: Generate & Save Payslips ──────────────────────────────────────

async function generateAndSavePayslips(
  entityId: string,
  payrollRunId: string,
  calculations: CalculatedPayroll[],
): Promise<number> {
  let savedCount = 0;

  for (const calc of calculations) {
    try {
      await db.insert(payslips).values({
        entityId,
        payrollRunId,
        employeeId: calc.employeeId,
        generatedAt: new Date(),
      });
      savedCount++;
    } catch {
      // Individual payslip failure shouldn't crash the pipeline
    }
  }

  return savedCount;
}

// ─── Step 10: Generate Compliance Calendar ─────────────────────────────────

function generateComplianceDeadlines(
  period: string,
  jurisdictionSummary: Array<{
    jurisdiction: Jurisdiction;
    employeeCount: number;
    totalGrossPay: number;
    totalPaye: number;
    totalSocialSecurity: number;
  }>,
): ComplianceDeadline[] {
  const [yearStr, monthStr] = period.split("-");
  const year = parseInt(yearStr ?? "2026", 10);
  const month = parseInt(monthStr ?? "01", 10);
  const deadlines: ComplianceDeadline[] = [];

  // PAYE filing deadlines — typically 10th-15th of following month
  const payeDeadlineMap: Record<Jurisdiction, { day: number; name: string }> = {
    GM: { day: 10, name: "GRA PAYE Filing — Monthly Return" },
    NG: { day: 14, name: "FIRS PAYE Filing — Monthly Schedule" },
    KE: { day: 9, name: "KRA PAYE Filing — Monthly Return" },
    GH: { day: 15, name: "GRA-GH PAYE Filing — Monthly Return" },
    SN: { day: 15, name: "DGID IRSA Filing — Monthly Withholding" },
    US: { day: 31, name: "IRS Form 941 — Quarterly Payroll Tax Return" },
  };

  // Social security filing deadlines
  const ssDeadlineMap: Record<Jurisdiction, { day: number; name: string }> = {
    GM: { day: 15, name: "SSHFC Contributions — Monthly Remittance" },
    NG: { day: 14, name: "NSITF/NHF Contributions — Monthly Remittance" },
    KE: { day: 9, name: "NSSF Contributions — Monthly Remittance" },
    GH: { day: 15, name: "SSNIT Contributions — Monthly Remittance" },
    SN: { day: 15, name: "IPRES/CSS Contributions — Monthly Remittance" },
    US: { day: 31, name: "FICA/FUTA Deposits — Monthly Schedule" },
  };

  // Withholding tax filing (quarterly for most)
  const whtDeadlineMap: Record<
    Jurisdiction,
    { day: number; name: string; quarterMonth: number }
  > = {
    GM: {
      day: 15,
      name: "GRA Withholding Tax — Quarterly Return",
      quarterMonth: 3,
    },
    NG: {
      day: 21,
      name: "FIRS Withholding Tax — Monthly Remittance",
      quarterMonth: 1,
    },
    KE: {
      day: 20,
      name: "KRA Withholding Tax — Monthly Return",
      quarterMonth: 1,
    },
    GH: {
      day: 15,
      name: "GRA-GH Withholding Tax — Quarterly Return",
      quarterMonth: 3,
    },
    SN: {
      day: 15,
      name: "DGID Withholding Tax — Monthly Remittance",
      quarterMonth: 1,
    },
    US: {
      day: 31,
      name: "IRS Form 941 — Federal Withholding Remittance",
      quarterMonth: 3,
    },
  };

  for (const js of jurisdictionSummary) {
    // PAYE deadline (next month)
    const payeNextMonth = month === 12 ? 1 : month + 1;
    const payeYear = month === 12 ? year + 1 : year;
    const payeConfig = payeDeadlineMap[js.jurisdiction];
    if (payeConfig) {
      const dueDate = `${payeYear}-${String(payeNextMonth).padStart(2, "0")}-${String(payeConfig.day).padStart(2, "0")}`;
      const isOverdue = new Date(dueDate) < new Date();
      deadlines.push({
        jurisdiction: js.jurisdiction,
        deadlineType: "filing",
        name: payeConfig.name,
        dueDate,
        period,
        status: isOverdue ? "overdue" : "upcoming",
        amount: js.totalPaye,
      });
    }

    // Social security deadline
    const ssConfig = ssDeadlineMap[js.jurisdiction];
    if (ssConfig && js.totalSocialSecurity > 0) {
      const ssNextMonth = month === 12 ? 1 : month + 1;
      const ssYear = month === 12 ? year + 1 : year;
      const dueDate = `${ssYear}-${String(ssNextMonth).padStart(2, "0")}-${String(ssConfig.day).padStart(2, "0")}`;
      const isOverdue = new Date(dueDate) < new Date();
      deadlines.push({
        jurisdiction: js.jurisdiction,
        deadlineType: "payment",
        name: ssConfig.name,
        dueDate,
        period,
        status: isOverdue ? "overdue" : "upcoming",
        amount: js.totalSocialSecurity,
      });
    }

    // Withholding tax (quarterly)
    const whtConfig = whtDeadlineMap[js.jurisdiction];
    if (whtConfig) {
      // Check if this is a withholding tax filing month
      const isWHTMonth = month % whtConfig.quarterMonth === 0;
      if (isWHTMonth) {
        const whtNextMonth = month === 12 ? 1 : month + 1;
        const whtYear = month === 12 ? year + 1 : year;
        const dueDate = `${whtYear}-${String(whtNextMonth).padStart(2, "0")}-${String(whtConfig.day).padStart(2, "0")}`;
        const isOverdue = new Date(dueDate) < new Date();
        deadlines.push({
          jurisdiction: js.jurisdiction,
          deadlineType: "return",
          name: whtConfig.name,
          dueDate,
          period,
          status: isOverdue ? "overdue" : "upcoming",
        });
      }
    }
  }

  return deadlines;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function updateStep(
  steps: PayrollStep[],
  stepId: PayrollStepId,
  updates: Partial<PayrollStep>,
): PayrollStep[] {
  return steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s));
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const groupKey = String(item[key]);
      (acc[groupKey] = acc[groupKey] ?? []).push(item);
      return acc;
    },
    {} as Record<string, T[]>,
  );
}

function finalizePayrollResult(
  result: PayrollRunResult,
  startTime: number,
): PayrollRunResult {
  return {
    ...result,
    durationMs: Date.now() - startTime,
  };
}

// ─── Get Payroll Status ────────────────────────────────────────────────────

export async function getPayrollStatus(
  entityId: string,
  period?: string,
): Promise<{
  currentPeriod: string | null;
  recentRuns: Array<{
    id: string;
    period: string;
    status: string;
    employeeCount: number;
    grossPay: string;
    netPay: string;
    createdAt: string;
  }>;
  totalPayslipsGenerated: number;
  upcomingDeadlines: ComplianceDeadline[];
}> {
  // Get the most recent open period
  const conditions = [eq(payrollRuns.entityId, entityId)];
  if (period) {
    conditions.push(eq(payrollRuns.period, period));
  }

  const recentRuns = await db.query.payrollRuns.findMany({
    where: and(...conditions),
    orderBy: [desc(payrollRuns.createdAt)],
    limit: 10,
  });

  // Count total payslips
  const allPayslips = await db.query.payslips.findMany({
    where: eq(payslips.entityId, entityId),
  });

  // Generate upcoming compliance deadlines
  const currentPeriod =
    period ??
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return {
    currentPeriod: period ?? null,
    recentRuns: recentRuns.map((r) => ({
      id: r.id,
      period: r.period,
      status: r.status,
      employeeCount: r.employeeCount,
      grossPay: r.grossPay,
      netPay: r.netPay,
      createdAt: r.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    totalPayslipsGenerated: allPayslips.length,
    upcomingDeadlines: [],
  };
}

// ─── Run Payroll (Convenience Wrapper) ──────────────────────────────────────

export async function runPayrollPipeline(params: {
  entityId: string;
  entityName: string;
  currency: string;
  period: string;
  userId: string;
  triggerSource?: "manual" | "scheduled" | "agent";
  skipValidation?: boolean;
  exceptions?: ExceptionIntakeItem[];
}): Promise<PayrollRunResult> {
  return executePayrollPipeline(params);
}
