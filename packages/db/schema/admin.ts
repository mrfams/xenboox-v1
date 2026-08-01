import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── ADMIN ROLES ─────────────────────────────────
// Control-plane roles. Separated from customer/entity roles on purpose —
// admin identity lives in its own tables and is never entity-scoped.

export const adminRoleEnum = pgEnum("admin_role", [
  "super_admin",
  "ops_admin",
  "finance_admin",
  "support_agent",
  "read_only_auditor",
]);

// ─── ADMIN USERS ─────────────────────────────────

export const adminUsers = pgTable("admin_users", {
  id: uuidId(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: adminRoleEnum("role").notNull().default("read_only_auditor"),
  // Mandatory TOTP 2FA. Stored encrypted (AES-256) — see lib/admin/totp.
  totpSecretEncrypted: text("totp_secret_encrypted"),
  totpEnrolled: boolean("totp_enrolled").notNull().default(false),
  // Optional per-account IP allowlist. Null = allow all.
  ipAllowlist: text("ip_allowlist").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdByAdminUserId: uuid("created_by_admin_user_id"),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
  ...timestamps,
});

// ─── ADMIN SESSIONS ──────────────────────────────
// DB-backed sessions so the control plane can enforce concurrency caps,
// inactivity timeouts, hard caps, and instant revocation.

export const adminSessions = pgTable("admin_sessions", {
  id: uuidId(),
  adminUserId: uuid("admin_user_id")
    .notNull()
    .references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
  lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  ...timestamps,
});

// ─── ADMIN AUDIT LOG ─────────────────────────────
// Append-only ledger of every control-plane action. Rows are never updated
// or deleted once written. Includes before/after snapshots for change
// attribution.

export const adminAuditLog = pgTable("admin_audit_log", {
  id: uuidId(),
  actorAdminUserId: uuid("actor_admin_user_id").references(() => adminUsers.id),
  actorRoleAtTimeOfAction: adminRoleEnum("actor_role_at_time_of_action"),
  actionType: text("action_type").notNull(),
  targetEntityType: text("target_entity_type").notNull(),
  targetEntityId: text("target_entity_id"),
  beforeValue: jsonb("before_value"),
  afterValue: jsonb("after_value"),
  reason: text("reason"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});
