"use client";

import { createContext, useContext, type ReactNode } from "react";

// ─── Types ──────────────────────────────────────

export type RbacModule =
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

export type RbacAction =
  | "view"
  | "create"
  | "edit"
  | "approve"
  | "post"
  | "delete"
  | "export"
  | "configure";

export type RbacScope = "full" | "scoped" | "none";

// ─── Permission Map Type ────────────────────────

export type PermissionMap = Record<string, Record<string, RbacScope>>;

// ─── Context for reactive permission checks ─────

type PermissionContextValue = {
  hasPermission: (module: RbacModule, action: RbacAction) => boolean;
  getScope: (module: RbacModule, action: RbacAction) => RbacScope;
  role: string | null;
  permissionsLoaded: boolean;
};

const PermissionContext = createContext<PermissionContextValue>({
  hasPermission: () => false,
  getScope: () => "none",
  role: null,
  permissionsLoaded: false,
});

export function usePermission() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermission must be used within a PermissionProvider");
  }
  return context;
}

// ─── Permission Provider ─────────────────────────

export function PermissionProvider({
  children,
  permissions,
  role,
}: {
  children: ReactNode;
  permissions: PermissionMap | null;
  role: string | null;
}) {
  const value: PermissionContextValue = {
    hasPermission: (module: RbacModule, action: RbacAction): boolean => {
      // Fast path: use server-provided permissions if available
      if (permissions) {
        const scope = permissions[module]?.[action];
        return scope === "full" || scope === "scoped";
      }
      // Fallback: client-side heuristic while server fetch is pending
      if (role) return roleHasBasicAccess(role, module, action);
      return false;
    },
    getScope: (module: RbacModule, action: RbacAction): RbacScope => {
      if (!permissions || !role) return "none";
      return permissions[module]?.[action] ?? "none";
    },
    role,
    permissionsLoaded: !!permissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// ─── <Can> Component ───────────────────────────

export function Can({
  module,
  action,
  fallback = null,
  children,
}: {
  module: RbacModule;
  action: RbacAction;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const { hasPermission } = usePermission();

  if (!hasPermission(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ─── <CanScope> Component — for scoped/conditional access ──

export function CanScope({
  module,
  action,
  scopedFallback = null,
  noAccessFallback = null,
  children,
}: {
  module: RbacModule;
  action: RbacAction;
  scopedFallback?: ReactNode;
  noAccessFallback?: ReactNode;
  children: ReactNode;
}) {
  const { getScope } = usePermission();
  const scope = getScope(module, action);

  if (scope === "full") {
    return <>{children}</>;
  }

  if (scope === "scoped") {
    return <>{scopedFallback}</>;
  }

  return <>{noAccessFallback}</>;
}

/**
 * Check if a role has at least "scoped" access to a module+action.
 * This is a simplified client-side check. The server has the full matrix.
 */
export function roleHasBasicAccess(
  role: string,
  module: RbacModule,
  action: RbacAction,
): boolean {
  // Owner/admin have mostly full access
  if (role === "owner" || role === "admin") return true;

  // FD has access to most things
  if (role === "finance_director") {
    const deniedModules: RbacModule[] = [
      "settings_users",
      "settings_entities",
      "settings_billing",
    ];
    if (deniedModules.includes(module)) return false;
    return true;
  }

  // External accountant has broad access
  if (role === "external_accountant") {
    return action !== "delete";
  }

  // External auditor is read-only
  if (role === "external_auditor") {
    return action === "view" || action === "export";
  }

  // Payroll officer is payroll-scoped
  if (role === "payroll_officer") {
    if (module === "payroll") return true;
    if (module === "financial_reporting" && action === "view") return true;
    if (module === "document_management") return true;
    return false;
  }

  // Cashier is cash-scoped
  if (role === "cashier") {
    if (module === "cash_imprest" || module === "mobile_money") return true;
    return false;
  }

  // Department manager is department-scoped
  if (role === "department_manager") {
    if (
      [
        "accounts_payable",
        "accounts_receivable",
        "expense_management",
        "fixed_assets",
        "inventory",
        "budgeting",
        "financial_reporting",
        "document_management",
      ].includes(module)
    )
      return true;
    return false;
  }

  // Employee is self-scoped
  if (role === "employee") {
    if (module === "expense_management") return true;
    if (module === "payroll" && (action === "view" || action === "export"))
      return true;
    if (
      module === "document_management" &&
      (action === "view" || action === "create")
    )
      return true;
    return false;
  }

  // Donor is project-scoped
  if (role === "donor") {
    if (
      module === "financial_reporting" ||
      module === "budgeting" ||
      module === "accounts_receivable" ||
      module === "document_management"
    )
      return true;
    return false;
  }

  return false;
}

/**
 * Serialize the server-side permission map into a Map for the client.
 */
export function serializePermissions(
  data: Array<{
    module: string;
    action: string;
    scope: string;
  }>,
): PermissionMap {
  const map: PermissionMap = {};
  for (const perm of data) {
    if (!map[perm.module]) map[perm.module] = {};
    map[perm.module][perm.action] = perm.scope as RbacScope;
  }
  return map;
}
