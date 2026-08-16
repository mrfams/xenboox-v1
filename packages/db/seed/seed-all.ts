/**
 * Seed ALL demo accounts — the one command to make every demo login shine.
 *
 *   pnpm seed:all
 *
 * What it does:
 *   1. demo@xenboox.com  — Kerr Jula Trading Co. (Gambia, GMD)  [verified]
 *   2. yc@xenboox.com    — Northwind Labs Inc. (US, USD)         [verified]
 *
 * Both seeds are idempotent and entity-scoped: they reuse the existing live
 * user/org/entity rows (find-or-create), reset ONLY their own entity's child
 * data (delete-entity cascade), and never TRUNCATE shared tables. Running
 * `seed:all` twice is safe.
 */
import { db } from "../index";
import { users } from "../schema/auth";
import { organizations, entities } from "../schema/organization";
import { eq } from "drizzle-orm";
import { seed } from "./index";
import { seedYc } from "./yc-3months";
import { seedCloseTasks, latestPeriodLabel } from "./close-tasks";
import { seedAdminOps } from "./seed-admin-ops";
import { seedWorkflowData } from "./seed-workflow-data";
import { seedContent } from "./seed-content";
import { findOrCreateUser, removeOtherEntities } from "./seed-lib";

function currentMonthLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Seed a realistic close checklist for every entity owned by the user. */
async function seedCloseTasksForUser(userId: string) {
  const orgs = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.ownerId, userId));
  for (const org of orgs) {
    const ents = await db
      .select({ id: entities.id, name: entities.name })
      .from(entities)
      .where(eq(entities.organizationId, org.id));
    for (const ent of ents) {
      const period = (await latestPeriodLabel(ent.id)) ?? currentMonthLabel();
      const res = await seedCloseTasks(ent.id, period);
      console.log(
        `     close checklist: ${ent.name} — ${res.inserted}/${res.total} tasks created for ${period}`,
      );
    }
  }
}

async function verifyAccount(email: string, name: string) {
  const id = await findOrCreateUser({ email, name });
  const row = await db
    .select({ verified: users.emailVerified })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return { id, verified: !!row[0]?.verified };
}

async function main() {
  console.log("═".repeat(64));
  console.log("XENBOOX — SEED ALL DEMO ACCOUNTS");
  console.log("═".repeat(64));

  // ── 1. Demo (Gambia) ────────────────────────────────────────────────
  const demo = await verifyAccount("demo@xenboox.com", "Demo User");
  console.log(
    `\n→ demo@xenboox.com ${demo.verified ? "✅ verified" : "❌ NOT verified"}`,
  );
  await seed();

  // Close checklists for every demo entity (current month).
  await seedCloseTasksForUser(demo.id);

  // ── 2. YC (US) ──────────────────────────────────────────────────────
  const yc = await verifyAccount("yc@xenboox.com", "YC Demo User");
  console.log(
    `\n→ yc@xenboox.com ${yc.verified ? "✅ verified" : "❌ NOT verified"}`,
  );
  await seedYc();

  // Close checklists for every YC entity (latest fiscal period).
  await seedCloseTasksForUser(yc.id);

  // ── 3. Final verification + sanity sweep ────────────────────────────
  console.log("\n" + "═".repeat(64));
  console.log("FINAL VERIFICATION");
  console.log("═".repeat(64));

  const [u1, u2] = await Promise.all([
    db.select().from(users).where(eq(users.email, "demo@xenboox.com")),
    db.select().from(users).where(eq(users.email, "yc@xenboox.com")),
  ]);

  for (const u of [u1[0], u2[0]]) {
    if (!u) continue;
    const org = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.ownerId, u.id))
      .limit(1);
    const orgId = org[0]?.id;
    const ents = orgId
      ? await db
          .select({
            id: entities.id,
            name: entities.name,
            currency: entities.currency,
          })
          .from(entities)
          .where(eq(entities.organizationId, orgId))
      : [];
    const hasJunk = ents.some(
      (e) =>
        e.name.toLowerCase().includes("healtest") ||
        e.name.toLowerCase().includes("test"),
    );
    console.log(`\n👤 ${u.email}`);
    console.log(`   verified:     ${u.emailVerified ? "✅" : "❌"}`);
    console.log(`   last_entity:  ${u.lastUsedEntityId ?? "—"}`);
    console.log(
      `   entities:     ${ents.map((e) => `${e.name} (${e.currency})`).join(", ") || "none"}`,
    );
    if (hasJunk)
      console.log(
        `   ⚠ junk/test entities present — run seed() again to sweep`,
      );
  }

  // Sweep any junk entities across both demo orgs (safety net).
  const orgRows = await db
    .select({ id: organizations.id, ownerId: organizations.ownerId })
    .from(organizations)
    .where(eq(organizations.ownerId, u1[0]?.id ?? ""));
  for (const o of orgRows) {
    const removed = await removeOtherEntities(o.id);
    if (removed > 0)
      console.log(`\n🧹 Removed ${removed} stale entity(ies) from org ${o.id}`);
  }

  // Admin ops + workflow-builder demo data (idempotent, platform-level).
  console.log("\n  Seeding admin ops + workflow data...");
  await seedAdminOps();
  await seedWorkflowData();

  // Marketing content (blog + careers).
  await seedContent();

  console.log("\n════════════════════════════════════════════════════════");
  console.log("SEED COMPLETE — both accounts verified");
  console.log(
    "  demo@xenboox.com  / demo1234  — Kerr Jula Trading Co. (GMD, Gambia)",
  );
  console.log(
    "  yc@xenboox.com    / demo1234  — Northwind Labs Inc. (USD, US)",
  );
  console.log("════════════════════════════════════════════════════════");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed-all failed:", err);
    process.exit(1);
  });
