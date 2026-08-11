// ─── AI-native UX catalog ──────────────────────────────────────────────────
//
// The product's AI-native experience, catalogued on the Explore → "AI UX" tab.
// Mirrors the Features tab: every entry carries an implementation status
// (shipped / partial / planned) with the same visual treatment.
//
// Entries with a `traceId` are runnable as high-fidelity simulations — the
// agent-workflow playback engine in lib/ai-ux plays the exact experience a
// live LLM agent will provide, so the UX can be evaluated before models ship.

import type { FeatureStatus } from "./features-catalog";

export type AiUxStatus = FeatureStatus;

export type AiUxCategory =
  | "Agent Workflows"
  | "Progress & Thinking"
  | "Conversation & Creation"
  | "Trust & Approval";

export type AiUxEntry = {
  id: string;
  name: string;
  category: AiUxCategory;
  description: string;
  status: AiUxStatus;
  /** Runnable agent-workflow simulation (see lib/ai-ux/traces.ts). */
  traceId?: string;
  /** Product surface where the user experiences this. */
  href?: string;
  /** Competitive benchmark / inspiration. */
  source?: string;
};

export const AI_UX_CATEGORIES: AiUxCategory[] = [
  "Agent Workflows",
  "Progress & Thinking",
  "Conversation & Creation",
  "Trust & Approval",
];

