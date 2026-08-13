/**
 * Setup Demo Admin User
 *
 * Creates an admin user for demo@xenboox.com with TOTP 2FA.
 * Run this script to set up admin access.
 *
 * Usage: cd packages/db && set -a && source ../../.env.local && set +a \
 *        && npx tsx seed/setup-demo-admin.ts
 *
 * Requires DATABASE_URL in the environment (see ./db-url.ts).
 */

import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { generateSecret } from "otplib";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { requireDbUrl } from "./db-url";

const sql = neon(requireDbUrl());

const DEMO_PASSWORD = "admin123";

/**
 * Encrypt a TOTP secret with AES-256-GCM (same format as lib/admin/totp.ts).
 * Format: iv.tag.ciphertext (base64).
 */
function encryptSecret(plain: string): string {
  const ALGO = "aes-256-gcm";
  const IV_LENGTH = 12;
  const base = process.env.AUTH_SECRET;
  if (!base) {
    throw new Error(
      "AUTH_SECRET environment variable is required for TOTP encryption.",
    );
  }
  const key = createHash("sha256").update(`${base}:admin-totp`).digest();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((part) => part.toString("base64")).join(".");
}

async function main() {
  console.log("Setting up demo admin user...\n");

  // Check if admin user exists
  const existing = await sql`
    SELECT id, email, totp_enrolled FROM admin_users WHERE email = 'demo@xenboox.com'
  `;

  let userId: string;
  if (existing.length === 0) {
    // New user — generate TOTP secret and encrypt it
    const totpSecret = generateSecret();
    const encryptedSecret = encryptSecret(totpSecret);
    userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

    await sql`
      INSERT INTO admin_users (
        id, email, password_hash, name, role, 
        totp_secret_encrypted, totp_enrolled, is_active,
        created_at, updated_at
      ) VALUES (
        ${userId}, 
        'demo@xenboox.com', 
        ${passwordHash},
        'Demo Admin', 
        'super_admin',
        ${encryptedSecret},
        true,
        true,
        NOW(), 
        NOW()
      )
    `;
    console.log("Created admin user: demo@xenboox.com");
    console.log(`  TOTP secret (encrypted): ${encryptedSecret}`);
  } else {
    userId = existing[0].id;
    const alreadyEnrolled = existing[0].totp_enrolled;

    if (alreadyEnrolled) {
      // Already enrolled — do NOT regenerate TOTP secret
      console.log("Admin user already exists with TOTP enrolled — skipping.");
      console.log("  To reset TOTP, run: pnpm db:seed (full reset)");
    } else {
      // Exists but not enrolled — generate new secret
      const totpSecret = generateSecret();
      const encryptedSecret = encryptSecret(totpSecret);
      const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
      await sql`
        UPDATE admin_users 
        SET password_hash = ${passwordHash},
            totp_secret_encrypted = ${encryptedSecret},
            totp_enrolled = true,
            is_active = true,
            role = 'super_admin',
            updated_at = NOW()
        WHERE email = 'demo@xenboox.com'
      `;
      console.log("Updated admin user: demo@xenboox.com");
      console.log(`  TOTP secret (encrypted): ${encryptedSecret}`);
    }
  }

  console.log("\n✅ Admin user configured!\n");
  console.log("Login credentials:");
  console.log("  Email: demo@xenboox.com");
  console.log("  Password: admin123");
  console.log("\nTo login:");
  console.log("  1. Go to /admin-login");
  console.log("  2. Enter email and password");
  console.log("  3. Enter the 6-digit TOTP code from your authenticator app");
  console.log(
    "\nIf TOTP is not set up, use /admin/settings to enroll your authenticator.",
  );
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
