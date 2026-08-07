import fs from "fs";
import path from "path";
import pg from "pg";

const env = fs.readFileSync("apps/web/.env", "utf8");
const m = env.match(/DATABASE_URL[=\"']+([^\"'\n]+)/);
const url = m[1].trim().replace(/^\"|\"$/g, "");
const { Pool } = pg;
const pool = new Pool({ connectionString: url, ssl: { rejectUnauthorized: false } });

const dir = "packages/db/migrations";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql") && /^\d{4}/.test(f)).sort();
// Topological fix: apply everything except 0010 first, then 0010's RLS policies last
const order = [...files.filter((f) => !f.startsWith("0010")), ...files.filter((f) => f.startsWith("0010"))];

for (const file of order) {
  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  const statements = sql.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
  let ok = 0;
  for (const stmt of statements) {
    try {
      await pool.query(stmt);
      ok++;
    } catch (e) {
      console.log(`FAIL ${file}: ${e.message?.slice(0, 110)}`);
      console.log(`  stmt: ${stmt.slice(0, 90).replace(/\n/g, " ")}`);
    }
  }
  console.log(`${file}: ${ok}/${statements.length} statements OK`);
}
await pool.end();
console.log("DONE");
