// ─── Role-Based UI Configuration ────────────────────────────────────────────
//
// Maps each user role to its UI behavior: which surfaces are visible,
// which page is the default landing, what the welcome widget shows,
// and which onboarding steps apply.
//
// This is CLIENT-SIDE ONLY — the server enforces access via requireRole().
// This config controls what the user SEES, not what they CAN DO.

import type { NavKey } from "@/lib/hooks/use-attention-signals";

// ─── Types ──────────────────────────────────────────────────────────────────

export type UserRole =
  | "owner"
  | "admin"
  | "finance_director"
  | "accountant"
  | "external_accountant"
  | "external_auditor"
  | "payroll_officer"
  | "cashier"
  | "department_manager"
  | "employee"
  | "donor";

export type SurfaceVisibility = "full" | "readonly" | "hidden";

export type WelcomeMetric = {
  label: string;
  value: string;
  icon?: string;
  color?: "default" | "success" | "warning" | "danger";
};

export type QuickAction = {
  label: string;
  href: string;
  icon: string;
  description?: string;
};

export type OnboardingStepId =
  | "welcome"
  | "entity"
  | "chart-of-accounts"
  | "bank-connection"
  | "aha-moment"
  | "team"
  | "ai-preferences"
  | "role-intro"
  | "complete";

export type RoleConfig = {
  /** Human-readable role name */
  displayName: string;
  /** Short description of what this role does */
  description: string;
  /** Which surfaces are visible and at what access level */
  surfaces: Record<NavKey, SurfaceVisibility>;
  /** Default landing page after login */
  defaultLanding: string;
  /** Welcome widget headline */
  welcomeHeadline: string;
  /** Welcome widget subtitle */
  welcomeSubtitle: string;
  /** Quick actions shown on the welcome screen */
  quickActions: QuickAction[];
  /** Onboarding steps for this role (in order) */
  onboardingSteps: OnboardingStepId[];
  /** Whether this role can access settings */
  canAccessSettings: boolean;
  /** Whether this role can access admin */
  canAccessAdmin: boolean;
  /** Whether this role sees the AI chat */
  showAiChat: boolean;
  /** Whether this role sees the create buttons */
  showCreateButtons: boolean;
};

// ─── Role Configurations ────────────────────────────────────────────────────

