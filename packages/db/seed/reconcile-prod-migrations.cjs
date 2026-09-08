// One-off: reconcile a DRIFTED production database with the migration journal.
//
// Production predates the migration discipline (db:push era): 24 of 45
// journal entries are stamped, but the live schema already contains objects
// from later migrations (e.g. 0040's status_code column). A plain
// `drizzle-kit migrate` would re-run everything after the watermark and die
// on the first duplicate object — drizzle's pg migrate only compares the
// latest watermark timestamp against each migration's `when`.
//
// This executor applies every pending migration STATEMENT-BY-STATEMENT with
// DRIFT-TOLERANT semantics:
//   * "already exists" errors (duplicate table/column/constraint/function/
//     schema/type) are treated as SATISFIED — the migration's intent already
//     holds on this database — and execution continues.
//   * Any other error ABORTS immediately with the full statement and error.
//   * RLS ENABLE/FORCE statements are DEFERRED (logged, not applied): the
//     app has zero withRlsTransaction adoption today, so enabling RLS now
//     would make every core table return zero rows. Phase 3 applies them
//     after router adoption. CREATE POLICY statements ARE applied (policies
//     are inert until RLS is enabled on the table).
//   * The drizzle journal is stamped with the REAL sha256(file) hash and the
//     journal's `when` timestamp (ON CONFLICT DO NOTHING), so future plain
//     `drizzle-kit migrate` runs see a consistent watermark.
//
// DRY-RUN BY DEFAULT. Pass --apply to execute.
//
// Usage (from packages/db):
//   set -a && source ../../.env.local && set +a
//   node seed/reconcile-prod-migrations.cjs            # dry run
//   node seed/reconcile-prod-migrations.cjs --apply    # execute
const { Client } = require("pg");
const { createHash } = require("crypto");
const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const url = (process.env.DATABASE_URL || "").replace("-pooler", "");
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const dir = path.join(__dirname, "..", "migrations");
const journal = JSON.parse(
  fs.readFileSync(path.join(dir, "meta", "_journal.json"), "utf8"),
);

// Drizzle's pg migrator compares ONLY the latest watermark timestamp.
// Recompute the watermark from the DB's own rows to find the pending set.
// (Rows were stamped with their journal `when` by earlier disciplined runs;
// where they weren't, the pending-set heuristic below is conservative: a
// file whose objects already exist simply gets tolerated through.)
const TOLERATED_CODES = new Set([
  "42P07", // duplicate_table (tables, views, indexes)
  "42710", // duplicate_object (types, constraints, policies, triggers)
  "42701", // duplicate_column
  "42723", // duplicate_function
  "42P06", // duplicate_schema
]);

const RLS_PATTERN = /\b(ENABLE|FORCE)\s+ROW\s+LEVEL\s+SECURITY\b/i;

let applied = 0;
let tolerated = 0;
let deferredRls = 0;
let stamped = 0;

async function main() {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  const host = url.match(/@([^/]+)/)?.[1] ?? "(unknown)";
  console.log(`connected to: ${host}  mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  // ── Pre-flight: 0037 uniqueness pre-check (abort on real violations) ──
  const dupChecks = [
    ["journal_entries.reference", `SELECT entity_id, reference, count(*)::int AS n
        FROM journal_entries WHERE reference IS NOT NULL
        GROUP BY entity_id, reference HAVING count(*) > 1 LIMIT 5`],
    ["journal_entries.entry_number", `SELECT entity_id, entry_number, count(*)::int AS n
        FROM journal_entries WHERE entry_number IS NOT NULL
        GROUP BY entity_id, entry_number HAVING count(*) > 1 LIMIT 5`],
  ];
  for (const [name, q] of dupChecks) {
    try {
      const r = await client.query(q);
      if (r.rows.length > 0) {
        console.error(`ABORT: pre-flight duplicate violation in ${name}:`);
        console.error(JSON.stringify(r.rows, null, 2));
        process.exit(1);
      }
      console.log(`pre-flight OK: ${name} has no duplicates`);
    } catch (e) {
      console.error(`ABORT: pre-flight query failed for ${name}: ${e.message}`);
      process.exit(1);
    }
  }

  // ── Watermark + pending set ──
  const wm = await client.query(
    "SELECT created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1",
  );
  const watermark = wm.rows[0] ? Number(wm.rows[0].created_at) : 0;
  const pending = journal.entries.filter((e) => Number(e.when) > watermark);
  console.log(
    `watermark: ${watermark} | journal entries: ${journal.entries.length} | pending files: ${pending.length}`,
  );

  for (const entry of pending) {
    const file = path.join(dir, `${entry.tag}.sql`);
    const content = fs.readFileSync(file, "utf8");
    const hash = createHash("sha256").update(content).digest("hex");
    const statements = content
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(
      `\n=== ${entry.tag} (${statements.length} statements) ${APPLY ? "" : "[dry-run]"}`,
    );

    if (APPLY) {
      for (const stmt of statements) {
        if (RLS_PATTERN.test(stmt)) {
          deferredRls++;
          console.log(`  DEFERRED (RLS): ${stmt.slice(0, 90)}...`);
          continue;
        }
        try {
          await client.query(stmt);
          applied++;
        } catch (e) {
          if (TOLERATED_CODES.has(e.code)) {
            tolerated++;
            console.log(
              `  tolerated ${e.code}: ${e.message.slice(0, 100)}`,
            );
          } else {
            console.error(`\nABORT in ${entry.tag}:`);
            console.error(`  error: ${e.message}`);
            console.error(`  statement: ${stmt.slice(0, 300)}`);
            process.exit(1);
          }
        }
      }

      // Stamp the journal with the real drizzle-compatible hash + `when`.
      const stamp = await client.query(
        `INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [hash, String(entry.when)],
      );
      if (stamp.rowCount > 0) stamped++;
    } else {
      const rlsCount = statements.filter((s) => RLS_PATTERN.test(s)).length;
      deferredRls += rlsCount;
      console.log(
        `  would apply ${statements.length - rlsCount}, defer ${rlsCount} RLS statements`,
      );
    }
  }

  // ── Post-verification ──
  console.log("\n=== verification ===");
  const eng = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema='public' AND table_name IN ('journal_events','ledger_account_balances')`,
  );
  console.log(
    "engine tables:",
    eng.rows.map((r) => r.table_name).join(", ") || "MISSING",
  );
  const wm2 = await client.query(
    "SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations",
  );
  console.log(`journal rows after: ${wm2.rows[0].n} (was ${journal.entries.length - pending.length} + pending ${pending.length})`);

  console.log(
    `\nDONE${APPLY ? "" : " (dry-run)"} — applied: ${applied}, tolerated: ${tolerated}, RLS deferred: ${deferredRls}, journal stamped: ${stamped}`,
  );
  if (!APPLY) console.log("Re-run with --apply to execute.");
  await client.end();
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
