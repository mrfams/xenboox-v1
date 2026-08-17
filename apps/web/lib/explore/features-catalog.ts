// ─── Feature Catalog ────────────────────────────────────────────────────────
//
// The platform's AI-native feature catalog, surfaced on the Explore page.
//
// Status legend (also rendered on the page):
//   shipped — fully implemented and functional today
//   partial — exists, but not fully complete or fully wired across modules
//   planned — on the roadmap; not implemented yet (shown muted/greyed out)
//
// `source` notes the competitive benchmark (QuickBooks, Xero, Digits, Basis,
// Sage, and leading non-accounting AI products) that inspired or validates
// each capability.

export type FeatureStatus = "shipped" | "partial" | "planned";

export type FeatureCategory =
  | "AI Conversation"
  | "Automated Bookkeeping"
  | "Insights & Forecasting"
  | "Payments & Collections"
  | "Tax & Compliance"
  | "Close, Audit & Trust"
  | "Agent Workforce";

export type Feature = {
  id: string;
  name: string;
  category: FeatureCategory;
  description: string;
  status: FeatureStatus;
  /** Where the user finds it in the product, when applicable. */
  href?: string;
  /** Competitive benchmark / inspiration. */
  source?: string;
};

export const FEATURE_CATEGORIES: FeatureCategory[] = [
  "AI Conversation",
  "Automated Bookkeeping",
  "Insights & Forecasting",
  "Payments & Collections",
  "Tax & Compliance",
  "Close, Audit & Trust",
  "Agent Workforce",
];

