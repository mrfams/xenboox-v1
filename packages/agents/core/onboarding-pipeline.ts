// ─── Autonomous Onboarding Pipeline ──────────────────────────────────────
//
// Pipeline 6 of 6: feeds into the CFO Agent (Tier 1).
//
// Full 6-step flow matching the Onboarding Pipeline spec:
//   1. Signup              — Org + user created, routing question answered
//   2. Entity Setup        — Business info, industry, fiscal year, currency
//   3. Data Connection Hub — Bank, mobile money, QB/Xero, or file upload
//   4. Historical Pull     — Background data import with permission gate
//   5. Chart of Accounts   — Propose + confirm CoA based on business type
//   6. First Look          — Dashboard loads, CFO Agent sends message
//
// Failure State Handling (cross-cutting — applies at every step):
//   Every step MUST have a defined, tested alternative path before shipping.
//   Never leave the user on a broken screen.

import { db } from "@xenboox/db";
import {
  entities,
  chartOfAccounts,
  fiscalPeriods,
  onboardingSessions,
  dataConnections,
  historicalPullJobs,
  openingBalances,
  coaTemplates,
} from "@xenboox/db";
import { eq, and, or, inArray } from "drizzle-orm";
import { langfuse } from "./langfuse";
import { createAuditEntry } from "./state";
import type { AuditEntry } from "./state";
import {
  withRetry,
  withTimeout,
  redactPIIFromObject,
  checkIdempotency,
  setIdempotencyResult,
  generateIdempotencyKey,
  startCacheCleanup,
  TimeoutError,
  DEFAULT_PIPELINE_TIMEOUT,
} from "./retry";
import type { PipelineTimeoutConfig } from "./retry";

// ─── Types ──────────────────────────────────────────────────────────────────

export type OnboardingStepId =
  | "signup"
  | "routing"
  | "entity_setup"
  | "data_connections"
  | "historical_pull"
  | "coa_review"
  | "first_look"
  | "complete";

export type RoutingAnswer =
  | "excel"
  | "quickbooks"
  | "xero"
  | "nothing"
  | "other";

// Five-category record-keeping answer (Historical Data Migration spec §2/§3).
// Replaces the legacy routing answer for new flows. `routing_answer` is
// retained read-only for legacy sessions; new flows write `source_type`.
export type OnboardingSourceType =
  | "brand_new"
  | "professional_software"
  | "manual_records"
  | "statements_only"
  | "no_records";

export type ReconstructionDetailDepth =
  | "last_12_months"
  | "last_3_years"
  | "full_history";

export interface OpeningBalanceInput {
  /** Chart-of-accounts code, e.g. "1010" — resolved to an accountId server-side. */
  code: string;
  amount: number;
}

/**
 * Best-effort mapping of a legacy routing answer to a five-category source.
 * `nothing` is genuinely ambiguous (brand-new vs informal-with-no-records) and
 * returns null so the user is re-asked rather than silently categorized.
 */
export function legacyRoutingToSourceType(
  legacy: string | null,
): OnboardingSourceType | null {
  switch (legacy) {
    case "quickbooks":
    case "xero":
      return "professional_software";
    case "excel":
    case "other":
      return "manual_records";
    case "nothing":
      return null; // ambiguous — must re-ask
    default:
      return null;
  }
}

export type DataConnectionType =
  | "bank_api"
  | "bank_pdf"
  | "mobile_money"
  | "quickbooks"
  | "xero"
  | "excel"
  | "csv"
  | "manual_entry";

export type DataConnectionStatus =
  | "pending"
  | "processing"
  | "connected"
  | "failed"
  | "fallback_offered";

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  status: "pending" | "completed" | "failed" | "skipped";
  details: string;
  failureRecovery?: string;
}

export interface OnboardingPipelineResult {
  success: boolean;
  sessionId: string | null;
  orgId: string | null;
  entityId: string | null;
  entityName?: string;
  steps: OnboardingStep[];
  currentStep: OnboardingStepId;
  coaCreated?: boolean;
  coaAccountCount?: number;
  fiscalPeriodsCreated?: number;
  bankAccountsLinked?: number;
  cashAccountsCreated?: number;
  completeness: number;
  timeToFirstValueSeconds: number | null;
  nextActions: string[];
  failureRecovery: string[];
  auditEntries: AuditEntry[];
  durationMs: number;
}

export interface DataConnectionResult {
  connectionId: string;
  type: DataConnectionType;
  status: DataConnectionStatus;
  recordsProcessed: number;
  failureReason: string | null;
  fallbackOffered: DataConnectionType | null;
}

// ─── Per-Step Telemetry ──────────────────────────────────────────────────

export interface OnboardingStepTelemetry {
  step: string;
  label: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: "completed" | "skipped" | "failed";
  metadata?: Record<string, unknown>;
}

function recordOnboardingStep(
  telemetry: OnboardingStepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
): OnboardingStepTelemetry {
  const durationMs = Date.now() - startedAt;
  const entry: OnboardingStepTelemetry = {
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs,
    status: "completed",
  };
  telemetry.push(entry);
  return entry;
}

function recordOnboardingFailedStep(
  telemetry: OnboardingStepTelemetry[],
  step: string,
  label: string,
  startedAt: number,
  error?: string,
): void {
  telemetry.push({
    step,
    label,
    startedAt: new Date(startedAt).toISOString(),
    completedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    status: "failed",
    metadata: error ? { error } : undefined,
  });
}

// ─── COA Templates (pre-built by segment/country) ────────────────────────

