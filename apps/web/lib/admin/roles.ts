export type AdminRole =
  | "super_admin"
  | "ops_admin"
  | "finance_admin"
  | "support_agent"
  | "read_only_auditor";

export const ADMIN_ROLES: readonly AdminRole[] = [
  "super_admin",
  "ops_admin",
  "finance_admin",
  "support_agent",
  "read_only_auditor",
];

export type AdminEpic =
  | "admin_users"
  | "admin_sessions"
  | "audit_log"
  | "model_control_plane"
  | "eval_pipeline"
  | "observability"
  | "cost"
  | "prompt_registry"
  | "jurisdiction_registry"
  | "billing"
  | "impersonation"
  | "customer_audit";

export const ADMIN_EPICS: readonly AdminEpic[] = [
  "admin_users",
  "admin_sessions",
  "audit_log",
  "model_control_plane",
  "eval_pipeline",
  "observability",
  "cost",
  "prompt_registry",
  "jurisdiction_registry",
  "billing",
  "impersonation",
  "customer_audit",
];

export type PermissionLevel = "none" | "read" | "write";

type EpicOverrides = Partial<Record<AdminEpic, PermissionLevel>>;

/**
 * Role × epic permission matrix for the admin control plane.
 * Base rule: no access. Explicit entries grant read or write.
 * `write` implies `read`.
 */
const PERMISSION_MATRIX: Record<AdminRole, EpicOverrides> = {
  super_admin: {
    admin_users: "write",
    admin_sessions: "write",
    audit_log: "write",
    model_control_plane: "write",
    eval_pipeline: "write",
    observability: "write",
    cost: "write",
    prompt_registry: "write",
    jurisdiction_registry: "write",
    billing: "write",
    impersonation: "write",
    customer_audit: "write",
  },
  ops_admin: {
    model_control_plane: "write",
    eval_pipeline: "write",
    observability: "write",
    prompt_registry: "write",
    jurisdiction_registry: "write",
    admin_sessions: "read",
    audit_log: "read",
    customer_audit: "read",
  },
  finance_admin: {
    billing: "write",
    cost: "read",
    audit_log: "read",
  },
  support_agent: {
    impersonation: "read",
    customer_audit: "read",
    audit_log: "read",
  },
  read_only_auditor: {
    admin_users: "read",
    admin_sessions: "read",
    audit_log: "read",
    model_control_plane: "read",
    eval_pipeline: "read",
    observability: "read",
    cost: "read",
    prompt_registry: "read",
    jurisdiction_registry: "read",
    billing: "read",
    impersonation: "read",
    customer_audit: "read",
  },
};

export function getAdminPermission(
  role: AdminRole,
  epic: AdminEpic,
): PermissionLevel {
  const level = PERMISSION_MATRIX[role]?.[epic] ?? "none";
  return level;
}

/**
 * Whether a role may perform `mode` on an epic. `write` requires "write";
 * `read` requires "read" or "write".
 */
export function hasAdminPermission(
  role: AdminRole,
  epic: AdminEpic,
  mode: "read" | "write",
): boolean {
  const level = getAdminPermission(role, epic);
  if (level === "none") return false;
  if (mode === "write") return level === "write";
  return true;
}

/** Only the super admin manages admin accounts. */
export function canManageAdminUsers(role: AdminRole): boolean {
  return role === "super_admin";
}

/** Only the super admin can revoke another admin's sessions. */
export function canRevokeAnySession(role: AdminRole): boolean {
  return role === "super_admin";
}
