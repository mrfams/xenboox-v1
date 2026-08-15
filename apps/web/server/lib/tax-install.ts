// ─── Shared tax preset installer ────────────────────────────────────────────
//
// Single implementation of the preset-pack install contract, used by both
// taxConfig.installPresets (Settings → Taxes) and onboarding.installTaxPresets
// (wizard auto-install), so the idempotency + version-continuation behavior
// can't drift between the two surfaces.

import { and, eq, sql } from "drizzle-orm";
import { jurisdictionTaxRules } from "@xenboox/db/schema/tax-compliance";
import type { TaxPreset } from "@xenboox/agents";

import { db } from "@/lib/db";

/**
 * Install tax presets for an entity, exactly like the Settings UI does:
 *
 * - Idempotent: presets already installed as a non-superseded `(ruleType,
 *   name)` identity are skipped.
 * - Versioning contract: a re-install after a supersede/deactivate continues
 *   the version sequence for the `(country, ruleType, name)` identity, exactly
 *   like createRule — never collides with an old v1.
 */
export async function installPresetsForEntity(args: {
  entityId: string;
  country: string;
  presets: TaxPreset[];
  actorId: string;
}): Promise<{ installed: number; skipped: number; installedNames: string[] }> {
  const { entityId, country, presets, actorId } = args;

  const existing = await db.query.jurisdictionTaxRules.findMany({
    where: and(
      eq(jurisdictionTaxRules.entityId, entityId),
      eq(jurisdictionTaxRules.country, country),
      sql`${jurisdictionTaxRules.status} <> 'superseded'`,
    ),
    columns: { ruleType: true, name: true, version: true },
  });
  const existingKeys = new Set(existing.map((r) => `${r.ruleType}::${r.name}`));

  const toInstall = presets.filter(
    (p) => !existingKeys.has(`${p.ruleType}::${p.name}`),
  );
  const skipped = presets.length - toInstall.length;

  if (toInstall.length > 0) {
    const history = await db.query.jurisdictionTaxRules.findMany({
      where: and(
        eq(jurisdictionTaxRules.entityId, entityId),
        eq(jurisdictionTaxRules.country, country),
      ),
      columns: { ruleType: true, name: true, version: true },
    });
    const latestVersion = new Map<string, number>();
    for (const row of history) {
      const key = `${row.ruleType}::${row.name}`;
      latestVersion.set(
        key,
        Math.max(latestVersion.get(key) ?? 0, row.version),
      );
    }

    await db.insert(jurisdictionTaxRules).values(
      toInstall.map((p) => {
        const key = `${p.ruleType}::${p.name}`;
        return {
          entityId,
          country,
          ruleType: p.ruleType,
          version: (latestVersion.get(key) ?? 0) + 1,
          name: p.name,
          description: p.description,
          appliesTo: p.appliesTo,
          rateOrBands: p.rateConfig,
          effectiveFrom: p.effectiveFrom,
          effectiveTo: null,
          status: "active" as const,
          proposedBy: actorId,
          approvedBy: actorId,
          approvedAt: new Date(),
          notes: `Installed from ${country} preset pack (${p.source})`,
        };
      }),
    );
  }

  return {
    installed: toInstall.length,
    skipped,
    installedNames: toInstall.map((p) => p.name),
  };
}