const DEFAULT_COA_TEMPLATES: Array<{
  segment: string;
  country: string;
  accounts: Array<{
    code: string;
    name: string;
    type: "asset" | "liability" | "equity" | "revenue" | "expense";
    subtype: string;
    isActive: boolean;
  }>;
}> = [
  {
    segment: "trading",
    country: "GM",
    accounts: [
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
        code: "1510",
        name: "Fixed Assets - Equipment",
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
        code: "2030",
        name: "VAT Payable",
        type: "liability",
        subtype: "tax_liability",
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
        code: "5020",
        name: "Operating Expenses",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
    ],
  },
  {
    segment: "services",
    country: "GM",
    accounts: [
      {
        code: "1010",
        name: "Cash - Operating",
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
        code: "1510",
        name: "Fixed Assets - Equipment",
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
        code: "4010",
        name: "Service Revenue",
        type: "revenue",
        subtype: "service_revenue",
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
        name: "Rent & Utilities",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
    ],
  },
  {
    segment: "manufacturing",
    country: "GM",
    accounts: [
      {
        code: "1010",
        name: "Cash - Operating",
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
        name: "Raw Materials Inventory",
        type: "asset",
        subtype: "inventory",
        isActive: true,
      },
      {
        code: "1210",
        name: "Work in Progress",
        type: "asset",
        subtype: "inventory",
        isActive: true,
      },
      {
        code: "1220",
        name: "Finished Goods Inventory",
        type: "asset",
        subtype: "inventory",
        isActive: true,
      },
      {
        code: "1510",
        name: "Plant & Machinery",
        type: "asset",
        subtype: "fixed_asset",
        isActive: true,
      },
      {
        code: "1520",
        name: "Buildings",
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
        code: "2030",
        name: "Accrued Payroll",
        type: "liability",
        subtype: "payroll_liability",
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
        code: "4010",
        name: "Sales Revenue - Products",
        type: "revenue",
        subtype: "sales_revenue",
        isActive: true,
      },
      {
        code: "5010",
        name: "Raw Materials",
        type: "expense",
        subtype: "cost_of_goods_sold",
        isActive: true,
      },
      {
        code: "5020",
        name: "Direct Labor",
        type: "expense",
        subtype: "payroll_expense",
        isActive: true,
      },
      {
        code: "5030",
        name: "Manufacturing Overhead",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "6010",
        name: "Depreciation - Plant",
        type: "expense",
        subtype: "depreciation",
        isActive: true,
      },
    ],
  },
  {
    segment: "agriculture",
    country: "GM",
    accounts: [
      {
        code: "1010",
        name: "Cash - Operating",
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
        code: "1300",
        name: "Biological Assets - Crops",
        type: "asset",
        subtype: "biological_asset",
        isActive: true,
      },
      {
        code: "1310",
        name: "Biological Assets - Livestock",
        type: "asset",
        subtype: "biological_asset",
        isActive: true,
      },
      {
        code: "1400",
        name: "Farm Supplies Inventory",
        type: "asset",
        subtype: "inventory",
        isActive: true,
      },
      {
        code: "1510",
        name: "Farm Equipment",
        type: "asset",
        subtype: "fixed_asset",
        isActive: true,
      },
      {
        code: "1520",
        name: "Land",
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
        code: "2040",
        name: "Loans Payable - Agricultural",
        type: "liability",
        subtype: "loan_liability",
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
        code: "4010",
        name: "Crop Sales Revenue",
        type: "revenue",
        subtype: "sales_revenue",
        isActive: true,
      },
      {
        code: "4020",
        name: "Livestock Sales Revenue",
        type: "revenue",
        subtype: "sales_revenue",
        isActive: true,
      },
      {
        code: "5010",
        name: "Seeds & Fertilizer",
        type: "expense",
        subtype: "cost_of_goods_sold",
        isActive: true,
      },
      {
        code: "5020",
        name: "Farm Labor",
        type: "expense",
        subtype: "payroll_expense",
        isActive: true,
      },
      {
        code: "5030",
        name: "Irrigation & Utilities",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
    ],
  },
  {
    segment: "nonprofit",
    country: "GM",
    accounts: [
      {
        code: "1010",
        name: "Cash - Operating",
        type: "asset",
        subtype: "bank_account",
        isActive: true,
      },
      {
        code: "1100",
        name: "Pledges Receivable",
        type: "asset",
        subtype: "accounts_receivable",
        isActive: true,
      },
      {
        code: "1510",
        name: "Fixed Assets",
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
        code: "2050",
        name: "Grant Funds Held in Trust",
        type: "liability",
        subtype: "trust_liability",
        isActive: true,
      },
      {
        code: "3010",
        name: "Net Assets - Unrestricted",
        type: "equity",
        subtype: "net_assets",
        isActive: true,
      },
      {
        code: "3020",
        name: "Net Assets - Restricted",
        type: "equity",
        subtype: "net_assets",
        isActive: true,
      },
      {
        code: "4010",
        name: "Grant Revenue",
        type: "revenue",
        subtype: "grant_revenue",
        isActive: true,
      },
      {
        code: "4020",
        name: "Donations Revenue",
        type: "revenue",
        subtype: "donation_revenue",
        isActive: true,
      },
      {
        code: "4030",
        name: "Program Service Revenue",
        type: "revenue",
        subtype: "service_revenue",
        isActive: true,
      },
      {
        code: "5010",
        name: "Program Expenses",
        type: "expense",
        subtype: "program_expense",
        isActive: true,
      },
      {
        code: "5020",
        name: "Administrative Expenses",
        type: "expense",
        subtype: "administrative_expense",
        isActive: true,
      },
      {
        code: "5030",
        name: "Fundraising Expenses",
        type: "expense",
        subtype: "fundraising_expense",
        isActive: true,
      },
    ],
  },
  {
    segment: "retail",
    country: "GM",
    accounts: [
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
        name: "Merchandise Inventory",
        type: "asset",
        subtype: "inventory",
        isActive: true,
      },
      {
        code: "1510",
        name: "Store Fixtures & Equipment",
        type: "asset",
        subtype: "fixed_asset",
        isActive: true,
      },
      {
        code: "1520",
        name: "Leasehold Improvements",
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
        name: "Sales Tax Payable",
        type: "liability",
        subtype: "tax_liability",
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
        code: "4010",
        name: "Sales Revenue - Products",
        type: "revenue",
        subtype: "sales_revenue",
        isActive: true,
      },
      {
        code: "4020",
        name: "Sales Returns & Allowances",
        type: "revenue",
        subtype: "contra_revenue",
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
        code: "5020",
        name: "Store Operating Expenses",
        type: "expense",
        subtype: "operating_expense",
        isActive: true,
      },
      {
        code: "5030",
        name: "Rent Expense",
        type: "expense",
        subtype: "rent_expense",
        isActive: true,
      },
    ],
  },
];

// ─── Step 1: Create Onboarding Session ───────────────────────────────────

export async function createOnboardingSession(
  orgId: string,
): Promise<{ sessionId: string }> {
  // Check if session already exists
  const existing = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.orgId, orgId),
  });

  if (existing) {
    return { sessionId: existing.id };
  }

  const [session] = await db
    .insert(onboardingSessions)
    .values({
      orgId,
      currentStep: "signup",
      status: "in_progress",
      startedAt: new Date(),
    })
    .returning({ id: onboardingSessions.id });

  return { sessionId: session!.id };
}

