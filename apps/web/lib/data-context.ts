/**
 * data-context.ts — Data type detection, action definitions, and prompt
 * generation for the DataAwareContextMenu.
 *
 * The menu reads `data-ai-context`, `data-record-id`, `data-record-type`,
 * and `data-record-name` attributes from the DOM to build context-aware AI
 * actions. This module contains the pure logic; the React hook and component
 * live in separate files.
 */

// ─── Data Types ───────────────────────────────────────────────────────────

export type DataType =
  | "currency"
  | "date"
  | "status"
  | "percentage"
  | "record-name"
  | "generic";

// ─── Detection ────────────────────────────────────────────────────────────

/** Regex patterns for detecting data types from raw selected text. */
const CURRENCY_RE =
  /(?:GMD|USD|EUR|GBP|NGN|GHS|XOF|KES|₵|\$|€|£)\s*[\d,]+\.?\d{0,2}|[\d,]+\.?\d{0,2}\s*(?:GMD|USD|EUR|GBP|NGN|GHS|XOF|KES)/i;
const PERCENTAGE_RE = /[\d]+\.?\d*\s*%/;
const DATE_RE =
  /\b\d{1,2}[/-\.]\d{1,2}[/-\.]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{1,2},?\s+\d{4}\b|\b\d{4}[/-\.]\d{1,2}[/-\.]\d{1,2}\b|\b(?:overdue|due\s+(?:in|today|tomorrow|this\s+week|next\s+week))\b/i;
const STATUS_RE =
  /\b(?:paid|unpaid|pending|approved|rejected|draft|sent|viewed|overdue|matched|unmatched|excluded|reconciled|unreconciled|active|inactive|closed|open|flagged|processing|completed|failed|cancelled|scheduled)\b/i;

/**
 * Walk up from the target element to find `data-ai-context` and
 * `data-record-*` attributes on the nearest ancestor that has them.
 */
export function extractDataAttributes(target: HTMLElement): {
  context?: string;
  recordId?: string;
  recordType?: string;
  recordName?: string;
} {
  let el: HTMLElement | null = target;
  // Walk up at most 8 levels — data attributes live on the cell or row, not
  // the entire document root.
  for (let i = 0; i < 8 && el; i++) {
    const ctx = el.getAttribute("data-ai-context");
    if (ctx) {
      return {
        context: ctx,
        recordId: el.getAttribute("data-record-id") ?? undefined,
        recordType: el.getAttribute("data-record-type") ?? undefined,
        recordName: el.getAttribute("data-record-name") ?? undefined,
      };
    }
    el = el.parentElement;
  }
  return {};
}

/**
 * Detect the data type from the selected text and optional DOM context.
 * DOM context (data-ai-context attribute) takes priority over regex
 * heuristics because it's authoritative.
 */
export function detectDataType(text: string, domContext?: string): DataType {
  if (domContext === "currency") return "currency";
  if (domContext === "date") return "date";
  if (domContext === "status") return "status";
  if (domContext === "percentage") return "percentage";
  if (domContext === "record-name") return "record-name";

  // Fallback to regex heuristics on the raw text.
  if (CURRENCY_RE.test(text)) return "currency";
  if (PERCENTAGE_RE.test(text)) return "percentage";
  if (DATE_RE.test(text)) return "date";
  if (STATUS_RE.test(text)) return "status";

  return "generic";
}

// ─── Route → Page Name Mapping ────────────────────────────────────────────

const ROUTE_PAGE: Record<string, string> = {
  "/dashboard/payroll": "payroll",
  "/dashboard/invoicing": "invoicing",
  "/dashboard/transactions": "transactions",
  "/dashboard/bills": "bills",
  "/dashboard/expenses": "expenses",
  "/dashboard/reports": "reports",
  "/dashboard/journal": "journal",
  "/dashboard/banking": "banking",
  "/dashboard/reconciliation": "reconciliation",
  "/dashboard/reconciliation/center": "reconciliation",
  "/dashboard/customers": "customers",
  "/dashboard/vendors": "vendors",
  "/dashboard/tax-compliance": "tax-compliance",
  "/dashboard/close": "close",
};

export function getPageFromRoute(pathname: string): string | null {
  // Exact match first.
  if (ROUTE_PAGE[pathname]) return ROUTE_PAGE[pathname];
  // Prefix match for nested routes.
  for (const [route, page] of Object.entries(ROUTE_PAGE)) {
    if (pathname.startsWith(route)) return page;
  }
  return null;
}

// ─── Actions ──────────────────────────────────────────────────────────────

export type ContextAction = {
  id: string;
  label: string;
  icon: string; // Lucide icon name — resolved at render time
  color: string;
  prompt: string;
};

/**
 * Build the list of context-aware actions for a given data type, selected
 * text, and page context. Actions are ordered by relevance — most useful
 * first.
 */
