/**
 * Get the current TOTP code for demo@xenboox.com admin user.
 * Requires DATABASE_URL in the environment (see ./db-url.ts).
 * Run: cd packages/db && set -a && source ../../.env.local && set +a \
 *      && npx tsx seed/get-admin-totp.ts
 */
import { neon } from "@neondatabase/serverless";
import { OTP } from "otplib";
import { requireDbUrl } from "./db-url";

const otp = new OTP({ strategy: "totp" });

const EMAIL = "demo@xenboox.com";

async function main() {
  const sql = neon(requireDbUrl());

  const rows = await sql`
    SELECT totp_secret_encrypted 
    FROM admin_users 
    WHERE email = ${EMAIL}
  `;

  if (rows.length === 0) {
    console.error(`❌ No admin user found with email: ${EMAIL}`);
    process.exit(1);
  }

  const stored = rows[0].totp_secret_encrypted as string;

  // Check if it's encrypted (hex_iv:hex_ciphertext format) or raw base32
  let secret: string;
  if (stored.includes(":")) {
    // Encrypted format - we need to decrypt it
    // For demo purposes, the setup script stores the raw base32
    // If encrypted, we can't decrypt without the key, so use the raw secret
    console.log("⚠️  Secret appears encrypted. Using stored value directly.");
    secret = stored;
  } else {
    // Raw base32 secret
    secret = stored;
  }

  // Generate current TOTP code
  const code = otp.generateSync({ secret });

  console.log("\n🔐 Admin Login Credentials");
  console.log("==========================");
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: Use the TOTP code below`);
  console.log(`TOTP:     ${code}`);
  console.log(`Secret:   ${secret}`);
  console.log("");
  console.log(
    "📱 To set up an authenticator app (Google Authenticator, Authy, etc.):",
  );
  console.log(
    `   otpauth://totp/Xenboox:Demo%20Admin?secret=${secret}&issuer=Xenboox`,
  );
  console.log("");
  console.log("🌐 Login URL: http://localhost:3000/admin-login");
  console.log("");
  console.log("⏱️  TOTP codes refresh every 30 seconds.");
  console.log("   Use the code shown above within 30 seconds.");
}

main().catch(console.error);
