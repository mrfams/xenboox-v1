// ─── Multi-Region & Data Residency (§26) ───────────────────────────────────
//
// Cell-based architecture: each region is a full cell (app + DB + storage).
// The TENANT is the routing atom — every request resolves entity → region at
// the edge, and a tenant's data never leaves its assigned region (POPIA /
// NDPA / GDPR cross-border rules).
//
// Launch reality: single cell (iad1). This module provides the registry +
// resolver that the multi-cell rollout builds on, with a fail-closed default
// so a misconfigured mapping never leaks data to the wrong region.
//
// Configuration (env, per cell deployment):
//   XENBOOX_REGION          — the region this deployment serves (default "iad1")
//   XENBOOX_REGION_MAP      — JSON: entityId → region (the residency mapping
//                             table; in production this lives in the DB, see
//                             docs/MULTI-REGION.md)
//
// MOCK VALUES below — replace with real cell endpoints before launch (the
// user owns the actual Vercel/Neon/R2 per-region resources).

export type RegionId = "iad1" | "cpt1" | "cdg1";

export interface RegionCell {
  id: RegionId;
  /** Human label */
  label: string;
  /** Vercel function region — must match vercel.json regions for the cell. */
  vercelRegion: string;
  /** Neon compute region for the cell's database. */
  neonRegion: string;
  /** R2 bucket for the cell (per-region residency). */
  r2Bucket: string;
  /** Public deployment URL for the cell. */
  deploymentUrl: string;
  /** GDPR/POPIA data-residency tier. */
  residency: "us" | "eu" | "af";
}

// ─── Registry (MOCK endpoints — replace before launch) ─────────────────────
// The real per-cell endpoints are user-side resources (Vercel project,
// Neon project, R2 bucket per region). These are the documented shapes.
export const REGION_REGISTRY: Record<RegionId, RegionCell> = {
  iad1: {
    id: "iad1",
    label: "US East (primary)",
    vercelRegion: "iad1",
    neonRegion: "us-east-2",
    r2Bucket: "xenboox-documents-us",
    deploymentUrl: "https://us.xenboox.com", // MOCK — user owns DNS
    residency: "us",
  },
  cpt1: {
    id: "cpt1",
    label: "Cape Town (Africa)",
    vercelRegion: "cpt1",
    neonRegion: "eu-west-2", // nearest Neon to Cape Town (neon has no cpt compute yet)
    r2Bucket: "xenboox-documents-af",
    deploymentUrl: "https://af.xenboox.com", // MOCK — user owns DNS
    residency: "af",
  },
  cdg1: {
    id: "cdg1",
    label: "Paris (EU)",
    vercelRegion: "cdg1",
    neonRegion: "eu-west-3",
    r2Bucket: "xenboox-documents-eu",
    deploymentUrl: "https://eu.xenboox.com", // MOCK — user owns DNS
    residency: "eu",
  },
};

export const DEFAULT_REGION: RegionId = "iad1";

/** The region this deployment serves. Fail-closed: unknown → iad1. */
export function currentRegion(): RegionId {
  const r = process.env.XENBOOX_REGION as RegionId | undefined;
  return r && r in REGION_REGISTRY ? r : DEFAULT_REGION;
}

/**
 * Resolve the cell that owns `entityId`.
 *
 * Order: explicit map entry (XENBOOX_REGION_MAP or DB) → deployment region.
 * The map is the residency contract; when absent we fail closed to the
 * deployment's own region (never to a random one).
 */
export function resolveRegionForEntity(entityId: string): RegionCell {
  const raw = process.env.XENBOOX_REGION_MAP;
  if (raw) {
    try {
      const map = JSON.parse(raw) as Record<string, string>;
      const region = map[entityId] as RegionId | undefined;
      if (region && region in REGION_REGISTRY) {
        return REGION_REGISTRY[region];
      }
    } catch {
      // Malformed map — fall through to the deployment default (fail closed).
    }
  }
  return REGION_REGISTRY[currentRegion()];
}

/**
 * The entity's per-cell DB URL. In production each cell deployment sets its
 * own DATABASE_URL; this helper documents the wiring and fails loudly if a
 * region-remapped entity lands on a deployment without a matching DB.
 */
export function databaseUrlForCell(cell: RegionCell): string {
  const url = process.env[`DATABASE_URL_${cell.id.toUpperCase()}`];
  if (url) return url;
  // Same-cell deployments share the base DATABASE_URL (launch state).
  return process.env.DATABASE_URL ?? "";
}
