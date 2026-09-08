// Fixes 0020: converts varchar(255) FK columns to uuid, block-scoped per
// CREATE TABLE, then patches snapshots 0020-0041 to match.
const fs = require("fs");

// [table, column, notNull]
const fixes = [
  ["review_items", "organization_id", false],
  ["customer_issues", "organization_id", false],
  ["customer_issues", "workflow_id", false],
  ["org_active_issues", "organization_id", false],
  ["feature_flag_audit_log", "flag_id", true],
  ["feature_flag_rollout_history", "flag_id", true],
  ["knowledge_connections", "source_node_id", true],
  ["knowledge_connections", "target_node_id", true],
  ["knowledge_documents", "source_id", false],
  ["workflow_edges", "workflow_id", true],
  ["workflow_edges", "source_node_id", true],
  ["workflow_edges", "target_node_id", true],
  ["workflow_nodes", "workflow_id", true],
  ["workflow_runs", "workflow_id", true],
  ["workflow_versions", "workflow_id", true],
  ["automation_activity", "automation_id", false],
  ["automation_time_savings", "automation_id", false],
];

const file = "packages/db/migrations/0020_abandoned_patriot.sql";
let sql = fs.readFileSync(file, "utf8");
let total = 0;

for (const [table, col, notNull] of fixes) {
  const blockRe = new RegExp('(CREATE TABLE "' + table + '" \\([\\s\\S]*?\\n\\);)', "g");
  let count = 0;
  sql = sql.replace(blockRe, (block) => {
    const colRe = new RegExp('"' + col + '" varchar\\(255\\)' + (notNull ? " NOT NULL" : "") + ",");
    if (colRe.test(block)) {
      count++;
      const nn = notNull ? " NOT NULL" : "";
      return block.replace(colRe, '"' + col + '" uuid' + nn + ",");
    }
    return block;
  });
  if (count === 0) console.log("MISS: " + table + "." + col);
  total += count;
}
fs.writeFileSync(file, sql);
console.log("0020 SQL columns fixed:", total);

// snapshots: same column set, varchar(255) -> uuid
const snapCols = {};
for (const [t, c] of fixes) {
  const key = "public." + t;
  (snapCols[key] = snapCols[key] || []).push(c);
}
let fixed = 0;
for (let i = 20; i <= 41; i++) {
  const sp = "packages/db/migrations/meta/00" + i + "_snapshot.json";
  if (!fs.existsSync(sp)) continue;
  const snap = JSON.parse(fs.readFileSync(sp, "utf8"));
  let touched = false;
  for (const [t, cs] of Object.entries(snapCols)) {
    const tbl = snap.tables && snap.tables[t];
    if (!tbl || !tbl.columns) continue;
    for (const c of cs) {
      if (tbl.columns[c] && tbl.columns[c].type === "varchar(255)") {
        tbl.columns[c].type = "uuid";
        touched = true;
      }
    }
  }
  if (touched) {
    fs.writeFileSync(sp, JSON.stringify(snap, null, "\t") + "\n");
    fixed++;
  }
}
console.log("snapshots fixed:", fixed);
