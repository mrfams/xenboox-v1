/**
 * One-off backfill: mark existing users as onboarded.
 *
 * The onboarding wizard gate reads `settings.onboarding.completed` from
 * `user_settings`. Accounts set up before server-side onboarding persistence
 * have no user_settings row, so the wizard reappears for them on every login.
 * This closes that gate for every user that is already set up (has entity
 * access or owns an organization). Safe to re-run (idempotent): users already
 * marked completed are skipped, and other settings keys are preserved.
 *
 * Usage:
 *   cd packages/db && pnpm tsx seed/mark-existing-users-onboarded.ts [--dry-run]
 */
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

// Load DATABASE_URL from repo .env.local (quoted values supported).
const envContent = readFileSync(
  new URL("../../../.env.local", import.meta.url),
  "utf8",
);
const urlMatch = envContent.match(/^DATABASE_URL="?(.+?)"?\s*$/m);
const url = urlMatch?.[1] ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL not found. Set it in .env.local or the environment.",
  );
  process.exit(1);
}

const sql = neon(url);
const dryRun = process.argv.includes("--dry-run");

type TargetUser = { id: string; email: string };
type SettingsRow = { user_id: string; settings: Record<string, unknown> };

async function main() {
  // neon's sql template doesn't take a row-type generic — cast instead.
  const targets = (await sql`
    SELECT DISTINCT u.id, u.email
    FROM users u
    WHERE EXISTS (SELECT 1 FROM user_entity_access uea WHERE uea.user_id = u.id)
       OR EXISTS (SELECT 1 FROM organizations o WHERE o.owner_id = u.id)
    ORDER BY u.email
  `) as unknown as TargetUser[];

  const existing = (await sql`
    SELECT user_id, settings FROM user_settings
  `) as unknown as SettingsRow[];
  const byUser = new Map(existing.map((r) => [r.user_id, r.settings]));

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const user of targets) {
    const settings = byUser.get(user.id) ?? {};
    const onboarding = (settings.onboarding as
      { completed?: boolean; currentStep?: string | null } | undefined) ?? {
      completed: false,
      currentStep: null,
    };
    if (onboarding.completed === true) {
      skipped++;
      continue;
    }
    const merged = {
      ...settings,
      onboarding: { ...onboarding, completed: true, currentStep: null },
    };
    if (dryRun) {
      console.log(`[dry-run] would mark onboarded: ${user.email}`);
      continue;
    }
    if (byUser.has(user.id)) {
      await sql`
        UPDATE user_settings
        SET settings = ${JSON.stringify(merged)}::jsonb, updated_at = now()
        WHERE user_id = ${user.id}
      `;
      updated++;
    } else {
      await sql`
        INSERT INTO user_settings (user_id, settings)
        VALUES (${user.id}, ${JSON.stringify(merged)}::jsonb)
      `;
      created++;
    }
    console.log(`marked onboarded: ${user.email}`);
  }

  console.log(
    `done${dryRun ? " (dry-run)" : ""}: ${targets.length} set-up users checked — created ${created}, updated ${updated}, already onboarded ${skipped}`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("backfill failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
