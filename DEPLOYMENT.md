# XENBOOX DEPLOYMENT RUNBOOK — Ledger Engine Cut-over (G4)

> Ops runbook for the Engine v2 staged cut-over. Companion to `ENGINEERING_SYSTEM.md` (process) and `prodway.md` (release gate).
> Doctrine: **staged, reversible, evidence-gated** — every flag flip is a per-environment operations decision backed by parity evidence, never a leap of faith.

---

## 1. Flag matrix (all default OFF)

| Flag | Module | Engine posts? | Legacy tables |
|---|---|---|---|
| `LEDGER_SHADOW=true` | ALL (mirror only) | No — legacy primary | Authoritative |
| `LEDGER_PRIMARY_AR=true` | AR invoices + payments | Yes | Derived mirror |
| `LEDGER_PRIMARY_AP=true` | AP bills + payments | Yes | Derived mirror |
| `LEDGER_PRIMARY_EXPENSES=true` | Expense reimbursements | Yes | Derived mirror |
| `LEDGER_PRIMARY_CLOSE=true` | Close depreciation | Yes | Derived mirror |
| `LEDGER_PRIMARY_PAYROLL=true` | Payroll runs | Yes | Derived mirror |
| `LEDGER_PRIMARY_FX=true` | FX revaluation | Yes | Derived mirror |
| `LEDGER_PRIMARY_BANKING=true` | Bank categorization | Yes | Derived mirror |

**Safety properties (all paths):** engine failure aborts the posting (money never half-exists); legacy-mirror failure after an engine commit leaves the event standing and is reconciled by the parity verifier; every event is hash-chained and append-only (DB trigger enforces).

---

## 2. Staging deployment (run once per staging refresh)

1. **Migrations**: `pnpm --filter=@xenboox/db migrate` — applies 0040 (status_code integer) and 0041 (journal_events + balances + append-only trigger).
2. **Env**: `DATABASE_URL` → Neon **pooled** endpoint; `LEDGER_SHADOW=true`; `CRON_SECRET` set; `USE_RLS`/RLS role wiring per ADR-RLS-POOL when enabled.
3. **Deploy** the branch (Vercel preview or staging project).
4. **Verify**: `GET /api/cron/ledger-parity?entityId=<uuid>` with `x-cron-secret` → expect `{ ok: true, mismatches: 0 }` once shadow events accumulate.
5. **Smoke**: post one AR invoice → check `journal_events` has the mirrored event (`reference == idempotency_key`) and `ledger_account_balances` moved.

## 3. Parity evidence (the gate for every flip)

- Nightly cron walks the 50 newest posting entities (300 entries each) and reports `checked/matched/mismatches`.
- **Flip gate: 14 consecutive nightly runs with zero mismatches for the target module's entity set.**
- Operator deep-scan: `GET /api/cron/ledger-parity?entityId=<uuid>` (2,000-entry sweep) before flipping high-volume modules.
- Any mismatch: fix the cause, re-run parity, **restart the 14-day window**. Mismatches are never waived.

## 4. Flag flip procedure (per module, per environment)

1. Confirm parity gate (§3) for the module.
2. Set the module flag (e.g. `LEDGER_PRIMARY_AR=true`) in the environment.
3. Keep `LEDGER_SHADOW=true` for one more cycle — it is a no-op once the module is engine-primary (the mirror direction already flipped), but leaving it on keeps the log semantics uniform.
4. Post-deploy smoke: one create + one void/reversal per entity type; verify journal_events, balances, and the legacy mirror row all agree.
5. **Rollback**: set the flag to false — the legacy path resumes as primary immediately. Engine events already committed stay (they are a superset record); the parity verifier reconciles.

## 5. Production gates (before ANY production flip)

- [ ] CI green: ledger typecheck + tests, web typecheck (6GB heap), epoch0 regression suites (16 suites / 125+ cases)
- [ ] Staging parity: 14 clean nights across all modules
- [ ] Migration 0041 applied to production (maintenance window: ALTER is instant on the empty new tables)
- [ ] Production `DATABASE_URL` on the pooled endpoint (N11 deploy gate)
- [ ] Backups: pre-deploy snapshot + PITR confirmed (restore drill documented in SECURITY.md)
- [ ] `LEDGER_SHADOW=true` production canary on ONE internal entity for 7 days → parity clean → broader enablement

## 6. Legacy freeze (G4 fully realized)

When every module is engine-primary in production for 30 days with zero parity incidents:
1. Legacy journal writes remain as mirrors (do NOT stop writing them while legacy readers exist).
2. Move each legacy reader (reports, dashboards, TB) onto the engine read models (per §4.3).
3. Then stop the legacy mirror writes; legacy tables freeze read-only.
4. G4 → COMPLETE. Epoch 2 builds (consolidation, firms, tax filings) stand on the engine.

---

## Escalation

- Parity mismatch in production: set the module flag to false (rollback), investigate with `?entityId=` deep-scan, fix, restart the window.
- Suspicious hash chain break (`verifyChain` invalid): treat as a security incident — freeze writes to the entity, preserve evidence, follow the incident response runbook (SECURITY.md).
