# ADR-RLS-POOL — Row-Level Security: Pool vs HTTP

**Status:** Accepted (2026-09-04)  
**Context:** `FORCE RLS` is enabled on every entity-scoped table (`0006_enable_rls.sql`, `0030_force_rls.sql`), but `packages/db/index.ts:1` defaulted to `neon-http` (`drizzle-orm/neon-http`) where `SET LOCAL`/`current_setting` silently no-ops. Primary enforcement was app-layer `entityScopingMiddleware` (`apps/web/lib/trpc/server.ts:249`) + `idor-rls-sweep` (69 tests). This gap blocked prod-grade claim.

**Decision:** Keep `neon-http` as **default** for backwards compat, edge caching, and Vercel serverless cold-start (no WebSocket). Add **opt-in** `USE_RLS=true` that switches `packages/db/index.ts` to `neon-serverless Pool` (`neonConfig.webSocketConstructor = ws`, `drizzle-orm/neon-serverless`). When `USE_RLS=true`, `setRlsContext()` (`server.ts:133`) actually enforces `app.current_entity_id`/`app.current_user_id` at the DB layer; `FORCE RLS` becomes active.

**Consequences:**
- Default (`USE_RLS=false`): RLS remains defense-in-depth only, app-layer is source of truth — verified by `idor-rls-sweep`, `rls-db-layer` (12, skip when http), `a11y` etc. No breaking change for existing deploys.
- Opt-in (`USE_RLS=true`): DB-layer guarantee for regulated tenants. Requires Neon WebSocket access (or PgBouncer in transaction mode), `FORCE RLS` on, and `ws` dep (already in `packages/db`). Slightly higher connection overhead, not for edge cache.

**Migration Checklist (when you need DB-layer):**
1. Set `USE_RLS=true` + `DATABASE_URL` with `sslmode=require` (pooler or direct) in Vercel env.
2. Verify `ws` available (already `8.21.0`).
3. Deploy, check logs: `[db] Pool RLS enabled` vs `[db] RLS app-layer only`.
4. Run `pnpm test -- rls-db-layer` (should be 12 passed, not skipped).
5. Smoke: `SELECT current_setting('app.current_entity_id', true)` after `setRlsContext` returns `entityId`.

**Alternatives Considered:**
- Always Pool — rejected: breaks edge caching, higher latency, and existing `neon-http` transaction shim (`packages/db/index.ts:32`) already handles non-atomic fallback with compensating deletes.
- Keep http + document exception only — rejected as sole path: need a real DB-layer option for SOC2/ISO tenants.

**References:** `DATABASE.md §14`, `packages/db/index.ts`, `apps/web/lib/trpc/server.ts:133`, `packages/db/schema/security.ts:51` (fixed string-interp), `__tests__/rls-db-layer.test.ts`, `__tests__/idor-rls-sweep.test.ts`.

*Generated 2026-09-04 — file:line verified, no guessing.*
