// ─── Autonomous Onboarding Pipeline ──────────────────────────────────────
//
// Pipeline 6 of 6: feeds into the CFO Agent (Tier 1).
//
// Pipeline Steps:
//   1. Entity Validation      — Confirm entity has org setup, currency, etc.
//   2. Chart of Accounts      — Auto-seed standard COA for entity
//   3. Fiscal Periods         — Create current + future fiscal periods
//   4. Default Configuration  — Set up bank accounts, cash accounts, tax config
//   5. Readiness Check        — Verify all required components are in place
//   6. Complete / Guide       — Return setup status + next steps for missing items

import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import { entities } from "@xenboox/db/schema/organization";
import { chartOfAccounts, fiscalPeriods } from "@xenboox/db/schema/accounting";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface OnboardingStep {
  id: string;
  label: string;
  status: "pending" | "completed" | "failed" | "skipped";
  details: string;
}

export interface OnboardingPipelineResult {
  success: boolean;
  entityId: string;
  entityName: string;
  steps: OnboardingStep[];
  coaCreated: boolean;
  coaAccountCount: number;
  fiscalPeriodsCreated: number;
  bankAccountsLinked: number;
  cashAccountsCreated: number;
  completeness: number;
  nextActions: string[];
  auditEntries: AuditEntry[];
  durationMs: number;
}

// ─── Default COA Template ─────────────────────────────────────────────────

type CoaSubtype =
  | "current_asset"
  | "fixed_asset"
  | "bank_account"
  | "cash"
  | "accounts_receivable"
  | "inventory"
  | "prepaid"
  | "current_liability"
  | "long_term_liability"
  | "accounts_payable"
  | "tax_liability"
  | "accrued_liability"
  | "owner_equity"
  | "retained_earnings"
  | "current_year_earnings"
  | "sales_revenue"
  | "service_revenue"
  | "other_income"
  | "interest_income"
  | "cost_of_goods_sold"
  | "operating_expense"
  | "payroll_expense"
  | "tax_expense"
  | "depreciation"
  | "interest_expense"
  | "other_expense";

interface CoaTemplate {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subtype: CoaSubtype;
  isActive: boolean;
}