// ─── Step 1b: Update Routing Answer ──────────────────────────────────────

export async function updateRoutingAnswer(
  sessionId: string,
  answer: OnboardingSourceType,
): Promise<void> {
  const completedSteps: string[] = ["signup", "routing"];

  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
    columns: { id: true, orgId: true },
  });
  if (!session) {
    throw new Error("Onboarding session not found");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(onboardingSessions)
      .set({
        sourceType: answer,
        currentStep: "entity_setup",
        completedSteps,
      })
      .where(eq(onboardingSessions.id, sessionId));

    // Mirror to the entity when one exists (spec §2: the answer sets
    // entities.onboarding_source_type). The entity may not exist yet at the
    // routing step — completeFlow re-mirrors defensively.
    const entity = await tx.query.entities.findFirst({
      where: eq(entities.organizationId, session.orgId),
      columns: { id: true },
    });
    if (entity) {
      await tx
        .update(entities)
        .set({ onboardingSourceType: answer })
        .where(eq(entities.id, entity.id));
    }

    // Seed COA templates if they don't exist yet
    for (const template of DEFAULT_COA_TEMPLATES) {
      const existing = await tx.query.coaTemplates.findFirst({
        where: and(
          eq(coaTemplates.segment, template.segment),
          eq(coaTemplates.country, template.country),
        ),
      });
      if (!existing) {
        await tx.insert(coaTemplates).values({
          name: `${template.segment} (${template.country})`,
          segment: template.segment,
          country: template.country,
          accountList: template.accounts,
          isDefault: true,
        });
      }
    }
  });
}

// ─── Step 1c: Business Start + Detail Depth ──────────────────────────────
//
// Category A follow-up (spec §3.1.1): business start date + whether money
// moved before incorporation (triggers a scoped mini-reconstruction window).
// Category B/C/D follow-up (spec §4.2): user-selected transaction detail depth.

export async function setBusinessStart(
  sessionId: string,
  options: {
    businessStartDate?: string;
    preIncorporationActivity: boolean;
  },
): Promise<void> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
    columns: { id: true, orgId: true },
  });
  if (!session) {
    throw new Error("Onboarding session not found");
  }

  const entity = await db.query.entities.findFirst({
    where: eq(entities.organizationId, session.orgId),
    columns: { id: true },
  });
  if (!entity) return; // entity created later — completeFlow mirrors

  await db
    .update(entities)
    .set({
      ...(options.businessStartDate !== undefined
        ? { businessStartDate: options.businessStartDate }
        : {}),
      preIncorporationActivity: options.preIncorporationActivity,
    })
    .where(eq(entities.id, entity.id));
}

export async function setDetailDepth(
  sessionId: string,
  depth: ReconstructionDetailDepth,
): Promise<void> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
    columns: { id: true, metadata: true },
  });
  if (!session) {
    throw new Error("Onboarding session not found");
  }

  const metadata = { ...(session.metadata ?? {}), detailDepth: depth };
  await db
    .update(onboardingSessions)
    .set({ metadata })
    .where(eq(onboardingSessions.id, sessionId));
}

// ─── Step 2: Entity Setup ────────────────────────────────────────────────

export async function setupEntity(
  sessionId: string,
  entityId: string,
): Promise<void> {
  // Read current steps, append, then write back (avoids race condition)
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
    columns: { completedSteps: true },
  });
  const steps = [...(session?.completedSteps ?? []), "entity_setup"];

  await db
    .update(onboardingSessions)
    .set({
      currentStep: "data_connections",
      completedSteps: steps,
    })
    .where(eq(onboardingSessions.id, sessionId));
}

