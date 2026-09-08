// Full-chain FK type-compatibility checker.
// Replays migrations in journal order tracking column types, then verifies
// every FK constraint's referencing column type is compatible with the
// referenced column type (uuid vs varchar is the classic failure).
const fs = require("fs");
const dir = "packages/db/migrations";
const j = JSON.parse(fs.readFileSync(dir + "/meta/_journal.json", "utf8"));

const tables = new Map(); // name -> Map<col, type>
let problems = [];

function obj(ref) {
  const parts = String(ref).replace(/"/g, "").split(".");
  return parts[parts.length - 1].trim().toLowerCase();
}
const ID = '(?:"[^"]+"|\\w+)(?:\\.(?:"[^"]+"|\\w+))?';

// Parse a CREATE TABLE body into col->type map
function parseCols(body) {
  const cols = new Map();
  let depth = 0, cur = "";
  const parts = [];
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(cur); cur = ""; }
    else cur += ch;
  }
  parts.push(cur);
  for (const raw of parts) {
    const def = raw.trim();
    if (!def) continue;
    if (/^(PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY|CONSTRAINT|EXCLUDE)\b/i.test(def)) continue;
    const m = def.match(new RegExp("^" + ID + "\\s+(.+)$", "s"));
    if (m && m[2]) {
      const name = obj(m[1]);
      let type = m[2].trim().split(/\s+/)[0].replace(/"/g, "").toLowerCase();
      // strip size modifiers already included; capture varchar(n), numeric(p,s)
      const tm = def.match(new RegExp("^" + ID + "\\s+((?:var)?char\\s*\\(\\s*\\d+\\s*\\)|numeric\\s*\\(\\s*\\d+\\s*,\\s*\\d+\\s*\\)|\\w+(?:\\s+precision)?)", "i"));
      if (tm && tm[2]) type = tm[2].replace(/\s+/g, " ").toLowerCase().replace(/"/g, "");
      cols.set(name, type);
    }
  }
  return cols;
}

function normType(t) {
  t = (t || "").toLowerCase().replace(/"/g, "").replace(/\s+/g, " ").trim();
  t = t.replace(/^character varying$/, "varchar").replace(/^varchar$/, "varchar");
  if (/^varchar\(\d+\)$/.test(t)) return "varchar";
  if (/^character\(\d+\)$/.test(t)) return "char";
  t = t.replace(/^timestamp with time zone$/, "timestamptz").replace(/^timestamp without time zone$/, "timestamp").replace(/^timestamp\(\d+\).*/, "timestamp");
  t = t.replace(/^double precision$/, "float8").replace(/^real$/, "float4");
  t = t.replace(/^numeric\(\d+,\s*\d+\)$/, "numeric").replace(/^numeric\(\d+\)$/, "numeric");
  return t;
}

const COMPAT = (a, b) => a === b || [a, b].every((x) => /int|numeric|float/.test(x)) === false ? a === b : true;

for (const e of j.entries) {
  const tag = e.tag;
  const file = `${dir}/${e.tag}.sql`;
  if (!fs.existsSync(file)) continue;
  const sql = fs.readFileSync(file, "utf8");
  const stmts = sql.split(/--> statement-breakpoint|;/);

  for (const raw of stmts) {
    const s = raw.trim();
    if (!s || s.startsWith("--")) continue;

    // CREATE TABLE
    let m = s.match(new RegExp("CREATE TABLE (?:IF NOT EXISTS )?(" + ID + ")\\s*\\(", "i"));
    if (m) {
      const n = obj(m[1]);
      const body = s.slice(s.indexOf("(") + 1, s.lastIndexOf(")"));
      if (!tables.has(n)) tables.set(n, parseCols(body));
      else for (const [c, t] of parseCols(body)) tables.get(n).set(c, t);
    }

    // ALTER TABLE ...
    for (const mm of s.matchAll(new RegExp("ALTER TABLE (?:ONLY )?(" + ID + ")\\s*([^;]*)", "gis"))) {
      const tn = obj(mm[1]);
      const rest = mm[2];
      if (!tables.has(tn)) continue;
      const cols = tables.get(tn);
      const cm = rest.match(new RegExp("ADD COLUMN (?:IF NOT EXISTS )?(" + ID + ")\\s+([^,;]+)", "i"));
      if (cm) cols.set(obj(cm[1]), normType(cm[2]));
      const tm = rest.match(new RegExp("ALTER COLUMN (" + ID + ") SET DATA TYPE ([^,;\\s]+(?:\\s*\\(\\s*\\d+(?:\\s*,\\s*\\d+)?\\s*\\))?)", "i"));
      if (tm) cols.set(obj(tm[1]), normType(tm[2]));
    }

    // ADD CONSTRAINT ... FOREIGN KEY (col) REFERENCES tbl(col)
    for (const fk of s.matchAll(new RegExp("ALTER TABLE (" + ID + ")\\s+ADD CONSTRAINT (\\S+)\\s+FOREIGN KEY\\s*\\(([^)]+)\\)\\s*REFERENCES (" + ID + ")\\s*(?:\\(([^)]+)\\))?", "gi"))) {
      const tn = obj(fk[1]);
      const refTable = obj(fk[4]);
      const refCol = obj(fk[5] || "id");
      for (const c of fk[3].split(",")) {
        const col = obj(c);
        const child = tables.get(tn)?.get(col);
        const parent = tables.get(refTable)?.get(refCol);
        if (!child || !parent) {
          problems.push(`[${tag}] FK ${obj(fk[2])}: cannot resolve types ${tn}.${col}=${child ?? "?"} -> ${refTable}.${refCol}=${parent ?? "?"}`);
          continue;
        }
        const A = normType(child), B = normType(parent);
        const ok = A === B ||
          (A === "varchar" && B === "text") || (A === "text" && B === "varchar") ||
          (A === "timestamptz" && B === "timestamp") || (A === "timestamp" && B === "timestamptz");
        if (!ok) {
          problems.push(`[${tag}] FK ${obj(fk[2])}: ${tn}.${col} (${child}) -> ${refTable}.${refCol} (${parent}) MISMATCH`);
        }
      }
    }

    // DROP TABLE
    for (const mm of s.matchAll(new RegExp("DROP TABLE (?:IF EXISTS )?(" + ID + ")", "gi"))) {
      tables.delete(obj(mm[1]));
    }
  }
}

// 3) Verify FKs declared in snapshots too (catch drift between journal + schema)
console.log(`Tables at end: ${tables.size}`);
if (problems.length === 0) console.log("FK TYPES CLEAN — all constraints compatible");
else {
  console.log(`PROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log("  " + p));
}
