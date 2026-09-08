// Validates migrations: every ALTER TABLE / ON TABLE / UPDATE / DELETE / INSERT INTO / DROP TABLE
// reference must be to a table that exists at that point in journal order, with existing columns.
const fs = require("fs");
const path = require("path");
const dir = "packages/db/migrations";
const j = JSON.parse(fs.readFileSync(path.join(dir, "meta/_journal.json"), "utf8"));
const files = j.entries.map((e) => e.tag + ".sql");

// table -> Set<column>
const tables = new Map();
const problems = [];

function ident(s) {
  return s.replace(/"/g, "").trim();
}
function getCols(t) {
  return tables.get(t.toLowerCase());
}
function checkCols(file, lineNo, t, cols, ctx) {
  const tc = getCols(t);
  if (!tc) {
    problems.push(`${file}:${lineNo} table '${t}' does not exist yet (${ctx})`);
    return;
  }
  for (const c of cols) {
    const col = ident(c).toLowerCase();
    if (col && col !== "*" && !col.includes("(") && !tc.has(col) && !tc.has(col.replace(/^"|"$/g, ""))) {
      problems.push(`${file}:${lineNo} table '${t}' has no column '${col}' (${ctx})`);
    }
  }
}

for (const f of files) {
  const sql = fs.readFileSync(path.join(dir, f), "utf8");
  const lines = sql.split("\n");
  const posToLine = (idx) => sql.slice(0, idx).split("\n").length;

  // 1) CREATE TABLE ... ( ... );  capture columns
  for (const m of sql.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?"?([a-zA-Z_][\w]*)"?\s*\(([\s\S]*?)\n\)/g)) {
    const t = ident(m[1]).toLowerCase();
    const cols = new Set();
    for (const lm of m[2].matchAll(/"([a-zA-Z_][\w]*)"\s+[a-zA-Z]/g)) cols.add(lm[1].toLowerCase());
    tables.set(t, cols);
  }

  // 2) ALTER TABLE statements
  for (const m of sql.matchAll(/ALTER TABLE (?:ONLY )?(?:IF EXISTS )?"?([a-zA-Z_][\w]*)"?\s+([^;]+);/g)) {
    const t = ident(m[1]).toLowerCase();
    const body = m[2];
    const lineNo = posToLine(m.index);
    const tc = getCols(t);
    if (!tc) {
      problems.push(`${f}:${lineNo} ALTER TABLE '${t}' — table does not exist yet`);
      continue;
    }
    // ADD COLUMN / ALTER COLUMN / DROP COLUMN / RENAME
    for (const c of body.matchAll(/(?:ADD COLUMN (?:IF NOT EXISTS )?|ALTER COLUMN|DROP COLUMN (?:IF EXISTS )?|RENAME COLUMN)\s+"?([a-zA-Z_][\w]*)"?/gi)) {
      const col = ident(c[1]).toLowerCase();
      if (/^add column/i.test(c[0])) tc.add(col); // creates it
      else if (!tc.has(col)) problems.push(`${f}:${lineNo} ALTER '${t}' references missing column '${col}'`);
    }
    // USING "col":: / SET DEFAULT references? capture quoted identifiers in CHECK/USING
    for (const c of body.matchAll(/USING\s+"?([a-zA-Z_][\w]*)"?/gi)) {
      const col = ident(c[1]).toLowerCase();
      if (!tc.has(col)) problems.push(`${f}:${lineNo} ALTER '${t}' USING references missing column '${col}'`);
    }
  }

  // 3) CREATE INDEX / CREATE POLICY / GRANT / ON TABLE refs
  for (const m of sql.matchAll(/ON (?:ONLY )?"?([a-zA-Z_][\w]*)"?\s*(\([^)]*\))?/g)) {
    const t = ident(m[1]).toLowerCase();
    const lineNo = posToLine(m.index);
    if (["delete", "update", "insert", "conflict", "cascade", "restrict", "commit"].includes(t)) continue;
    if (!getCols(t)) {
      problems.push(`${f}:${lineNo} 'ON ${t}' — table does not exist yet`);
      continue;
    }
    if (m[2]) {
      // index/policy columns
      for (const c of m[2].split(",")) {
        const col = ident(c).replace(/\s+(asc|desc|NULLS FIRST|NULLS LAST)/gi, "").toLowerCase();
        const tc = getCols(t);
        if (col && !col.includes("(") && col !== "true" && col !== "false" && tc && !tc.has(col) && !/^[a-z_]+$/.test(col) === false) {
          if (!tc.has(col)) problems.push(`${f}:${lineNo} ON ${t}(${col}) — missing column`);
        }
      }
    }
  }

  // 4) UPDATE / DELETE FROM / INSERT INTO
  for (const m of sql.matchAll(/(?:UPDATE|DELETE FROM|INSERT INTO)\s+"?([a-zA-Z_][\w]*)"?\s*\.?([a-zA-Z_][\w]*)?/gi)) {
    const name = ident(m[2] || m[1]).toLowerCase();
    if (["set", "values", "default", "where"].includes(name)) continue;
    if (m[2] && ident(m[1]) !== "public" && !getCols(ident(m[1]).toLowerCase())) continue; // schema.table handled below
    const lineNo = posToLine(m.index);
    if (!getCols(name)) problems.push(`${f}:${lineNo} ${m[0].split(/\s/)[0].toUpperCase()} '${name}' — table does not exist yet`);
  }

  // 5) DROP TABLE
  for (const m of sql.matchAll(/DROP TABLE (?:IF EXISTS )?"?([a-zA-Z_][\w]*)"?/gi)) {
    const t = ident(m[1]).toLowerCase();
    if (!getCols(t)) problems.push(`${f}:${posToLine(m.index)} DROP TABLE '${t}' — never created`);
    tables.delete(t);
  }

  // 6) ALTER TABLE x RENAME TO y
  for (const m of sql.matchAll(/ALTER TABLE "?([\w]+)"?\s+RENAME TO\s+"?([\w]+)"?/gi)) {
    const from = ident(m[1]).toLowerCase(), to = ident(m[2]).toLowerCase();
    if (tables.has(from)) { tables.set(to, tables.get(from)); tables.delete(from); }
    else problems.push(`${f}:${posToLine(m.index)} RENAME '${from}' — never created`);
  }
}

console.log(problems.length ? problems.join("\n") : "ALL MIGRATION REFERENCES VALID");
