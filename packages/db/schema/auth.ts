import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  uniqueIndex,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { uuidId, timestamps } from "./helpers";

// ─── USERS ───────────────────────────────────────

export const users = pgTable("users", {
  id: uuidId(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified"),
  image: text("image"),
  passwordHash: text("password_hash"),
  // Password reset
  resetPasswordToken: text("reset_password_token"),
  resetPasswordExpires: timestamp("reset_password_expires"),
  // Account lockout
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
  // Two-factor authentication
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  backupCodes: text("backup_codes"),
  ...timestamps,
});

// ─── ACCOUNTS (OAuth providers) ──────────────────

export const accounts = pgTable(
  "accounts",
  {
    id: uuidId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refreshToken: text("refresh_token"),
    accessToken: text("access_token"),
    expiresAt: bigint("expires_at", { mode: "number" }),
    tokenType: text("token_type"),
    scope: text("scope"),
    idToken: text("id_token"),
    sessionState: text("session_state"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("accounts_provider_provider_account_id").on(
      t.provider,
      t.providerAccountId,
    ),
  ],
);

// ─── SESSIONS ────────────────────────────────────

export const sessions = pgTable("sessions", {
  id: uuidId(),
  sessionToken: text("session_token").notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  ...timestamps,
});

// ─── VERIFICATION TOKENS ─────────────────────────

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires").notNull(),
  },
  (t) => [
    uniqueIndex("verification_tokens_identifier_token").on(
      t.identifier,
      t.token,
    ),
  ],
);
