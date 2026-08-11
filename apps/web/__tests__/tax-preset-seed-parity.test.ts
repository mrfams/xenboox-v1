// ─── Demo seed ↔ tax preset catalog parity (GM + SN) ────────────────────────
//
// The demo seed installs two preset packs: Gambia into Kerr Jula Trading Co.
// (GM_TAX_RULES) and Senegal into the second demo entity Dakar Distribution
// SARL (SN_TAX_RULES) — see packages/db/seed/{gm-tax-rules,sn-tax-rules}.ts.
// Those rows must stay in lock step with the GM_PRESETS / SN_PRESETS catalog
// users install one-click from the Settings UI
// (packages/agents/core/tax-presets.ts). If a catalog rate, band, or name
// changes without the seed being updated in the same change, this test
// fails — no silent drift between what the UI shows and what the demo data
// contains.

import { describe, it, expect } from "vitest";

import { GM_TAX_RULES } from "@xenboox/db/seed/gm-tax-rules";
import { SN_TAX_RULES } from "@xenboox/db/seed/sn-tax-rules";
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

const SEED_PACKS: Array<{ rules: SeedTaxRow[]; country: string }> = [
  { rules: GM_TAX_RULES, country: "GM" },
  { rules: SN_TAX_RULES, country: "SN" },
];

describe("demo seed ↔ tax preset catalog parity", () => {
  it.each(SEED_PACKS)(
    "$country: the seed has exactly one row per catalog preset, field-for-field equal",
    ({ rules, country }) => {
      const presets = getTaxPresetsForCountry(country);

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
    ({ rules, country }) => {
      const catalogKeys = new Set(
        getTaxPresetsForCountry(country).map((p) => `${p.ruleType}::${p.name}`),
      );
      for (const row of rules) {
        expect(
          catalogKeys.has(`${row.ruleType}::${row.name}`),
          `${row.name} exists in the ${country} catalog`,
        ).toBe(true);
      }
    },
  );
});