// ─── Step 3: Data Connection Hub ─────────────────────────────────────────
//
// Every connection type has a defined failure recovery path:
//   Bank upload fails       → Manual transaction entry offered
//   Mobile money fails      → Agent asks for different export format
//   QuickBooks/Xero fails   → CSV export path offered as fallback
//   Any other failure       → Never leave user on broken screen

export async function createDataConnection(
  entityId: string,
  type: DataConnectionType,
): Promise<DataConnectionResult> {
  const [connection] = await db
    .insert(dataConnections)
    .values({
      entityId,
      type,
      status: "pending",
    })
    .returning();

  return {
    connectionId: connection!.id,
    type,
    status: "pending",
    recordsProcessed: 0,
    failureReason: null,
    fallbackOffered: null,
  };
}

export async function updateDataConnectionStatus(
  connectionId: string,
  status: DataConnectionStatus,
  options?: {
    recordsProcessed?: number;
    failureReason?: string;
    fallbackOffered?: DataConnectionType;
  },
): Promise<void> {
  const update: Record<string, unknown> = { status };

  if (options?.recordsProcessed !== undefined) {
    update.recordsProcessed = options.recordsProcessed;
  }
  if (options?.failureReason !== undefined) {
    update.failureReason = options.failureReason;
  }
  if (options?.fallbackOffered !== undefined) {
    update.fallbackOffered = options.fallbackOffered;
  }

  await db
    .update(dataConnections)
    .set(update)
    .where(eq(dataConnections.id, connectionId));
}

/**
 * Determine the appropriate fallback when a connection fails.
 * Spec requirement: every failure state maps to a defined alternative path.
 */
export function getFallbackForFailure(
  type: DataConnectionType,
): { fallbackType: DataConnectionType; message: string } | null {
  switch (type) {
    case "bank_api":
    case "bank_pdf":
      return {
        fallbackType: "manual_entry",
        message:
          "Bank upload failed. You can enter transactions manually instead.",
      };
    case "mobile_money":
      return {
        fallbackType: "csv",
        message:
          "Mobile money format not recognized. Please export as CSV and try again.",
      };
    case "quickbooks":
    case "xero":
      return {
        fallbackType: "csv",
        message:
          "Connection failed. You can export your data as CSV and upload it.",
      };
    case "excel":
    case "csv":
      return {
        fallbackType: "manual_entry",
        message:
          "File upload failed. You can enter your data manually instead.",
      };
    default:
      return null;
  }
}

export async function markDataConnectionsStepComplete(
  sessionId: string,
): Promise<void> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
  });
  if (!session) return;

  const steps = [...(session.completedSteps ?? []), "data_connections"];

  await db
    .update(onboardingSessions)
    .set({
      currentStep: "historical_pull",
      completedSteps: steps,
    })
    .where(eq(onboardingSessions.id, sessionId));
}

// ─── Step 4: Historical Data Pull (background) ───────────────────────────
//
// The ONE explicit human-permission gate in the whole flow.
// If detected history exceeds 12 months, CFO Agent stops and asks permission.
// No paywall, no limits — prerequisites for accurate work.

export async function startHistoricalPull(
  entityId: string,
  dateRangeStart: string,
  dateRangeEnd: string,
  detailDepth: ReconstructionDetailDepth = "last_12_months",
): Promise<{ jobId: string; needsPermission: boolean }> {
  // Estimate if data exceeds 12 months
  const startDate = new Date(dateRangeStart);
  const endDate = new Date(dateRangeEnd);
  const monthDiff =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());
  const exceeds12Months = monthDiff > 12;

  const [job] = await db
    .insert(historicalPullJobs)
    .values({
      entityId,
      dateRangeStart,
      dateRangeEnd,
      status: exceeds12Months ? "permission_required" : "pulling",
      exceeds12Months,
      detailDepth,
    })
    .returning();

  return { jobId: job!.id, needsPermission: exceeds12Months };
}

export async function requestHistoricalPullPermission(
  jobId: string,
): Promise<void> {
  await db
    .update(historicalPullJobs)
    .set({ permissionRequestedAt: new Date() })
    .where(eq(historicalPullJobs.id, jobId));
}

export async function approveHistoricalPull(
  jobId: string,
  approved: boolean,
): Promise<void> {
  if (approved) {
    await db
      .update(historicalPullJobs)
      .set({
        status: "pulling",
        permissionGrantedAt: new Date(),
      })
      .where(eq(historicalPullJobs.id, jobId));
  } else {
    await db
      .update(historicalPullJobs)
      .set({ status: "permission_denied" })
      .where(eq(historicalPullJobs.id, jobId));
  }
}

export async function markHistoricalPullComplete(
  sessionId: string,
): Promise<void> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
  });
  if (!session) return;

  const steps = [...(session.completedSteps ?? []), "historical_pull"];

  await db
    .update(onboardingSessions)
    .set({
      currentStep: "coa_review",
      completedSteps: steps,
    })
    .where(eq(onboardingSessions.id, sessionId));
}

// ─── Opening Balances (spec §4.1 / §6) ───────────────────────────────────
//
// Account balances as of the earliest point reconstructed to. Category E
// (no records) is owner-confirmed; B/C/D pipeline-created balances are
// written with source=reconstructed/migrated. The (entity, account) unique
// index makes this an idempotent upsert — retries never duplicate rows.

