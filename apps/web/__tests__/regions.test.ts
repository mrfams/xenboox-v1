// ─── §26 Multi-region resolver — fail-closed residency ─────────────────────
//
// The tenant→cell resolver must NEVER route a tenant to a random region: when
// the map is absent or malformed it fails closed to the deployment's own
// region. Per-cell DB URLs resolve via DATABASE_URL_<REGION> or the base URL.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  delete process.env.XENBOOX_REGION;
  delete process.env.XENBOOX_REGION_MAP;
  delete process.env.DATABASE_URL;
  delete process.env.DATABASE_URL_CPT1;
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

async function loadRegions() {
  return await import("@/lib/regions");
}

describe("multi-region registry + resolver", () => {
  it("defaults to the iad1 cell when no region is configured", async () => {
    const { resolveRegionForEntity, REGION_REGISTRY } = await loadRegions();
    expect(resolveRegionForEntity("any-entity")).toBe(REGION_REGISTRY.iad1);
  });

  it("uses the deployment region when the map has no entry for the entity", async () => {
    const { resolveRegionForEntity, REGION_REGISTRY } = await loadRegions();
    process.env.XENBOOX_REGION = "cpt1";
    expect(resolveRegionForEntity("unmapped-entity")).toBe(
      REGION_REGISTRY.cpt1,
    );
  });

  it("routes a mapped entity to its residency cell", async () => {
    const { resolveRegionForEntity, REGION_REGISTRY } = await loadRegions();
    process.env.XENBOOX_REGION_MAP = JSON.stringify({
      "entity-africa": "cpt1",
    });
    expect(resolveRegionForEntity("entity-africa")).toBe(REGION_REGISTRY.cpt1);
  });

  it("fails closed (deployment region) on a malformed map — never a random region", async () => {
    const { resolveRegionForEntity, REGION_REGISTRY } = await loadRegions();
    process.env.XENBOOX_REGION = "iad1";
    process.env.XENBOOX_REGION_MAP = "not-json{{{";
    expect(resolveRegionForEntity("entity-x")).toBe(REGION_REGISTRY.iad1);
  });

  it("fails closed when the map references an unknown region", async () => {
    const { resolveRegionForEntity, REGION_REGISTRY } = await loadRegions();
    process.env.XENBOOX_REGION_MAP = JSON.stringify({ e: "mars1" });
    expect(resolveRegionForEntity("e")).toBe(REGION_REGISTRY.iad1);
  });

  it("resolves per-cell DB URLs (DATABASE_URL_<REGION> over base)", async () => {
    const { resolveRegionForEntity, databaseUrlForCell } = await loadRegions();
    process.env.XENBOOX_REGION_MAP = JSON.stringify({ e: "cpt1" });
    process.env.DATABASE_URL = "postgres://base/db";
    process.env.DATABASE_URL_CPT1 = "postgres://cpt1-cell/db";
    const cell = resolveRegionForEntity("e");
    expect(databaseUrlForCell(cell)).toBe("postgres://cpt1-cell/db");
  });

  it("falls back to the base DATABASE_URL for the deployment's own cell", async () => {
    const { currentRegion, databaseUrlForCell, REGION_REGISTRY } =
      await loadRegions();
    process.env.DATABASE_URL = "postgres://base/db";
    expect(databaseUrlForCell(REGION_REGISTRY[currentRegion()])).toBe(
      "postgres://base/db",
    );
  });
});
