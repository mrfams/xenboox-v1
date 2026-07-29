import crypto from "node:crypto";
import { db } from "../index";
import { agents } from "../schema/agents";

/**
 * Deterministic UUID generator consistent with the main seed pattern.
 */
function seedUuid(type: string, n: number): string {
  const hash = crypto.createHash("sha256").update(`${type}-${n}`).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Agent definitions matching Database Schema v1.0 §2.1.
 *
 * Agent hierarchy:
 *   CFO (Tier 1) → directs all department heads + platform agents
 *   ├─ Controller (Tier 2) → Ledger, AP, AR, Asset, Inventory, Expense
 *   ├─ Treasury (Tier 2) → Reconciliation, Cash, Mobile Money
 *   ├─ Payroll Manager (Tier 2) → Payroll Worker
 *   ├─ Compliance (Tier 2) → Tax, Audit
 *   ├─ Reporting (Platform) → direct to CFO
 *   ├─ Budget (Platform) → direct to CFO
 *   ├─ Analytics (Platform) → direct to CFO
 *   └─ Document (Platform) → direct to CFO
 */

type AgentDef = {
  id: string;
  name: string;
  displayName: string;
  tier: "strategic" | "management" | "worker" | "platform";
  model: "haiku-4-5" | "sonnet-4-6";
  reportsTo: string | null;
  description: string;
};

export function getAgentIds() {
  return {
    cfo: seedUuid("agent", 1),
    controller: seedUuid("agent", 2),
    treasury: seedUuid("agent", 3),
    payrollManager: seedUuid("agent", 4),
    compliance: seedUuid("agent", 5),
    ledger: seedUuid("agent", 6),
    ap: seedUuid("agent", 7),
    ar: seedUuid("agent", 8),
    asset: seedUuid("agent", 9),
    inventory: seedUuid("agent", 10),
    reconciliation: seedUuid("agent", 11),
    cash: seedUuid("agent", 12),
    mobileMoney: seedUuid("agent", 13),
    expense: seedUuid("agent", 14),
    payrollWorker: seedUuid("agent", 15),
    tax: seedUuid("agent", 16),
    audit: seedUuid("agent", 17),
    reporting: seedUuid("agent", 18),
    budget: seedUuid("agent", 19),
    analytics: seedUuid("agent", 20),
    document: seedUuid("agent", 21),
  };
}

export function getAgentDefinitions(): AgentDef[] {
  const ids = getAgentIds();

  return [
    // ── Tier 1: Strategic ─────────────────────────────────────────
    {
      id: ids.cfo,
      name: "cfo",
      displayName: "CFO Agent",
      tier: "strategic",
      model: "sonnet-4-6",
      reportsTo: null,
      description:
        "Orchestrates the entire AI accounting workforce. Strategic planning, month-end orchestration, and the sole agent interface with the human owner.",
    },

    // ── Tier 2: Management — all report to CFO ─────────────────────
    {
      id: ids.controller,
      name: "controller",
      displayName: "Controller Agent",
      tier: "management",
      model: "sonnet-4-6",
      reportsTo: ids.cfo,
      description:
        "Oversees the general ledger, trial balance, close checklist, and supervises ledger/AP/AR/asset/inventory/expense workers.",
    },
    {
      id: ids.treasury,
      name: "treasury",
      displayName: "Treasury Agent",
      tier: "management",
      model: "sonnet-4-6",
      reportsTo: ids.cfo,
      description:
        "Manages cash position, bank reconciliation, and supervises reconciliation/cash/mobile-money workers. Generates daily treasury reports.",
    },
    {
      id: ids.payrollManager,
      name: "payroll_manager",
      displayName: "Payroll Manager",
      tier: "management",
      model: "sonnet-4-6",
      reportsTo: ids.cfo,
      description:
        "Processes payroll runs, validates calculations, handles close confirmation for payroll, and supervises the payroll worker.",
    },
    {
      id: ids.compliance,
      name: "compliance",
      displayName: "Compliance Agent",
      tier: "management",
      model: "sonnet-4-6",
      reportsTo: ids.cfo,
      description:
        "Reviews tax filings, tracks compliance deadlines, handles close confirmation for compliance, and supervises tax/audit workers.",
    },

    // ── Tier 3: Workers — report to their department head ──────────
    // Controller's team
    {
      id: ids.ledger,
      name: "ledger",
      displayName: "Ledger Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.controller,
      description:
        "Single point of entry to the general ledger. Validates double-entry, posts journal entries, and generates trial balances.",
    },
    {
      id: ids.ap,
      name: "ap",
      displayName: "AP Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.controller,
      description:
        "Processes supplier invoices, manages AP aging, generates payment schedules, and posts AP-related journal entries.",
    },
    {
      id: ids.ar,
      name: "ar",
      displayName: "AR Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.controller,
      description:
        "Manages customer invoices, tracks AR aging, sends overdue alerts, and matches incoming payments.",
    },
    {
      id: ids.asset,
      name: "asset",
      displayName: "Asset Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.controller,
      description:
        "Manages fixed asset register, calculates depreciation, and handles asset lifecycle events (acquisition, disposal, transfer).",
    },
    {
      id: ids.inventory,
      name: "inventory",
      displayName: "Inventory Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.controller,
      description:
        "Tracks inventory movements, calculates COGS, performs valuation adjustments, and maintains inventory summaries.",
    },
    {
      id: ids.expense,
      name: "expense",
      displayName: "Expense Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.controller,
      description:
        "Processes employee expense claims, applies policy rules, flags anomalies, and routes approvals.",
    },

    // Treasury's team
    {
      id: ids.reconciliation,
      name: "reconciliation",
      displayName: "Reconciliation Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.treasury,
      description:
        "Matches bank transactions to journal entries, flags discrepancies, and generates reconciliation reports.",
    },
    {
      id: ids.cash,
      name: "cash",
      displayName: "Cash Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.treasury,
      description:
        "Manages petty cash and imprest floats, tracks cash positions, and flags unreconciled cash transactions.",
    },
    {
      id: ids.mobileMoney,
      name: "mobile_money",
      displayName: "Mobile Money Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.treasury,
      description:
        "Matches mobile money transactions (Wave/Orange/MTN/M-Pesa/Airtel) to ledger entries and flags timing differences.",
    },

    // Payroll Manager's team
    {
      id: ids.payrollWorker,
      name: "payroll_worker",
      displayName: "Payroll Worker Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.payrollManager,
      description:
        "Executes payroll calculations, computes statutory deductions, generates payslips, and posts payroll journal entries.",
    },

    // Compliance's team
    {
      id: ids.tax,
      name: "tax",
      displayName: "Tax Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.compliance,
      description:
        "Calculates VAT, PAYE, withholding tax, and corporate tax. Prepares tax packages for filing across jurisdictions.",
    },
    {
      id: ids.audit,
      name: "audit",
      displayName: "Audit Agent",
      tier: "worker",
      model: "haiku-4-5",
      reportsTo: ids.compliance,
      description:
        "Performs audit sampling, runs golden dataset evaluations, detects model drift, and prepares audit packages.",
    },

    // ── Platform Agents — report to CFO directly ───────────────────
    {
      id: ids.reporting,
      name: "reporting",
      displayName: "Reporting Agent",
      tier: "platform",
      model: "haiku-4-5",
      reportsTo: ids.cfo,
      description:
        "Generates financial statements (P&L, balance sheet, cash flow, trial balance) with narrative commentary.",
    },
    {
      id: ids.budget,
      name: "budget",
      displayName: "Budget Agent",
      tier: "platform",
      model: "haiku-4-5",
      reportsTo: ids.cfo,
      description:
        "Manages budgets and budget lines, tracks variance between actuals and budgets, and generates budget reports.",
    },
    {
      id: ids.analytics,
      name: "analytics",
      displayName: "Analytics Agent",
      tier: "platform",
      model: "haiku-4-5",
      reportsTo: ids.cfo,
      description:
        "Produces health scores, detects trends and anomalies, benchmarks against cohorts, and generates forecast models.",
    },
    {
      id: ids.document,
      name: "document",
      displayName: "Document Agent",
      tier: "platform",
      model: "haiku-4-5",
      reportsTo: ids.cfo,
      description:
        "Processes ingested documents: OCR extraction, classification (invoice/receipt/contract/statement), and links records.",
    },
  ];
}

export async function seedAgents() {
  console.log("  Seeding agents reference table...");

  const agentDefs = getAgentDefinitions();

  for (const agent of agentDefs) {
    await db
      .insert(agents)
      .values({
        id: agent.id,
        name: agent.name as any, // pgEnum cast
        displayName: agent.displayName,
        tier: agent.tier as any, // pgEnum cast
        model: agent.model as any, // pgEnum cast
        reportsTo: agent.reportsTo,
        description: agent.description,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  console.log(`    ✓ ${agentDefs.length} agents seeded`);
}
