"use client";

import { useEntity } from "@/lib/entity-context";
import { OwnerDashboard } from "./owner-dashboard";
import { FinanceDirectorDashboard } from "./finance-director-dashboard";
import { PayrollOfficerDashboard } from "./payroll-officer-dashboard";
import { AccountantDashboard } from "./accountant-dashboard";
import { ExternalAuditorDashboard } from "./external-auditor-dashboard";
import { DonorDashboard } from "./donor-dashboard";
import { CashierDashboard } from "./cashier-dashboard";
import { DepartmentManagerDashboard } from "./department-manager-dashboard";
import { EmployeeDashboard } from "./employee-dashboard";
import { ExternalAccountantDashboard } from "./external-accountant-dashboard";
import { Skeleton } from "@/components/shared/loading";

/**
 * Role-Based Dashboard Router
 *
 * Per Architecture Doc §5, each user role gets a distinct home screen
 * composition (same design system, different layout priority).
 *
 * The user's role is resolved from the entity context's entityRole (set by the
 * tRPC entity-scoping middleware from user_entity_access).
 *
 * Roles from DB entityRoleEnum:
 *   owner | admin | finance_director | accountant | payroll_officer
 *   | cashier | department_manager | employee | external_auditor | donor
 */

export type UserRole = string;

export function RoleDashboard() {
  const { entityId, entityRole } = useEntity();

  // Resolve role from entity context (set by tRPC middleware from DB)
  const role = (entityRole ?? "owner") as UserRole;

  // Show loading state while context is loading
  if (!entityId) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Route to the appropriate dashboard based on role
  switch (role) {
    case "owner":
    case "admin":
      return <OwnerDashboard />;

    case "finance_director":
      return <FinanceDirectorDashboard />;

    // All roles have dedicated dashboards — dispatch to the correct component
    case "accountant":
      return <AccountantDashboard />;

    case "payroll_officer":
      return <PayrollOfficerDashboard />;

    case "external_auditor":
      return <ExternalAuditorDashboard />;

    case "donor":
      return <DonorDashboard />;

    case "cashier":
      return <CashierDashboard />;

    case "department_manager":
      return <DepartmentManagerDashboard />;

    case "employee":
      return <EmployeeDashboard />;

    case "external_accountant":
      return <ExternalAccountantDashboard />;

    default:
      return <OwnerDashboard />;
  }
}
