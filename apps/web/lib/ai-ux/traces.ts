// ─── AI-native UX — scripted agent workflow traces ─────────────────────────
//
// Each trace is a high-fidelity simulation of how the Xenboox agent workforce
// would behave on that workflow once live LLM agents are wired in. The step
// vocabulary mirrors modern agentic products (ChatGPT "thinking", Claude's
// analysis tool, Cursor/Devin step feeds, Basis accounting workflows):
//
//   think      — "Thinking…" shimmer, then the agent's reasoning
//   act        — the agent narrates what it is doing ("Creating June month-end
//                close report…") while it works
//   tool       — a discrete tool invocation, rendered in mono type
//   approval   — a confidence-scored pause for human sign-off
//   complete   — terminal success line
//
// All steps resolve automatically in the simulation. Approval steps show the
// confidence that a real agent would carry into the review queue.

import type { AiUxStep, AiUxTrace } from "./types";

function t(
  id: string,
  title: string,
  tagline: string,
  module: string,
  durationLabel: string,
  agents: AiUxTrace["agents"],
  steps: AiUxStep[],
): AiUxTrace {
  return { id, title, tagline, module, durationLabel, agents, steps };
}

export const AI_UX_TRACES: AiUxTrace[] = [
  // ── Month-end close ────────────────────────────────────────────────────
  t(
    "month-end-close",
    "Autonomous month-end close",
    "CFO agent plans, department agents run their checklists, and the books close without a spreadsheet in sight.",
    "Close Center",
    "~48s run",
    ["cfo", "controller", "ledger", "reporting", "compliance"],
    [
      {
        kind: "think",
        agent: "cfo",
        text: "June close requested. Scanning the ledger for open items, unreconciled accounts, and unfinished approvals.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "cfo",
        text: "Creating June month-end close plan — 6 phases, 14 tasks, owners assigned across the agent workforce.",
        ms: 3200,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Running pre-close checklist: bank reconciliations, accruals, depreciation, and inter-entity balances.",
        ms: 3400,
      },
      {
        kind: "tool",
        agent: "controller",
        tool: "closeCenter.getChecklist",
        detail:
          "4 of 6 phases complete · 2 tasks awaiting data from bank feeds",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "reconciliation",
        text: "Matching 3 unreconciled bank lines against open invoices — 2 matched, 1 flagged as a possible transfer.",
        ms: 3000,
      },
      {
        kind: "approval",
        agent: "controller",
        text: "Adjusting entry proposed: D 12,500.00 to Bank Charges · C 12,500.00 to Cash. Awaiting your sign-off.",
        ms: 3000,
        confidence: 92,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting approved adjustments and running a trial-balance check — debits equal credits to the cent.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "reporting",
        text: "Creating June month-end close report — P&L, balance sheet, cash flow, and variance narratives…",
        ms: 3600,
      },
      {
        kind: "tool",
        agent: "reporting",
        tool: "reports.generateMonthly",
        detail:
          "Writing narrative: 'Gross margin improved 2.1pts on higher-margin service revenue…'",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "compliance",
        text: "Verifying the close against tax rules, statutory rates, and the tamper-evident audit chain.",
        ms: 2800,
      },
      {
        kind: "complete",
        agent: "cfo",
        text: "June close complete — 14/14 tasks done, all accounts reconciled, report generated and attached to the activity trail.",
      },
    ],
  ),

  // ── Bank reconciliation ────────────────────────────────────────────────
  t(
    "bank-reconciliation",
    "Bank statement auto-match",
    "The document pipeline ingests your statement, the reconciliation agent matches every line, and only exceptions reach you.",
    "Banking",
    "~38s run",
    ["document", "reconciliation", "ledger"],
    [
      {
        kind: "act",
        agent: "document",
        text: "Ingesting June bank statement — 42 transactions detected from the PDF.",
        ms: 2600,
      },
      {
        kind: "tool",
        agent: "document",
        tool: "document.extract",
        detail: "OCR complete · 42/42 lines extracted · 99.2% field confidence",
        ms: 2200,
      },
      {
        kind: "think",
        agent: "reconciliation",
        text: "Matching 42 bank lines against open invoices, bills, and transfers using amount, date, and counterparty.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "reconciliation",
        text: "Auto-matched 35 of 42 lines — including 2 duplicate fee lines that would have double-posted.",
        ms: 3400,
      },
      {
        kind: "act",
        agent: "reconciliation",
        text: "Proposing categories for the 7 unmatched lines from vendor history and past patterns.",
        ms: 3000,
      },
      {
        kind: "approval",
        agent: "reconciliation",
        text: "7 categorization suggestions ready in the review queue. Auto-categorized 4 at 96% confidence.",
        ms: 2800,
        confidence: 88,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting matched and approved lines to the general ledger — cash and clearing accounts in balance.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "reconciliation",
        text: "Reconciliation complete — 42/42 lines accounted for, ledger balances match the statement to the cent.",
      },
    ],
  ),

  // ── Transaction categorization ─────────────────────────────────────────
  t(
    "transaction-categorization",
    "Smart transaction categorization",
    "Cash agent reads every transaction, learns from your past coding, and posts high-confidence items while holding the rest.",
    "Transactions",
    "~34s run",
    ["cash", "ledger"],
    [
      {
        kind: "think",
        agent: "cash",
        text: "Reviewing 24 uncategorized transactions — grouping by payee, amount pattern, and prior coding history.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "cash",
        text: "Categorizing 18 transactions at above 90% confidence using historical patterns from the last 6 months.",
        ms: 3400,
      },
      {
        kind: "tool",
        agent: "cash",
        tool: "transactions.suggestCategory",
        detail:
          "Acme Supplies D 3,400.00 → Office Supplies (96%) · MTN Mobile Money → Bank Fees (91%)",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "cash",
        text: "Flagging 3 transactions that break the pattern — unusual vendor, amount, or account pairing.",
        ms: 3000,
      },
      {
        kind: "approval",
        agent: "cash",
        text: "6 items held for your review — 3 anomalies, 2 recurring vendor changes, 1 missing receipt.",
        ms: 2800,
        confidence: 84,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting the 18 auto-approved entries to the general ledger, entity-scoped and audit-logged.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "cash",
        text: "Categorization run complete — 18 posted automatically, 6 awaiting your review in the queue.",
      },
    ],
  ),

  // ── Document extraction ────────────────────────────────────────────────
  t(
    "document-extraction",
    "Document capture → AI extraction",
    "Upload a PDF or photo and the document agent turns it into a draft bill — with every figure traceable to the source.",
    "Documents",
    "~36s run",
    ["document", "ap", "ledger"],
    [
      {
        kind: "act",
        agent: "document",
        text: "Receiving invoice_1047.pdf — running OCR and layout analysis.",
        ms: 2400,
      },
      {
        kind: "tool",
        agent: "document",
        tool: "document.ocr",
        detail:
          "12 fields extracted · vendor: Global Freight Ltd · total: D 86,400.00",
        ms: 2200,
      },
      {
        kind: "think",
        agent: "document",
        text: "Resolving vendor identity, tax treatment, and account mapping against the chart of accounts.",
        ms: 2800,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Drafting a bill from the extracted data — matching the amount to the open purchase order.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "ap",
        tool: "ap.matchPO",
        detail:
          "PO-0231 found · line totals match · no price or quantity variance",
        ms: 2200,
      },
      {
        kind: "approval",
        agent: "ap",
        text: "Draft bill ready for approval: Global Freight Ltd · D 86,400.00 · 15 lines extracted.",
        ms: 2800,
        confidence: 94,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting the approved bill — crediting Accounts Payable and debiting Freight & Logistics.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "document",
        text: "Document processed — original preserved, extraction versioned, entry audit-logged and visible in Bills.",
      },
    ],
  ),

  // ── Invoice generation ─────────────────────────────────────────────────
  t(
    "invoice-creation",
    "AI invoice generation",
    "A quote, a note, or a customer message becomes a ready-to-send invoice — drafted, checked, and waiting for one click.",
    "Invoicing",
    "~30s run",
    ["ar", "cfo"],
    [
      {
        kind: "think",
        agent: "ar",
        text: "Converting accepted estimate EST-2026-0314 into an invoice — copying lines, prices, and terms.",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Drafting invoice INV-2026-118 for Kerr Jula Trading Co. — 4 line items, D 245,000.00 total.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "ar",
        tool: "ar.draftInvoice",
        detail:
          "Lines from estimate preserved · terms: net-30 · tax treatment: VAT standard rate",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Cross-checking the draft against the accepted estimate — no discrepancies found.",
        ms: 2600,
      },
      {
        kind: "approval",
        agent: "ar",
        text: "Invoice ready to send. Confidence in line accuracy: high. One click to approve and email.",
        ms: 2600,
        confidence: 96,
      },
      {
        kind: "complete",
        agent: "cfo",
        text: "Invoice INV-2026-118 approved and queued — customer notified, receivable tracked from day one.",
      },
    ],
  ),

  // ── Payroll run ────────────────────────────────────────────────────────
  t(
    "payroll-run",
    "Payroll run automation",
    "Gross pay, statutory deductions, net pay, and payslips — computed, verified, and posted in a single run.",
    "Payroll",
    "~40s run",
    ["payroll", "ledger", "reporting"],
    [
      {
        kind: "think",
        agent: "payroll",
        text: "Computing June payroll for 14 employees — salaries, overtime, and the latest statutory rate updates.",
        ms: 2800,
      },
      {
        kind: "act",
        agent: "payroll",
        text: "Applying PAYE bands, social security splits, and per-employee deductions from the tax rules engine.",
        ms: 3400,
      },
      {
        kind: "tool",
        agent: "payroll",
        tool: "payroll.computeRun",
        detail:
          "Gross D 1,284,000 · statutory D 312,400 · net D 971,600 · 14 payslips",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "payroll",
        text: "Flagging 2 employees whose deductions changed from last month for your awareness.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "payroll",
        text: "Payroll run awaiting approval before posting — D 971,600.00 net to disburse.",
        ms: 3000,
        confidence: 97,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting the payroll journal — wages expense, PAYE payable, social security payable, and bank cash-out.",
        ms: 3200,
      },
      {
        kind: "act",
        agent: "reporting",
        text: "Generating individual payslips and the statutory filing summary for the period.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "payroll",
        text: "Payroll complete — 14 payslips generated, journal posted, statutory filing summary attached.",
      },
    ],
  ),

  // ── Cash flow forecast ─────────────────────────────────────────────────
  t(
    "cashflow-forecast",
    "Cash flow forecasting",
    "The treasury agent models your runway from real AR/AP positions and the CFO briefs you on what it means.",
    "Dashboard",
    "~32s run",
    ["treasury", "ar", "ap", "cfo"],
    [
      {
        kind: "think",
        agent: "treasury",
        text: "Pulling open receivables, payables, committed bills, and bank balances to build the 90-day model.",
        ms: 2600,
      },
      {
        kind: "tool",
        agent: "ar",
        tool: "ar.openBalances",
        detail: "D 645,000 receivable · 3 overdue · average collection 38 days",
        ms: 2000,
      },
      {
        kind: "tool",
        agent: "ap",
        tool: "ap.schedule",
        detail: "D 412,000 committed payables · D 86,400 due this week",
        ms: 2000,
      },
      {
        kind: "act",
        agent: "treasury",
        text: "Modeling 90-day cash flow across three scenarios — base, delayed collections, and early supplier payment.",
        ms: 3400,
      },
      {
        kind: "act",
        agent: "treasury",
        text: "Runway holds at 5.2 months in the base case; the delayed-collections scenario crosses the 90-day floor.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "cfo",
        text: "Writing executive briefing — 3 actions recommended, including following up on the two oldest invoices.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "cfo",
        text: "Forecast delivered — dashboard updated with the 90-day runway chart and recommended actions.",
      },
    ],
  ),

  // ── Collections ────────────────────────────────────────────────────────
  t(
    "collections-flow",
    "AR collections agent",
    "Overdue invoices are chased automatically with tone tuned per customer — stubborn accounts escalate to you.",
    "Customers",
    "~30s run",
    ["ar", "cfo"],
    [
      {
        kind: "think",
        agent: "ar",
        text: "Reviewing 5 overdue invoices worth D 187,000 — segmenting by customer relationship and payment history.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Drafting personalized reminder emails — gentle for long-standing customers, firmer for repeat offenders.",
        ms: 3200,
      },
      {
        kind: "tool",
        agent: "ar",
        tool: "ar.draftReminder",
        detail:
          "3 reminders drafted · tone: 'friendly nudge' for 2 · 'payment due' for 1",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Escalating D 62,000 from a customer 45 days overdue with no response to the last two reminders.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "ar",
        text: "4 emails ready to send and 1 escalation flagged for your review before dispatch.",
        ms: 2600,
        confidence: 86,
      },
      {
        kind: "complete",
        agent: "cfo",
        text: "Collections round complete — reminders queued, escalation logged to the receivables aging report.",
      },
    ],
  ),

  // ── Vendor payments ────────────────────────────────────────────────────
  t(
    "vendor-payments",
    "Vendor payment scheduling",
    "Payables are scheduled against cash position, so you never overdraw — and never miss a discount window.",
    "Bills",
    "~30s run",
    ["treasury", "ap", "cfo"],
    [
      {
        kind: "think",
        agent: "ap",
        text: "Ranking 9 due bills by due date, discount window, and supplier relationship.",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "treasury",
        text: "Checking the payment plan against the 90-day cash position — flagging the month's peak outflow week.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "treasury",
        text: "Rescheduling 2 supplier payments by 3 days to ride out the peak — no discounts lost, no overdraft.",
        ms: 3000,
      },
      {
        kind: "approval",
        agent: "treasury",
        text: "Payment batch of D 386,000 ready — 7 bills on schedule, 2 rescheduled. Review and approve.",
        ms: 2800,
        confidence: 91,
      },
      {
        kind: "complete",
        agent: "cfo",
        text: "Payment schedule locked — approvals handed to the bank integration for execution on the planned dates.",
      },
    ],
  ),

  // ── Audit verification ─────────────────────────────────────────────────
  t(
    "audit-verification",
    "Audit chain verification",
    "The compliance agent walks the tamper-evident hash chain and certifies the books — end to end.",
    "Activity Log",
    "~28s run",
    ["compliance", "ledger"],
    [
      {
        kind: "act",
        agent: "compliance",
        text: "Walking the audit chain for June — verifying every event hash from the last verified block.",
        ms: 2800,
      },
      {
        kind: "tool",
        agent: "compliance",
        tool: "audit.verify",
        detail:
          "1,284 events verified · 0 hash mismatches · 0 integrity violations",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "compliance",
        text: "Cross-checking ledger postings against their originating documents and approval records.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Confirming trial-balance consistency for the period — every entry traces to an approved source.",
        ms: 2600,
      },
      {
        kind: "complete",
        agent: "compliance",
        text: "Verification complete — the June ledger is certified, and the verification report is attached to the trail.",
      },
    ],
  ),

  // ── Vendor profile enrichment ─────────────────────────────────────────
  t(
    "vendor-profile",
    "Vendor profile enrichment",
    "Vendor records are deduplicated, enriched, and tax-flagged so payables stay clean and 1099-ready.",
    "Vendors",
    "~30s run",
    ["ap", "compliance", "cash"],
    [
      {
        kind: "think",
        agent: "ap",
        text: "Scanning 31 vendor records for duplicates, missing tax IDs, and stale payment details.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Merging 2 duplicate vendor profiles — same bank account, same address, different spellings.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "ap",
        tool: "vendors.findDuplicates",
        detail:
          "2 duplicates found · 0 conflicting balances · merge plan drafted",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "compliance",
        text: "Flagging 4 vendors missing tax IDs and 2 marked as 1099-reportable for the filing season.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Enriching payment terms from the last 6 bills — 11 vendors get standard net-30 reminders.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "ap",
        text: "Profile updates ready for review — 2 merges, 6 tax flags, and terms suggestions. Approve to apply.",
        ms: 2600,
        confidence: 87,
      },
      {
        kind: "complete",
        agent: "cash",
        text: "Vendor master updated — duplicates merged, tax flags logged, and payables now route with correct details.",
      },
    ],
  ),

  // ── Expense review ─────────────────────────────────────────────────────
  t(
    "expense-review",
    "Expense policy review",
    "Every expense is checked against your policy before it posts — duplicates and out-of-policy spend get flagged.",
    "Expenses",
    "~30s run",
    ["ap", "compliance"],
    [
      {
        kind: "think",
        agent: "ap",
        text: "Reviewing 11 submitted expenses against category, amount, receipt, and policy limits.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Categorizing 8 clean expenses — travel, meals, office, and software — against the chart of accounts.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "compliance",
        text: "Flagging 2 expenses over the per-meal policy limit and 1 missing its receipt attachment.",
        ms: 2800,
      },
      {
        kind: "tool",
        agent: "compliance",
        tool: "expenses.policyCheck",
        detail: "2 policy flags · 1 missing receipt · 0 duplicates detected",
        ms: 2200,
      },
      {
        kind: "approval",
        agent: "ap",
        text: "8 expenses auto-approved · 3 held for your review with policy notes attached.",
        ms: 2600,
        confidence: 89,
      },
      {
        kind: "complete",
        agent: "compliance",
        text: "Review complete — clean expenses posted, flagged items waiting in the review queue.",
      },
    ],
  ),

  // ── Historical data migration ──────────────────────────────────────────
  t(
    "data-migration",
    "Historical data migration",
    "Bringing years of records from a spreadsheet into clean, entity-scoped opening balances.",
    "Onboarding",
    "~36s run",
    ["document", "controller", "ledger", "cfo"],
    [
      {
        kind: "think",
        agent: "document",
        text: "Analyzing the uploaded trial balance workbook — 3 sheets, 74 accounts, 2 fiscal years.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "document",
        text: "Mapping 74 accounts onto the chart of accounts — 68 matched directly, 6 needing a decision.",
        ms: 3400,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Reconstructing opening balances at the migration cutoff date from statements and records.",
        ms: 3200,
      },
      {
        kind: "approval",
        agent: "controller",
        text: "6 unmapped accounts awaiting your choice (e.g. 'Petty Cash Fund' → Cash or Other Receivables).",
        ms: 3000,
        confidence: 78,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting reconstructed opening balances — balanced to the cent, entity-scoped, audit-logged.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "cfo",
        text: "Migration complete — your history is in Xenboox, source files preserved, balances verified.",
      },
    ],
  ),
];

// ─── Lookup ────────────────────────────────────────────────────────────────

const TRACE_INDEX = new Map(AI_UX_TRACES.map((trace) => [trace.id, trace]));

export function getAiUxTrace(id: string): AiUxTrace | undefined {
  return TRACE_INDEX.get(id);
}
