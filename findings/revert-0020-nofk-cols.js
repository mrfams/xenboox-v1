// Reverts three columns that have NO FK in the schema back to varchar(255):
// customer_issues.workflow_id, knowledge_connections.source_node_id/_target_node_id.
// My earlier pass wrongly uuid-ified them in 0020 SQL + snapshots.
const fs = require("fs");

const file = "packages/db/migrations/0020_abandoned_patriot.sql";
let sql = fs.readFileSync(file, "utf8");
const reverts = [
  ['"workflow_id" uuid,', '"workflow_id" varchar(255),'],
  ['"source_node_id" uuid NOT NULL,', '"source_node_id" varchar(255) NOT NULL,'],
  ['"target_node_id" uuid NOT NULL,', '"target_node_id" varchar(255) NOT NULL,'],
];
for (const [from, to] of reverts) {
  if (sql.includes(from)) { sql = sql.split(from).join(to); console.log("reverted:", from); }
  else console.log("NOT FOUND in SQL:", from);
}
fs.writeFileSync(file, sql);

const targets = {
  "public.customer_issues": ["workflow_id"],
  "public.knowledge_connections": ["source_node_id", "target_node_id"],
};
let fixed = 0;
for (let i = 20; i <= 41; i++) {
  const sp = "packages/db/migrations/meta/00" + i + "_snapshot.json";
  if (!fs.existsSync(sp)) continue;
  const snap = JSON.parse(fs.readFileSync(sp, "utf8"));
  let touched = false;
  for (const [t, cs] of Object.entries(targets)) {
    const tbl = snap.tables && snap.tables[t];
    if (!tbl || !tbl.columns) continue;
    for (const c of cs) {
      if (tbl.columns[c] && tbl.columns[c].type === "uuid") {
        tbl.columns[c].type = "varchar(255)";
        touched = true;
      }
    }
  }
  if (touched) { fs.writeFileSync(sp, JSON.stringify(snap, null, "\t") + "\n"); fixed++; }
}
console.log("snapshots reverted:", fixed);