export function buildActions(
  dataType: DataType,
  selectedText: string,
  page: string | null,
  record?: { id?: string; type?: string; name?: string },
): ContextAction[] {
  const actions: ContextAction[] = [];

  // ── Universal: Ask AI ────────────────────────────────────────────────
  actions.push({
    id: "ask",
    label: "Ask Xenboox",
    icon: "Bot",
    color: "text-primary",
    prompt: buildAskPrompt(dataType, selectedText, page, record),
  });

  // ── Data-type specific actions ───────────────────────────────────────
  switch (dataType) {
    case "currency":
      actions.push({
        id: "explain-amount",
        label: "Explain this amount",
        icon: "HelpCircle",
        color: "text-purple-500",
        prompt: `Explain this amount: ${selectedText}. What does it represent, how was it calculated, and is it within expected range?`,
      });
      actions.push({
        id: "compare-budget",
        label: "Compare to budget",
        icon: "BarChart3",
        color: "text-blue-500",
        prompt: `Compare ${selectedText} against the budget for this period. Are we over or under? What's the variance?`,
      });
      actions.push({
        id: "flag-anomaly",
        label: "Flag anomaly",
        icon: "Flag",
        color: "text-amber-500",
        prompt: `Review ${selectedText} for anomalies. Compare against historical data and flag anything unusual or concerning.`,
      });
      break;

    case "date":
      actions.push({
        id: "explain-deadline",
        label: "When is this due?",
        icon: "Calendar",
        color: "text-blue-500",
        prompt: `What's the deadline for ${selectedText}? Is it approaching? What actions are needed before then?`,
      });
      break;

    case "status":
      actions.push({
        id: "explain-status",
        label: "Why this status?",
        icon: "HelpCircle",
        color: "text-purple-500",
        prompt: `Why is this in "${selectedText}" status? What led to this state and what happens next?`,
      });
      actions.push({
        id: "what-changed",
        label: "What changed?",
        icon: "RefreshCw",
        color: "text-emerald-500",
        prompt: `What changed recently for this item that resulted in "${selectedText}" status? Show the history.`,
      });
      break;

    case "percentage":
      actions.push({
        id: "explain-calc",
        label: "How is this calculated?",
        icon: "Calculator",
        color: "text-purple-500",
        prompt: `How is ${selectedText} calculated? Show the formula and the underlying numbers.`,
      });
      break;

    case "record-name":
      actions.push({
        id: "show-history",
        label: "Show history",
        icon: "Clock",
        color: "text-blue-500",
        prompt: `Show the recent history and activity for ${selectedText}. What's changed and what's pending?`,
      });
      break;

    case "generic":
    default:
      // Only Ask AI for generic selections — no filler actions.
      break;
  }

  // ── Page-specific overrides ──────────────────────────────────────────
  const pageActions = getPageActions(page, selectedText, dataType);
  actions.push(...pageActions);

  // ── Always: Copy ─────────────────────────────────────────────────────
  actions.push({
    id: "copy",
    label: "Copy",
    icon: "Copy",
    color: "text-muted-foreground",
    prompt: "", // handled locally, not sent to AI
  });

  return actions;
}

/**
 * Page-specific actions that supplement (not replace) the data-type actions.
 * These are appended after the data-type actions.
 */