export const FEATURES: Feature[] = [
  // ── AI Conversation ────────────────────────────────────────────────────
  {
    id: "command-center",
    name: "AI Command Center",
    category: "AI Conversation",
    description:
      "A full conversation with the CFO agent: ask questions, delegate tasks, request changes, and approve or reject agent recommendations — all routed to the right specialist agent.",
    status: "shipped",
    href: "/dashboard/chat",
    source: "Xero JAX · QuickBooks Intuit Assist · Sage Copilot",
  },
  {
    id: "page-copilot",
    name: "Ask Xenboox — page-aware copilot",
    category: "AI Conversation",
    description:
      "Pages built on the module shell carry an 'Ask Xenboox' button. The AI sees exactly the page you're on (filters, metrics, record count) and answers, explains, or tasks itself using live entity-scoped data. Rollout across the remaining module pages is in progress.",
    status: "shipped",
    href: "/dashboard/transactions",
    source: "Xero JAX · Digits Ask · GitHub Copilot (in-context)",
  },
  {
    id: "intent-understanding",
    name: "Natural-language intent understanding",
    category: "AI Conversation",
    description:
      "The pipeline distinguishes questions from instructions, corrections, and approval responses — so 'explain this' and 'change this' are handled differently.",
    status: "shipped",
    href: "/dashboard/chat",
    source: "Digits AGL · Basis",
  },
  {
    id: "explain-the-books",
    name: "Explain the books",
    category: "AI Conversation",
    description:
      '"What\'s driving my profit?", "Why is this variance here?", "Show me overdue invoices" — answered in plain language against live data.',
    status: "shipped",
    href: "/dashboard/chat",
    source: "QuickBooks Intelligence Chat · Brex Intelligent Finance",
  },
  {
    id: "in-app-help",
    name: "In-app help assistant",
    category: "AI Conversation",
    description:
      "Ask 'how do I…' and get guided, product-aware answers instead of digging through help docs.",
    status: "planned",
    source: "Xero JAX in-app help · Sage Search Help with Copilot",
  },
  {
    id: "web-research",
    name: "External market research blended with your data",
    category: "AI Conversation",
    description:
      "Strategic questions like 'what's a healthy runway for my industry?' — combining public information with your own numbers.",
    status: "planned",
    source: "Xero JAX + OpenAI · Glean",
  },

  // ── Automated Bookkeeping ──────────────────────────────────────────────
  {
    id: "bank-sync",
    name: "Bank & mobile money sync",
    category: "Automated Bookkeeping",
    description:
      "Automatic import from connected bank feeds and mobile-money wallets so transactions flow in continuously.",
    status: "shipped",
    href: "/dashboard/banking",
    source: "QuickBooks Bank Feeds · Xero",
  },
  {
    id: "auto-categorization",
    name: "Smart transaction categorization",
    category: "Automated Bookkeeping",
    description:
      "AI suggests categories, accounts, and tax treatments from historical patterns and vendor behavior.",
    status: "shipped",
    href: "/dashboard/transactions",
    source: "QuickBooks Accounting AI · Xero Smart Coding",
  },
  {
    id: "smart-reconciliation",
    name: "Smart reconciliation",
    category: "Automated Bookkeeping",
    description:
      "Auto-match bank lines to bills, invoices, and transfers — with suggestions you approve before posting.",
    status: "shipped",
    href: "/dashboard/reconciliation/center",
    source: "Xero auto-reconciliation · QuickBooks",
  },
  {
    id: "document-capture",
    name: "Document capture, OCR & extraction",
    category: "Automated Bookkeeping",
    description:
      "Upload, snap, or forward receipts and invoices; the document pipeline extracts data into draft entries.",
    status: "shipped",
    href: "/dashboard/documents",
    source: "Xero Hubdoc · QuickBooks Photo-to-Invoice",
  },
  {
    id: "ai-invoice-generation",
    name: "AI invoice generation from documents",
    category: "Automated Bookkeeping",
    description:
      "Turn a photo, PDF, or note into a ready-to-send invoice or bill. Extraction exists; full photo-to-invoice coverage is still rolling out.",
    status: "partial",
    href: "/dashboard/documents",
    source: "QuickBooks AI Invoice Generator · Xero",
  },
  {
    id: "review-signals",
    name: "Auto-posting with review signals",
    category: "Automated Bookkeeping",
    description:
      "Batch high-confidence items for one-click approval with clear confidence cues — green (safe), amber (verify), red (hold).",
    status: "partial",
    href: "/dashboard/review-queue",
    source: "QuickBooks Ready to post · Review Signals",
  },
  {
    id: "bill-po-matching",
    name: "Bill-to-PO matching",
    category: "Automated Bookkeeping",
    description:
      "Automatically match incoming bills against purchase orders and flag price or quantity mismatches.",
    status: "planned",
    source: "Sage AP automation",
  },
  {
    id: "recurring-automation",
    name: "Recurring & scheduled automation",
    category: "Automated Bookkeeping",
    description:
      "Recurring transactions, scheduled payments, and reminder schedules that run without manual setup each time.",
    status: "partial",
    source: "Xero · QuickBooks",
  },

  // ── Insights & Forecasting ─────────────────────────────────────────────
  {
    id: "cashflow-forecast",
    name: "Cash flow forecasting & runway",
    category: "Insights & Forecasting",
    description:
      "Projected cash position, runway in months, and a trajectory sparkline — with alerting when runway crosses critical thresholds.",
    status: "shipped",
    href: "/dashboard",
    source: "Xero 30/60/180-day · QuickBooks Finance AI · Ramp",
  },
  {
    id: "anomaly-detection",
    name: "Anomaly & outlier detection",
    category: "Insights & Forecasting",
    description:
      "Flag unusual transactions, duplicates, and out-of-pattern spend. Basic alerts exist; full ML review is in progress.",
    status: "partial",
    href: "/dashboard/insights",
    source: "Sage GL Outlier Detection · Xero · Brex Audit Agent",
  },
  {
    id: "nl-bi",
    name: "Natural-language BI",
    category: "Insights & Forecasting",
    description:
      "Ask any business question in plain language and get an answer computed from your live ledger — no report-building required.",
    status: "shipped",
    href: "/dashboard/chat",
    source: "QuickBooks · Digits Ask · Brex Intelligent Finance",
  },
  {
    id: "report-narratives",
    name: "AI report narratives",
    category: "Insights & Forecasting",
    description:
      "Auto-written commentary for P&L, balance sheet, and variance — explaining the numbers, not just showing them.",
    status: "partial",
    href: "/dashboard/reports",
    source: "Sage Variance Analysis · Basis",
  },
  {
    id: "scenario-planning",
    name: "Scenario planning / what-if",
    category: "Insights & Forecasting",
    description:
      "Model changes — 'what if churn rises 5%?' or 'what if we hire two more people?' — against cash flow and runway.",
    status: "planned",
    source: "QuickBooks scenario planning · Brex",
  },

  // ── Payments & Collections ─────────────────────────────────────────────
  {
    id: "ai-reminders",
    name: "AI-drafted invoice reminders",
    category: "Payments & Collections",
    description:
      "Personalized overdue reminders drafted from invoice status and customer history.",
    status: "planned",
    source: "QuickBooks Payments AI (gets paid ~5 days faster)",
  },
  {
    id: "collections-agent",
    name: "AR collections agent",
    category: "Payments & Collections",
    description:
      "An agent that chases overdue invoices automatically, tuning tone per customer and escalating stubborn accounts.",
    status: "planned",
    source: "Brex Agents · Intercom Fin",
  },

  // ── Tax & Compliance ───────────────────────────────────────────────────
  {
    id: "tax-rules-engine",
    name: "Self-service tax rules engine",
    category: "Tax & Compliance",
    description:
      "Configure, version, and override taxes for any country or entity — flat, edge, progressive brackets, fixed amounts, conditional rules (incl. non-citizen rates), combined-rate components (state+city), rounding rules, and employer/employee splits. Covers 22 tax families from VAT to inheritance. No dev needed when laws change.",
    status: "shipped",
    href: "/dashboard/settings",
    source: "Beyond QuickBooks/Xero — enterprise-grade configurability",
  },
  {
    id: "statutory-rates",
    name: "Multi-jurisdiction statutory rates",
    category: "Tax & Compliance",
    description:
      "One-click country tax packs (Gambia, Senegal, USA, Nigeria, Kenya, Ghana, UK, South Africa) with built-in payroll statutory rules (PAYE, social security, WHT), per-entity overrides, and live previews.",
    status: "shipped",
    href: "/dashboard/settings",
    source: "Sage · QuickBooks (country packs)",
  },
  {
    id: "deduction-discovery",
    name: "Tax deduction discovery",
    category: "Tax & Compliance",
    description:
      "Continuously scan for missed deductions and tax-saving opportunities aligned to current rules.",
    status: "planned",
    source: "QuickBooks Business Tax AI",
  },
  {
    id: "vat-compliance",
    name: "VAT / sales-tax compliance flags",
    category: "Tax & Compliance",
    description:
      "Flag filing or calculation issues and suggest fixes before they become problems.",
    status: "partial",
    href: "/dashboard/tax-compliance",
    source: "QuickBooks Sales Tax AI",
  },

  // ── Close, Audit & Trust ───────────────────────────────────────────────
  {
    id: "month-end-close",
    name: "Autonomous month-end close",
    category: "Close, Audit & Trust",
    description:
      "An orchestrated close: department agents run their checklists, results aggregate, and you sign off.",
    status: "shipped",
    href: "/dashboard/close",
    source: "Digits Agentic Close · Sage Close Assistant",
  },
  {
    id: "confidence-scoring",
    name: "Confidence-scored agent output",
    category: "Close, Audit & Trust",
    description:
      "Every agent answer carries a 0–1 confidence. Below threshold → escalated to a supervisor or human; never guessed.",
    status: "shipped",
    href: "/dashboard/agent-monitor",
    source: "Basis · Digits (verification layer)",
  },
  {
    id: "human-approvals",
    name: "Human-in-the-loop approvals",
    category: "Close, Audit & Trust",
    description:
      "Low-confidence or high-value agent actions pause in a review queue for approve / reject / request-changes.",
    status: "shipped",
    href: "/dashboard/review-queue",
    source: "Xero JAX Assure · Basis",
  },
  {
    id: "audit-trail",
    name: "Tamper-evident audit trail",
    category: "Close, Audit & Trust",
    description:
      "Hash-chained, verifiable log of every action — who, what, when, why, and confidence. Tiered visibility by role.",
    status: "shipped",
    href: "/dashboard/activity",
    source: "Enterprise accounting standard",
  },
  {
    id: "gl-outlier-detection",
    name: "GL outlier detection",
    category: "Close, Audit & Trust",
    description:
      "ML review of journal entries against historical patterns before approval — flagging unusual accounts, amounts, or pairings.",
    status: "partial",
    href: "/dashboard/journal",
    source: "Sage GL Outlier Detection",
  },
  {
    id: "conflict-detection",
    name: "Agent disagreement detection",
    category: "Close, Audit & Trust",
    description:
      "When two agents return conflicting outputs, the pipeline flags the conflict instead of choosing blindly.",
    status: "shipped",
    source: "Basis · enterprise audit",
  },

  // ── Agent Workforce ────────────────────────────────────────────────────
  {
    id: "agent-workforce",
    name: "Multi-tier agent workforce",
    category: "Agent Workforce",
    description:
      "19 agents in a three-tier hierarchy — CFO agent on top, department heads, and worker agents beneath. Workers never talk to each other; everything flows through management.",
    status: "shipped",
    href: "/dashboard/agents",
    source: "Digits (Bookkeeper/Reconciliation/Review agents) · Basis",
  },
  {
    id: "agent-monitor",
    name: "Agent monitor & activity",
    category: "Agent Workforce",
    description:
      "Live visibility into agent runs — what ran, confidence, cost, and errors, with a full activity trail.",
    status: "shipped",
    href: "/dashboard/agent-monitor",
    source: "Langfuse-style observability",
  },
  {
    id: "proactive-agents",
    name: "Proactive business feed",
    category: "Agent Workforce",
    description:
      "Agents that work in the background and surface pre-drafted work — flagged discrepancies, matched transactions, reminders — ready for your review.",
    status: "partial",
    href: "/dashboard/work",
    source: "QuickBooks Business Feed · Intercom Fin",
  },
  {
    id: "at-mentions",
    name: "@-mention context anchoring",
    category: "Agent Workforce",
    description:
      "Pin a document, transaction, or policy into a chat with '@' so the AI anchors its reasoning to that exact record. Type '@' in the AI Command Center composer to pin documents, transactions, invoices, bills, accounts, customers, or suppliers — every pin is re-resolved entity-scoped before it reaches the agent, and pinned chips persist in message history.",
    status: "shipped",
    href: "/dashboard/chat",
    source: "Notion AI · GitHub Copilot chat",
  },
  {
    id: "diff-confirmations",
    name: "Interactive diff confirmations",
    category: "Agent Workforce",
    description:
      "Approve AI-proposed changes on a before/after diff card — see exactly what would change before it posts. Live in review queues and the journal approval flow.",
    status: "shipped",
    source: "GitHub Copilot · Salesforce Agentforce",
  },
  {
    id: "explainable-outputs",
    name: "Explainable outputs (why lineage)",
    category: "Agent Workforce",
    description:
      "Every recommendation maps back to the rule, historical transaction, or policy behind it. Confidence + audit exist; source lineage UI is in progress.",
    status: "partial",
    href: "/dashboard/activity",
    source: "Xero JAX Assure · Glean",
  },
];

// ─── Ask Xenboox explainer (the task-the-AI feature) ──────────────────────

export const ASK_XENBOOX_EXPLAINER = {
  name: "Ask Xenboox",
  status: "shipped" as FeatureStatus,
  tagline:
    "Ask it, explain it, task it, or change it — from any page, or the Command Center.",
  howItWorks: [
    {
      step: "Open any data page (Transactions, Payroll, Bills…) and click Ask Xenboox — or open the AI Command Center.",
    },
    {
      step: "Ask a question, request an explanation, or give a task — e.g. “summarize what I'm seeing”, “explain this variance”, “categorize these as rent”, “create an invoice for Acme”.",
    },
    {
      step: "The CFO agent classifies your intent (question vs instruction vs correction), routes it to the right specialist agent, and answers with confidence — pausing for your approval when the action is high-value or confidence is low.",
    },
  ],
  surfaces: [
    { label: "AI Command Center", href: "/dashboard/chat" },
    { label: "Ask Xenboox on data pages", href: "/dashboard/transactions" },
  ],
} as const;
