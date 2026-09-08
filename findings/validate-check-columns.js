// Sweeps ALL migrations: every ALTER TABLE ... CHECK (...) column reference
// must exist on the target table at that point in journal order.
const fs = require("fs");
const dir = "packages/db/migrations";
const j = JSON.parse(fs.readFileSync(dir + "/meta/_journal.json", "utf8"));
const tables = new Map(); // name -> Set<col>

for (const e of j.entries) {
  const sql = fs.readFileSync(`${dir}/${e.tag}.sql`, "utf8");
  const posToLine = (idx) => sql.slice(0, idx).split("\n").length;

  // register creates (columns = quoted identifiers at start of a line inside parens)
  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?([a-zA-Z_][\w]*)"?\s*\(([\s\S]*?)\n\)/g)) {
    const t = m[1].toLowerCase();
    if (!tables.has(t)) tables.set(t, new Set());
    const cols = tables.get(t);
    for (const lm of m[2].matchAll(/^\s*"([a-zA-Z_][\w]*)"/gm)) cols.add(lm[1].toLowerCase());
    for (const lm of m[2].matchAll(/^\s+([a-zA-Z_][\w]*)\s+(uuid|text|varchar|numeric|integer|int|boolean|timestamp|date|jsonb|bigint|real|double)/g)) cols.add(lm[1].toLowerCase());
  }

  // ALTER TABLE ... ADD CONSTRAINT ... CHECK ( ... )
  for (const m of sql.matchAll(/ALTER TABLE (?:ONLY )?"?([a-zA-Z_][\w]*)"?\s+ADD CONSTRAINT\s+"?([\w]+)"?\s+CHECK\s*\(([\s\S]*?)\);/gi)) {
    const t = m[1].toLowerCase();
    const expr = m[3];
    const lineNo = posToLine(m.index);
    const cols = tables.get(t);
    if (!cols) { console.log(`${e.tag}:${lineNo} CHECK on missing table '${t}'`); continue; }
    // candidate column refs inside the expression: identifiers not followed by (
    for (const c of expr.matchAll(/[.]?["]?([a-zA-Z_][\w]*)["]?\s*(?!\()/g)) {
      const col = c[1].toLowerCase();
      if (["not","and","or","is","null","true","false","check","between","in","like","case","when","then","else","end","coalesce","greatest","least","abs","length","lower","upper","now","interval","distinct","cast","as","select","from","where","exists"].includes(col)) continue;
      if (!cols.has(col)) {
        console.log(`${e.tag}:${lineNo} constraint '${m[2]}' on '${t}': column '${col}' does not exist`);
      }
    }
  }

  // track added columns
  for (const m of sql.matchAll(/ALTER TABLE "?([\w]+)"?\s+ADD COLUMN (?:IF NOT EXISTS )?"?([\w]+)"?/gi)) {
    const t = m[1].toLowerCase();
    if (!tables.has(t)) tables.set(t, new Set());
    tables.get(t).add(m[2].toLowerCase());
  }
}
console.log("CHECK sweep done");
