import { neon } from "@neondatabase/serverless";
import { requireDbUrl } from "./db-url";

// ─── Destructive-op safety guard ───────────────────────────────────────────
// DROP SCHEMA public CASCADE wipes EVERY table, row, and policy in the
// database. Never run without an explicit `--yes`. The target host is shown
// so a mispointed DATABASE_URL is obvious before anything happens.
if (!process.argv.includes("--yes")) {
  const url = requireDbUrl();
  let host: string;
  try {
    host = new URL(url).host;
  } catch {
    host = "(unparseable DATABASE_URL)";
  }
  console.error("⛔ REFUSING to reset the database — no --yes flag.");
  console.error(`   Target: ${host}`);
  console.error("");
  console.error("   This command DROPS the entire public schema (all tables,");
  console.error("   rows, RLS policies, everything) and recreates it empty.");
  console.error("   Re-run with --yes to confirm:");
  console.error("     npx tsx seed/reset.ts --yes");
  process.exit(1);
}

const sql = neon(requireDbUrl());

async function main() {
  console.log("Dropping public schema...");
  await sql("DROP SCHEMA IF EXISTS public CASCADE");
  console.log("Creating public schema...");
  await sql("CREATE SCHEMA public");
  console.log("Granting permissions...");
  await sql("GRANT ALL ON SCHEMA public TO public");
  console.log("DONE");
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
