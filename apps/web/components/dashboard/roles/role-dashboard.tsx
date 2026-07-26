"use client";

import { useEntity } from "@/lib/entity-context";
import { OwnerDashboard } from "./owner-dashboard";
import { FinanceDirectorDashboard } from "./finance-director-dashboard";
import { PayrollOfficerDashboard } from "./payroll-officer-dashboard";
import { Skeleton } from "@/components/shared/loading";
import { AlertCircle, Building2 } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * Role-Based Dashboard Router
 *
 * Per Architecture Doc §5, each user role gets a distinct home screen
 * composition (same design system, different layout priority).
 *
 * Current roles implemented:
 *   - owner / admin  →  OwnerDashboard (cash position, close status, CFO summary, approvals)
 *   - finance_director  →  FinanceDirectorDashboard (full KPIs, agent activity, all approvals, compliance)
 *
 * Roles not yet implemented fall back to OwnerDashboard with a role indicator.
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

    // Role-specific dashboards for other roles (to be implemented)
    case "accountant":
      return (
        <RolePlaceholder
          role="Accountant"
          description="Exception queue, document inbox, transaction feed"
          fallback={<OwnerDashboard />}
        />
      );

    case "payroll_officer":
      return <PayrollOfficerDashboard />;

    case "cashier":
      return (
        <RolePlaceholder
          role="Cashier"
          description="Today's cash position, imprest issue/retire, receipt capture"
          fallback={<OwnerDashboard />}
        />
      );

    case "department_manager":
      return (
        <RolePlaceholder
          role="Department Manager"
          description="Budget vs actual, pending team expense approvals"
          fallback={<OwnerDashboard />}
        />
      );

    case "employee":
      return (
        <EmptyState
          icon={<Building2 className="h-10 w-10" />}
          title="Your Claims"
          description="Submit and track your expense claims here. Select 'Submit Claim' to get started."
          action={
            <Link href="/dashboard/expense/pipeline">
              <Button size="sm">Submit Claim</Button>
            </Link>
          }
        />
      );

    default:
      return <OwnerDashboard />;
  }
}

/**
 * Placeholder for unimplemented role-specific dashboards.
 * Shows the role name and what the dashboard will contain,
 * plus the fallback dashboard below.
 */
function RolePlaceholder({
  role,
  description,
  fallback,
}: {
  role: string;
  description: string;
  fallback: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {role} Dashboard
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
              A dedicated {role.toLowerCase()} dashboard is being built. The
              view below is a general overview — the dedicated view will show:{" "}
              {description}.
            </p>
          </div>
        </div>
      </div>
      {fallback}
    </div>
  );
}
