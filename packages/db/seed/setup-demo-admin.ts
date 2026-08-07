/**
 * Setup Demo Admin User
 *
 * Creates an admin user for demo@xenboox.com with TOTP 2FA.
 * Run this script to set up admin access.
 *
 * Usage: npx tsx packages/db/seed/setup-demo-admin.ts
 */

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../schema";
import { adminUsers } from "../schema/admin";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const DATABASE_URL =
  "postgresql://neondb_owner:npg_hS1rq9sLmjnP@ep-crimson-lake-abh33lg6-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require";

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema: schema as any });

// Simple TOTP secret for demo (in production, use proper encryption)
const DEMO_TOTP_SECRET = "JBSWY3DPEHPK3PXP"; // Base32 encoded secret
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
  console.log("  Secret: JBSWY3DPEHPK3PXP");
  console.log(
    "  Use this in your authenticator app (Google Authenticator, Authy, etc.)",
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
