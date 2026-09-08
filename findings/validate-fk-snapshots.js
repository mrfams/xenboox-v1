// Snapshot-based FK type-compatibility checker.
// Drizzle snapshots are JSON states of the whole schema at each migration —
// far more reliable than parsing SQL. Checks every FK in a snapshot against
// the parent column's type and reports incompatible pairs.
const fs = require("fs");

const dir = "packages/db/migrations/meta";
const args = process.argv.slice(2);
const target = args[0] || "latest";

const snaps = fs.readdirSync(dir).filter((f) => f.endsWith("_snapshot.json")).sort();
const snapFile = target === "latest" ? snaps[snaps.length - 1] : snaps.find((f) => f.startsWith(target));
if (!snapFile) { console.error("snapshot not found: " + target); process.exit(1); }
const snap = JSON.parse(fs.readFileSync(`${dir}/${snapFile}`, "utf8"));
console.log(`Checking ${snapFile} (${Object.keys(snap.tables).length} tables)`);

const norm = (t) => (t || "").toLowerCase().replace(/\s+/g, " ").replace(/\(\d+(,\s*\d+)?\)/g, "");
const compatible = (a, b) => {
  const A = norm(a), B = norm(b);
  if (A === B) return true;
  // text <-> varchar are interchangeable in Postgres FK terms
  if ((A === "text" && B === "varchar") || (A === "varchar" && B === "text")) return true;
  return false;
};

let problems = 0, checked = 0;
for (const [tname, table] of Object.entries(snap.tables)) {
  for (const [fkName, fk] of Object.entries(table.foreignKeys || {})) {
    checked++;
    for (let i = 0; i < fk.columnsFrom.length; i++) {
      const childCol = fk.columnsFrom[i];
      const parentTable = snap.tables[fk.schemaTo !== undefined ? `${fk.schemaTo || "public"}.${fk.tableTo}` : `public.${fk.tableTo}`] || snap.tables[fk.tableTo];
      if (!parentTable) { console.log(`  [?] ${fkName}: parent table ${fk.tableTo} not in snapshot`); continue; }
      const parentCol = parentTable.columns[fk.columnsTo[i]];
      const child = table.columns[childCol];
      if (!child || !parentCol) { console.log(`  [?] ${fkName}: column missing in snapshot`); continue; }
      if (!compatible(child.type, parentCol.type)) {
        problems++;
        console.log(`  [X] ${fkName}: ${tname}.${childCol} (${child.type}) -> ${fk.tableTo}.${fk.columnsTo[i]} (${parentCol.type})`);
      }
    }
  }
}
console.log(`\nChecked ${checked} FK constraints`);
if (problems === 0) console.log("FK TYPES CLEAN");
else console.log(`${problems} INCOMPATIBLE — fix before fresh-DB replay can pass`);