export const AI_UX_ENTRIES: AiUxEntry[] = [
  // ── Agent Workflows ────────────────────────────────────────────────────
  {
    id: "autonomous-close",
    name: "Autonomous month-end close",
    category: "Agent Workflows",
    description:
      "The CFO agent plans the close, department agents run their checklists, the ledger posts, the reporting agent writes the month-end report, and compliance certifies the chain.",
    status: "shipped",
    traceId: "month-end-close",
    href: "/dashboard/close",
    source: "Digits Agentic Close · Sage Close Assistant",
  },
  {
    id: "bank-automatch",
    name: "Bank statement auto-match",
    category: "Agent Workflows",
    description:
      "The document pipeline ingests a statement, the reconciliation agent matches every line to invoices and bills, and only exceptions reach you.",
    status: "shipped",
    traceId: "bank-reconciliation",
    href: "/dashboard/banking",
    source: "Xero auto-reconciliation",
  },
  {
    id: "auto-categorization",
    name: "Smart transaction categorization",
    category: "Agent Workflows",
    description:
      "Every transaction is read, learned from your past coding, and posted at high confidence while anomalies and low-confidence items pause for review.",
    status: "shipped",
    traceId: "transaction-categorization",
    href: "/dashboard/transactions",
    source: "QuickBooks Accounting AI · Xero Smart Coding",
  },
  {
    id: "document-extraction",
    name: "Document capture & extraction",
    category: "Agent Workflows",
    description:
      "Upload a PDF or photo; the document agent OCRs it, resolves the vendor and tax treatment, and drafts a bill — every figure traceable to the source.",
    status: "shipped",
    traceId: "document-extraction",
    href: "/dashboard/documents",
    source: "Xero Hubdoc",
  },
  {
    id: "ai-invoice-generation",
    name: "AI invoice generation",
    category: "Agent Workflows",
    description:
      "An accepted estimate becomes a ready-to-send invoice — lines, terms, and tax treatment carried over and cross-checked before one-click dispatch.",
    status: "partial",
    traceId: "invoice-creation",
    href: "/dashboard/invoicing",
    source: "QuickBooks AI Invoice Generator",
  },
  {
    id: "payroll-automation",
    name: "Payroll run automation",
    category: "Agent Workflows",
    description:
      "Gross pay, statutory deductions, net pay, and payslips computed against the live tax rules engine, verified, and posted in a single run.",
    status: "partial",
    traceId: "payroll-run",
    href: "/dashboard/payroll",
    source: "Sage · QuickBooks Payroll",
  },
  {
    id: "cashflow-forecast",
    name: "Cash flow forecasting",
    category: "Agent Workflows",
    description:
      "The treasury agent models 90-day runway from real AR/AP positions across scenarios and the CFO briefs you on what to do about it.",
    status: "partial",
    traceId: "cashflow-forecast",
    href: "/dashboard",
    source: "Xero 30/60/180-day · Ramp",
  },
  {
    id: "collections-agent",
    name: "AR collections agent",
    category: "Agent Workflows",
    description:
      "Overdue invoices are chased automatically with tone tuned per customer; stubborn accounts escalate to you with full context.",
    status: "planned",
    traceId: "collections-flow",
    href: "/dashboard/customers",
    source: "Brex Agents · Intercom Fin",
  },
  {
    id: "vendor-payments",
    name: "Vendor payment scheduling",
    category: "Agent Workflows",
    description:
      "Payables are ranked by due date and discount window, rescheduled against cash position, and batched for approval — never an overdraft, never a missed discount.",
    status: "planned",
    traceId: "vendor-payments",
    href: "/dashboard/bills",
    source: "Brex · Ramp payables",
  },
  {
    id: "vendor-profile",
    name: "Vendor profile enrichment",
    category: "Agent Workflows",
    description:
      "Vendor records are deduplicated, tax-flagged, and enriched with payment terms — so payables stay clean and 1099-ready.",
    status: "planned",
    traceId: "vendor-profile",
    href: "/dashboard/vendors",
    source: "Xero Contacts · QuickBooks Vendor Center",
  },
  {
    id: "audit-verification",
    name: "Audit chain verification",
    category: "Agent Workflows",
    description:
      "The compliance agent walks the tamper-evident hash chain, verifies every posting traces to an approved source, and certifies the period.",
    status: "shipped",
    traceId: "audit-verification",
    href: "/dashboard/activity",
    source: "Enterprise accounting standard",
  },
  {
    id: "expense-policy-review",
    name: "Expense policy review",
    category: "Agent Workflows",
    description:
      "Every expense is checked against your policy before posting — duplicates, over-limit spend, and missing receipts get flagged with notes.",
    status: "planned",
    traceId: "expense-review",
    href: "/dashboard/expenses",
    source: "Sage · Expensify AI",
  },
  {
    id: "data-migration",
    name: "Historical data migration",
    category: "Agent Workflows",
    description:
      "Years of spreadsheet records become clean, entity-scoped opening balances — unmapped accounts pause for your decision, balances verify to the cent.",
    status: "partial",
    traceId: "data-migration",
    href: "/dashboard/settings",
    source: "Xero conversion service",
  },
  {
    id: "estimate-conversion",
    name: "Estimate conversion & follow-up",
    category: "Agent Workflows",
    description:
      "Accepted quotes become invoices automatically while expiring ones get a final nudge — the sales-to-cash handoff runs itself.",
    status: "partial",
    traceId: "estimate-conversion",
    href: "/dashboard/estimates",
    source: "QuickBooks Estimate → Invoice",
  },
  {
    id: "journal-entry-automation",
    name: "Journal entry automation",
    category: "Agent Workflows",
    description:
      "Describe the adjustment in plain words — the controller structures it and the ledger posts a balanced, audit-traced entry.",
    status: "partial",
    traceId: "journal-entry-automation",
    href: "/dashboard/journal",
    source: "Xero Journal Assistant",
  },
  {
    id: "depreciation-run",
    name: "Monthly depreciation run",
    category: "Agent Workflows",
    description:
      "Depreciation is computed per asset, verified against policy, and posted in one controlled run — fully-depreciated assets flagged.",
    status: "partial",
    traceId: "depreciation-run",
    href: "/dashboard/fixed-assets",
    source: "Sage Fixed Assets",
  },
  {
    id: "chart-of-accounts-review",
    name: "Chart of accounts review",
    category: "Agent Workflows",
    description:
      "The controller reviews account structure, suggests new accounts from real transaction patterns, and flags dormant ones.",
    status: "partial",
    traceId: "chart-of-accounts-review",
    href: "/dashboard/chart-of-accounts",
    source: "QuickBooks COA cleanup",
  },
  {
    id: "tax-filing-prep",
    name: "Tax filing preparation",
    category: "Agent Workflows",
    description:
      "VAT, PAYE, and corporate liabilities are computed from the live tax rules engine and returns are drafted for review.",
    status: "partial",
    traceId: "tax-filing-prep",
    href: "/dashboard/tax-compliance",
    source: "Avalara · Xero Tax",
  },
  {
    id: "ledger-reconciliation",
    name: "Subledger vs ledger reconciliation",
    category: "Agent Workflows",
    description:
      "AR, AP, and cash subledgers are reconciled against the general ledger — every difference traced to its source entry.",
    status: "partial",
    traceId: "ledger-reconciliation",
    href: "/dashboard/reconciliation",
    source: "Dynamics 365 reconciliation",
  },
  {
    id: "report-generation",
    name: "Financial statement generation",
    category: "Agent Workflows",
    description:
      "The reporting agent builds the P&L, balance sheet, and cash flow with variance narratives — CFO-reviewed before publication.",
    status: "partial",
    traceId: "report-generation",
    href: "/dashboard/reports",
    source: "Basis · Sage Intacct reports",
  },
  {
    id: "payroll-filing",
    name: "Statutory payroll filing",
    category: "Agent Workflows",
    description:
      "PAYE, social security, and year-end certificates are prepared from the payroll run — ready to file.",
    status: "partial",
    traceId: "payroll-filing",
    href: "/dashboard/payroll",
    source: "Sage Payroll · QuickBooks Payroll",
  },
  {
    id: "payment-matching",
    name: "Payment matching & application",
    category: "Agent Workflows",
    description:
      "Incoming payments are matched to open invoices — short-payments and overpayments flagged before posting.",
    status: "partial",
    traceId: "payment-matching",
    href: "/dashboard/invoicing",
    source: "Xero payment matching",
  },
  {
    id: "bill-approval",
    name: "Bill approval routing",
    category: "Agent Workflows",
    description:
      "Every bill is checked against purchase orders and routed through the right approval chain before it posts.",
    status: "planned",
    traceId: "bill-approval",
    href: "/dashboard/bills",
    source: "Melio · BILL approvals",
  },
  {
    id: "expense-reimbursement",
    name: "Expense reimbursement run",
    category: "Agent Workflows",
    description:
      "Employee reimbursements are compiled, policy-checked, and batched into a single payment run.",
    status: "planned",
    traceId: "expense-reimbursement",
    href: "/dashboard/expenses",
    source: "Expensify · Ramp reimbursements",
  },
  {
    id: "credit-limit-review",
    name: "Customer credit review",
    category: "Agent Workflows",
    description:
      "Credit limits are reviewed against aging and exposure — over-limit customers flagged before they ship.",
    status: "planned",
    traceId: "credit-limit-review",
    href: "/dashboard/customers",
    source: "Brex credit risk",
  },
  {
    id: "w9-collection",
    name: "Tax form collection",
    category: "Agent Workflows",
    description:
      "W-9 and W-8 forms are requested, tracked, and verified so 1099 season never gets held up.",
    status: "planned",
    traceId: "w9-collection",
    href: "/dashboard/vendors",
    source: "Track1099 · Avalara 1099",
  },

  // ── Progress & Thinking ────────────────────────────────────────────────
  {
    id: "thinking-reveal",
    name: "Thinking reveal",
    category: "Progress & Thinking",
    description:
      "Before an agent acts, it shows its reasoning — a thinking shimmer that settles into the plan it is forming, exactly like ChatGPT's thinking display.",
    status: "shipped",
    source: "ChatGPT thinking · Claude",
  },
  {
    id: "status-vocabulary",
    name: "Progress status vocabulary",
    category: "Progress & Thinking",
    description:
      "Agents narrate work with concrete status verbs — 'Creating June month-end close report…', 'Posting approved adjustments…', 'Verifying the audit chain…' — so you always know what is happening.",
    status: "shipped",
    source: "Cursor · Devin · Conductor",
  },
  {
    id: "tool-traces",
    name: "Tool-call traces",
    category: "Progress & Thinking",
    description:
      "Every tool invocation renders as a mono-type trace with its result — OCR output, match counts, verification results — so agent work is inspectable, not a black box.",
    status: "shipped",
    source: "Claude analysis tool · Devin",
  },
  {
    id: "step-timeline",
    name: "Step-by-step execution timeline",
    category: "Progress & Thinking",
    description:
      "Multi-step work unfolds as a live timeline: which agent, which step, what it found, and what it did next — with progress tracking to completion.",
    status: "shipped",
    source: "Devin task view",
  },
  {
    id: "delegation-view",
    name: "Multi-agent delegation map",
    category: "Progress & Thinking",
    description:
      "The CFO routes work to the right specialist and you see the delegation happen — who was handed what, and why — following the three-tier workforce model.",
    status: "shipped",
    source: "Conductor · Basis workflow trays",
  },

  // ── Conversation & Creation ────────────────────────────────────────────
  {
    id: "streaming-activity",
    name: "Streaming answers with agent activity",
    category: "Conversation & Creation",
    description:
      "The AI Command Center streams answers with live agent-activity blocks — actions, confidence, delegations, and durations as the response builds.",
    status: "shipped",
    href: "/dashboard/chat",
    source: "Xero JAX · ChatGPT",
  },
  {
    id: "page-copilot",
    name: "Page-aware copilot",
    category: "Conversation & Creation",
    description:
      "Ask Xenboox from any data page — the AI sees your filters, metrics, and record count and answers against that exact context.",
    status: "shipped",
    href: "/dashboard/transactions",
    source: "GitHub Copilot (in-context) · Digits Ask",
  },
  {
    id: "row-copilot",
    name: "Row-level AI copilot",
    category: "Conversation & Creation",
    description:
      "Hover any row and ask about that exact record — the copilot focuses on the row you point at, not the whole page.",
    status: "shipped",
    href: "/dashboard/transactions",
    source: "Cursor-style in-context AI",
  },
  {
    id: "artifact-viewer",
    name: "Artifact previews & inline editing",
    category: "Conversation & Creation",
    description:
      "AI-generated reports open in a sandboxed viewer where you can select any passage and ask the AI to redo or change it — versioned, never destructive.",
    status: "shipped",
    href: "/dashboard/documents/artifacts",
    source: "Claude artifacts · ChatGPT Canvas",
  },
  {
    id: "ai-drafts",
    name: "AI-drafted documents",
    category: "Conversation & Creation",
    description:
      "Quotes, invoices, and bills drafted for you from a note, document, or estimate — reviewed by you, not written from scratch.",
    status: "partial",
    href: "/dashboard/estimates",
    source: "QuickBooks AI Invoice Generator",
  },
  {
    id: "simulation-layer",
    name: "Agent UX simulation layer",
    category: "Conversation & Creation",
    description:
      "The full agentic experience is playable today as high-fidelity simulations — run any workflow from this catalog or the module pages and feel exactly how the live agents will behave.",
    status: "shipped",
    traceId: "month-end-close",
    source: "This build — first-hand experience before models ship",
  },

  // ── Trust & Approval ───────────────────────────────────────────────────
  {
    id: "confidence-scoring",
    name: "Confidence-scored agent output",
    category: "Trust & Approval",
    description:
      "Every agent action carries a 0–100 confidence — green for auto-post, amber for review, red for hold. Never a silent guess.",
    status: "shipped",
    href: "/dashboard/agent-monitor",
    source: "Basis · Digits verification layer",
  },
  {
    id: "human-approvals",
    name: "Human-in-the-loop approvals",
    category: "Trust & Approval",
    description:
      "Low-confidence or high-value actions pause in a review queue with the exact proposed entry — approve, reject, or request changes.",
    status: "shipped",
    href: "/dashboard/review-queue",
    source: "Xero JAX Assure · Basis",
  },
  {
    id: "escalation",
    name: "Confidence-based escalation",
    category: "Trust & Approval",
    description:
      "Below 70% confidence an agent escalates to its supervisor; below 40% it escalates to a human. The simulation shows the escalation trail in action.",
    status: "shipped",
    source: "Xenboox agent spec — CONFIDENCE_AND_ESCALATION",
  },
  {
    id: "diff-confirmations",
    name: "Interactive diff confirmations",
    category: "Trust & Approval",
    description:
      "Approve AI-proposed changes on a before/after diff card — see exactly what would change before it posts.",
    status: "planned",
    source: "GitHub Copilot · Salesforce Agentforce",
  },
  {
    id: "explainable-outputs",
    name: "Explainable outputs (why lineage)",
    category: "Trust & Approval",
    description:
      "Every recommendation maps back to the rule, historical transaction, or policy behind it — confidence and audit exist; the source-lineage UI is in progress.",
    status: "partial",
    href: "/dashboard/activity",
    source: "Xero JAX Assure · Glean",
  },
  {
    id: "journal-review",
    name: "Journal review & anomaly flagging",
    category: "Agent Workflows",
    description:
      "Recent postings are audited for duplicates, unbalanced rounding, and skipped approvals — corrections drafted for one-click sign-off.",
    status: "partial",
    traceId: "journal-review",
    href: "/dashboard/journal",
    source: "Xero / QuickBooks audit trails",
  },
  {
    id: "estimate-margin-review",
    name: "Estimate margin & follow-up review",
    category: "Agent Workflows",
    description:
      "Open estimates are checked against real costs — expiring quotes nudged, under-priced ones flagged for re-quote.",
    status: "partial",
    traceId: "estimate-margin-review",
    href: "/dashboard/estimates",
    source: "QuickBooks Estimate → Invoice",
  },
  {
    id: "coa-suggest-accounts",
    name: "Chart of accounts suggestions",
    category: "Agent Workflows",
    description:
      "Transaction patterns reveal where the chart forces awkward postings — new accounts, merges, and renames proposed safely.",
    status: "partial",
    traceId: "coa-suggest-accounts",
    href: "/dashboard/chart-of-accounts",
    source: "Xero Chart of Accounts",
  },
  {
    id: "reconciliation-automatch",
    name: "Reconciliation auto-matching",
    category: "Agent Workflows",
    description:
      "The bank feed is matched against the ledger automatically — only the genuinely unclear lines wait on you.",
    status: "partial",
    traceId: "reconciliation-automatch",
    href: "/dashboard/reconciliation",
    source: "QuickBooks Bank Feeds",
  },
  {
    id: "fixed-assets-health",
    name: "Fixed asset health review",
    category: "Agent Workflows",
    description:
      "The asset register is scanned for fully-depreciated items, disposal candidates, and impairment risk.",
    status: "partial",
    traceId: "fixed-assets-health",
    href: "/dashboard/fixed-assets",
    source: "Sage Fixed Assets",
  },
  {
    id: "tax-compliance-check",
    name: "Tax compliance & deadline check",
    category: "Agent Workflows",
    description:
      "Filings, liabilities, and deadlines are cross-checked across every active jurisdiction before anything is late.",
    status: "partial",
    traceId: "tax-compliance-check",
    href: "/dashboard/tax-compliance",
    source: "Avalara · Basis",
  },
  {
    id: "mobile-money-reconciliation",
    name: "Mobile money reconciliation",
    category: "Agent Workflows",
    description:
      "Wave, MTN MoMo, and Orange Money feeds are normalized, matched to the ledger, and settled in one pass.",
    status: "partial",
    traceId: "mobile-money-reconciliation",
    href: "/dashboard/money",
    source: "Wave · MTN MoMo",
  },
  {
    id: "insight-generation",
    name: "AI-generated business insights",
    category: "Agent Workflows",
    description:
      "The books are scanned for trends and anomalies — a CFO-ready narrative brief comes out the other side.",
    status: "partial",
    traceId: "insight-generation",
    href: "/dashboard/insights",
    source: "QuickBooks Insights",
  },
  {
    id: "automation-suggestion",
    name: "Automation workflow builder",
    category: "Agent Workflows",
    description:
      "Repetitive manual work is observed and turned into a ready-to-enable automation recipe.",
    status: "partial",
    traceId: "automation-suggestion",
    href: "/dashboard/automation",
    source: "Zapier · QuickBooks Automation",
  },
  {
    id: "approval-pre-review",
    name: "Approval pre-review & triage",
    category: "Agent Workflows",
    description:
      "Pending approvals are triaged by the agents first — routine items resolved, policy conflicts escalated to you.",
    status: "partial",
    traceId: "approval-pre-review",
    href: "/dashboard/review-queue",
    source: "Basis · Digits review queues",
  },
  {
    id: "inbox-processing",
    name: "Document inbox processing",
    category: "Agent Workflows",
    description:
      "Every document lands, gets extracted, matched, and linked into the audit trail — the inbox works itself empty.",
    status: "partial",
    traceId: "inbox-processing",
    href: "/dashboard/inbox",
    source: "Dext · AutoEntry",
  },
  {
    id: "agent-health-check",
    name: "Agent workforce diagnostic",
    category: "Agent Workflows",
    description:
      "All 19 agents are surveyed — queue depth, confidence, and escalations — and bottlenecks get remediation.",
    status: "partial",
    traceId: "agent-health-check",
    href: "/dashboard/agent-monitor",
    source: "LangFuse agent monitoring",
  },
  {
    id: "workforce-review",
    name: "Agent workforce overview",
    category: "Agent Workflows",
    description:
      "Today's workforce summary — tasks dispatched, completed, and escalated across all three tiers.",
    status: "partial",
    traceId: "workforce-review",
    href: "/dashboard/agents",
    source: "LangFuse agent monitoring",
  },
  {
    id: "workspace-setup",
    name: "AI workspace setup",
    category: "Agent Workflows",
    description:
      "One run configures a new workspace — entity settings, the country tax pack, roles, and banking — all from Settings.",
    status: "partial",
    traceId: "workspace-setup",
    href: "/dashboard/settings",
    source: "Product onboarding flows",
  },
  {
    id: "ai-workforce-demo",
    name: "How the AI workforce works",
    category: "Agent Workflows",
    description:
      "The three-tier explainer: watch a month-end task travel from the CFO through the department heads down to the Ledger Agent.",
    status: "partial",
    traceId: "ai-workforce-demo",
    href: "/dashboard/help",
    source: "Help-center product tours",
  },
  {
    id: "command-center-demo",
    name: "AI Command Center demo",
    category: "Conversation & Creation",
    description:
      "A live question classified, routed, researched, and answered — exactly what your real streaming answers will look like.",
    status: "partial",
    traceId: "command-center-demo",
    href: "/dashboard/chat",
    source: "Perplexity · ChatGPT reasoning UX",
  },
];

// ─── AI UX explainer (hero banner on the tab) ─────────────────────────────

export const AI_UX_EXPLAINER = {
  name: "The AI-native experience",
  tagline: "Play it before the models arrive.",
  body: "Xenboox is an AI-native platform: 19 agents, three tiers, one ledger. The live LLM agents are the last mile — every interaction they will have is already designed and playable here as high-fidelity simulations. Click Run on any workflow and watch the CFO agent plan, delegate, work, and post — the exact experience the live agents will deliver.",
  surfaces: [
    { label: "Close Center", href: "/dashboard/close" },
    { label: "Transactions", href: "/dashboard/transactions" },
    { label: "AI Command Center", href: "/dashboard/chat" },
  ],
} as const;
