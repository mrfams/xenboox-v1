// Scans drizzle schema files for columns whose TYPE (nearest type-call before
// a .references) is text/varchar — these generate impossible FKs when the
// parent PK is uuid.
const fs = require("fs");
const glob = require("glob");
const files = glob.sync("packages/db/schema/*.ts");
const TYPES = /(?:uuid|text|varchar|char|integer|bigint|boolean|timestamp|jsonb|date|numeric)\(/g;
let hits = 0;
for (const f of files) {
  const src = fs.readFileSync(f, "utf8");
  const refs = [...src.matchAll(/\.references\(/g)];
  for (const ref of refs) {
    const before = src.slice(0, ref.index);
    // nearest type call before this .references
    let last = null, m;
    const re = new RegExp(TYPES.source, "g");
    while ((m = re.exec(before))) last = m;
    if (!last) continue;
    const type = last[0].slice(0, -1);
    if (type !== "text" && type !== "varchar" && type !== "char") continue;
    // column name = first quoted string after the type call
    const nm = before.slice(last.index).match(/\("([^"]+)"/);
    // owning table = nearest pgTable above
    const tm = before.match(/pgTable\("([a-z_]+)"/g);
    const table = tm ? tm[tm.length - 1].match(/pgTable\("([a-z_]+)"/)[1] : "?";
    const line = before.split("\n").length;
    console.log(`${f}:${line}  ${table}.${nm ? nm[1] : "?"}  (${type})`);
    hits++;
  }
}
console.log(hits === 0 ? "NO text/varchar FK COLUMNS" : `${hits} found`);
