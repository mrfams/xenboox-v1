// ─── Demo seed ↔ tax preset catalog parity (GM + SN + US) ───────────────────
//
// The demo seed installs three preset packs: Gambia into Kerr Jula Trading Co.
// (GM_TAX_RULES), Senegal into the second demo entity Dakar Distribution
// SARL (SN_TAX_RULES), and the US sales-tax pack into the third demo entity
// Brooklyn Goods LLC (US_TAX_RULES) — see
// packages/db/seed/{gm-tax-rules,sn-tax-rules,us-tax-rules}.ts. Those rows
// must stay in lock step with the catalog presets users install one-click
// from the Settings UI (packages/agents/core/tax-presets.ts). If a catalog
// rate, band, or name changes without the seed being updated in the same
// change, this test fails — no silent drift between what the UI shows and
// what the demo data contains.
//
// GM/SN install their full country pack; the US demo installs a curated
// subset (NY, NYC combined, CA, TX) so its parity check is pinned to those
// preset ids.

import { describe, it, expect } from "vitest";

import { GM_TAX_RULES } from "@xenboox/db/seed/gm-tax-rules";
import { SN_TAX_RULES } from "@xenboox/db/seed/sn-tax-rules";
import { US_TAX_RULES } from "@xenboox/db/seed/us-tax-rules";
import { getTaxPresetsForCountry } from "@xenboox/agents";

type SeedTaxRow = {
  ruleType: string;
  name: string;
  description: string;
  appliesTo: string;
  effectiveFrom: string;
  rateOrBands: unknown;
  source: string;
};

const SEED_PACKS: Array<{
  rules: SeedTaxRow[];
  country: string;
  /** Pin the parity check to these catalog ids (omitted = the full country pack). */
  presetIds?: string[];
}> = [
  { rules: GM_TAX_RULES, country: "GM" },
  { rules: SN_TAX_RULES, country: "SN" },
  {
    rules: US_TAX_RULES,
    country: "US",
    presetIds: [
      "us-sales-tax-ny",
      "us-sales-tax-nyc",
      "us-sales-tax-ca",
      "us-sales-tax-tx",
    ],
  },
];

/** The catalog presets a seed pack is expected to cover. */
function expectedPresets(pack: (typeof SEED_PACKS)[number]) {
  const all = getTaxPresetsForCountry(pack.country);
  const ids = pack.presetIds;
  return ids ? all.filter((p) => ids.includes(p.id)) : all;
}

describe("demo seed ↔ tax preset catalog parity", () => {
  it("every pinned preset id resolves in the catalog", () => {
    // A mistyped or renamed pinned id would otherwise fail as a confusing
    // row-count mismatch — name the missing preset explicitly instead.
    for (const pack of SEED_PACKS) {
      if (!pack.presetIds) continue;
      const catalogIds = new Set(
        getTaxPresetsForCountry(pack.country).map((p) => p.id),
      );
      for (const id of pack.presetIds) {
        expect(
          catalogIds.has(id),
          `${id} exists in the ${pack.country} catalog`,
        ).toBe(true);
      }
    }
  });

  it.each(SEED_PACKS)(
    "$country: the seed has exactly one row per catalog preset, field-for-field equal",
    (pack) => {
      const { rules, country } = pack;
      const presets = expectedPresets(pack);

      // Same rule set — adding/removing a preset requires touching the seed too.
      expect(rules.length, `${country} seed row count`).toBe(presets.length);

      const seedByKey = new Map(
        rules.map((r) => [`${r.ruleType}::${r.name}`, r]),
      );

      for (const preset of presets) {
        const row = seedByKey.get(`${preset.ruleType}::${preset.name}`);
        expect(row, `seed row for ${preset.id}`).toBeDefined();
        if (!row) continue;

        expect(row.ruleType, `${preset.id} ruleType`).toBe(preset.ruleType);
        expect(row.name, `${preset.id} name`).toBe(preset.name);
        expect(row.description, `${preset.id} description`).toBe(
          preset.description,
        );
        expect(row.appliesTo, `${preset.id} appliesTo`).toBe(preset.appliesTo);
        expect(row.effectiveFrom, `${preset.id} effectiveFrom`).toBe(
          preset.effectiveFrom,
        );
        // The seed writes the exact same rate config the Settings UI would.
        expect(row.rateOrBands, `${preset.id} rateConfig`).toEqual(
          preset.rateConfig,
        );
        // installPresets embeds the catalog's source attribution in the note.
        expect(row.source, `${preset.id} source`).toBe(preset.source);
      }
    },
  );

  it.each(SEED_PACKS)(
    "$country: every seed row maps back to a catalog preset",
    (pack) => {
      const catalogKeys = new Set(
        expectedPresets(pack).map((p) => `${p.ruleType}::${p.name}`),
      );
      for (const row of pack.rules) {
        expect(
          catalogKeys.has(`${row.ruleType}::${row.name}`),
          `${row.name} exists in the ${pack.country} catalog`,
        ).toBe(true);
      }
    },
  );
});
