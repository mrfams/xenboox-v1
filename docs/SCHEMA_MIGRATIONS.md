# Schema Migrations: Policy, Testing, and Rollback

> Last updated: Aug 16, 2026 · Owner: Platform · Reference: ROADTOPRODUCTION.md §9.2

## 1. Policy

- **Generated, never hand-written.** Schema changes are created with
  `pnpm db:generate` (drizzle-kit). Hand-written SQL is allowed ONLY for
  data migrations and ops-level DDL (partitioning, RLS forcing) and must be
  journaled (see §4).
- **One logical change per migration.** Generated migrations are additive
  and forward-only — there is **no down migration** in Drizzle.
- **Non-destructive by default.** A migration that drops data or renames a
  table requires a review note in the migration header and an entry in this
  doc. The partitioning migration (`0029_partition_append_heavy_tables.sql`)
  is the template: it builds shadow tables and documents the manual swap —
  it is **not** auto-applied (kept out of the journal by design).
- **Journal completeness is mandatory.** Every SQL file in
  `packages/db/migrations/` that must run on fresh environments has a
  journal entry in `meta/_journal.json`. The CI Migrations job fails if a
  fresh database diverges from the schema (drift check).

## 2. Testing in CI

`.github/workflows/ci.yml` → **Migrations** job:

1. Spins up a **fresh PostgreSQL 16** service container (no prior state).
2. Runs `pnpm db:migrate` — every journaled migration must apply cleanly.
3. Runs the **drift check**: `drizzle-kit generate` after the migrate; if a
   new migration is produced, schema and migrations are out of sync → CI
   fails with "run `pnpm db:generate` and commit the new migration".

This catches, before any deploy: broken SQL, missing journal entries,
schema drift, and migrations that depend on pre-existing data.

## 3. Rollback Strategy (forward-only, expand/contract)

Drizzle migrations are **forward-only**. Rolling back a schema change is a
**forward** operation, never a revert:

### 3.1 Before every deploy with a migration

1. **Backup first.** On Neon: take a branch snapshot / PITR point before the
   deploy (`pnpm db:push` and manual SQL excluded — only journaled
   migrations ship).
2. **Expand/contract for risky changes** (renames, NOT NULL additions,
   type changes):
   - **Expand**: add the new column/table alongside the old (write path
     writes both).
   - **Migrate data**: backfill the new structure.
   - **Contract**: in a _later_ release, drop the old structure.
3. Additive migrations (new tables/columns/indexes) are inherently
   reversible by the next release — no special handling.

### 3.2 When a deploy goes wrong

| Scenario                         | Action                                                                                                                                                                                                                |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration SQL error              | Deploy failed before commit — fix the migration (append a NEW corrective migration, never edit an applied one — the migrator tracks by hash/timestamp) and redeploy                                                   |
| Migration applied but app broken | **Roll back the app** to the previous release (Vercel instant rollback). The schema stays forward — the old app code must tolerate the new schema (expand/contract guarantees this). Then ship a corrective migration |
| Data corruption detected         | Restore from the Neon PITR snapshot taken before deploy; the app release stays, schema is rebuilt by re-running migrations up to the fixed head                                                                       |
| Partial application              | The migrator runs each migration in a transaction — a failed migration leaves zero partial application; re-run `pnpm db:migrate` after fixing                                                                         |

### 3.3 The 4.5.3 rule

- **4** eyes on every migration review (2 reviewers, or 1 reviewer + CI).
- **5** minutes is the target time for the CI Migrations job.
- **3** copies of the schema state: migrations on disk, the journal
  snapshot chain (`meta/*_snapshot.json`), and the live database. CI
  verifies the first two match, and the drift check verifies they match the
  third (by generating against the fresh DB).

## 4. Journaling hand-written migrations

Hand-written SQL (ops DDL, data migrations) must be added to
`meta/_journal.json` so fresh environments run them in order. The migrator
applies entries whose `when` timestamp is newer than the last applied one —
append new entries at the end with a fresh timestamp, and keep the `tag`
equal to the SQL filename.

> **Example**: `0030_force_rls.sql` (FORCE ROW LEVEL SECURITY on every
> RLS table — critical hardening) was present on disk but missing from the
> journal, so fresh databases silently skipped it. Added to the journal
> (Aug 16, 2026). The partitioning migration was deliberately NOT journaled
> per its own "DO NOT run automatically" note.
