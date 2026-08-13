// One-off: create every schema-declared index that drizzle-kit push missed
// (the interrupted push left non-PK indexes out). Reads the 0028 snapshot's
// index metadata and issues CREATE INDEX IF NOT EXISTS per index.
//
// Usage (from packages/db):
//   set -a && source ../../apps/web/.env && set +a && node seed/sync-indexes.cjs
const { Client } = require("pg");
const snapshot = require("../migrations/meta/0028_snapshot.json");

const url = (process.env.DATABASE_URL || "").replace("-pooler", "");
if (!url) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

function quoteCol(expr, isExpression) {
  if (isExpression) return expr;
  return `"${expr}"`;
}

(async () => {
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log("connected to:", url.match(/@([^/]+)/)[1]);

  const tables = snapshot.tables || {};
  let created = 0;
  let skipped = 0;

  for (const [fullName, table] of Object.entries(tables)) {
    const tableName = fullName.split(".").pop();
    const indexes = table.indexes || {};
    for (const idx of Object.values(indexes)) {
      if (idx.name === `${tableName}_pkey`) continue; // PK already exists
      const cols = (idx.columns || [])
        .map((c) => `${quoteCol(c.expression, c.isExpression)}`)
        .join(", ");
      const unique = idx.isUnique ? "UNIQUE " : "";
      const method = idx.method && idx.method !== "btree" ? ` USING ${idx.method}` : "";
      const ddl = `CREATE ${unique}INDEX IF NOT EXISTS "${idx.name}" ON "${tableName}"${method} (${cols})`;
      try {
        await client.query(ddl);
        created++;
      } catch (e) {
        // column missing (drift) or dup — report and continue
        console.log(`skip ${idx.name}: ${e.message.slice(0, 120)}`);
        skipped++;
      }
    }
  }

  console.log(`\nDONE - created ${created} indexes, skipped ${skipped}`);
  await client.end();
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