function getPageActions(
  page: string | null,
  selectedText: string,
  dataType: DataType,
): ContextAction[] {
  const actions: ContextAction[] = [];

  switch (page) {
    case "payroll":
      if (dataType === "currency") {
        actions.push({
          id: "explain-deductions",
          label: "Explain deductions",
          icon: "Receipt",
          color: "text-amber-500",
          prompt: `Break down the deductions for ${selectedText}. What are each deduction components, are they compliant, and is anything unusual?`,
        });
        actions.push({
          id: "pay-breakdown",
          label: "Show pay breakdown",
          icon: "Calculator",
          color: "text-emerald-500",
          prompt: `Show the full pay breakdown that results in ${selectedText}. Base pay, allowances, deductions, and net — itemize everything.`,
        });
      }
      break;

    case "invoicing":
      if (dataType === "currency") {
        actions.push({
          id: "explain-charges",
          label: "Explain charges",
          icon: "FileText",
          color: "text-purple-500",
          prompt: `Explain the charges that make up ${selectedText}. What line items, quantities, and rates produce this total?`,
        });
        actions.push({
          id: "send-reminder",
          label: "Send payment reminder",
          icon: "Send",
          color: "text-blue-500",
          prompt: `Draft a payment reminder for this invoice totaling ${selectedText}. Professional tone, include due date and payment details.`,
        });
      }
      break;

    case "transactions":
      if (dataType === "currency") {
        actions.push({
          id: "explain-category",
          label: "Why this category?",
          icon: "Tag",
          color: "text-amber-500",
          prompt: `Why was this transaction of ${selectedText} categorized this way? Is the categorization correct?`,
        });
        actions.push({
          id: "audit-trail",
          label: "Show audit trail",
          icon: "ScrollText",
          color: "text-blue-500",
          prompt: `Show the complete audit trail for this transaction of ${selectedText}. Who created it, when, and what changes were made?`,
        });
      }
      break;

    case "bills":
      if (dataType === "currency") {
        actions.push({
          id: "schedule-payment",
          label: "Schedule payment",
          icon: "CalendarClock",
          color: "text-blue-500",
          prompt: `Help me schedule payment for this bill of ${selectedText}. When is it due, what's the optimal payment date, and do we have sufficient funds?`,
        });
      }
      break;

    case "expenses":
      if (dataType === "currency") {
        actions.push({
          id: "explain-flag",
          label: "Why flagged?",
          icon: "AlertTriangle",
          color: "text-amber-500",
          prompt: `Why was this expense of ${selectedText} flagged? What rule or threshold triggered the flag?`,
        });
        actions.push({
          id: "policy-check",
          label: "Compare to policy",
          icon: "ShieldCheck",
          color: "text-emerald-500",
          prompt: `Check this expense of ${selectedText} against company policy. Does it comply with spending limits and approval requirements?`,
        });
      }
      break;

    case "reports":
      if (dataType === "currency" || dataType === "percentage") {
        actions.push({
          id: "explain-calculation",
          label: "How is this calculated?",
          icon: "Calculator",
          color: "text-purple-500",
          prompt: `How is ${selectedText} calculated? Show the formula, underlying accounts, and any adjustments.`,
        });
        actions.push({
          id: "compare-period",
          label: "Compare to last period",
          icon: "TrendingUp",
          color: "text-blue-500",
          prompt: `Compare ${selectedText} to the previous period. What changed and why?`,
        });
      }
      break;

    case "journal":
      if (dataType === "currency") {
        actions.push({
          id: "explain-entry",
          label: "Explain this entry",
          icon: "BookOpen",
          color: "text-purple-500",
          prompt: `Explain this journal entry involving ${selectedText}. What's the business purpose, which accounts are affected, and is the double-entry balanced?`,
        });
      }
      break;

    case "banking":
      if (dataType === "currency") {
        actions.push({
          id: "explain-balance",
          label: "Explain this balance",
          icon: "Wallet",
          color: "text-purple-500",
          prompt: `Explain this balance of ${selectedText}. What's the breakdown of recent activity that led to this figure?`,
        });
      }
      break;

    case "reconciliation":
      if (dataType === "currency") {
        actions.push({
          id: "explain-discrepancy",
          label: "Explain discrepancy",
          icon: "AlertTriangle",
          color: "text-amber-500",
          prompt: `Explain the discrepancy of ${selectedText}. What transactions don't match and why?`,
        });
      }
      break;

    case "customers":
      if (dataType === "currency") {
        actions.push({
          id: "payment-history",
          label: "Show payment history",
          icon: "History",
          color: "text-blue-500",
          prompt: `Show the payment history for this customer balance of ${selectedText}. When did they last pay, and what's the aging breakdown?`,
        });
      }
      break;

    case "vendors":
      if (dataType === "currency") {
        actions.push({
          id: "payment-schedule",
          label: "Show payment schedule",
          icon: "CalendarClock",
          color: "text-blue-500",
          prompt: `Show the payment schedule for this vendor amount of ${selectedText}. What's owed, when is it due, and what's the priority?`,
        });
      }
      break;

    case "tax-compliance":
      if (dataType === "currency") {
        actions.push({
          id: "explain-tax",
          label: "Explain this tax",
          icon: "Landmark",
          color: "text-purple-500",
          prompt: `Explain this tax amount of ${selectedText}. What's the rate, the base, and how was it calculated?`,
        });
      }
      break;

    default:
      break;
  }

  return actions;
}

// ─── Prompt Builders ──────────────────────────────────────────────────────

function buildAskPrompt(
  dataType: DataType,
  selectedText: string,
  page: string | null,
  record?: { id?: string; type?: string; name?: string },
): string {
  const parts: string[] = [];

  if (record?.name) {
    parts.push(`About ${record.type ?? "this record"} "${record.name}"`);
  }

  switch (dataType) {
    case "currency":
      parts.push(
        `Explain this amount: ${selectedText}. What it represents, how it was calculated, and whether it's within expected range.`,
      );
      break;
    case "date":
      parts.push(
        `What's the significance of ${selectedText}? Is there a deadline approaching and what actions are needed?`,
      );
      break;
    case "status":
      parts.push(
        `What does "${selectedText}" status mean here? What led to this and what happens next?`,
      );
      break;
    case "percentage":
      parts.push(
        `How is ${selectedText} calculated? Is this good or bad compared to benchmarks?`,
      );
      break;
    case "record-name":
      parts.push(
        `Tell me about ${selectedText}. Recent activity, current status, and any pending items.`,
      );
      break;
    default:
      parts.push(`Help me understand: ${selectedText}`);
  }

  if (page) {
    parts.push(`(Context: ${page} page)`);
  }

  return parts.join(" ");
}
