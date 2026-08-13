// One-off: apply the handwritten "mechanism" migrations that drizzle-kit push
// does NOT generate (RLS policies, audit triggers, legal enums/tables, check
// constraints, unique indexes). Safe to run against a schema freshly created
// by `drizzle-kit push`; "already exists" errors are tolerated.
//
// Skipped: 0009 (enum ADD VALUE — push already created the final enum).
//
// Usage (from packages/db):
//   set -a && source ../../apps/web/.env && set +a && node seed/apply-mechanisms.cjs
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const url = (process.env.DATABASE_URL || "").replace("-pooler", "");
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const FILES = [
  "0006_enable_rls.sql",
  "0010_rls_remaining_tables.sql",
  "0011_immutable_audit_trail.sql",
  "0012_legal_mechanisms.sql",
  "0013_financial_check_constraints.sql",
  "0014_unique_constraints_and_indexes.sql",
];

const TOLERABLE =
  /already exists|duplicate object|duplicate key value|multiple primary keys|does not exist/i;

(async () => {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("connected to:", url.match(/@([^/]+)/)[1]);

  for (const f of FILES) {
    const full = path.join(__dirname, "..", "migrations", f);
    const content = fs.readFileSync(full, "utf8");
    const chunks = content.includes("--> statement-breakpoint")
      ? content
          .split("--> statement-breakpoint")
          .map((p) => p.trim())
          .filter(Boolean)
      : [content.trim()];

    for (const chunk of chunks) {
      try {
        await client.query(chunk);
        process.stdout.write(".");
      } catch (e) {
        if (TOLERABLE.test(e.message)) {
          process.stdout.write("s"); // skipped: already exists
        } else {
          console.log(`\nFAIL ${f}: ${e.message.slice(0, 250)}`);
          console.log(`  statement: ${chunk.slice(0, 180)}...`);
          process.exit(1);
        }
      }
    }
    console.log(`\nOK  ${f}`);
  }

  const r = await client.query(
    "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public' AND rowsecurity=true",
  );
  console.log(`\nDONE - ${r.rows[0].n} tables now have RLS enabled`);
  await client.end();
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
