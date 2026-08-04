export type NavPage = {
  label: string;
  href: string;
  group: string;
  keywords: string[];
};

export const NAV_PAGES: NavPage[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    group: "Overview",
    keywords: ["home", "overview", "summary"],
  },
  {
    label: "AI Command Center",
    href: "/dashboard/chat",
    group: "Overview",
    keywords: ["ai", "assistant", "claude", "ask", "chat", "cfo"],
  },
  {
    label: "Money",
    href: "/dashboard/money",
    group: "Overview",
    keywords: ["cash", "finance", "finances", "banking hub"],
  },
  {
    label: "Insights",
    href: "/dashboard/insights",
    group: "Overview",
    keywords: ["analytics", "intelligence", "reports hub", "bi"],
  },
  {
    label: "Inbox",
    href: "/dashboard/inbox",
    group: "Overview",
    keywords: ["notifications", "messages", "approvals", "queue"],
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    group: "Overview",
    keywords: ["inbox", "alerts", "messages"],
  },
  {
    label: "Review Queue",
    href: "/dashboard/review-queue",
    group: "Overview",
    keywords: ["approvals", "pending", "inbox", "review"],
  },
  {
    label: "Transactions",
    href: "/dashboard/transactions",
    group: "Accounting",
    keywords: ["journal entries", "entries", "postings", "ledger"],
  },
  {
    label: "General Ledger",
    href: "/dashboard/journal",
    group: "Accounting",
    keywords: ["journal", "entries", "accounts"],
  },
  {
    label: "Journal Entries",
    href: "/dashboard/journal",
    group: "Accounting",
    keywords: ["general ledger", "ledger", "postings"],
  },
  {
    label: "Chart of Accounts",
    href: "/dashboard/chart-of-accounts",
    group: "Accounting",
    keywords: ["coa", "accounts", "account list", "categories"],
  },
  {
    label: "Trial Balance",
    href: "/dashboard/trial-balance",
    group: "Accounting",
    keywords: ["balance", "equity", "totals"],
  },
  {
    label: "Consolidation",
    href: "/dashboard/consolidation",
    group: "Accounting",
    keywords: ["consolidated", "group", "entities", "rollup"],
  },
  {
    label: "Banking",
    href: "/dashboard/banking",
    group: "Banking & Cash",
    keywords: ["bank", "accounts", "cash"],
  },
  {
    label: "Cash",
    href: "/dashboard/cash",
    group: "Banking & Cash",
    keywords: ["banking", "bank", "balances", "money"],
  },
  {
    label: "Reconciliation",
    href: "/dashboard/reconciliation/center",
    group: "Banking & Cash",
    keywords: ["reconcile", "matching", "bank", "statements"],
  },
  {
    label: "Fixed Assets",
    href: "/dashboard/fixed-assets",
    group: "Banking & Cash",
    keywords: ["assets", "depreciation", "register", "property"],
  },
  {
    label: "Invoicing",
    href: "/dashboard/invoicing",
    group: "Sales",
    keywords: ["invoices", "invoice", "ar", "receivables", "sales"],
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    group: "Sales",
    keywords: ["clients", "ar", "receivables", "aging"],
  },
  {
    label: "Bills",
    href: "/dashboard/bills",
    group: "Purchasing",
    keywords: ["ap", "payables", "vendor bills", "pay"],
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    group: "Purchasing",
    keywords: ["suppliers", "ap", "payables", "aging"],
  },
  {
    label: "Expenses",
    href: "/dashboard/expenses",
    group: "Purchasing",
    keywords: ["spending", "costs", "receipts", "reimburse"],
  },
  {
    label: "Payroll",
    href: "/dashboard/payroll",
    group: "People & Pay",
    keywords: [
      "salary",
      "wages",
      "employees",
      "staff",
      "compensation",
      "payslips",
    ],
  },
  {
    label: "Reports",
    href: "/dashboard/reports",
    group: "Reporting",
    keywords: ["financial statements", "p&l", "balance sheet", "custom"],
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    group: "Reporting",
    keywords: ["files", "attachments", "receipts", "uploads"],
  },
  {
    label: "Close Center",
    href: "/dashboard/close",
    group: "Reporting",
    keywords: ["month-end", "period close", "closing", "checklist"],
  },
  {
    label: "Work",
    href: "/dashboard/work",
    group: "Automation",
    keywords: ["tasks", "jobs", "activity", "queue"],
  },
  {
    label: "Automation",
    href: "/dashboard/automation",
    group: "Automation",
    keywords: ["workflows", "rules", "triggers", "bots"],
  },
  {
    label: "Agents",
    href: "/dashboard/agents",
    group: "Automation",
    keywords: ["ai agents", "autonomous", "bots"],
  },
  {
    label: "Agent Monitor",
    href: "/dashboard/agent-monitor",
    group: "Automation",
    keywords: ["ai", "runs", "status", "monitoring"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    group: "Settings",
    keywords: ["preferences", "profile", "organization", "config"],
  },
];

export function filterNavPages(query: string, limit = 8): NavPage[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);

  const matches = NAV_PAGES.filter((page) => {
    const haystack = `${page.label.toLowerCase()} ${page.group.toLowerCase()} ${page.keywords.join(" ").toLowerCase()}`;
    return tokens.every((token) => haystack.includes(token));
  });

  const ranked = matches.sort((a, b) => {
    const aLabelStarts = a.label.toLowerCase().startsWith(tokens[0]);
    const bLabelStarts = b.label.toLowerCase().startsWith(tokens[0]);
    if (aLabelStarts !== bLabelStarts) return aLabelStarts ? -1 : 1;
    return a.label.length - b.label.length;
  });

  return ranked.slice(0, limit);
}
