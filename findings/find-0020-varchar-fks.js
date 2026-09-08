// Lists every varchar(255) FK column occurrence with its CREATE TABLE context.
const fs = require("fs");
const sql = fs.readFileSync("packages/db/migrations/0020_abandoned_patriot.sql", "utf8");
const targets = ["organization_id", "flag_id", "source_id", "workflow_id", "source_node_id", "target_node_id", "automation_id"];
const blocks = sql.split("--> statement-breakpoint");
for (const b of blocks) {
  const tm = b.match(/CREATE TABLE "([a-z_]+)"/);
  if (!tm) continue;
  for (const t of targets) {
    const re = new RegExp('"' + t + '" varchar\\(255\\)( NOT NULL)?', "g");
    let m;
    while ((m = re.exec(b))) console.log(tm[1] + "." + t, m[1] ? "NOT NULL" : "nullable");
  }
}