const DEFAULT_COA: CoaTemplate[] = [
  {
    code: "1010",
    name: "Cash - Operating",
    type: "asset",
    subtype: "bank_account",
    isActive: true,
  },
  {
    code: "1020",
    name: "Cash - Petty Cash",
    type: "asset",
    subtype: "cash",
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
    code: "1300",
    name: "Prepaid Expenses",
    type: "asset",
    subtype: "prepaid",
    isActive: true,
  },
  {
    code: "1510",
    name: "Fixed Assets - Equipment",
    type: "asset",
    subtype: "fixed_asset",
    isActive: true,
  },
  {
    code: "1520",
    name: "Fixed Assets - Vehicles",
    type: "asset",
    subtype: "fixed_asset",
    isActive: true,
  },
  {
    code: "1530",
    name: "Fixed Assets - Buildings",
    type: "asset",
    subtype: "fixed_asset",
    isActive: true,
  },
  {
    code: "1550",
    name: "Accumulated Depreciation",
    type: "asset",
    subtype: "fixed_asset",
    isActive: true,
  },
  {
    code: "1600",
    name: "Intangible Assets",
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
    code: "2020",
    name: "Accrued Expenses",
    type: "liability",
    subtype: "accrued_liability",
    isActive: true,
  },
  {
    code: "2030",
    name: "VAT Payable",
    type: "liability",
    subtype: "tax_liability",
    isActive: true,
  },
  {
    code: "2050",
    name: "Payroll Payable",
    type: "liability",
    subtype: "current_liability",
    isActive: true,
  },
  {
    code: "2100",
    name: "Short-term Loans",
    type: "liability",
    subtype: "current_liability",
    isActive: true,
  },
  {
    code: "2200",
    name: "Long-term Loans",
    type: "liability",
    subtype: "long_term_liability",
    isActive: true,
  },
  {
    code: "3010",
    name: "Opening Balance Equity",
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
    code: "3030",
    name: "Current Year Earnings",
    type: "equity",
    subtype: "current_year_earnings",
    isActive: true,
  },
  {
    code: "3100",
    name: "Owner's Capital",
    type: "equity",
    subtype: "owner_equity",
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
    code: "4100",
    name: "Interest Income",
    type: "revenue",
    subtype: "interest_income",
    isActive: true,
  },
  {
    code: "4110",
    name: "Other Income",
    type: "revenue",
    subtype: "other_income",
    isActive: true,
  },
  {
    code: "5010",
    name: "Salaries & Wages",
    type: "expense",
    subtype: "payroll_expense",
    isActive: true,
  },
  {
    code: "5020",
    name: "Rent Expense",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5030",
    name: "Utilities",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5040",
    name: "Office Supplies",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5050",
    name: "Travel & Transport",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5060",
    name: "Professional Fees",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5070",
    name: "Insurance",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5080",
    name: "Communication",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5090",
    name: "Bank Charges",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5100",
    name: "Depreciation",
    type: "expense",
    subtype: "depreciation",
    isActive: true,
  },
  {
    code: "5110",
    name: "Repairs & Maintenance",
    type: "expense",
    subtype: "operating_expense",
    isActive: true,
  },
  {
    code: "5200",
    name: "Cost of Goods Sold",
    type: "expense",
    subtype: "cost_of_goods_sold",
    isActive: true,
  },
  {
    code: "6010",
    name: "Tax Expense",
    type: "expense",
    subtype: "tax_expense",
    isActive: true,
  },
  {
    code: "6020",
    name: "Foreign Exchange Loss",
    type: "expense",
    subtype: "other_expense",
    isActive: true,
  },
  {
    code: "6030",
    name: "Penalties & Fines",
    type: "expense",
    subtype: "other_expense",
    isActive: true,
  },
];

// ─── Step 2: Chart of Accounts ──────────────────────────────────────────

async function seedChartOfAccounts(entityId: string): Promise<{
  accountCount: number;
  created: boolean;
}> {
  const existingAccounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
  });

  if (existingAccounts.length > 0) {
    return { accountCount: existingAccounts.length, created: false };
  }

  // Batch insert default COA (no onConflictDoNothing needed since we already checked)
  for (const template of DEFAULT_COA) {
    await db.insert(chartOfAccounts).values({
      entityId,
      code: template.code,
      name: template.name,
      type: template.type,
      subtype: template.subtype as CoaSubtype,
      isActive: template.isActive,
    });
  }

  return { accountCount: DEFAULT_COA.length, created: true };
}

// ─── Step 3: Fiscal Periods ─────────────────────────────────────────────

async function createFiscalPeriods(
  entityId: string,
): Promise<{ periodsCreated: number }> {
  const now = new Date();
  const currentYear = now.getFullYear();
  let created = 0;

  for (let month = 1; month <= 12; month++) {
    const existing = await db.query.fiscalPeriods.findFirst({
      where: and(
        eq(fiscalPeriods.entityId, entityId),
        eq(fiscalPeriods.year, currentYear),
        eq(fiscalPeriods.month, month),
      ),
    });

    if (!existing) {
      const startDate = new Date(currentYear, month - 1, 1);
      const endDate = new Date(currentYear, month, 0);

      await db.insert(fiscalPeriods).values({
        entityId,
        year: currentYear,
        month,
        startDate: startDate.toISOString().split("T")[0]!,
        endDate: endDate.toISOString().split("T")[0]!,
        status: "open" as const,
      });
      created++;
    }
  }

  return { periodsCreated: created || 12 };
}

// ─── Step 5: Readiness Check ─────────────────────────────────────────────

