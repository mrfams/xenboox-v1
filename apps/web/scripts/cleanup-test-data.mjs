import { neon } from "@neondatabase/serverless";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const candidates = [
  resolve("C:/Users/asano/Desktop/xenboox/.env.local"),
  resolve(process.cwd(), ".env.local"),
  resolve(process.cwd(), "../.env.local"),
];
let env = "";
for (const p of candidates) {
  try {
    if (!existsSync(p)) continue;
    env = readFileSync(p, "utf8");
    if (env.includes("DATABASE_URL")) break;
  } catch {}
}
const line = env.split("\n").find((l) => l.trim().startsWith("DATABASE_URL="));
const url = line.slice(line.indexOf("=") + 1).trim().replace(/^"|"$/g, "").replace(/;$/, "");
const sql = neon(url);

const testNames = ["HealTest"];
for (const prefix of testNames) {
  const ents = await sql("SELECT id, name, organization_id FROM entities WHERE name LIKE $1", [`${prefix} %`]);
  for (const e of ents) {
    await sql("DELETE FROM user_entity_access WHERE entity_id = $1", [e.id]);
    await sql("DELETE FROM entities WHERE id = $1", [e.id]);
    console.log("deleted", e.name);
  }
}

// Reset demo user's lastUsedEntityId to the real entity
const real = await sql("SELECT id FROM entities WHERE name = 'Kerr Jula Trading Co.' LIMIT 1");
if (real.length > 0) {
  await sql("UPDATE users SET last_used_entity_id = $1 WHERE email = 'demo@xenboox.com'", [real[0].id]);
  console.log("lastUsedEntityId reset to", real[0].id.slice(0, 8));
}

const finalEnts = await sql("SELECT id, name FROM entities ORDER BY created_at");
console.log("\n=== FINAL ENTITIES ===");
for (const e of finalEnts) console.log(e.id.slice(0, 8), e.name);
