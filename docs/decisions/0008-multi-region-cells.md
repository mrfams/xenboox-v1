# ADR-0008: Cell-Based Multi-Region Architecture

- **Status:** Accepted (design); rollout gated on user-side region resources
- **Date:** 2026-08-14
- **Deciders:** DevSecOps (this session), Product, Eng
- **Related:** ROADTOPRODUCTION §3.4, §26 · docs/MULTI-REGION.md

## Context

Target markets are African (Gambia, Senegal, Nigeria, Ghana, Kenya, South
Africa) with EU users possible. Two forces demand more than a single `iad1`
region:

1. **Latency** — a user in Banjul talking to `iad1` (US East) eats 150–250 ms
   of pure network RTT before any work happens. On the p95 < 300 ms read SLO
   (§24.2) that leaves almost no budget for the query itself.
2. **Data residency law** — NDPA (Nigeria), POPIA (South Africa), DPA 2019
   (Kenya), GDPR (EU) all restrict outbound transfers of personal/financial
   data absent adequacy or SCCs (§21.3). "The data is in the US" is not a
   compliant answer for an enterprise buyer in Lagos or Cape Town.

## Decision

Adopt a **cell-based architecture**: independent, full-stack cells per
region, each with its own Vercel deployment, Neon database, and R2 bucket.
The **tenant is the routing atom**: every request resolves `entity_id → cell`
and is served entirely inside that cell.

```
                    ┌──────────────────────────────┐
                    │  Edge (Vercel)               │
                    │  entity_id → cell lookup     │
                    └──────────────┬───────────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
   ┌────▼─────┐              ┌─────▼─────┐              ┌─────▼─────┐
   │  us1     │              │  af1      │              │  eu1      │
   │ (iad1)   │              │ (cpt1)    │              │ (cdg1)    │
   │ App      │              │ App       │              │ App       │
   │ Neon us  │              │ Neon eu-  │              │ Neon eu-  │
   │ R2 us    │              │ west-2    │              │ west-3    │
   │          │              │ R2 af     │              │ R2 eu     │
   └──────────┘              └───────────┘              └───────────┘
```

### Why cells, not read replicas

- Read replicas don't fix residency — the primary is still in one region.
- Cells give hard isolation: a tenant's data physically never leaves its
  assigned region, which is what POPIA/NDPA auditors check.
- Cell blast radius is smaller: one cell can degrade without taking down the
  platform (supports the 99.9% SLA).

### Routing

- A tenant→cell mapping table lives in the control plane (per-cell DBs
  replicate a read-only copy of the mapping; the edge resolves it).
- Launch (single cell): `lib/regions.ts` resolves every entity to the
  deployment's own region — `resolveRegionForEntity()` fails closed.
- Multi-cell rollout adds the DB-backed mapping + edge lookup; the resolver
  API (`resolveRegionForEntity`) is unchanged, so application code never
  needs to change.

## Consequences

**Positive**

- Latency SLO becomes reachable for African markets (cpt1 ≈ 40–80 ms RTT).
- Residency is structural, not a policy — data physically stays in-region.
- Cell isolation supports DR (region-level failover, §3.3/DR-PLAN).

**Negative / costs**

- Cross-entity operations (consolidation across entities in different cells)
  need a cross-cell read path — deferred; launch consolidations are
  same-entity (multi-entity consolidation across cells is a documented
  follow-up).
- Each cell doubles the fixed cost (Vercel + Neon + R2). Billing per region
  (§26.1) is a user-side dashboard task.
- Auth sessions, webhooks, and outbound emails must resolve to the correct
  cell; the mapping must exist before a second cell goes live.

## Rollout plan

1. **Launch** — single cell (iad1); `lib/regions.ts` registry ships, all
   lookups return the deployment's own region. (This ADR + docs are the
   deliverable of this session.)
2. **Phase 2 (user-side)** — create `cpt1` Vercel project + Neon + R2 cell;
   set per-cell env (`DATABASE_URL_CPT1`, `XENBOOX_REGION=CPT1`); register
   tenant→cell rows; point `af.xenboox.com` at the cell.
3. **Phase 3** — add `eu1` cell; cross-cell read path for consolidation.

See docs/MULTI-REGION.md for the configuration checklist and mock keys.
