import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { uuidId, entityId, timestamps } from "./helpers";
import { entityRoleEnum, entities } from "./organization";
import { users } from "./auth";

// ─── MODULE ENUM ────────────────────────────────
// All 20+ modules in the Xenboox platform

export const rbacModuleEnum = pgEnum("rbac_module", [
  "general_ledger",
  "chart_of_accounts",
  "bank_reconciliation",
  "mobile_money",
  "accounts_payable",
  "accounts_receivable",
  "cash_imprest",
  "payroll",
  "invoicing",
  "expense_management",
  "fixed_assets",
  "inventory",
  "budgeting",
  "financial_reporting",
  "tax_compliance",
  "audit_preparation",
  "donor_grant_reporting",
  "multi_entity",
  "multi_currency",
  "document_management",
  "analytics_insights",
  "settings_users",
  "settings_entities",
  "settings_billing",
]);

// ─── ACTION ENUM ────────────────────────────────
// Every distinct action a user can perform on a module

export const rbacActionEnum = pgEnum("rbac_action", [
  "view",
  "create",
  "edit",
  "approve",
  "post",
  "delete",
  "export",
  "configure",
]);

// ─── SCOPE TYPE ENUM ────────────────────────────
// How a permission is scoped

export const rbacScopeEnum = pgEnum("rbac_scope", [
  "full", // ✅ — full access
  "scoped", // 🟡 — conditional/scoped access
  "none", // ⛔ — no access
]);

// ─── ROLE PERMISSIONS TABLE ─────────────────────
// The core RBAC Matrix: role × module × action × scope
// This is the source of truth for all permission checks

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuidId(),
    role: entityRoleEnum("role").notNull(),
    module: rbacModuleEnum("module").notNull(),
    action: rbacActionEnum("action").notNull(),
    scope: rbacScopeEnum("scope").notNull().default("none"),
    // For scoped permissions, a JSON condition that gets evaluated at runtime
    // e.g. { "threshold": 50000, "field": "amount", "comparison": "lte" }
    // e.g. { "department": "own", "scope_type": "self_only" }
    scopeCondition: text("scope_condition"),
    // Human-readable description of what this permission grants
    description: text("description"),
    // Only Org Owner/Admin can modify
    ...timestamps,
  },
  (t) => [
    uniqueIndex("role_permissions_unique").on(t.role, t.module, t.action),
    index("role_permissions_role").on(t.role),
    index("role_permissions_module").on(t.module),
  ],
);

export const rolePermissionsRelations = relations(
  rolePermissions,
  ({}) => ({}),
);

// ─── USER PERMISSION OVERRIDES ──────────────────
// Per-user exceptions to the role-based permissions
// Allows granting or revoking specific permissions for specific users.
// Scoped to entity_id — an override for Entity A does not apply to Entity B.

export const userPermissionOverrides = pgTable(
  "user_permission_overrides",
  {
    id: uuidId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entityId: entityId.references(() => entities.id, { onDelete: "cascade" }),
    module: rbacModuleEnum("module").notNull(),
    action: rbacActionEnum("action").notNull(),
    grant: boolean("grant").notNull().default(true), // true = grant, false = revoke
    grantedBy: uuid("granted_by").references(() => users.id),
    reason: text("reason"),
    expiresAt: timestamp("expires_at"),
    ...timestamps,
  },
  (t) => [
    index("user_permission_overrides_user").on(t.userId),
    index("user_permission_overrides_entity").on(t.entityId),
    uniqueIndex("user_perm_override_unique").on(
      t.userId,
      t.entityId,
      t.module,
      t.action,
    ),
  ],
);

export const userPermissionOverridesRelations = relations(
  userPermissionOverrides,
  ({}) => ({}),
);

// ─── AUDIT LOG FOR PERMISSION CHANGES ───────────

export const permissionAuditLog = pgTable(
  "permission_audit_log",
  {
    id: uuidId(),
    userId: uuid("user_id").notNull(),
    action: text("action").notNull(), // 'role_permission_updated', 'override_granted', 'override_revoked'
    targetUserId: uuid("target_user_id"),
    targetRole: entityRoleEnum("target_role"),
    module: rbacModuleEnum("module"),
    actionName: rbacActionEnum("action_name"),
    oldScope: rbacScopeEnum("old_scope"),
    newScope: rbacScopeEnum("new_scope"),
    details: text("details"),
    ...timestamps,
  },
  (t) => [index("permission_audit_log_user").on(t.userId)],
);