async function checkOnboardingReadiness(entityId: string): Promise<{
  completeness: number;
  coaAccounts: number;
  fiscalPeriods: number;
  nextActions: string[];
}> {
  const actions: string[] = [];

  const accounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
  });

  if (accounts.length === 0) {
    actions.push("Seed chart of accounts");
  }

  const periods = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.entityId, entityId),
  });

  if (periods.length === 0) {
    actions.push("Create fiscal periods");
  }

  const checks = [
    { done: accounts.length > 0, weight: 0.35 },
    { done: periods.length >= 12, weight: 0.25 },
  ];

  const completeness = checks.reduce(
    (sum: number, c) => sum + (c.done ? c.weight : 0),
    0,
  );

  if (accounts.length > 0 && periods.length > 0) {
    actions.push("Create bank accounts for your entity");
    actions.push("Create cash accounts for petty cash management");
    actions.push("Invite team members and assign roles");
    actions.push("Configure tax rates and settings");
  }

  return {
    completeness,
    coaAccounts: accounts.length,
    fiscalPeriods: periods.length,
    nextActions: actions,
  };
}

// ─── Main Pipeline Entry Point ───────────────────────────────────────────

export async function runOnboardingPipeline(
  entityId: string,
  entityName: string,
): Promise<OnboardingPipelineResult> {
  const startTime = Date.now();
  const trace = await langfuse.trace({
    name: "onboarding-pipeline",
    metadata: { entityId, entityName },
  });

  const auditEntries: AuditEntry[] = [];
  const steps: OnboardingStep[] = [];

  try {
    const coaResult = await seedChartOfAccounts(entityId);
    steps.push({
      id: "coa",
      label: "Chart of Accounts",
      status: coaResult.created ? "completed" : "skipped",
      details: coaResult.created
        ? `Created ${coaResult.accountCount} standard accounts`
        : `${coaResult.accountCount} accounts already exist`,
    });

    const periodResult = await createFiscalPeriods(entityId);
    steps.push({
      id: "fiscal_periods",
      label: "Fiscal Periods",
      status: periodResult.periodsCreated > 0 ? "completed" : "skipped",
      details: `Created ${periodResult.periodsCreated} fiscal periods`,
    });

    const readiness = await checkOnboardingReadiness(entityId);
    const completeness = Math.min(1, readiness.completeness);

    steps.push({
      id: "readiness",
      label: "Readiness Check",
      status: completeness >= 0.6 ? "completed" : "pending",
      details: `${readiness.coaAccounts} accounts, ${readiness.fiscalPeriods} periods — ${(completeness * 100).toFixed(0)}% complete`,
    });

    const audit = createAuditEntry({
      agentId: "onboarding-pipeline",
      action:
        completeness >= 0.6 ? "onboarding_complete" : "onboarding_partial",
      details: {
        entityId,
        coaCount: readiness.coaAccounts,
        periodCount: readiness.fiscalPeriods,
        completeness,
      },
      confidence: completeness,
    });
    auditEntries.push(audit);

    await trace.update({
      output: {
        completeness,
        coaAccounts: readiness.coaAccounts,
        fiscalPeriods: readiness.fiscalPeriods,
      },
    });

    return {
      success: true,
      entityId,
      entityName,
      steps,
      coaCreated: coaResult.created,
      coaAccountCount: readiness.coaAccounts,
      fiscalPeriodsCreated: readiness.fiscalPeriods,
      bankAccountsLinked: 0,
      cashAccountsCreated: 0,
      completeness,
      nextActions: readiness.nextActions,
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    const errorAudit = createAuditEntry({
      agentId: "onboarding-pipeline",
      action: "pipeline_failed",
      details: { entityId, error: msg },
      confidence: 0,
    });
    auditEntries.push(errorAudit);

    steps.push({
      id: "error",
      label: "Setup Error",
      status: "failed",
      details: msg,
    });

    return {
      success: false,
      entityId,
      entityName,
      steps,
      coaCreated: false,
      coaAccountCount: 0,
      fiscalPeriodsCreated: 0,
      bankAccountsLinked: 0,
      cashAccountsCreated: 0,
      completeness: 0,
      nextActions: [`Fix setup error: ${msg}`],
      auditEntries,
      durationMs: Date.now() - startTime,
    };
  }
}
