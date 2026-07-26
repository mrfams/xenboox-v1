import { db } from "../index";
import { rolePermissions } from "../schema/permissions";

/**
 * Seed the RBAC Matrix from XENBOOX_RBAC_MATRIX.md
 *
 * Every role × module × action mapping is seeded here.
 * The matrix defines 10 roles × 15+ modules × 8 actions = ~1200 entries,
 * but most are "none" — we only seed the non-"none" entries for efficiency.
 *
 * Scope values:
 *   "full"  = ✅ — full access
 *   "scoped" = 🟡 — conditional/scoped access
 *   "none"  = ⛔ — no access (default, not inserted)
 */

// Enum union types derived from the Drizzle schema enums for type safety
// These must match the values in rbacModuleEnum, rbacActionEnum, rbacScopeEnum, and entityRoleEnum
type RbacRole =
  | "owner"
  | "admin"
  | "finance_director"
  | "accountant"
  | "payroll_officer"
  | "cashier"
  | "department_manager"
  | "employee"
  | "external_auditor"
  | "external_accountant"
  | "donor";

type RbacModule =
  | "general_ledger"
  | "chart_of_accounts"
  | "bank_reconciliation"
  | "mobile_money"
  | "accounts_payable"
  | "accounts_receivable"
  | "cash_imprest"
  | "payroll"
  | "invoicing"
  | "expense_management"
  | "fixed_assets"
  | "inventory"
  | "budgeting"
  | "financial_reporting"
  | "tax_compliance"
  | "audit_preparation"
  | "donor_grant_reporting"
  | "multi_entity"
  | "multi_currency"
  | "document_management"
  | "analytics_insights"
  | "settings_users"
  | "settings_entities"
  | "settings_billing";

type RbacAction =
  | "view"
  | "create"
  | "edit"
  | "approve"
  | "post"
  | "delete"
  | "export"
  | "configure";

type RbacScope = "full" | "scoped" | "none";

type PermEntry = {
  role: RbacRole;
  module: RbacModule;
  action: RbacAction;
  scope: RbacScope;
  description?: string;
  scopeCondition?: string;
};