const FULL_SURFACES: Record<NavKey, SurfaceVisibility> = {
  "command-center": "full",
  "activity-hub": "full",
  "financial-pulse": "full",
  ledger: "full",
  operations: "full",
};

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  // ── Owner ──────────────────────────────────────────────────────────────
  owner: {
    displayName: "Owner",
    description: "Full access to everything. Manages the organization.",
    surfaces: FULL_SURFACES,
    defaultLanding: "/dashboard",
    welcomeHeadline: "Welcome back. Here's your business at a glance.",
    welcomeSubtitle: "",
    quickActions: [
      {
        label: "Create Invoice",
        href: "/dashboard/operations",
        icon: "file-text",
        description: "Bill your customers",
      },
      {
        label: "Connect Bank",
        href: "/dashboard/operations",
        icon: "landmark",
        description: "Sync transactions automatically",
      },
      {
        label: "Invite Team",
        href: "/dashboard/settings",
        icon: "users",
        description: "Collaborate with your team",
      },
      {
        label: "View Reports",
        href: "/dashboard/financial-pulse",
        icon: "bar-chart-3",
        description: "Financial insights & forecasts",
      },
    ],
    onboardingSteps: [
      "welcome",
      "entity",
      "chart-of-accounts",
      "bank-connection",
      "aha-moment",
      "team",
      "ai-preferences",
      "complete",
    ],
    canAccessSettings: true,
    canAccessAdmin: true,
    showAiChat: true,
    showCreateButtons: true,
  },

  // ── Admin ──────────────────────────────────────────────────────────────
  admin: {
    displayName: "Admin",
    description: "Full access. Manages users and settings.",
    surfaces: FULL_SURFACES,
    defaultLanding: "/dashboard",
    welcomeHeadline: "Welcome back. Here's your business at a glance.",
    welcomeSubtitle: "",
    quickActions: [
      {
        label: "Create Invoice",
        href: "/dashboard/operations",
        icon: "file-text",
        description: "Bill your customers",
      },
      {
        label: "Connect Bank",
        href: "/dashboard/operations",
        icon: "landmark",
        description: "Sync transactions automatically",
      },
      {
        label: "Invite Team",
        href: "/dashboard/settings",
        icon: "users",
        description: "Collaborate with your team",
      },
      {
        label: "View Reports",
        href: "/dashboard/financial-pulse",
        icon: "bar-chart-3",
        description: "Financial insights & forecasts",
      },
    ],
    onboardingSteps: [
      "welcome",
      "entity",
      "chart-of-accounts",
      "bank-connection",
      "aha-moment",
      "team",
      "ai-preferences",
      "complete",
    ],
    canAccessSettings: true,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: true,
  },

  // ── Finance Director ───────────────────────────────────────────────────
  finance_director: {
    displayName: "Finance Director",
    description: "Views financials and approves transactions.",
    surfaces: {
      "command-center": "full",
      "activity-hub": "full",
      "financial-pulse": "full",
      ledger: "full",
      operations: "full",
    },
    defaultLanding: "/dashboard/financial-pulse",
    welcomeHeadline: "Good morning. Here's your financial overview.",
    welcomeSubtitle: "Approvals and insights at your fingertips.",
    quickActions: [
      {
        label: "Review Approvals",
        href: "/dashboard/activity-hub",
        icon: "check-circle",
        description: "Items awaiting your approval",
      },
      {
        label: "Financial Pulse",
        href: "/dashboard/financial-pulse",
        icon: "bar-chart-3",
        description: "AI-narrated financial health",
      },
      {
        label: "View Ledger",
        href: "/dashboard/ledger",
        icon: "book-open",
        description: "Journal entries and trial balance",
      },
      {
        label: "Run Report",
        href: "/dashboard/financial-pulse",
        icon: "file-text",
        description: "Generate financial statements",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "chart-of-accounts", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: false,
  },

  // ── Accountant ─────────────────────────────────────────────────────────
  accountant: {
    displayName: "Accountant",
    description: "Full accounting access. Manages books and transactions.",
    surfaces: {
      "command-center": "full",
      "activity-hub": "full",
      "financial-pulse": "readonly",
      ledger: "full",
      operations: "full",
    },
    defaultLanding: "/dashboard/ledger",
    welcomeHeadline: "Good morning. Your books are ready.",
    welcomeSubtitle: "Transactions, journal entries, and reconciliations.",
    quickActions: [
      {
        label: "Journal Entry",
        href: "/dashboard/ledger",
        icon: "book-open",
        description: "Record a journal entry",
      },
      {
        label: "Reconcile",
        href: "/dashboard/operations",
        icon: "check-circle",
        description: "Match bank transactions",
      },
      {
        label: "Create Invoice",
        href: "/dashboard/operations",
        icon: "file-text",
        description: "Bill your customers",
      },
      {
        label: "Run Report",
        href: "/dashboard/financial-pulse",
        icon: "bar-chart-3",
        description: "Generate financial statements",
      },
    ],
    onboardingSteps: [
      "welcome",
      "chart-of-accounts",
      "bank-connection",
      "aha-moment",
      "complete",
    ],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: true,
  },

  // ── External Accountant ────────────────────────────────────────────────
  external_accountant: {
    displayName: "External Accountant",
    description: "Broad access. Cannot delete or manage users.",
    surfaces: {
      "command-center": "full",
      "activity-hub": "full",
      "financial-pulse": "readonly",
      ledger: "full",
      operations: "full",
    },
    defaultLanding: "/dashboard/ledger",
    welcomeHeadline: "Welcome. You have full accounting access.",
    welcomeSubtitle: "Read and create, but cannot delete or manage users.",
    quickActions: [
      {
        label: "Journal Entry",
        href: "/dashboard/ledger",
        icon: "book-open",
        description: "Record a journal entry",
      },
      {
        label: "Reconcile",
        href: "/dashboard/operations",
        icon: "check-circle",
        description: "Match bank transactions",
      },
      {
        label: "View Reports",
        href: "/dashboard/financial-pulse",
        icon: "bar-chart-3",
        description: "Financial statements",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: true,
  },

  // ── External Auditor ───────────────────────────────────────────────────
  external_auditor: {
    displayName: "External Auditor",
    description: "Read-only access. Can view and export data.",
    surfaces: {
      "command-center": "readonly",
      "activity-hub": "readonly",
      "financial-pulse": "readonly",
      ledger: "readonly",
      operations: "readonly",
    },
    defaultLanding: "/dashboard/ledger",
    welcomeHeadline: "Welcome. You have read-only access.",
    welcomeSubtitle: "View and export data. Cannot make changes.",
    quickActions: [
      {
        label: "View Ledger",
        href: "/dashboard/ledger",
        icon: "book-open",
        description: "Journal entries and trial balance",
      },
      {
        label: "Audit Trail",
        href: "/dashboard/audit-trail",
        icon: "shield",
        description: "Complete action history",
      },
      {
        label: "Export Report",
        href: "/dashboard/financial-pulse",
        icon: "download",
        description: "Download financial statements",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: false,
  },

  // ── Payroll Officer ────────────────────────────────────────────────────
  payroll_officer: {
    displayName: "Payroll Officer",
    description: "Manages payroll, employees, and payslips.",
    surfaces: {
      "command-center": "hidden",
      "activity-hub": "full",
      "financial-pulse": "hidden",
      ledger: "readonly",
      operations: "full",
    },
    defaultLanding: "/dashboard/operations",
    welcomeHeadline: "Hi. Payroll is ready for the next run.",
    welcomeSubtitle: "Manage employees, contracts, and payslips.",
    quickActions: [
      {
        label: "Run Payroll",
        href: "/dashboard/operations",
        icon: "dollar-sign",
        description: "Process payroll for this period",
      },
      {
        label: "View Employees",
        href: "/dashboard/operations",
        icon: "users",
        description: "Employee directory and contracts",
      },
      {
        label: "Payslips",
        href: "/dashboard/operations",
        icon: "file-text",
        description: "Generate and send payslips",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: true,
  },

  // ── Cashier ────────────────────────────────────────────────────────────
  cashier: {
    displayName: "Cashier",
    description: "Manages cash and mobile money transactions.",
    surfaces: {
      "command-center": "hidden",
      "activity-hub": "full",
      "financial-pulse": "hidden",
      ledger: "hidden",
      operations: "full",
    },
    defaultLanding: "/dashboard/operations",
    welcomeHeadline: "Hi. Your cash drawer is ready.",
    welcomeSubtitle: "Record cash and mobile money transactions.",
    quickActions: [
      {
        label: "Record Transaction",
        href: "/dashboard/operations",
        icon: "dollar-sign",
        description: "Log a cash or mobile money transaction",
      },
      {
        label: "View Cash Position",
        href: "/dashboard/operations",
        icon: "wallet",
        description: "Current cash and mobile money balances",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: true,
  },

  // ── Department Manager ─────────────────────────────────────────────────
  department_manager: {
    displayName: "Department Manager",
    description: "Manages department expenses, approvals, and budget.",
    surfaces: {
      "command-center": "full",
      "activity-hub": "full",
      "financial-pulse": "readonly",
      ledger: "hidden",
      operations: "full",
    },
    defaultLanding: "/dashboard/activity-hub",
    welcomeHeadline: "Good morning. Here's what needs your attention.",
    welcomeSubtitle: "Approvals, expenses, and department budget.",
    quickActions: [
      {
        label: "Review Approvals",
        href: "/dashboard/activity-hub",
        icon: "check-circle",
        description: "Pending approvals from your team",
      },
      {
        label: "Submit Expense",
        href: "/dashboard/operations",
        icon: "receipt",
        description: "Log a department expense",
      },
      {
        label: "Budget Overview",
        href: "/dashboard/financial-pulse",
        icon: "bar-chart-3",
        description: "Department budget vs actual",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: false,
  },

  // ── Employee ───────────────────────────────────────────────────────────
  employee: {
    displayName: "Employee",
    description: "Self-scoped. Submits expenses and views payslips.",
    surfaces: {
      "command-center": "hidden",
      "activity-hub": "full",
      "financial-pulse": "hidden",
      ledger: "hidden",
      operations: "hidden",
    },
    defaultLanding: "/dashboard/activity-hub",
    welcomeHeadline: "Hi. Here's your employee dashboard.",
    welcomeSubtitle: "Submit expenses, view payslips, manage documents.",
    quickActions: [
      {
        label: "Submit Expense",
        href: "/dashboard/activity-hub",
        icon: "receipt",
        description: "Log an expense claim",
      },
      {
        label: "View Payslip",
        href: "/dashboard/activity-hub",
        icon: "file-text",
        description: "Download your payslip",
      },
      {
        label: "Documents",
        href: "/dashboard/activity-hub",
        icon: "folder",
        description: "Upload and view documents",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: false,
  },

  // ── Donor ──────────────────────────────────────────────────────────────
  donor: {
    displayName: "Donor",
    description: "Project-scoped. Views reports and grant utilization.",
    surfaces: {
      "command-center": "hidden",
      "activity-hub": "hidden",
      "financial-pulse": "readonly",
      ledger: "hidden",
      operations: "readonly",
    },
    defaultLanding: "/dashboard/financial-pulse",
    welcomeHeadline: "Welcome back. Here's your project's financial health.",
    welcomeSubtitle: "Grant utilization, budget tracking, and reports.",
    quickActions: [
      {
        label: "View Report",
        href: "/dashboard/financial-pulse",
        icon: "bar-chart-3",
        description: "Financial statements and grant report",
      },
      {
        label: "Budget vs Actual",
        href: "/dashboard/financial-pulse",
        icon: "pie-chart",
        description: "Budget utilization by category",
      },
      {
        label: "Download Statement",
        href: "/dashboard/financial-pulse",
        icon: "download",
        description: "Export financial data",
      },
    ],
    onboardingSteps: ["welcome", "role-intro", "complete"],
    canAccessSettings: false,
    canAccessAdmin: false,
    showAiChat: true,
    showCreateButtons: false,
  },
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the UI configuration for a given role.
 * Falls back to owner config if role is unknown (fail-open for UI only —
 * server still enforces real permissions).
 */
export function getRoleConfig(role: string | null): RoleConfig {
  if (!role || !(role in ROLE_CONFIGS)) {
    return ROLE_CONFIGS.owner;
  }
  return ROLE_CONFIGS[role as UserRole];
}

/**
 * Check if a surface is visible for the given role.
 */
export function isSurfaceVisible(
  role: string | null,
  surface: NavKey,
): boolean {
  const config = getRoleConfig(role);
  return config.surfaces[surface] !== "hidden";
}

/**
 * Check if a surface is read-only for the given role.
 */
export function isSurfaceReadonly(
  role: string | null,
  surface: NavKey,
): boolean {
  const config = getRoleConfig(role);
  return config.surfaces[surface] === "readonly";
}

/**
 * Get the default landing page for a given role.
 */
export function getDefaultLanding(role: string | null): string {
  return getRoleConfig(role).defaultLanding;
}

/**
 * Get visible surfaces for sidebar rendering.
 */
export function getVisibleSurfaces(
  role: string | null,
): Array<{ key: NavKey; label: string; visibility: SurfaceVisibility }> {
  const config = getRoleConfig(role);
  const labels: Record<NavKey, string> = {
    "command-center": "Command Center",
    "activity-hub": "Activity Hub",
    "financial-pulse": "Financial Pulse",
    ledger: "Ledger",
    operations: "Operations",
  };

  return (Object.keys(config.surfaces) as NavKey[])
    .filter((key) => config.surfaces[key] !== "hidden")
    .map((key) => ({
      key,
      label: labels[key],
      visibility: config.surfaces[key],
    }));
}
