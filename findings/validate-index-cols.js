// Focused: every CREATE [UNIQUE] INDEX ... ON table (cols) / WHERE col refs
// must reference existing tables/columns at that point in journal order.
const fs = require("fs");
const dir = "packages/db/migrations";
const j = JSON.parse(fs.readFileSync(dir + "/meta/_journal.json", "utf8"));
const tables = new Map();

for (const e of j.entries) {
  const raw = fs.readFileSync(`${dir}/${e.tag}.sql`, "utf8").replace(/\r\n/g, "\n");
  const posToLine = (idx) => raw.slice(0, idx).split("\n").length;

  for (const m of raw.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?([a-zA-Z_][\w]*)"?\s*\(([\s\S]*?)\n\)/g)) {
    const t = m[1].toLowerCase();
    if (!tables.has(t)) tables.set(t, new Set());
    const cols = tables.get(t);
    for (const lm of m[2].matchAll(/^\s*"([a-zA-Z_][\w]*)"/gm)) cols.add(lm[1].toLowerCase());
  }
  for (const m of raw.matchAll(/ALTER TABLE "?([\w]+)"?\s+ADD COLUMN (?:IF NOT EXISTS )?"?([\w]+)"?/gi)) {
    const t = m[1].toLowerCase();
    if (!tables.has(t)) tables.set(t, new Set());
    tables.get(t).add(m[2].toLowerCase());
  }

  for (const sm of raw.matchAll(/CREATE (?:UNIQUE )?INDEX[^;]+;/gi)) {
    const stmt = sm[0];
    const lineNo = posToLine(sm.index);
    const nm = stmt.match(/INDEX (?:IF NOT EXISTS )?"?([\w]+)"?\s+ON\s+"?([a-zA-Z_][\w]*)"?\s*(?:USING \w+\s*)?\(([\s\S]*?)\)/i);
    if (!nm) continue;
    const t = nm[2].toLowerCase();
    const cols = tables.get(t);
    if (!cols) { console.log(`${e.tag}:${lineNo} INDEX '${nm[1]}' on missing table '${t}'`); continue; }
    for (const part of nm[3].split(",")) {
      const col = part.trim().replace(/^"|"$/g, "").replace(/\s+(asc|desc|NULLS\s+(FIRST|LAST))/gi, "").trim().toLowerCase();
      if (!col || col.includes("(") || col.includes(" ")) continue;
      if (!cols.has(col)) console.log(`${e.tag}:${lineNo} INDEX '${nm[1]}' ON '${t}' missing column '${col}'`);
    }
    const wm = stmt.match(/\bWHERE\b([\s\S]*)$/i);
    if (wm) {
      for (const c of wm[1].matchAll(/"([a-zA-Z_][\w]*)"/g)) {
        if (!cols.has(c[1].toLowerCase())) console.log(`${e.tag}:${lineNo} INDEX '${nm[1]}' WHERE on '${t}' missing column '${c[1]}'`);
      }
    }
  }
}
console.log("INDEX sweep done");
