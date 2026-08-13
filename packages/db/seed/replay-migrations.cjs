// One-off: replay all migration .sql files in order against an EMPTY schema.
// drizzle-kit migrate can't run here (the handwritten 0006-0014 migrations
// have no meta snapshots), so this applies the files directly.
//
// Usage (from packages/db):
//   set -a && source ../../apps/web/.env && set +a && node seed/replay-migrations.cjs
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const url = (process.env.DATABASE_URL || "").replace("-pooler", "");
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const dir = path.join(__dirname, "..", "migrations");
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

/** Split a drizzle migration file into individual statements. */
function splitStatements(content) {
  const parts = content.split("--> statement-breakpoint");
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !/^--/.test(p.split("\n")[0]) || p.length > 0);
}

(async () => {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("connected to:", url.match(/@([^/]+)/)[1]);

  let statements = 0;
  for (const f of files) {
    const content = fs.readFileSync(path.join(dir, f), "utf8");
    // No breakpoints = single statement.
    const chunks = content.includes("--> statement-breakpoint")
      ? splitStatements(content)
      : [content.trim()].filter(Boolean);

    for (const chunk of chunks) {
      try {
        await client.query(chunk);
        statements++;
      } catch (e) {
        console.log(`FAIL ${f}: ${e.message.slice(0, 250)}`);
        console.log(`  statement: ${chunk.slice(0, 150)}...`);
        process.exit(1);
      }
    }
    console.log("OK  ", f);
  }

  const r = await client.query(
    "SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'",
  );
  console.log(`DONE - ${statements} statements applied, ${r.rows[0].n} base tables`);
  await client.end();
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
