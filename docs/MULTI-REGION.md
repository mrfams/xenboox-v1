# Multi-Region & Data Residency — Configuration Guide

> **What's done (code):** `apps/web/lib/regions.ts` — region registry, tenant
> → region resolver (fail-closed), per-cell DB URL helper. ADR-0008 documents
> the cell architecture.
>
> **What needs YOU (user-side):** the actual Vercel projects, Neon databases,
> R2 buckets, and DNS per region. The keys below are **MOCK VALUES** — replace
> them with the real resources before launch.

---

## 1. The cells

| Cell | Region | Vercel func region              | Neon compute | R2 bucket (mock)       | Deployment (mock)        |
| ---- | ------ | ------------------------------- | ------------ | ---------------------- | ------------------------ |
| us1  | iad1   | `iad1` (live)                   | `us-east-2`  | `xenboox-documents-us` | `https://us.xenboox.com` |
| af1  | cpt1   | `cpt1` (needs Vercel Hobby→Pro) | `eu-west-2`  | `xenboox-documents-af` | `https://af.xenboox.com` |
| eu1  | cdg1   | `cdg1` (needs Vercel Pro)       | `eu-west-3`  | `xenboox-documents-eu` | `https://eu.xenboox.com` |

> Neon has no Cape Town compute region yet — `eu-west-2` (London) is the
> nearest; revisit when Neon ships African regions.

## 2. MOCK KEYS — replace before launch (user-side)

These are **placeholders for the real resources**. Create each per cell and
paste the real values into the cell's Vercel env.

| Env var (per cell)        | MOCK value                                                                            | Real source                                   |
| ------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------- |
| `XENBOOX_REGION`          | `iad1` / `cpt1` / `cdg1`                                                              | per-cell deployment                           |
| `DATABASE_URL_CPT1`       | `postgresql://USER:MOCK@ep-cpt1-mock.eu-west-2.aws.neon.tech/xenboox?sslmode=require` | Neon → new project (region `eu-west-2`)       |
| `DATABASE_URL_CDG1`       | `postgresql://USER:MOCK@ep-cdg1-mock.eu-west-3.aws.neon.tech/xenboox?sslmode=require` | Neon → new project (region `eu-west-3`)       |
| `R2_ACCESS_KEY_ID_AF`     | `MOCK_R2_AF_ACCESS_KEY_ID`                                                            | Cloudflare R2 → bucket `xenboox-documents-af` |
| `R2_SECRET_ACCESS_KEY_AF` | `MOCK_R2_AF_SECRET_KEY`                                                               | Cloudflare R2 → API token (write)             |
| `R2_ACCOUNT_ID_AF`        | `MOCK_R2_AF_ACCOUNT_ID`                                                               | Cloudflare dashboard → Account ID             |
| `R2_ENDPOINT_AF`          | `https://MOCK_ACCOUNT.r2.cloudflarestorage.com`                                       | auto-built from account ID                    |
| (same R2 trio for `_EU`)  | `MOCK_R2_EU_*`                                                                        | second bucket                                 |
| `XENBOOX_REGION_MAP`      | `{"<entity-uuid>":"cpt1"}`                                                            | tenant→cell mapping (control plane)           |

## 3. Per-cell setup checklist (user)

1. **Vercel**: duplicate the project per cell (or one project + `regions` in
   vercel.json); set `XENBOOX_REGION` + that cell's `DATABASE_URL_*`/`R2_*`.
2. **Neon**: one project per cell in the cell's compute region; restore the
   schema (migrations) into each.
3. **R2**: one bucket per cell; store the keys in that cell's Vercel env.
4. **DNS**: point the cell subdomain at the cell deployment; set
   `NEXT_PUBLIC_APP_URL` + `AUTH_URL` per cell.
5. **Mapping**: seed `XENBOOX_REGION_MAP` (or the DB mapping table when the
   control plane ships) so every tenant resolves to its home cell.
6. **vercel.json**: after Phase 2, add the cell region to `regions`:
   ```json
   { "regions": ["iad1", "cpt1"] }
   ```

## 4. Residency enforcement

- `resolveRegionForEntity(entityId)` → cell (fail-closed to the deployment's
  own region when the map is absent — never a random region).
- A tenant's data lives only in its cell: app + Neon + R2 are all in-region.
- Cross-cell consolidation is a documented follow-up (ADR-0008); launch
  consolidations are same-entity.

## 5. Verify after wiring

```bash
# Per cell, from that cell's deployment:
curl https://af.xenboox.com/api/health?check=detailed   # DB + Redis pass
# Confirm residency: the cell's DATABASE_URL_CPT1 is used (not iad1's)
```

---

_Last updated: 2026-08-14 · MOCK keys are placeholders — replace before launch._