const PERMISSIONS: PermEntry[] = [
  // ═══════════════════════════════════════════════════════════════
  // GENERAL LEDGER / CHART OF ACCOUNTS (module: general_ledger)
  // ═══════════════════════════════════════════════════════════════
  // Org Owner
  { role: "owner", module: "general_ledger", action: "view", scope: "full" },
  { role: "owner", module: "general_ledger", action: "approve", scope: "full" },
  { role: "owner", module: "general_ledger", action: "export", scope: "full" },
  {
    role: "owner",
    module: "general_ledger",
    action: "configure",
    scope: "full",
  },
  // Finance Director
  {
    role: "finance_director",
    module: "general_ledger",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "general_ledger",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "general_ledger",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "general_ledger",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "general_ledger",
    action: "post",
    scope: "scoped",
    description: "Human override only — agent-driven by default",
  },
  {
    role: "finance_director",
    module: "general_ledger",
    action: "export",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "general_ledger",
    action: "configure",
    scope: "full",
  },
  // Accountant
  {
    role: "accountant",
    module: "general_ledger",
    action: "view",
    scope: "full",
  },
  {
    role: "accountant",
    module: "general_ledger",
    action: "create",
    scope: "full",
  },
  {
    role: "accountant",
    module: "general_ledger",
    action: "edit",
    scope: "scoped",
    description: "Own drafts only",
  },
  {
    role: "accountant",
    module: "general_ledger",
    action: "export",
    scope: "full",
  },
  // External Auditor
  {
    role: "external_auditor",
    module: "general_ledger",
    action: "view",
    scope: "scoped",
    description: "Period-locked — read-only historical data",
  },
  {
    role: "external_auditor",
    module: "general_ledger",
    action: "export",
    scope: "scoped",
    description: "Locked period only",
  },
  // External Accountant
  {
    role: "external_accountant",
    module: "general_ledger",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "general_ledger",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "general_ledger",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "general_ledger",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "general_ledger",
    action: "post",
    scope: "scoped",
    description: "Same override rules as FD",
  },
  {
    role: "external_accountant",
    module: "general_ledger",
    action: "export",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "general_ledger",
    action: "configure",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // CHART OF ACCOUNTS (module: chart_of_accounts)
  // ═══════════════════════════════════════════════════════════════
  { role: "owner", module: "chart_of_accounts", action: "view", scope: "full" },
  {
    role: "owner",
    module: "chart_of_accounts",
    action: "approve",
    scope: "full",
  },
  {
    role: "owner",
    module: "chart_of_accounts",
    action: "export",
    scope: "full",
  },
  {
    role: "owner",
    module: "chart_of_accounts",
    action: "configure",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "chart_of_accounts",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "chart_of_accounts",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "chart_of_accounts",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "chart_of_accounts",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "chart_of_accounts",
    action: "export",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "chart_of_accounts",
    action: "configure",
    scope: "full",
  },
  {
    role: "accountant",
    module: "chart_of_accounts",
    action: "view",
    scope: "full",
  },
  {
    role: "accountant",
    module: "chart_of_accounts",
    action: "create",
    scope: "full",
  },
  {
    role: "accountant",
    module: "chart_of_accounts",
    action: "edit",
    scope: "scoped",
    description: "Own drafts only",
  },
  {
    role: "accountant",
    module: "chart_of_accounts",
    action: "export",
    scope: "full",
  },
  {
    role: "external_auditor",
    module: "chart_of_accounts",
    action: "view",
    scope: "scoped",
    description: "Locked period",
  },
  {
    role: "external_auditor",
    module: "chart_of_accounts",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "chart_of_accounts",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "chart_of_accounts",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "chart_of_accounts",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "chart_of_accounts",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "chart_of_accounts",
    action: "export",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "chart_of_accounts",
    action: "configure",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // AP / AR (modules: accounts_payable, accounts_receivable)
  // ═══════════════════════════════════════════════════════════════
  // Owner
  { role: "owner", module: "accounts_payable", action: "view", scope: "full" },
  {
    role: "owner",
    module: "accounts_payable",
    action: "approve",
    scope: "full",
  },
  {
    role: "owner",
    module: "accounts_payable",
    action: "export",
    scope: "full",
  },
  {
    role: "owner",
    module: "accounts_receivable",
    action: "view",
    scope: "full",
  },
  {
    role: "owner",
    module: "accounts_receivable",
    action: "approve",
    scope: "full",
  },
  {
    role: "owner",
    module: "accounts_receivable",
    action: "export",
    scope: "full",
  },
  // FD
  {
    role: "finance_director",
    module: "accounts_payable",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_payable",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_payable",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_payable",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_payable",
    action: "delete",
    scope: "scoped",
    description: "Void with reason required",
  },
  {
    role: "finance_director",
    module: "accounts_payable",
    action: "export",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_receivable",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_receivable",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_receivable",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_receivable",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "accounts_receivable",
    action: "delete",
    scope: "scoped",
    description: "Void with reason required",
  },
  {
    role: "finance_director",
    module: "accounts_receivable",
    action: "export",
    scope: "full",
  },
  // Accountant
  {
    role: "accountant",
    module: "accounts_payable",
    action: "view",
    scope: "full",
  },
  {
    role: "accountant",
    module: "accounts_payable",
    action: "create",
    scope: "full",
  },
  {
    role: "accountant",
    module: "accounts_payable",
    action: "edit",
    scope: "full",
  },
  {
    role: "accountant",
    module: "accounts_payable",
    action: "approve",
    scope: "scoped",
    description: "Under approval threshold",
  },
  {
    role: "accountant",
    module: "accounts_payable",
    action: "export",
    scope: "full",
  },
  {
    role: "accountant",
    module: "accounts_receivable",
    action: "view",
    scope: "full",
  },
  {
    role: "accountant",
    module: "accounts_receivable",
    action: "create",
    scope: "full",
  },
  {
    role: "accountant",
    module: "accounts_receivable",
    action: "edit",
    scope: "full",
  },
  {
    role: "accountant",
    module: "accounts_receivable",
    action: "approve",
    scope: "scoped",
    description: "Under approval threshold",
  },
  {
    role: "accountant",
    module: "accounts_receivable",
    action: "export",
    scope: "full",
  },
  // Cashier
  {
    role: "cashier",
    module: "accounts_payable",
    action: "view",
    scope: "scoped",
    description: "View only, own tills",
  },
  {
    role: "cashier",
    module: "accounts_receivable",
    action: "view",
    scope: "scoped",
    description: "View only, own tills",
  },
  // Dept Manager
  {
    role: "department_manager",
    module: "accounts_payable",
    action: "view",
    scope: "scoped",
    description: "Own department spend only",
  },
  {
    role: "department_manager",
    module: "accounts_receivable",
    action: "view",
    scope: "scoped",
    description: "Own department only",
  },
  // External Auditor
  {
    role: "external_auditor",
    module: "accounts_payable",
    action: "view",
    scope: "scoped",
    description: "Locked period only",
  },
  {
    role: "external_auditor",
    module: "accounts_payable",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_auditor",
    module: "accounts_receivable",
    action: "view",
    scope: "scoped",
    description: "Locked period only",
  },
  {
    role: "external_auditor",
    module: "accounts_receivable",
    action: "export",
    scope: "scoped",
  },
  // External Accountant
  {
    role: "external_accountant",
    module: "accounts_payable",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_payable",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_payable",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_payable",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_payable",
    action: "delete",
    scope: "scoped",
    description: "With reason",
  },
  {
    role: "external_accountant",
    module: "accounts_payable",
    action: "export",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_receivable",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_receivable",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_receivable",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_receivable",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "accounts_receivable",
    action: "delete",
    scope: "scoped",
    description: "With reason",
  },
  {
    role: "external_accountant",
    module: "accounts_receivable",
    action: "export",
    scope: "full",
  },
  // Donor
  {
    role: "donor",
    module: "accounts_receivable",
    action: "view",
    scope: "scoped",
    description: "Project-scoped only",
  },
  {
    role: "donor",
    module: "accounts_receivable",
    action: "export",
    scope: "scoped",
    description: "Project-scoped only",
  },

  // ═══════════════════════════════════════════════════════════════
  // CASH & IMPREST / MOBILE MONEY
  // ═══════════════════════════════════════════════════════════════
  { role: "owner", module: "cash_imprest", action: "view", scope: "full" },
  { role: "owner", module: "cash_imprest", action: "approve", scope: "full" },
  { role: "owner", module: "cash_imprest", action: "export", scope: "full" },
  {
    role: "finance_director",
    module: "cash_imprest",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "cash_imprest",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "cash_imprest",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "cash_imprest",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "cash_imprest",
    action: "export",
    scope: "full",
  },
  { role: "accountant", module: "cash_imprest", action: "view", scope: "full" },
  {
    role: "accountant",
    module: "cash_imprest",
    action: "create",
    scope: "full",
  },
  { role: "accountant", module: "cash_imprest", action: "edit", scope: "full" },
  {
    role: "accountant",
    module: "cash_imprest",
    action: "approve",
    scope: "scoped",
  },
  {
    role: "accountant",
    module: "cash_imprest",
    action: "export",
    scope: "full",
  },
  {
    role: "cashier",
    module: "cash_imprest",
    action: "view",
    scope: "scoped",
    description: "Own till/location only",
  },
  {
    role: "cashier",
    module: "cash_imprest",
    action: "create",
    scope: "scoped",
    description: "Issue/retire imprest",
  },
  {
    role: "cashier",
    module: "cash_imprest",
    action: "edit",
    scope: "scoped",
    description: "Own entries only",
  },
  {
    role: "external_auditor",
    module: "cash_imprest",
    action: "view",
    scope: "scoped",
    description: "Locked period",
  },
  {
    role: "external_auditor",
    module: "cash_imprest",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "cash_imprest",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "cash_imprest",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "cash_imprest",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "cash_imprest",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "cash_imprest",
    action: "export",
    scope: "full",
  },
  // Mobile Money mirrors Cash & Imprest
  { role: "owner", module: "mobile_money", action: "view", scope: "full" },
  { role: "owner", module: "mobile_money", action: "approve", scope: "full" },
  { role: "owner", module: "mobile_money", action: "export", scope: "full" },
  {
    role: "finance_director",
    module: "mobile_money",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "mobile_money",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "mobile_money",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "mobile_money",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "mobile_money",
    action: "export",
    scope: "full",
  },
  { role: "accountant", module: "mobile_money", action: "view", scope: "full" },
  {
    role: "accountant",
    module: "mobile_money",
    action: "create",
    scope: "full",
  },
  { role: "accountant", module: "mobile_money", action: "edit", scope: "full" },
  {
    role: "accountant",
    module: "mobile_money",
    action: "approve",
    scope: "scoped",
  },
  {
    role: "accountant",
    module: "mobile_money",
    action: "export",
    scope: "full",
  },
  {
    role: "cashier",
    module: "mobile_money",
    action: "view",
    scope: "scoped",
    description: "Own till/location",
  },
  {
    role: "cashier",
    module: "mobile_money",
    action: "create",
    scope: "scoped",
    description: "Issue/retire",
  },
  {
    role: "cashier",
    module: "mobile_money",
    action: "edit",
    scope: "scoped",
    description: "Own entries",
  },
  {
    role: "external_accountant",
    module: "mobile_money",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "mobile_money",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "mobile_money",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "mobile_money",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "mobile_money",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // PAYROLL — Strictest scoping in the system
  // ═══════════════════════════════════════════════════════════════
  {
    role: "owner",
    module: "payroll",
    action: "view",
    scope: "scoped",
    description: "Summary only, not individual salaries",
  },
  { role: "owner", module: "payroll", action: "approve", scope: "full" },
  {
    role: "owner",
    module: "payroll",
    action: "export",
    scope: "scoped",
    description: "Summary only",
  },
  {
    role: "finance_director",
    module: "payroll",
    action: "view",
    scope: "full",
    description: "Full access including individual salaries",
  },
  {
    role: "finance_director",
    module: "payroll",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "payroll",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "payroll",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "payroll",
    action: "export",
    scope: "full",
  },
  { role: "payroll_officer", module: "payroll", action: "view", scope: "full" },
  {
    role: "payroll_officer",
    module: "payroll",
    action: "create",
    scope: "full",
  },
  { role: "payroll_officer", module: "payroll", action: "edit", scope: "full" },
  {
    role: "payroll_officer",
    module: "payroll",
    action: "approve",
    scope: "scoped",
    description: "Up to FD sign-off threshold",
  },
  {
    role: "payroll_officer",
    module: "payroll",
    action: "export",
    scope: "full",
  },
  {
    role: "department_manager",
    module: "payroll",
    action: "view",
    scope: "scoped",
    description: "Own team, totals only, no individual salary detail",
  },
  {
    role: "employee",
    module: "payroll",
    action: "view",
    scope: "scoped",
    description: "Own payslip only",
  },
  {
    role: "employee",
    module: "payroll",
    action: "export",
    scope: "scoped",
    description: "Own payslip download",
  },
  {
    role: "external_auditor",
    module: "payroll",
    action: "view",
    scope: "scoped",
    description: "Aggregate only unless specific grant",
  },
  {
    role: "external_accountant",
    module: "payroll",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "payroll",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "payroll",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "payroll",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "payroll",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // EXPENSE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  {
    role: "owner",
    module: "expense_management",
    action: "view",
    scope: "full",
  },
  {
    role: "owner",
    module: "expense_management",
    action: "approve",
    scope: "full",
  },
  {
    role: "owner",
    module: "expense_management",
    action: "export",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "expense_management",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "expense_management",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "expense_management",
    action: "export",
    scope: "full",
  },
  {
    role: "accountant",
    module: "expense_management",
    action: "view",
    scope: "full",
  },
  {
    role: "accountant",
    module: "expense_management",
    action: "edit",
    scope: "scoped",
    description: "Categorization only",
  },
  {
    role: "accountant",
    module: "expense_management",
    action: "export",
    scope: "full",
  },
  {
    role: "department_manager",
    module: "expense_management",
    action: "view",
    scope: "scoped",
    description: "Own team's claims only",
  },
  {
    role: "department_manager",
    module: "expense_management",
    action: "approve",
    scope: "scoped",
    description: "Own team only",
  },
  {
    role: "department_manager",
    module: "expense_management",
    action: "export",
    scope: "scoped",
    description: "Own team only",
  },
  {
    role: "employee",
    module: "expense_management",
    action: "view",
    scope: "scoped",
    description: "Own claims only",
  },
  {
    role: "employee",
    module: "expense_management",
    action: "create",
    scope: "scoped",
    description: "Own claims only",
  },
  {
    role: "employee",
    module: "expense_management",
    action: "edit",
    scope: "scoped",
    description: "Own, pre-approval only",
  },
  {
    role: "employee",
    module: "expense_management",
    action: "export",
    scope: "scoped",
    description: "Own history only",
  },
  {
    role: "external_auditor",
    module: "expense_management",
    action: "view",
    scope: "scoped",
    description: "Locked period",
  },
  {
    role: "external_auditor",
    module: "expense_management",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "expense_management",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "expense_management",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "expense_management",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "expense_management",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "expense_management",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // FIXED ASSETS / INVENTORY
  // ═══════════════════════════════════════════════════════════════
  { role: "owner", module: "fixed_assets", action: "view", scope: "full" },
  { role: "owner", module: "fixed_assets", action: "approve", scope: "full" },
  { role: "owner", module: "fixed_assets", action: "export", scope: "full" },
  {
    role: "finance_director",
    module: "fixed_assets",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "fixed_assets",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "fixed_assets",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "fixed_assets",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "fixed_assets",
    action: "export",
    scope: "full",
  },
  { role: "accountant", module: "fixed_assets", action: "view", scope: "full" },
  {
    role: "accountant",
    module: "fixed_assets",
    action: "create",
    scope: "full",
  },
  { role: "accountant", module: "fixed_assets", action: "edit", scope: "full" },
  {
    role: "accountant",
    module: "fixed_assets",
    action: "export",
    scope: "full",
  },
  {
    role: "department_manager",
    module: "fixed_assets",
    action: "view",
    scope: "scoped",
    description: "Own department assets",
  },
  {
    role: "external_auditor",
    module: "fixed_assets",
    action: "view",
    scope: "scoped",
    description: "Locked period",
  },
  {
    role: "external_auditor",
    module: "fixed_assets",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "fixed_assets",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "fixed_assets",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "fixed_assets",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "fixed_assets",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "fixed_assets",
    action: "export",
    scope: "full",
  },
  // Inventory mirrors Fixed Assets
  { role: "owner", module: "inventory", action: "view", scope: "full" },
  { role: "owner", module: "inventory", action: "approve", scope: "full" },
  { role: "owner", module: "inventory", action: "export", scope: "full" },
  {
    role: "finance_director",
    module: "inventory",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "inventory",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "inventory",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "inventory",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "inventory",
    action: "export",
    scope: "full",
  },
  { role: "accountant", module: "inventory", action: "view", scope: "full" },
  { role: "accountant", module: "inventory", action: "create", scope: "full" },
  { role: "accountant", module: "inventory", action: "edit", scope: "full" },
  { role: "accountant", module: "inventory", action: "export", scope: "full" },
  {
    role: "department_manager",
    module: "inventory",
    action: "view",
    scope: "scoped",
    description: "Own department",
  },
  {
    role: "external_auditor",
    module: "inventory",
    action: "view",
    scope: "scoped",
  },
  {
    role: "external_auditor",
    module: "inventory",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "inventory",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "inventory",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "inventory",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "inventory",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "inventory",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // FINANCIAL REPORTING
  // ═══════════════════════════════════════════════════════════════
  {
    role: "owner",
    module: "financial_reporting",
    action: "view",
    scope: "full",
  },
  {
    role: "owner",
    module: "financial_reporting",
    action: "export",
    scope: "full",
  },
  {
    role: "owner",
    module: "financial_reporting",
    action: "configure",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "financial_reporting",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "financial_reporting",
    action: "export",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "financial_reporting",
    action: "configure",
    scope: "full",
  },
  {
    role: "accountant",
    module: "financial_reporting",
    action: "view",
    scope: "scoped",
    description: "Own domain reports",
  },
  {
    role: "accountant",
    module: "financial_reporting",
    action: "export",
    scope: "full",
  },
  {
    role: "accountant",
    module: "financial_reporting",
    action: "configure",
    scope: "scoped",
  },
  {
    role: "payroll_officer",
    module: "financial_reporting",
    action: "view",
    scope: "scoped",
    description: "Payroll reports only",
  },
  {
    role: "payroll_officer",
    module: "financial_reporting",
    action: "export",
    scope: "scoped",
  },
  {
    role: "cashier",
    module: "financial_reporting",
    action: "view",
    scope: "scoped",
    description: "Cash reports only",
  },
  {
    role: "department_manager",
    module: "financial_reporting",
    action: "view",
    scope: "scoped",
    description: "Own department",
  },
  {
    role: "department_manager",
    module: "financial_reporting",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_auditor",
    module: "financial_reporting",
    action: "view",
    scope: "scoped",
    description: "Locked period, full FS",
  },
  {
    role: "external_auditor",
    module: "financial_reporting",
    action: "export",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "financial_reporting",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "financial_reporting",
    action: "export",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "financial_reporting",
    action: "configure",
    scope: "full",
  },
  {
    role: "donor",
    module: "financial_reporting",
    action: "view",
    scope: "scoped",
    description: "Own project reports",
  },
  {
    role: "donor",
    module: "financial_reporting",
    action: "export",
    scope: "scoped",
  },

  // ═══════════════════════════════════════════════════════════════
  // TAX & COMPLIANCE / AUDIT PREPARATION
  // ═══════════════════════════════════════════════════════════════
  { role: "owner", module: "tax_compliance", action: "view", scope: "full" },
  { role: "owner", module: "tax_compliance", action: "approve", scope: "full" },
  { role: "owner", module: "tax_compliance", action: "export", scope: "full" },
  {
    role: "finance_director",
    module: "tax_compliance",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "tax_compliance",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "tax_compliance",
    action: "export",
    scope: "full",
  },
  {
    role: "accountant",
    module: "tax_compliance",
    action: "view",
    scope: "scoped",
    description: "Prep only",
  },
  {
    role: "accountant",
    module: "tax_compliance",
    action: "export",
    scope: "full",
  },
  {
    role: "payroll_officer",
    module: "tax_compliance",
    action: "view",
    scope: "scoped",
    description: "Payroll tax only",
  },
  {
    role: "payroll_officer",
    module: "tax_compliance",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_auditor",
    module: "audit_preparation",
    action: "view",
    scope: "full",
    description: "Full audit package",
  },
  {
    role: "external_auditor",
    module: "audit_preparation",
    action: "export",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "tax_compliance",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "tax_compliance",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "tax_compliance",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // BUDGETING / ANALYTICS
  // ═══════════════════════════════════════════════════════════════
  { role: "owner", module: "budgeting", action: "view", scope: "full" },
  { role: "owner", module: "budgeting", action: "create", scope: "full" },
  { role: "owner", module: "budgeting", action: "edit", scope: "full" },
  { role: "owner", module: "budgeting", action: "export", scope: "full" },
  {
    role: "finance_director",
    module: "budgeting",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "budgeting",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "budgeting",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "budgeting",
    action: "export",
    scope: "full",
  },
  { role: "accountant", module: "budgeting", action: "view", scope: "scoped" },
  { role: "accountant", module: "budgeting", action: "export", scope: "full" },
  {
    role: "department_manager",
    module: "budgeting",
    action: "view",
    scope: "scoped",
    description: "Own department budget",
  },
  {
    role: "department_manager",
    module: "budgeting",
    action: "edit",
    scope: "scoped",
    description: "Own department, needs FD approval",
  },
  {
    role: "department_manager",
    module: "budgeting",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "budgeting",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "budgeting",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "budgeting",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "budgeting",
    action: "export",
    scope: "full",
  },
  {
    role: "donor",
    module: "budgeting",
    action: "view",
    scope: "scoped",
    description: "Own project budget",
  },

  // ═══════════════════════════════════════════════════════════════
  // DOCUMENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════
  {
    role: "owner",
    module: "document_management",
    action: "view",
    scope: "full",
  },
  {
    role: "owner",
    module: "document_management",
    action: "create",
    scope: "full",
  },
  {
    role: "owner",
    module: "document_management",
    action: "delete",
    scope: "scoped",
    description: "With audit log",
  },
  {
    role: "finance_director",
    module: "document_management",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "document_management",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "document_management",
    action: "delete",
    scope: "scoped",
  },
  {
    role: "accountant",
    module: "document_management",
    action: "view",
    scope: "full",
  },
  {
    role: "accountant",
    module: "document_management",
    action: "create",
    scope: "full",
  },
  {
    role: "payroll_officer",
    module: "document_management",
    action: "view",
    scope: "scoped",
    description: "Payroll docs only",
  },
  {
    role: "payroll_officer",
    module: "document_management",
    action: "create",
    scope: "scoped",
    description: "Payroll docs only",
  },
  {
    role: "cashier",
    module: "document_management",
    action: "view",
    scope: "scoped",
    description: "Own uploads",
  },
  {
    role: "cashier",
    module: "document_management",
    action: "create",
    scope: "full",
  },
  {
    role: "department_manager",
    module: "document_management",
    action: "view",
    scope: "scoped",
    description: "Own department",
  },
  {
    role: "department_manager",
    module: "document_management",
    action: "create",
    scope: "full",
  },
  {
    role: "employee",
    module: "document_management",
    action: "view",
    scope: "scoped",
    description: "Own submitted receipts",
  },
  {
    role: "employee",
    module: "document_management",
    action: "create",
    scope: "full",
  },
  {
    role: "external_auditor",
    module: "document_management",
    action: "view",
    scope: "scoped",
    description: "Locked period",
  },
  {
    role: "external_accountant",
    module: "document_management",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "document_management",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "document_management",
    action: "delete",
    scope: "scoped",
  },
  {
    role: "donor",
    module: "document_management",
    action: "view",
    scope: "scoped",
    description: "Project-scoped",
  },

  // ═══════════════════════════════════════════════════════════════
  // BANK RECONCILIATION
  // ═══════════════════════════════════════════════════════════════
  {
    role: "owner",
    module: "bank_reconciliation",
    action: "view",
    scope: "full",
  },
  {
    role: "owner",
    module: "bank_reconciliation",
    action: "approve",
    scope: "full",
  },
  {
    role: "owner",
    module: "bank_reconciliation",
    action: "export",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "bank_reconciliation",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "bank_reconciliation",
    action: "create",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "bank_reconciliation",
    action: "edit",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "bank_reconciliation",
    action: "approve",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "bank_reconciliation",
    action: "export",
    scope: "full",
  },
  {
    role: "accountant",
    module: "bank_reconciliation",
    action: "view",
    scope: "full",
  },
  {
    role: "accountant",
    module: "bank_reconciliation",
    action: "create",
    scope: "full",
  },
  {
    role: "accountant",
    module: "bank_reconciliation",
    action: "edit",
    scope: "full",
  },
  {
    role: "accountant",
    module: "bank_reconciliation",
    action: "approve",
    scope: "scoped",
  },
  {
    role: "accountant",
    module: "bank_reconciliation",
    action: "export",
    scope: "full",
  },
  {
    role: "external_auditor",
    module: "bank_reconciliation",
    action: "view",
    scope: "scoped",
    description: "Locked period",
  },
  {
    role: "external_auditor",
    module: "bank_reconciliation",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "bank_reconciliation",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "bank_reconciliation",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "bank_reconciliation",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "bank_reconciliation",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "bank_reconciliation",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // MULTI-ENTITY & CONSOLIDATION
  // ═══════════════════════════════════════════════════════════════
  { role: "owner", module: "multi_entity", action: "view", scope: "full" },
  { role: "owner", module: "multi_entity", action: "export", scope: "full" },
  {
    role: "finance_director",
    module: "multi_entity",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "multi_entity",
    action: "export",
    scope: "full",
  },
  {
    role: "accountant",
    module: "multi_entity",
    action: "view",
    scope: "scoped",
  },
  {
    role: "external_auditor",
    module: "multi_entity",
    action: "view",
    scope: "scoped",
    description: "Locked period",
  },
  {
    role: "external_auditor",
    module: "multi_entity",
    action: "export",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "multi_entity",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "multi_entity",
    action: "create",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "multi_entity",
    action: "edit",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "multi_entity",
    action: "approve",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "multi_entity",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // ANALYTICS & INSIGHTS
  // ═══════════════════════════════════════════════════════════════
  {
    role: "owner",
    module: "analytics_insights",
    action: "view",
    scope: "full",
  },
  {
    role: "owner",
    module: "analytics_insights",
    action: "export",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "analytics_insights",
    action: "view",
    scope: "full",
  },
  {
    role: "finance_director",
    module: "analytics_insights",
    action: "export",
    scope: "full",
  },
  {
    role: "accountant",
    module: "analytics_insights",
    action: "view",
    scope: "scoped",
  },
  {
    role: "external_accountant",
    module: "analytics_insights",
    action: "view",
    scope: "full",
  },
  {
    role: "external_accountant",
    module: "analytics_insights",
    action: "export",
    scope: "full",
  },

  // ═══════════════════════════════════════════════════════════════
  // SETTINGS — Users, Entities, Billing
  // ═══════════════════════════════════════════════════════════════
  { role: "owner", module: "settings_users", action: "view", scope: "full" },
  { role: "owner", module: "settings_users", action: "create", scope: "full" },
  { role: "owner", module: "settings_users", action: "edit", scope: "full" },
  { role: "owner", module: "settings_users", action: "delete", scope: "full" },
  { role: "owner", module: "settings_entities", action: "view", scope: "full" },
  {
    role: "owner",
    module: "settings_entities",
    action: "create",
    scope: "full",
  },
  { role: "owner", module: "settings_entities", action: "edit", scope: "full" },
  { role: "owner", module: "settings_billing", action: "view", scope: "full" },
  { role: "owner", module: "settings_billing", action: "edit", scope: "full" },
  { role: "admin", module: "settings_users", action: "view", scope: "full" },
  { role: "admin", module: "settings_users", action: "create", scope: "full" },
  { role: "admin", module: "settings_users", action: "edit", scope: "full" },
  { role: "admin", module: "settings_users", action: "delete", scope: "full" },
  { role: "admin", module: "settings_entities", action: "view", scope: "full" },
  {
    role: "admin",
    module: "settings_entities",
    action: "create",
    scope: "full",
  },
  { role: "admin", module: "settings_entities", action: "edit", scope: "full" },
];

/**
 * Seed the role_permissions table with all entries from the RBAC Matrix
 */
export async function seedPermissions() {
  console.log("Seeding RBAC permissions...");

  // Clear existing permissions for clean re-seed
  await db.delete(rolePermissions);

  for (const perm of PERMISSIONS) {
    await db
      .insert(rolePermissions)
      .values({
        role: perm.role as any,
        module: perm.module as any,
        action: perm.action as any,
        scope: perm.scope as any,
        description: perm.description,
        scopeCondition: perm.scopeCondition,
      })
      .onConflictDoNothing();
  }

  console.log(`  Inserted ${PERMISSIONS.length} permission entries.`);
}