export async function confirmOpeningBalance(
  entityId: string,
  rows: OpeningBalanceInput[],
  confirmedByUserId: string,
): Promise<{ saved: number }> {
  if (rows.length === 0) return { saved: 0 };

  const codes = [...new Set(rows.map((r) => r.code))];
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      inArray(chartOfAccounts.code, codes),
    ),
  });
  const accountByCode = new Map(accounts.map((a) => [a.code, a.id]));
  const missing = codes.filter((c) => !accountByCode.has(c));
  if (missing.length > 0) {
    throw new Error(`Account not found for this entity: ${missing.join(", ")}`);
  }

  await db.transaction(async (tx) => {
    for (const row of rows) {
      await tx
        .insert(openingBalances)
        .values({
          entityId,
          accountId: accountByCode.get(row.code)!,
          amount: row.amount.toString(),
          currency: "GMD",
          source: "owner_confirmed",
          confirmedByUserId,
          confirmedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [openingBalances.entityId, openingBalances.accountId],
          set: {
            amount: row.amount.toString(),
            confirmedByUserId,
            confirmedAt: new Date(),
          },
        });
    }
  });

  return { saved: rows.length };
}

/**
 * Category E escape hatch (spec §3.5): the owner doesn't know their balances,
 * so tracking starts from today and the balances are flagged for a later
 * reconciliation pass instead of blocking onboarding.
 */
export async function confirmOpeningBalanceEscape(
  entityId: string,
): Promise<void> {
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    columns: { id: true, settings: true },
  });
  if (!entity) {
    throw new Error("Entity not found");
  }

  const settings = {
    ...(entity.settings ?? {}),
    openingBalanceNeedsReconciliation: true,
  };
  await db.update(entities).set({ settings }).where(eq(entities.id, entityId));
}

export async function getOpeningBalanceSummary(entityId: string): Promise<{
  sourceType: OnboardingSourceType | null;
  businessStartDate: string | null;
  balances: Array<{
    accountId: string;
    accountCode: string | null;
    amount: string;
    currency: string;
    source: string;
    confirmedAt: Date | null;
  }>;
  total: number;
  escaped: boolean;
}> {
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    columns: {
      id: true,
      onboardingSourceType: true,
      businessStartDate: true,
      settings: true,
    },
  });

  const balances = await db.query.openingBalances.findMany({
    where: eq(openingBalances.entityId, entityId),
  });
  const accounts = balances.length
    ? await db.query.chartOfAccounts.findMany({
        where: inArray(
          chartOfAccounts.id,
          balances.map((b) => b.accountId),
        ),
      })
    : [];
  const codeByAccount = new Map(accounts.map((a) => [a.id, a.code]));
  const settings = (entity?.settings ?? {}) as Record<string, unknown>;

  return {
    sourceType: entity?.onboardingSourceType ?? null,
    businessStartDate: entity?.businessStartDate ?? null,
    balances: balances.map((b) => ({
      accountId: b.accountId,
      accountCode: codeByAccount.get(b.accountId) ?? null,
      amount: b.amount,
      currency: b.currency,
      source: b.source,
      confirmedAt: b.confirmedAt,
    })),
    total: balances.reduce((s, b) => s + Number(b.amount), 0),
    escaped: settings.openingBalanceNeedsReconciliation === true,
  };
}

/**
 * CFO Agent's first message, per record-keeping category (spec §3.1/§3.5).
 * The honesty rule: A/E must never imply records were "found" or processed.
 */
export function getFirstMessage(
  sourceType: OnboardingSourceType | null | undefined,
  summary?: { transactions?: number; flagged?: number; months?: number },
): string {
  switch (sourceType) {
    case "brand_new":
      return "You're starting with a clean slate — no history to sort through. I'll track everything from here. Let's set up your chart of accounts.";
    case "no_records":
      return "I don't have any records or statements to reconstruct your history from. I can start tracking from today with an opening balance you confirm — cash on hand, any money owed to you, and anything you owe — and we'll build accurate books from this point forward.";
    case "professional_software":
    case "statements_only":
    case "manual_records":
    default:
      return `I've reviewed your records. Here's what I found: ${summary?.transactions ?? 0} transactions categorized across ${summary?.months ?? 12} months, ${summary?.flagged ?? 0} flagged for your review.`;
  }
}

// ─── Step 5: Chart of Accounts Setup ─────────────────────────────────────
//
// Proposes a standard CoA based on business type + country.
// User reviews and confirms with zero accounting knowledge required.
// Fully customizable later via chat.

export async function getSuggestedCoA(
  segment: string,
  country: string,
): Promise<{
  templateId: string | null;
  accounts: Array<{
    code: string;
    name: string;
    type: string;
    subtype: string;
    isActive: boolean;
  }>;
}> {
  // Try to find a matching template
  const template = await db.query.coaTemplates.findFirst({
    where: and(
      eq(coaTemplates.segment, segment),
      eq(coaTemplates.country, country),
    ),
  });

  if (template) {
    return {
      templateId: template.id,
      accounts: template.accountList as any[],
    };
  }

  // Fall back to default template matching by segment only
  const defaultTemplate = await db.query.coaTemplates.findFirst({
    where: and(
      eq(coaTemplates.segment, segment),
      eq(coaTemplates.isDefault, true),
    ),
  });

  if (defaultTemplate) {
    return {
      templateId: defaultTemplate.id,
      accounts: defaultTemplate.accountList as any[],
    };
  }

  return { templateId: null, accounts: [] };
}

