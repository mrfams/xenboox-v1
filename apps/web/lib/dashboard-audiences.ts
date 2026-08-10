// ─── Dashboard Briefing Audiences ──────────────────────────────────────────
// Single source of truth for mapping an entity role to a briefing audience.
// The dashboard router tags each briefing insight with an audience (server
// side); this file decides which audience a logged-in role actually sees.
//
//   decision    → owner / admin / finance director — the financial pulse and
//                 the decisions only they can make.
//   operations  → finance staff — the work queue (approvals, payments,
//                 flagged items, payroll).
//   oversight   → auditors / donors / employees — verifiable state (compliance,
//                 filings, period position), read-only, no action noise.
//
// Keep this map in sync with packages/db/schema/organization.ts
// (entityRoleEnum) and packages/db/seed/permissions.ts.

export type BriefingAudience = "decision" | "operations" | "oversight";

export const ROLE_AUDIENCES: Record<string, BriefingAudience> = {
  owner: "decision",
  admin: "decision",
  finance_director: "decision",
  accountant: "operations",
  payroll_officer: "operations",
  cashier: "operations",
  department_manager: "operations",
  employee: "oversight",
  external_auditor: "oversight",
  external_accountant: "oversight",
  donor: "oversight",
};

/** Resolve a role to its audience; unknown/missing roles get the decision
 *  briefing so the dashboard never renders empty. */
export function roleToAudience(
  role: string | null | undefined,
): BriefingAudience {
  return (role && ROLE_AUDIENCES[role]) || "decision";
}

export const AUDIENCE_META: Record<
  BriefingAudience,
  { title: string; subtitle: string }
> = {
  decision: {
    title: "Executive Briefing",
    subtitle: "The state of the business and what needs your decision today.",
  },
  operations: {
    title: "Action Queue",
    subtitle:
      "Work that needs your hands today — approvals, payments, flagged items.",
  },
  oversight: {
    title: "Oversight Briefing",
    subtitle: "Verifiable state — compliance, filings, and period position.",
  },
};
