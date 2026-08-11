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

  // ── Estimate → invoice conversion ──────────────────────────────────────
  t(
    "estimate-conversion",
    "Estimate conversion & follow-up",
    "Accepted quotes become invoices automatically while expiring ones get a final nudge — the sales-to-cash handoff runs itself.",
    "Estimates",
    "~30s run",
    ["ar", "cfo"],
    [
      {
        kind: "think",
        agent: "ar",
        text: "Scanning 23 open estimates — checking which are accepted, expiring soon, or have gone quiet.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Converting 2 accepted estimates into invoices — line items, tax treatment, and terms carried over.",
        ms: 3200,
      },
      {
        kind: "tool",
        agent: "ar",
        tool: "estimates.convertAccepted",
        detail: "EST-2026-0314 → INV-2026-118 · EST-2026-0319 → INV-2026-119",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Sending a final reminder to 3 customers with quotes expiring within the next 7 days.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "ar",
        text: "2 invoices ready to send and 3 expiry nudges drafted. Review the conversion details.",
        ms: 2600,
        confidence: 95,
      },
      {
        kind: "act",
        agent: "cfo",
        text: "Updating the quote pipeline — conversion rate, average time-to-accept, and open value recalibrated.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "cfo",
        text: "Estimates round complete — conversions queued, expiring quotes chased, pipeline refreshed.",
      },
    ],
  ),

  // ── Journal entry automation ───────────────────────────────────────────
  t(
    "journal-entry-automation",
    "Journal entry automation",
    "Describe the adjustment in plain words — the controller structures it and the ledger posts a balanced, audit-traced entry.",
    "Journal Entries",
    "~32s run",
    ["controller", "ledger"],
    [
      {
        kind: "think",
        agent: "controller",
        text: "Reading the request: 'accrue for the consulting invoice that arrives next month' — identifying accounts and amounts.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Structuring a draft entry — D 12,500.00 to Consulting Expense · C 12,500.00 to Accrued Liabilities.",
        ms: 3200,
      },
      {
        kind: "tool",
        agent: "controller",
        tool: "journal.draftEntry",
        detail:
          "Debits D 12,500.00 · Credits D 12,500.00 · balanced · accounts mapped from the chart",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Checking the entry against the close checklist — no duplicate accrual exists for this vendor.",
        ms: 2600,
      },
      {
        kind: "approval",
        agent: "controller",
        text: "Draft journal entry awaiting approval: Consulting Expense D 12,500.00 ↔ Accrued Liabilities.",
        ms: 2800,
        confidence: 96,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting the approved entry — balanced, entity-scoped, and chained onto the audit trail.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "ledger",
        text: "Journal entry posted — the accrual will reverse automatically when the invoice is booked next month.",
      },
    ],
  ),

  // ── Monthly depreciation run ───────────────────────────────────────────
  t(
    "depreciation-run",
    "Monthly depreciation run",
    "Depreciation is computed per asset, verified against policy, and posted in one controlled run.",
    "Fixed Assets",
    "~34s run",
    ["controller", "ledger"],
    [
      {
        kind: "think",
        agent: "controller",
        text: "Preparing the June depreciation run for 41 active assets — checking methods, useful lives, and prior-year additions.",
        ms: 2800,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Computing straight-line and declining-balance depreciation per asset class from the fixed-asset register.",
        ms: 3400,
      },
      {
        kind: "tool",
        agent: "controller",
        tool: "fixedAssets.computeDepreciation",
        detail:
          "41 assets · D 86,240.00 total · 3 assets fully depreciated · 1 disposed",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Flagging 2 assets at 95%+ of useful life for a revaluation or disposal decision.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "controller",
        text: "Depreciation journal of D 86,240.00 ready to post — 41 assets, methods verified.",
        ms: 2800,
        confidence: 98,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting depreciation to accumulated depreciation and depreciation expense accounts.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "controller",
        text: "Depreciation run complete — net book values updated, fully-depreciated assets flagged for review.",
      },
    ],
  ),

  // ── Chart of accounts review ───────────────────────────────────────────
  t(
    "chart-of-accounts-review",
    "Chart of accounts review",
    "The controller reviews account structure, suggests new accounts from real transaction patterns, and flags dormant ones.",
    "Chart of Accounts",
    "~30s run",
    ["controller", "ledger"],
    [
      {
        kind: "think",
        agent: "controller",
        text: "Reviewing 74 accounts — mapping six months of transactions to spot misuse and missing granularity.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Suggesting 3 new sub-accounts — split 'Utilities' into power, water, and internet based on spend patterns.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "controller",
        tool: "coa.analyzeUsage",
        detail:
          "74 accounts · 5 never used · 2 overloaded · 1 duplicate pair detected",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Flagging 5 dormant accounts and a duplicate 'Travel – Local' / 'Travel – Domestic' pair for cleanup.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "controller",
        text: "Chart of accounts recommendations ready — 3 new accounts, 2 merges, 5 deactivations.",
        ms: 2600,
        confidence: 88,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Applying approved changes — reclassifying history so reports stay comparable month over month.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "controller",
        text: "Chart of accounts review complete — structure clean, reports now group where your spend actually is.",
      },
    ],
  ),

  // ── Tax filing preparation ─────────────────────────────────────────────
  t(
    "tax-filing-prep",
    "Tax filing preparation",
    "VAT, PAYE, and corporate liabilities are computed from the live tax rules engine and returns are drafted for review.",
    "Tax & Compliance",
    "~40s run",
    ["compliance", "controller", "reporting"],
    [
      {
        kind: "think",
        agent: "compliance",
        text: "Compiling the June filing package — VAT, PAYE, and corporate estimates across 5 active jurisdictions.",
        ms: 2800,
      },
      {
        kind: "act",
        agent: "compliance",
        text: "Applying the entity's tax rules — output VAT on sales, input VAT on purchases, PAYE bands, and corporate rate.",
        ms: 3400,
      },
      {
        kind: "tool",
        agent: "compliance",
        tool: "tax.computeLiabilities",
        detail:
          "VAT payable D 48,600 · PAYE D 96,200 · corporate estimate D 210,400 · due dates mapped",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Reconciling the computed liabilities against the general ledger VAT and PAYE payable accounts.",
        ms: 3000,
      },
      {
        kind: "act",
        agent: "reporting",
        text: "Drafting the filing summaries with the supporting transaction schedules for each return.",
        ms: 3200,
      },
      {
        kind: "approval",
        agent: "compliance",
        text: "Filing package ready for review — 3 returns drafted, liabilities match the ledger to the cent.",
        ms: 2800,
        confidence: 93,
      },
      {
        kind: "complete",
        agent: "compliance",
        text: "Filing package prepared — returns, schedules, and due-date reminders attached for your sign-off.",
      },
    ],
  ),

  // ── Subledger vs ledger reconciliation ─────────────────────────────────
  t(
    "ledger-reconciliation",
    "Subledger vs ledger reconciliation",
    "AR, AP, and cash subledgers are reconciled against the general ledger — every difference traced to its source entry.",
    "Reconciliation",
    "~36s run",
    ["reconciliation", "controller"],
    [
      {
        kind: "think",
        agent: "reconciliation",
        text: "Comparing subledger totals to the general ledger for June — receivables, payables, and cash.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "reconciliation",
        text: "Matching 312 subledger postings to ledger entries — 309 tie out exactly.",
        ms: 3200,
      },
      {
        kind: "tool",
        agent: "reconciliation",
        tool: "reconcile.subledger",
        detail:
          "AR D 645,000 = GL · AP D 412,000 = GL · Cash D 1,286,000 ≠ GL by D 2,500",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "reconciliation",
        text: "Tracing the D 2,500 cash difference to a bank-fee entry posted to the wrong subledger line.",
        ms: 3000,
      },
      {
        kind: "approval",
        agent: "reconciliation",
        text: "Correction proposed: move the D 2,500.00 bank fee to Bank Charges. Apply to reconcile?",
        ms: 2800,
        confidence: 91,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Verifying the correction keeps the trial balance balanced and the audit chain intact.",
        ms: 2800,
      },
      {
        kind: "complete",
        agent: "reconciliation",
        text: "Subledgers reconciled — all differences resolved, June books tie out to the cent.",
      },
    ],
  ),

  // ── Financial statement generation ─────────────────────────────────────
  t(
    "report-generation",
    "Financial statement generation",
    "The reporting agent builds the P&L, balance sheet, and cash flow with variance narratives — CFO-reviewed before publication.",
    "Reports",
    "~38s run",
    ["reporting", "cfo"],
    [
      {
        kind: "think",
        agent: "reporting",
        text: "Building the June statement package from posted ledger entries — period, budget, and prior-year comparisons.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "reporting",
        text: "Generating the P&L with budget variance, the balance sheet, and the cash-flow statement.",
        ms: 3400,
      },
      {
        kind: "tool",
        agent: "reporting",
        tool: "reports.generateMonthly",
        detail:
          "Revenue D 1.24M · Net income D 318k · gross margin +2.1pts vs May · OCF D 142k",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "reporting",
        text: "Writing variance narratives — explaining the margin lift and the one-off legal fee in June.",
        ms: 3200,
      },
      {
        kind: "act",
        agent: "cfo",
        text: "Reviewing the package — checking the numbers against the close report and prior-period trends.",
        ms: 3000,
      },
      {
        kind: "approval",
        agent: "cfo",
        text: "June statement package ready — publish to the board pack and the entity's shared reports?",
        ms: 2600,
        confidence: 97,
      },
      {
        kind: "complete",
        agent: "reporting",
        text: "Reports published — P&L, balance sheet, and cash flow attached with signed-off narratives.",
      },
    ],
  ),

  // ── Statutory payroll filing ───────────────────────────────────────────
  t(
    "payroll-filing",
    "Statutory payroll filing",
    "PAYE, social security, and year-end certificates are prepared from the payroll run — ready to file.",
    "Payroll",
    "~34s run",
    ["payroll", "compliance"],
    [
      {
        kind: "think",
        agent: "payroll",
        text: "Preparing June statutory returns from the posted payroll run — 14 employees, per-employee tax statuses applied.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "payroll",
        text: "Computing PAYE payable, social security contributions, and the employer's share per employee.",
        ms: 3400,
      },
      {
        kind: "tool",
        agent: "payroll",
        tool: "payroll.prepareFiling",
        detail:
          "PAYE D 96,200 · SS employee D 38,520 · SS employer D 48,150 · 14 certificates",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "compliance",
        text: "Cross-checking the figures against the tax rules engine and last month's filing for rate regressions.",
        ms: 3000,
      },
      {
        kind: "approval",
        agent: "payroll",
        text: "June filing package ready — returns and certificates drafted, totals match the payroll journal.",
        ms: 2800,
        confidence: 96,
      },
      {
        kind: "complete",
        agent: "compliance",
        text: "Filing package complete — returns queued for submission and payslips distributed to employees.",
      },
    ],
  ),

  // ── Payment matching & application ─────────────────────────────────────
  t(
    "payment-matching",
    "Payment matching & application",
    "Incoming payments are matched to open invoices — short-payments and overpayments flagged before posting.",
    "Invoicing",
    "~32s run",
    ["ar", "ledger"],
    [
      {
        kind: "think",
        agent: "ar",
        text: "Reviewing 9 incoming payments against 31 open invoices — matching by customer, amount, and reference.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Applying 6 payments cleanly — invoice paid in full, receivables updated.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "ar",
        tool: "ar.matchPayment",
        detail:
          "6 applied · 1 short-payment (D 24,000 vs D 25,400 due) · 1 overpayment · 1 unidentifiable",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Flagging the short-payment for a follow-up note and the overpayment as a customer credit.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "ar",
        text: "7 of 9 payments ready to post — 2 exceptions need your call before they touch the ledger.",
        ms: 2600,
        confidence: 90,
      },
      {
        kind: "act",
        agent: "ledger",
        text: "Posting applied payments — debiting cash and clearing each invoice's receivable balance.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "ar",
        text: "Payment matching complete — 7 posted, overpayment credited, short-payment flagged for follow-up.",
      },
    ],
  ),

  // ── Bill approval routing ──────────────────────────────────────────────
  t(
    "bill-approval",
    "Bill approval routing",
    "Every bill is checked against purchase orders and routed through the right approval chain before it posts.",
    "Bills",
    "~34s run",
    ["ap", "controller"],
    [
      {
        kind: "think",
        agent: "ap",
        text: "Reviewing 7 incoming bills — checking PO matching, duplicate risk, and approval authority by amount.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Routing 4 bills under the threshold straight through and 3 higher-value bills up the approval chain.",
        ms: 3200,
      },
      {
        kind: "tool",
        agent: "ap",
        tool: "ap.matchPO",
        detail:
          "5 PO-matched · 1 price variance +3.2% · 1 possible duplicate of BILL-0873",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Flagging the price variance for the buyer and holding the suspected duplicate for confirmation.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "ap",
        text: "5 bills approved · 2 exceptions flagged — variance and duplicate check. Approve the batch?",
        ms: 2800,
        confidence: 89,
      },
      {
        kind: "act",
        agent: "controller",
        text: "Verifying approved bills against budget and the accruals raised in the close checklist.",
        ms: 2800,
      },
      {
        kind: "complete",
        agent: "ap",
        text: "Bill batch processed — approved bills booked to payables, exceptions routed to the review queue.",
      },
    ],
  ),

  // ── Expense reimbursement run ───────────────────────────────────────────
  t(
    "expense-reimbursement",
    "Expense reimbursement run",
    "Employee reimbursements are compiled, policy-checked, and batched into a single payment run.",
    "Expenses",
    "~30s run",
    ["ap", "cash"],
    [
      {
        kind: "think",
        agent: "ap",
        text: "Compiling 12 pending employee reimbursements — receipts, policy limits, and approval status.",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Validating each expense against policy — meal caps, mileage rates, and receipt requirements.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "ap",
        tool: "expenses.policyCheck",
        detail:
          "11 approved · 1 over per-diem cap by D 1,200 · total run D 84,600",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "cash",
        text: "Checking the run against cash position — no conflict with the scheduled vendor payment batch.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "ap",
        text: "Reimbursement batch of D 84,600 ready — 11 employees, 1 exception held for review.",
        ms: 2600,
        confidence: 94,
      },
      {
        kind: "complete",
        agent: "cash",
        text: "Reimbursements batched — employees notified, the exception stays in the review queue.",
      },
    ],
  ),

  // ── Customer credit review ─────────────────────────────────────────────
  t(
    "credit-limit-review",
    "Customer credit review",
    "Credit limits are reviewed against aging and exposure — over-limit customers flagged before they ship.",
    "Customers",
    "~32s run",
    ["ar", "cfo"],
    [
      {
        kind: "think",
        agent: "ar",
        text: "Reviewing credit limits for 28 customers against open balances, aging, and recent payment behavior.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Calculating exposure — D 645,000 outstanding against D 1.4M in approved credit limits.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "ar",
        tool: "ar.creditReview",
        detail:
          "3 customers over limit · 2 near limit · 5 with 45+ day overdue balances",
        ms: 2400,
      },
      {
        kind: "act",
        agent: "ar",
        text: "Flagging the 3 over-limit customers — new orders will be held pending payment or a limit increase.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "ar",
        text: "Credit actions ready — raise 2 limits, hold 1 new order, and send 5 payment reminders.",
        ms: 2600,
        confidence: 87,
      },
      {
        kind: "act",
        agent: "cfo",
        text: "Reviewing the exceptions — the largest exposure is a long-standing customer with a clean 3-year history.",
        ms: 3000,
      },
      {
        kind: "complete",
        agent: "ar",
        text: "Credit review complete — limits updated, holds applied, reminders queued for overdue accounts.",
      },
    ],
  ),

  // ── Tax form collection ────────────────────────────────────────────────
  t(
    "w9-collection",
    "Tax form collection",
    "W-9 and W-8 forms are requested, tracked, and verified so 1099 season never gets held up.",
    "Vendors",
    "~30s run",
    ["compliance", "ap"],
    [
      {
        kind: "think",
        agent: "compliance",
        text: "Reviewing vendor tax-document status ahead of the filing season — 31 vendors, W-9s and W-8s required.",
        ms: 2600,
      },
      {
        kind: "act",
        agent: "compliance",
        text: "Checking which vendors are reportable and which forms are on file, expired, or missing.",
        ms: 3000,
      },
      {
        kind: "tool",
        agent: "compliance",
        tool: "vendors.taxDocStatus",
        detail:
          "22 W-9 on file · 4 missing · 2 expired · 3 foreign W-8BEN required",
        ms: 2200,
      },
      {
        kind: "act",
        agent: "ap",
        text: "Drafting form requests to the 6 vendors with missing or expired documents.",
        ms: 2800,
      },
      {
        kind: "approval",
        agent: "compliance",
        text: "6 form requests ready to send — with a note that payments may pause for new vendors until received.",
        ms: 2600,
        confidence: 92,
      },
      {
        kind: "complete",
        agent: "ap",
        text: "Requests sent — vendor records tagged, 1099 season will have every form in hand.",
      },
    ],
  ),
];

// ─── Lookup ────────────────────────────────────────────────────────────────

const TRACE_INDEX = new Map(AI_UX_TRACES.map((trace) => [trace.id, trace]));

export function getAiUxTrace(id: string): AiUxTrace | undefined {
  return TRACE_INDEX.get(id);
}
