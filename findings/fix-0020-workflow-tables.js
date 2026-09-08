// Block-scoped fix: the earlier revert was file-wide and also reverted
// workflow tables whose columns DO have FKs. Restore uuid in exactly the
// four workflow CREATE TABLE blocks of 0020.
const fs = require("fs");
const file = "packages/db/migrations/0020_abandoned_patriot.sql";
let sql = fs.readFileSync(file, "utf8");

// [table, column] — all NOT NULL in these tables
const fixes = [
  ["workflow_edges", "workflow_id"],
  ["workflow_edges", "source_node_id"],
  ["workflow_edges", "target_node_id"],
  ["workflow_nodes", "workflow_id"],
  ["workflow_runs", "workflow_id"],
  ["workflow_versions", "workflow_id"],
];

let total = 0;
for (const [table, col] of fixes) {
  const blockRe = new RegExp('(CREATE TABLE "' + table + '" \\([\\s\\S]*?\\n\\);)', "g");
  let count = 0;
  sql = sql.replace(blockRe, (block) => {
    const colRe = new RegExp('"' + col + '" varchar\\(255\\) NOT NULL,');
    if (colRe.test(block)) { count++; return block.replace(colRe, '"' + col + '" uuid NOT NULL,'); }
    return block;
  });
  if (count === 0) console.log("MISS: " + table + "." + col);
  total += count;
}
fs.writeFileSync(file, sql);
console.log("uuid restored in", total, "columns");

// sanity: print every workflow_* / knowledge_connections / customer_issues
// occurrence of these columns for eyeball verification
const check = sql.split("--> statement-breakpoint");
for (const b of check) {
  const tm = b.match(/CREATE TABLE "([a-z_]+)"/);
  if (!tm || !/^(workflow_edges|workflow_nodes|workflow_runs|workflow_versions|knowledge_connections|customer_issues)$/.test(tm[1])) continue;
  const m = b.match(/"(workflow_id|source_node_id|target_node_id)"\s+(uuid|varchar\(255\))/);
  if (m) console.log(tm[1] + "." + m[1] + " = " + m[2]);
}
