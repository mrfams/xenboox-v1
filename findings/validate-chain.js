// Full-chain migration state simulator.
// Replays every migration in journal order and validates that each statement
// can execute on a fresh database: CREATEs that collide, ALTERs on missing
// tables/columns, DROPs on missing objects, CREATE INDEX on missing columns.
const fs = require("fs");
const dir = "packages/db/migrations";
const j = JSON.parse(fs.readFileSync(dir + "/meta/_journal.json", "utf8"));

const tables = new Map(); // name -> { cols: Set, created: tag }
const enums = new Map(); // name -> Set of values
const indexes = new Set();
const policies = new Set();
const constraints = new Set(); // "table.constraint"
let problems = [];

function norm(s) {
  return (s || "").replace(/"/g, "").trim().toLowerCase();
}
// "public"."doc_status" or public.doc_status or doc_status -> doc_status
function obj(ref) {
  const parts = String(ref).split(".");
  return norm(parts[parts.length - 1]);
}
// Matches optionally-quoted, optionally schema-qualified identifiers
const ID = "(?:\"[^\"]+\"|\\w+)(?:\\.(?:\"[^\"]+\"|\\w+))?";

function ensureTable(name, tag) {
  if (!tables.has(name)) {
    problems.push(`[${tag}] references missing table "${name}"`);
    tables.set(name, { cols: new Set(), created: tag });
  }
  return tables.get(name);
}

function parseCols(body) {
  const cols = new Set();
  let depth = 0,
    cur = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      cur = cur.trim();
      if (cur && !/^(PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY|CONSTRAINT|EXCLUDE)\b/i.test(cur))
        cols.add(norm(cur.split(/[\s(]/)[0]));
      cur = "";
    } else cur += ch;
  }
  cur = cur.trim();
  if (cur && !/^(PRIMARY KEY|UNIQUE|CHECK|FOREIGN KEY|CONSTRAINT|EXCLUDE)\b/i.test(cur))
    cols.add(norm(cur.split(/[\s(]/)[0]));
  return cols;
}

function colRefs(sql) {
  // Find CREATE INDEX / ALTER TABLE ... ADD CONSTRAINT ... (col list) references
  const out = [];
  const idx = [...sql.matchAll(new RegExp("CREATE (?:UNIQUE )?INDEX (?:CONCURRENTLY )?(?:IF NOT EXISTS )?\\S+ ON (?:ONLY )?(" + ID + ")\\s*(?:USING \\w+)?\\s*\\(([^;]+)\\)", "gi"))];
  for (const m of idx) out.push({ kind: "index", table: obj(m[1]), cols: m[2] });
  const pk = [...sql.matchAll(new RegExp("ALTER TABLE (?:ONLY )?(" + ID + ")\\s*ADD (?:CONSTRAINT \\S+ )?PRIMARY KEY\\s*\\(([^;]+)\\)", "gi"))];
  for (const m of pk) out.push({ kind: "pk", table: obj(m[1]), cols: m[2] });
  return out;
}

for (const e of j.entries) {
  const tag = e.tag;
  const file = `${dir}/${e.tag}.sql`;
  if (!fs.existsSync(file)) continue;
  const sql = fs.readFileSync(file, "utf8");
  const stmts = sql.split(/;\s*(?:--> statement-breakpoint\s*)?|\n--> statement-breakpoint\n?/);

  for (const raw of stmts) {
    const s = raw.trim();
    if (!s) continue;
    const S = s.toUpperCase();

    // DROP TYPE (removes from enum registry)
    for (const mm of s.matchAll(new RegExp("DROP TYPE (?:IF EXISTS )?(" + ID + ")", "gi"))) {
      enums.delete(obj(mm[1]));
    }
    // CREATE TYPE
    let m = s.match(/CREATE TYPE (?:IF NOT EXISTS )?("?[\w.]+"?)/i);
    if (m && !/^CREATE TYPE AS/i.test(s) === false) {}
    m = s.match(new RegExp("CREATE TYPE\\s+(" + ID + ")", "i"));
    if (m) {
      const n = obj(m[1]);
      if (enums.has(n)) problems.push(`[${tag}] CREATE TYPE "${n}" already exists (${enums.get(n).created})`);
      else enums.set(n, { values: new Set(), created: tag });
    }
    // CREATE TABLE
    m = s.match(new RegExp("CREATE TABLE (?:IF NOT EXISTS )?(" + ID + ")\\s*\\(", "i"));
    if (m) {
      const n = obj(m[1]);
      const body = s.slice(s.indexOf("(") + 1, s.lastIndexOf(")"));
      if (tables.has(n) && !/IF NOT EXISTS/i.test(s))
        problems.push(`[${tag}] CREATE TABLE "${n}" collides with ${tables.get(n).created}`);
      if (!tables.has(n)) tables.set(n, { cols: parseCols(body), created: tag });
      else tables.get(n).cols = new Set([...tables.get(n).cols, ...parseCols(body)]);
    }
    // ALTER TABLE ADD COLUMN
    for (const mm of s.matchAll(/ALTER TABLE (?:ONLY )?(?:IF EXISTS )?("?[\w.]+"?)\s*(.*)/gis)) {
      const tn = obj(mm[1]);
      const rest = mm[2];
      const cm = rest.match(new RegExp("ADD COLUMN (?:IF NOT EXISTS )?(" + ID + ")", "i"));
      if (cm) {
        const t = ensureTable(tn, tag);
        const c = obj(cm[1]);
        if (t.cols.has(c) && !/IF NOT EXISTS/i.test(cm[0]))
          problems.push(`[${tag}] ADD COLUMN "${tn}.${c}" already exists (added in ${t.created})`);
        t.cols.add(c);
      }
      const dm = rest.match(new RegExp("DROP COLUMN (?:IF EXISTS )?(" + ID + ")", "i"));
      if (dm) {
        const t = ensureTable(tn, tag);
        t.cols.delete(obj(dm[1]));
      }
      // ADD CONSTRAINT (unique/check/fk)
      const km = rest.match(/ADD CONSTRAINT ("?[\w]+"?)\s*(UNIQUE|PRIMARY KEY|FOREIGN KEY|CHECK)/i);
      if (km) {
        const key = `${tn}.${norm(km[1])}`;
        if (constraints.has(key)) problems.push(`[${tag}] CONSTRAINT "${key}" already exists`);
        constraints.add(key);
      }
    }
    // CREATE INDEX
    for (const ref of colRefs(s)) {
      const t = tables.get(ref.table);
      if (!t) { problems.push(`[${tag}] ${ref.kind} on missing table "${ref.table}"`); continue; }
      for (const c of ref.cols.split(",")) {
        const cn = norm(c.replace(/\s+(ASC|DESC|NULLS (FIRST|LAST)|\b[^(]*$)/gi, "").split(/\(|\s/)[0]);
        if (cn && !cn.startsWith("(") && !/^(lower|upper|coalesce|abs|date|to_)/i.test(cn) && !t.cols.has(cn))
          problems.push(`[${tag}] ${ref.kind} on "${ref.table}(${cn})" — column missing (table from ${t.created})`);
      }
    }
    // CREATE POLICY / DROP POLICY
    for (const mm of s.matchAll(new RegExp("CREATE POLICY (" + ID + ") ON (" + ID + ")", "gi"))) {
      const key = `${obj(mm[2])}.${obj(mm[1])}`;
      if (policies.has(key)) problems.push(`[${tag}] POLICY "${key}" already exists`);
      policies.add(key);
    }
    // DROP TABLE
    for (const mm of s.matchAll(new RegExp("DROP TABLE (?:IF EXISTS )?(" + ID + ")", "gi"))) {
      const n = obj(mm[1]);
      if (!/IF EXISTS/i.test(mm[0]) && !tables.has(n))
        problems.push(`[${tag}] DROP TABLE "${n}" — never existed`);
      tables.delete(n);
    }
    // INSERT/UPDATE/SELECT column refs skipped (too noisy) — focus on DDL
  }
}

console.log(`Tables at end: ${tables.size}, enums: ${enums.size}`);
if (problems.length === 0) console.log("CHAIN CLEAN — no statement-level conflicts");
else {
  console.log(`PROBLEMS (${problems.length}):`);
  problems.forEach((p) => console.log("  " + p));
}
