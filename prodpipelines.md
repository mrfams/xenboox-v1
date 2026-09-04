# Production Pipelines — Master List

Every end-to-end flow a user can run through Xenboox, audited to production grade.
Method: **one pipeline at a time, one sub-part at a time** — fire the relevant
"employees" (engineering, design, security, UX, edge cases), deep-audit a single
part, plan, implement, verify, commit. Nothing ships surface-level.

Status legend: ✅ done · 🔄 in progress · ⬜ not started · ⚠️ needs follow-up

---

## Pipeline 1 — Document Ingestion

**File/image → AI extraction → TrustGuard → journal generation → posting**

- Sub-part A: Intake & classification
- Sub-part B: TrustGuard (deterministic verification — never trusts the LLM)
- Sub-part C: AI extraction
- Sub-part D: Journal generation
- Sub-part E: Posting & propagation
- Sub-part F: Notifications & status
- Sub-part G: UI layer
- Sub-part H: Background jobs

**Findings:** `findings/pipeline-1-subpart-*`
**Status:** ✅ Deep-audited (A–H) — committed earlier in master

---

## Pipeline 2 — Bank Connection → Transaction Import → Categorization

**Connect bank (Plaid/Mono/manual) → sync/import transactions → categorize → post to ledger**

- Sub-part A: Connection layer (link, token, exchange)
- Sub-part B: Transaction sync (Plaid/Mono jobs, dedup, pagination)
- Sub-part C: Categorization engine (rules, keywords, provider signals, learning loop)
- Sub-part D: Propagation & GL posting (bank tx → journal entries)
- Sub-part E: Statement/PDF import (CSV/PDF parsers, OCR, validation)
- Sub-part F: UI layer (banking view, rows, rules manager, connection cards)
- Sub-part A: Connection layer (link, token, exchange)
- Sub-part B: Transaction sync (Plaid/Mono jobs, dedup, pagination)
- Sub-part C: Categorization engine (rules, keywords, provider signals, learning loop)
- Sub-part D: Propagation & GL posting (bank tx → journal entries)
- Sub-part E: Statement/PDF import (CSV/PDF parsers, OCR, validation)
- Sub-part F: UI layer (banking view, rows, rules manager, connection cards)
- Sub-part G: Notifications & status
- Sub-part H: Background jobs & scheduling
- Verification loop: cross-sub-part re-audit

**Findings:** `findings/pipeline-2-banking/subpart-*`

| Sub-part | Status | Commit      |
| -------- | ------ | ----------- |
| A + B    | ✅     | earlier     |
| C        | ✅     | `52152406`  |
| D        | ✅     | `6cddb782`  |
| E        | ✅     | `0ab15c8`   |
| F        | ✅     | `f30ab08`   |
| G        | ✅     | `30b8fbcd`  |
| H        | ✅     | `b8332b2e`  |
| Verify   | ✅     | next commit |

---

## Pipelines 3–12

| #   | Pipeline                     | Status | Notes                                                                                                    |
| --- | ---------------------------- | ------ | -------------------------------------------------------------------------------------------------------- |
| 3   | Invoice Flow                 | ✅     | A–D + verification loop committed                                                                        |
| 4   | Bill Flow                    | ✅     | A–D + verification loop committed                                                                        |
| 5   | Bank Reconciliation          | ✅     | A–E + verification loop committed                                                                        |
| 6   | Expense Recording → Approval | ✅     | A ✅ · B ✅ · C ✅ · D ✅ · E ✅ (EXP- partition, superRefine tree fix, GMD sweep, tax-install layering) |
| 7   | Journal Entries              | 🔄     | Deep-audit: A ✅ (record layer) · B ⬜ · C ⬜ · D ⬜                                                     |
| 8   | Month-End Close              | 🔄     | Deep-audit: A ✅ · B ✅ (close job) · C ⬜ · D ⬜                                                        |
| 9   | Financial Reporting          | ✅     | P&L, Balance Sheet, Cash Flow, Budget vs Actual                                                          |
| 10  | AI Chat / Agent Routing      | ✅     | Message validation, conversation management                                                              |
| 11  | Recurring Transactions       | ✅     | Batch party-name enrichment, full lifecycle                                                              |
| 12  | Multi-Currency               | ✅     | 4-level FX resolution, cache, revaluation, audit logging                                                 |

**Findings:** `findings/pipelines-3-12-audit/audit-summary.md`
**Status:** ⚠️ One audit pass done (2 fixes landed: Bills scope-crash, Recurring N+1).
Each pipeline still deserves the same deep one-sub-part-at-a-time treatment as
Pipelines 1–2 before true production sign-off.

---

## Cross-cutting audit tracks

- **Security audit** — `findings/security-audit/`
- **Design critique** — `findings/design-critique/`
- **CI/CD audit** — `findings/cicd-audit/`
- **Engineering findings** — `findings/pipeline-2-banking/engineering-findings.md`
- **Production gaps ledger** — `PRODUCTION_GAPS.md`

---

## Current state (where we are now)

- **Pipeline 3 (Invoice Flow) — Sub-Parts A + B committed:**

  - `apps/web/server/ar-validation.ts` — shared money/date boundary validators.
  - `ar.ts` — server-side money+date+length validation (NaN/negative/junk
    amounts blocked), line `accountId` entity-scope check, `updateInvoice` is now
    a gated state machine (void-only, no totalAmount forgery), payments use an
    atomic compare-and-set balance update (no silent db.transaction shim race),
    delete guards with clear conflicts, deletePayment restores invoice balance.
  - `invoicing.getNextInvoiceNumber` — max-sequence suggestion (collision-free
    after deletes), `create-invoice-dialog` validates lines inline (no silent
    drops).
  - **P3-B (posting) committed (`f2658d0` + follow-up):** AR invoices/payments
    now reach the ledger — invoice creation posts Dr AR / Cr line accounts
    (`ar-inv-{id}`), payments post Dr receipt / Cr AR (`ar-pay-{id}`), void
    reverses the entry (`ar-inv-rev-{id}`). Idempotent by JE reference,
    TrustGuard-validated, open-period gated, canonical AR/cash/bank accounts
    auto-created (1100/1010/1020). Payment posting failure rolls the payment
    back; deleting a posted payment is blocked (reverse first).
  - **Next (P3-C/D):** notifications/status + UI surface (unposted state +
    retry action), PDF/email, then verification loop.

- **Pipeline 2 (Banking) is fully done** — sub-parts A–H + verification loop:
  - G `30b8fbcd`: shared entity-notification helper (`notify-entity.ts`, db client
    extracted to `packages/db/client.ts` to break the type cycle), +3 banking
    notification types, sync/import failures now notify entity users, Plaid
    reauth (`ITEM_LOGIN_REQUIRED`) detection, admin-notification SQL bug fixed,
    attention destinations + connection-card error UI with retry.
  - H `b8332b2e`: double-booking gate (bank statements can no longer silently
    post as revenue journals — verified income never routes to ledger), provider-
    correct sync dispatch (Plaid never sent to Mono task), scheduler rewritten
    chunked-parallel + fail-loud.
  - Verify (next commit): ledger-integrity lock — transactions posted to the GL
    (`journalEntryId` set) are now locked against re-categorization/undo until
    the journal entry is reversed; UI renders a lock + surfaces blocked undo rows.
- **Next:** deep-audit Pipelines 3–12 one sub-part at a time with the same method.

## Needs review (implemented, check when convenient)

- **P5-A**: Reconciliation view mounted as a "Reconcile" tab inside Operations → Banking (not the Ledger page). Move to Ledger or AI-chat-only if preferred.
