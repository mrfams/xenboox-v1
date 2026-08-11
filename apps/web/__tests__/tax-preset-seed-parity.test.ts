// ─── Demo seed ↔ tax preset catalog parity (Gambia) ────────────────────────
//
// The demo entity is seeded with GM_TAX_RULES (packages/db/seed/gm-tax-rules.ts)
// so Settings → Taxes shows installed rules on first login. Those rows must
// stay in lock step with the GM_PRESETS catalog users install one-click from
// the Settings UI (packages/agents/core/tax-presets.ts). If a catalog rate,
// band, or name changes without the seed being updated in the same change,
// this test fails — no silent drift between what the UI shows and what the
// demo data contains.

import { describe, it, expect } from "vitest";

import { GM_TAX_RULES } from "@xenboox/db/seed/gm-tax-rules";
import { getTaxPresetsForCountry } from "@xenboox/agents";

describe("demo seed ↔ tax preset catalog parity (GM)", () => {
  it("the seed has exactly one row per catalog preset, field-for-field equal", () => {
    const presets = getTaxPresetsForCountry("GM");

    // Same rule set — adding/removing a preset requires touching the seed too.
    expect(GM_TAX_RULES.length).toBe(presets.length);

    const seedByKey = new Map(
      GM_TAX_RULES.map((r) => [`${r.ruleType}::${r.name}`, r]),
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
  });

  it("every seed row maps back to a catalog preset", () => {
    const catalogKeys = new Set(
      getTaxPresetsForCountry("GM").map((p) => `${p.ruleType}::${p.name}`),
    );
    for (const row of GM_TAX_RULES) {
      expect(
        catalogKeys.has(`${row.ruleType}::${row.name}`),
        `${row.name} exists in the GM catalog`,
      ).toBe(true);
    }
  });
});
