export const MODULE_TABS = {
  overview: [
    { label: "Command Center", href: "/dashboard" },
    { label: "Activity Hub", href: "/dashboard/activity-hub" },
    { label: "Financial Pulse", href: "/dashboard/financial-pulse" },
    { label: "Ledger", href: "/dashboard/ledger" },
    { label: "Operations", href: "/dashboard/operations" },
  ],
  settings: [
    { label: "Settings", href: "/dashboard/settings" },
    { label: "Help & Support", href: "/dashboard/help" },
  ],
} as const;
