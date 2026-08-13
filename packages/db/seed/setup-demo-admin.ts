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
import { requireDbUrl } from "./db-url";

const sql = neon(requireDbUrl());

// A fresh 32-char base32 secret (20 bytes) is generated per run.
// NOTE: the old hardcoded "JBSWY3DPEHPK3PXP" is only 10 bytes — otplib's
// verifySync requires >= 16 bytes, so logins with it always failed.
const DEMO_TOTP_SECRET = generateSecret();
const DEMO_PASSWORD = "admin123";

async function main() {
  console.log("Setting up demo admin user...\n");

  // Check if admin user exists
  const existing = await sql`
    SELECT id, email FROM admin_users WHERE email = 'demo@xenboox.com'
  `;

  let userId: string;
  if (existing.length === 0) {
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
        ${DEMO_TOTP_SECRET},
        true,
        true,
        NOW(), 
        NOW()
      )
    `;
    console.log("Created admin user: demo@xenboox.com");
  } else {
    userId = existing[0].id;
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
    await sql`
      UPDATE admin_users 
      SET password_hash = ${passwordHash},
          totp_secret_encrypted = ${DEMO_TOTP_SECRET},
          totp_enrolled = true,
          is_active = true,
          role = 'super_admin',
          updated_at = NOW()
      WHERE email = 'demo@xenboox.com'
    `;
    console.log("Updated admin user: demo@xenboox.com");
  }

  console.log("\n✅ Admin user configured!\n");
  console.log("Login credentials:");
  console.log("  Email: demo@xenboox.com");
  console.log("  Password: admin123");
  console.log("\nTOTP 2FA Setup:");
  console.log(`  Secret: ${DEMO_TOTP_SECRET}`);
  console.log(
    "  Use this in your authenticator app (Google Authenticator, Authy, etc.)",
  );
  console.log(
    "  Tip: re-run `npx tsx seed/get-admin-totp.ts` to print the current code.",
  );
  console.log("\nTo login:");
  console.log("  1. Go to /admin-login");
  console.log("  2. Enter email and password");
  console.log("  3. Enter the 6-digit TOTP code from your authenticator app");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
