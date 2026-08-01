/**
 * Bootstrap the first Xenboox admin control-plane account.
 *
 * Usage (from apps/web):
 *   node scripts/create-admin.mjs --email founder@xenboox.com --name "Founder" --password "strong-password"
 *
 * Requires DATABASE_URL and AUTH_SECRET (used to derive the AES key for the
 * TOTP secret) in the environment.
 *
 * Prints the TOTP provisioning data exactly once so the operator can enroll
 * it into their authenticator app. 2FA is mandatory and active immediately.
 */
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import {
  pgEnum,
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import bcrypt from "bcryptjs";
import { generateSecret, generateURI } from "otplib";

const adminRoleEnum = pgEnum("admin_role", [
  "super_admin",
  "ops_admin",
  "finance_admin",
  "support_agent",
  "read_only_auditor",
]);

const adminUsers = pgTable("admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: adminRoleEnum("role").notNull().default("read_only_auditor"),
  totpSecretEncrypted: text("totp_secret_encrypted"),
  totpEnrolled: boolean("totp_enrolled").notNull().default(false),
  ipAllowlist: text("ip_allowlist").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdByAdminUserId: uuid("created_by_admin_user_id"),
  lastLoginAt: timestamp("last_login_at"),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockoutUntil: timestamp("lockout_until"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

function encryptSecret(plain) {
  const base = process.env.AUTH_SECRET ?? "xenboox-dev-secret";
  const key = createHash("sha256").update(`${base}:admin-totp`).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext]
    .map((part) => part.toString("base64"))
    .join(".");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, "");
    const value = argv[i + 1] && !argv[i + 1].startsWith("--")
      ? argv[i + 1]
      : true;
    args[key] = value;
    if (value !== true) i++;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email ?? "").toLowerCase().trim();
  const name = String(args.name ?? "");
  const password = String(args.password ?? "");

  if (!email || !name || !password) {
    console.error(
      "Usage: node scripts/create-admin.mjs --email <email> --name <name> --password <password>",
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required.");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  const existing = await db
    .select()
    .from(adminUsers)
    .where((t) => t.email === email)
    .limit(1);

  if (existing.length > 0) {
    console.error(`An admin user already exists for ${email}.`);
    process.exit(1);
  }

  const existingAny = await db.select().from(adminUsers).limit(1);
  if (existingAny.length > 0) {
    console.error(
      "An admin user already exists. This script only bootstraps the FIRST admin account.",
    );
    process.exit(1);
  }

  const secret = generateSecret();
  const otpauthUri = generateURI({
    issuer: "Xenboox Admin",
    label: email,
    secret,
  });
  const passwordHash = await bcrypt.hash(password, 12);
  const totpSecretEncrypted = encryptSecret(secret);

  await db.insert(adminUsers).values({
    email,
    name,
    passwordHash,
    role: "super_admin",
    totpSecretEncrypted,
    totpEnrolled: true,
    isActive: true,
  });

  console.log("Admin account created successfully.\n");
  console.log("Email:            " + email);
  console.log("Role:             super_admin");
  console.log("2FA:              TOTP (enrolled, mandatory)");
  console.log("\nEnroll the secret below into your authenticator app");
  console.log("(e.g. Google Authenticator / Authy) before signing in:\n");
  console.log("TOTP Secret:      " + secret);
  console.log("otpauth:// URI:   " + otpauthUri + "\n");
  console.log("Sign in at:       /admin-login");
}

main().catch((err) => {
  console.error("Failed to create admin account:", err);
  process.exit(1);
});
