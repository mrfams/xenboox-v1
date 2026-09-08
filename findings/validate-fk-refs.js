// Sweeps FK REFERENCES targets: referenced table + column must exist.
const fs = require("fs");
const dir = "packages/db/migrations";
const j = JSON.parse(fs.readFileSync(dir + "/meta/_journal.json", "utf8"));
const tables = new Map();

for (const e of j.entries) {
  const sql = fs.readFileSync(`${dir}/${e.tag}.sql`, "utf8");
  const posToLine = (idx) => sql.slice(0, idx).split("\n").length;

  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?([a-zA-Z_][\w]*)"?\s*\(([\s\S]*?)\n\)/g)) {
    const t = m[1].toLowerCase();
    if (!tables.has(t)) tables.set(t, new Set());
    const cols = tables.get(t);
    for (const lm of m[2].matchAll(/^\s*"([a-zA-Z_][\w]*)"/gm)) cols.add(lm[1].toLowerCase());
  }
  for (const m of sql.matchAll(/ALTER TABLE "?([\w]+)"?\s+ADD COLUMN (?:IF NOT EXISTS )?"?([\w]+)"?/gi)) {
    const t = m[1].toLowerCase();
    if (!tables.has(t)) tables.set(t, new Set());
    tables.get(t).add(m[2].toLowerCase());
  }

  for (const m of sql.matchAll(/REFERENCES\s+"?([a-zA-Z_][\w]*)"?\s*\(\s*"?([a-zA-Z_][\w]*)"?\s*\)/gi)) {
    const rt = m[1].toLowerCase(), rc = m[2].toLowerCase();
    const lineNo = posToLine(m.index);
    const cols = tables.get(rt);
    if (!cols) { console.log(`${e.tag}:${lineNo} REFERENCES missing table '${rt}'`); continue; }
    if (!cols.has(rc)) console.log(`${e.tag}:${lineNo} REFERENCES '${rt}' missing column '${rc}'`);
  }
}
console.log("FK sweep done");