export async function confirmCoA(
  entityId: string,
  templateId: string,
): Promise<{ accountCount: number }> {
  const template = await db.query.coaTemplates.findFirst({
    where: eq(coaTemplates.id, templateId),
  });
  if (!template) {
    throw new Error("COA template not found");
  }

  const accounts = template.accountList as Array<{
    code: string;
    name: string;
    type: string;
    subtype: string;
    isActive: boolean;
  }>;

  // Check if accounts already exist
  const existingAccounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
  });

  if (existingAccounts.length > 0) {
    return { accountCount: existingAccounts.length };
  }

  // Insert accounts in a transaction
  await db.transaction(async (tx) => {
    for (const account of accounts) {
      await tx.insert(chartOfAccounts).values({
        entityId,
        code: account.code,
        name: account.name,
        type: account.type as any,
        subtype: account.subtype as any,
        isActive: account.isActive,
      });
    }
  });

  return { accountCount: accounts.length };
}

export async function markCoAComplete(sessionId: string): Promise<void> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
  });
  if (!session) return;

  const steps = [...(session.completedSteps ?? []), "coa_review"];

  await db
    .update(onboardingSessions)
    .set({
      currentStep: "first_look",
      completedSteps: steps,
    })
    .where(eq(onboardingSessions.id, sessionId));
}

// ─── Step 6: First Look — Activation Moment ──────────────────────────────
//
// Dashboard loads with transactions already categorized.
// CFO Agent sends first message.
// This IS the product's first-value moment.
// Time-to-first-value is logged.

export async function completeOnboarding(
  sessionId: string,
): Promise<{ timeToFirstValueSeconds: number }> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.id, sessionId),
  });
  if (!session) {
    throw new Error("Onboarding session not found");
  }

  const now = new Date();
  const startedAt = session.startedAt;
  const ttFirstValue = Math.round((now.getTime() - startedAt.getTime()) / 1000);

  const steps = [...(session.completedSteps ?? []), "first_look", "complete"];

  await db
    .update(onboardingSessions)
    .set({
      currentStep: "complete",
      status: "completed",
      completedSteps: steps,
      completedAt: now,
      timeToFirstValueSeconds: ttFirstValue,
    })
    .where(eq(onboardingSessions.id, sessionId));

  return { timeToFirstValueSeconds: ttFirstValue };
}

// ─── Status & Readiness ──────────────────────────────────────────────────

export async function getOnboardingStatus(
  orgId: string,
): Promise<OnboardingPipelineResult | null> {
  const session = await db.query.onboardingSessions.findFirst({
    where: eq(onboardingSessions.orgId, orgId),
  });
  if (!session) return null;

  const entity = await db.query.entities.findFirst({
    where: eq(entities.organizationId, orgId),
  });

  const steps = buildSteps(session.currentStep, session.completedSteps ?? []);
  const completeness = computeCompleteness(session.completedSteps ?? []);
  const failureRecovery = await checkFailureRecovery(entity?.id ?? "");

  return {
    success: session.status === "completed",
    sessionId: session.id,
    orgId,
    entityId: entity?.id ?? null,
    steps,
    currentStep: session.currentStep as OnboardingStepId,
    completeness,
    timeToFirstValueSeconds: session.timeToFirstValueSeconds,
    nextActions: getNextActions(session.currentStep as OnboardingStepId),
    failureRecovery,
    auditEntries: [],
    durationMs: 0,
  };
}

function buildSteps(
  currentStep: string,
  completedSteps: string[],
): OnboardingStep[] {
  const allSteps: Array<{
    id: OnboardingStepId;
    label: string;
    recovery?: string;
  }> = [
    { id: "signup", label: "Create account" },
    { id: "routing", label: "Tell us about your books" },
    { id: "entity_setup", label: "Set up your business" },
    {
      id: "data_connections",
      label: "Connect your data",
      recovery: "Manual entry always available",
    },
    { id: "historical_pull", label: "Import historical data" },
    { id: "coa_review", label: "Review chart of accounts" },
    { id: "first_look", label: "Your first look" },
  ];

  return allSteps.map((s) => {
    const isComplete = completedSteps.includes(s.id);
    const isCurrent = s.id === currentStep;
    return {
      id: s.id,
      label: s.label,
      status: isComplete ? "completed" : isCurrent ? "pending" : "pending",
      details: isComplete ? "Done" : isCurrent ? "In progress" : "Waiting",
      failureRecovery: s.recovery,
    };
  });
}

function computeCompleteness(completedSteps: string[]): number {
  // Fiscal periods + CoA are the heavy items (35% + 25% = 60%)
  // Data connections (20%), Historical pull (15%), First look (5%)
  const weights: Record<string, number> = {
    signup: 0.05,
    routing: 0.05,
    entity_setup: 0.1,
    data_connections: 0.2,
    historical_pull: 0.15,
    coa_review: 0.35,
    first_look: 0.05,
    complete: 0.05,
  };

  const base = completedSteps.reduce(
    (sum, step) => sum + (weights[step] ?? 0),
    0,
  );
  return Math.min(1, base);
}

function getNextActions(currentStep: string): string[] {
  switch (currentStep) {
    case "signup":
      return ["Tell us how you currently manage your books"];
    case "entity_setup":
      return ["Fill in your business details"];
    case "data_connections":
      return [
        "Connect your bank account",
        "Upload bank statements (PDF)",
        "Import from QuickBooks/Xero",
        "Enter transactions manually",
      ];
    case "historical_pull":
      return ["Wait for historical data import to complete"];
    case "coa_review":
      return ["Review and confirm suggested chart of accounts"];
    case "first_look":
      return ["Explore your dashboard", "Ask your CFO Agent a question"];
    default:
      return [];
  }
}

