export type NavPage = {
  label: string;
  href: string;
  group: string;
  keywords: string[];
};

export const NAV_PAGES: NavPage[] = [
  {
    label: "Command Center",
    href: "/dashboard",
    group: "Surfaces",
    keywords: ["ai", "assistant", "chat", "cfo", "home", "overview"],
  },
  {
    label: "Activity Hub",
    href: "/dashboard/activity-hub",
    group: "Surfaces",
    keywords: ["approvals", "notifications", "alerts", "queue", "pending"],
  },
  {
    label: "Financial Pulse",
    href: "/dashboard/financial-pulse",
    group: "Surfaces",
    keywords: ["reports", "kpis", "narrative", "health", "analytics"],
  },
  {
    label: "Ledger",
    href: "/dashboard/ledger",
    group: "Surfaces",
    keywords: ["journal", "entries", "accounts", "trial balance", "coa"],
  },
  {
    label: "Operations",
    href: "/dashboard/operations",
    group: "Surfaces",
    keywords: ["money", "cash", "banking", "flow", "invoicing", "bills"],
  },
  {
    label: "Audit Trail",
    href: "/dashboard/audit-trail",
    group: "Surfaces",
    keywords: ["audit", "log", "history", "compliance"],
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    group: "Settings",
    keywords: ["preferences", "profile", "organization", "config"],
  },
  {
    label: "Help & Support",
    href: "/dashboard/help",
    group: "Settings",
    keywords: ["help", "support", "faq", "guide", "documentation"],
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