async function checkFailureRecovery(entityId: string): Promise<string[]> {
  if (!entityId) return [];

  const failedConnections = await db.query.dataConnections.findMany({
    where: and(
      eq(dataConnections.entityId, entityId),
      or(
        eq(dataConnections.status, "failed"),
        eq(dataConnections.status, "fallback_offered"),
      ),
    ),
  });

  return failedConnections.map(
    (c) =>
      `Connection ${c.type} failed: ${c.failureReason ?? "Unknown error"}. ${c.fallbackOffered ? `Fallback: ${c.fallbackOffered}` : "Try a different connection method."}`,
  );
}

// ─── Main Pipeline Entry Point ───────────────────────────────────────────

export async function runOnboardingPipeline(
  entityId: string,
  entityName: string,
  timeoutConfig?: Partial<PipelineTimeoutConfig>,
): Promise<OnboardingPipelineResult> {
  const startTime = Date.now();
  const pipelineTimeout: PipelineTimeoutConfig = {
    ...DEFAULT_PIPELINE_TIMEOUT,
    ...timeoutConfig,
  };
  const stepTelemetry: OnboardingStepTelemetry[] = [];
  const telemetryStart = Date.now();

  // ── Enterprise: Idempotency Check ─────────────────────────────────────
  const idempotencyKey = generateIdempotencyKey({
    channel: "onboarding-pipeline",
    userId: "system",
    entityId,
    rawContent: `onboarding:${entityId}:${entityName}`,
    sessionId: `onboard-${entityId}`,
  });
  const cachedResult = checkIdempotency(idempotencyKey);
  if (cachedResult) {
    const cached = cachedResult as OnboardingPipelineResult;
    return { ...cached, durationMs: Date.now() - startTime };
  }

  startCacheCleanup();

  // ── Enterprise: Pipeline-Level Timeout ───────────────────────────────
  const pipelinePromise = (async () => {
    const trace = await langfuse.trace({
      name: "onboarding-pipeline",
      metadata: {
        entityId,
        entityName,
        timeoutMs: pipelineTimeout.maxExecutionMs,
        idempotencyKey: idempotencyKey.slice(0, 16),
      },
    });

    const auditEntries: AuditEntry[] = [];
    const steps: OnboardingStep[] = [];

    try {
      // ── Step: Entity Setup ───────────────────────────────────────────
      let stepStart = Date.now();
      steps.push({
        id: "entity_setup",
        label: "Entity Setup",
        status: "completed",
        details: `Entity "${entityName}" confirmed`,
      });
      recordOnboardingStep(
        stepTelemetry,
        "entity_setup",
        "Entity Setup",
        stepStart,
      );

      // ── Step: CoA Check & Seed (with retry + timeout) ────────────────
      stepStart = Date.now();
      const accounts = await withTimeout(
        () =>
          db.query.chartOfAccounts.findMany({
            where: eq(chartOfAccounts.entityId, entityId),
          }),
        pipelineTimeout.maxStepExecutionMs,
        "coa-check",
      );

      if (accounts.length === 0) {
        // Try to find a suitable template and seed (with retry)
        const suggested = await withTimeout(
          () => getSuggestedCoA("trading", "GM"),
          pipelineTimeout.maxStepExecutionMs,
          "coa-template-lookup",
        );

        if (suggested.templateId && suggested.accounts.length > 0) {
          // Retry on confirmCoA for resilience against transient DB failures
          const coaResult = await withRetry(
            () =>
              withTimeout(
                () => confirmCoA(entityId, suggested.templateId!),
                pipelineTimeout.maxStepExecutionMs,
                "coa-confirm",
              ),
            {
              agentId: "onboarding-pipeline",
              operationName: "confirm-coa",
              context: { entityId, templateId: suggested.templateId },
            },
          );
          steps.push({
            id: "coa_review",
            label: "Chart of Accounts",
            status: "completed",
            details: `Created ${coaResult.accountCount} accounts from template`,
          });
        } else {
          // Fallback: seed standard COA inline with retry
          await withRetry(
            () =>
              withTimeout(
                async () => {
                  await db.transaction(async (tx) => {
                    for (const acct of DEFAULT_COA_TEMPLATES[0].accounts) {
                      await tx.insert(chartOfAccounts).values({
                        entityId,
                        code: acct.code,
                        name: acct.name,
                        type: acct.type as any,
                        subtype: acct.subtype as any,
                        isActive: acct.isActive,
                      });
                    }
                  });
                },
                pipelineTimeout.maxStepExecutionMs,
                "coa-seed-fallback",
              ),
            {
              agentId: "onboarding-pipeline",
              operationName: "seed-coa-fallback",
              context: { entityId },
            },
          );
          steps.push({
            id: "coa_review",
            label: "Chart of Accounts",
            status: "completed",
            details: `Created ${DEFAULT_COA_TEMPLATES[0].accounts.length} standard accounts`,
          });
        }
      } else {
        steps.push({
          id: "coa_review",
          label: "Chart of Accounts",
          status: "skipped",
          details: `${accounts.length} accounts already exist`,
        });
      }
      recordOnboardingStep(
        stepTelemetry,
        "coa_seed",
        "Chart of Accounts",
        stepStart,
      );

      // ── Step: Fiscal Periods Check & Create (with timeout) ───────────
      stepStart = Date.now();
      const periods = await withTimeout(
        () =>
          db.query.fiscalPeriods.findMany({
            where: eq(fiscalPeriods.entityId, entityId),
          }),
        pipelineTimeout.maxStepExecutionMs,
        "periods-check",
      );

      if (periods.length === 0) {
        const currentYear = new Date().getFullYear();
        await withRetry(
          () =>
            withTimeout(
              async () => {
                await db.transaction(async (tx) => {
                  for (let month = 1; month <= 12; month++) {
                    const startDate = new Date(currentYear, month - 1, 1);
                    const endDate = new Date(currentYear, month, 0);
                    await tx.insert(fiscalPeriods).values({
                      entityId,
                      year: currentYear,
                      month,
                      startDate: startDate.toISOString().split("T")[0]!,
                      endDate: endDate.toISOString().split("T")[0]!,
                      status: "open",
                    });
                  }
                });
              },
              pipelineTimeout.maxStepExecutionMs,
              "periods-create",
            ),
          {
            agentId: "onboarding-pipeline",
            operationName: "create-fiscal-periods",
            context: { entityId },
          },
        );
        steps.push({
          id: "historical_pull",
          label: "Fiscal Periods",
          status: "completed",
          details: "Created 12 fiscal periods for current year",
        });
      } else {
        steps.push({
          id: "historical_pull",
          label: "Fiscal Periods",
          status: "skipped",
          details: `${periods.length} periods already exist`,
        });
      }
      recordOnboardingStep(
        stepTelemetry,
        "fiscal_periods",
        "Fiscal Periods",
        stepStart,
      );

      // ── Step: Failure Recovery Check (with timeout) ──────────────────
      stepStart = Date.now();
      const failureRecovery = await withTimeout(
        () => checkFailureRecovery(entityId),
        pipelineTimeout.maxStepExecutionMs,
        "failure-recovery",
      );
      recordOnboardingStep(
        stepTelemetry,
        "failure_recovery",
        "Failure Recovery Check",
        stepStart,
      );

      // ── Step: Final Readiness Check ──────────────────────────────────
      stepStart = Date.now();
      const [finalAccounts, finalPeriods] = await Promise.all([
        withTimeout(
          () =>
            db.query.chartOfAccounts.findMany({
              where: eq(chartOfAccounts.entityId, entityId),
            }),
          pipelineTimeout.maxStepExecutionMs,
          "final-accounts",
        ),
        withTimeout(
          () =>
            db.query.fiscalPeriods.findMany({
              where: eq(fiscalPeriods.entityId, entityId),
            }),
          pipelineTimeout.maxStepExecutionMs,
          "final-periods",
        ),
      ]);

      steps.push({
        id: "first_look",
        label: "Readiness Check",
        status: "completed",
        details: `${finalAccounts.length} accounts, ${finalPeriods.length} periods ready`,
      });
      recordOnboardingStep(
        stepTelemetry,
        "readiness",
        "Final Readiness Check",
        stepStart,
      );

      // ── Completeness & Audit (with PII Redaction) ────────────────────
      const completeness = computeCompleteness([
        "signup",
        "routing",
        "entity_setup",
        "coa_review",
        ...(finalPeriods.length > 0 ? ["historical_pull"] : []),
      ]);

      const audit = createAuditEntry({
        agentId: "onboarding-pipeline",
        action:
          completeness >= 0.6 ? "onboarding_complete" : "onboarding_partial",
        details: redactPIIFromObject({
          entityId,
          accountCount: finalAccounts.length,
          completeness,
        }),
        confidence: completeness,
      });
      auditEntries.push(audit);

      await trace.update({
        output: {
          completeness,
          accountCount: finalAccounts.length,
          stepCount: stepTelemetry.length,
          totalStepDurationMs: stepTelemetry.reduce(
            (s, t) => s + t.durationMs,
            0,
          ),
        },
      });

      langfuse.event({
        name: "onboarding-pipeline-complete",
        metadata: {
          entityId,
          completeness,
          accountCount: finalAccounts.length,
          periodCount: finalPeriods.length,
          stepsCompleted: stepTelemetry.length,
        },
      });

      const result: OnboardingPipelineResult = {
        success: true,
        sessionId: "",
        orgId: "",
        entityId,
        steps,
        currentStep: completeness >= 1 ? "complete" : "coa_review",
        completeness,
        timeToFirstValueSeconds: null,
        nextActions: [],
        failureRecovery,
        auditEntries,
        durationMs: Date.now() - startTime,
      };

      setIdempotencyResult(idempotencyKey, result);
      return result;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isTimeout = error instanceof TimeoutError;
      const errorAudit = createAuditEntry({
        agentId: "onboarding-pipeline",
        action: "pipeline_failed",
        details: redactPIIFromObject({
          entityId,
          error: isTimeout ? `Pipeline timed out: ${msg}` : msg,
          isTimeout,
        }),
        confidence: 0,
      });
      auditEntries.push(errorAudit);

      recordOnboardingFailedStep(
        stepTelemetry,
        "pipeline_error",
        "Pipeline Execution",
        telemetryStart,
        msg,
      );

      await trace.update({
        output: { status: "error", error: msg, isTimeout },
      });

      steps.push({
        id: "entity_setup",
        label: "Setup Error",
        status: "failed",
        details: msg,
        failureRecovery: "Please try again or contact support",
      });

      const errorResult: OnboardingPipelineResult = {
        success: false,
        sessionId: "",
        orgId: "",
        entityId,
        steps,
        currentStep: "entity_setup",
        completeness: 0,
        timeToFirstValueSeconds: null,
        nextActions: [`Fix setup error: ${msg}`],
        failureRecovery: ["Please try again or contact support"],
        auditEntries,
        durationMs: Date.now() - startTime,
      };
      return errorResult;
    }
  })(); // <-- IIFE invoked immediately

  return withTimeout(
    () => pipelinePromise,
    pipelineTimeout.maxExecutionMs,
    "onboarding-pipeline",
  );
}

// Legacy exports for backward compatibility
// seedChartOfAccounts and createFiscalPeriods are now inline in this module
