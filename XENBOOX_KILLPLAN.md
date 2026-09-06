# XENBOOX KILLPLAN — Building the Platform That Kills All Accounting Software

> Status: **MASTER PLAN v2 (2026-09-06)** — v1 (thesis → roadmap, §1–12) expanded with the global platform sections §13–§19: all markets (developed + developing), all money rails (banks, mobile money, digital), localization/regulatory per continent, the migration factory, AI-native for all regions, and the mobile/desktop gate. Companion to `prodway.md` (deep audit — the "what's broken today" source of truth).
> Mission: out-engineer and out-design QuickBooks, Xero, Sage, NetSuite, Intuit's AI agents, and every AI-native challenger — for everyone from a one-person business to institutions and accounting firms — on an architecture built for millions of concurrent users.

---

## 1. The Thesis — why every incumbent is beatable

Each competitor has a structural weakness that is expensive for them to fix and cheap for us to build correctly from day one.

| Front | Incumbent | Their structural weakness | Our kill move |
|---|---|---|---|
| Legacy SMB | QuickBooks Online | Per-company-file silos; **no native multi-entity consolidation** (manual close stretches 5→15+ days); 2025 price hikes (32%+, some report 400–600% cumulatively) with features REMOVED; 25-user cap even on Advanced; desktop sunset backlash; shallow inventory | One ledger, unlimited entities; one-click migration importer; flat predictable pricing; AI does the books |
| Legacy SMB | Xero | No native consolidation; no US-native payroll; weaker inventory; support complaints | Same as above + real payment/payroll partnerships where native is uneconomic |
| The AI giant | Intuit (Intuit Assist + 2025 "virtual team of AI agents") | AI bolted ON TOP of a 20-year-old single-entity ledger; agents act inside the same siloed, price-gouged product; no firm channel at scale; trust bounded by QBO's data model | AI-native from the ledger up: every agent action is an evidence-linked, reversible, audited posting — and firms get our AI as staff |
| AI-native challengers | Basis ($1.15B — AI staff for CPA firms), Puzzle ($66.5M — AI-native ledger, 98% auto-categorization), Numeric ($89M+ — AI close), FloQast, Truewind, Digits, Rillet | Each owns ONE wedge (firms OR ledger OR close). None covers the full stack: ledger + close + AP/AR + tax + multi-entity + firms in one system | We are the full stack: their three categories are three modules of one platform |
| Mid-market | NetSuite / Sage Intacct | $100K–$500K TCO, $50K–$150K implementations, 3–6 month deployments, per-module pricing creep, complexity complaints | 90% of mid-market finance capability (consolidation, eliminations, multi-currency, close) with same-day setup and AI doing the work — at SMB pricing |
| Accounting firms | Nobody owns "AI staff + work management + client ledger" together | CPA pipeline crisis is structural: 200,000+ unfilled US CPA roles, 81% of firms capacity-constrained, CAS growing 17% median with revenue projected to double in 3 years; 70% of firms already use AI weekly | The firm channel IS our distribution: we give firms an AI workforce + client ledger + review workflow, so firms bring us their clients |
| Regulatory | Everyone is scrambling | E-invoicing mandates have force-on dates: France Sept 2026 (all must RECEIVE), Belgium live Jan 2026, Poland KSeF 2026, Germany phasing 2025–2028, PEPPOL/EN 16931 standards | Build PEPPOL-native e-invoicing into the ledger NOW — compliance is forced adoption and a moat |

**One-sentence pitch:** *Xenboox is the AI accounting department — a real double-entry ledger the AI works on top of, for one person or one thousand entities, used directly or through your accounting firm.*

---

## 2. Market Intelligence (researched 2026-09-06)

### 2.1 The AI-native wave
- **Basis** — $100M Series B at **$1.15B valuation** (Accel). AI agents doing end-to-end accounting work inside CPA firms; featured on OpenAI's customer stories (firms save up to 30% of time). Proves the FIRM channel pays enterprise prices for AI labor.
- **Puzzle** — ~$66.5M total. AI-native general ledger for startups + firms; claims 98% auto-categorization and 96% reconciliation-time reduction; free tier under $20k cumulative volume. Proves an AI-native ledger can take QBO's base.
- **Numeric** — $51M Series B (Nov 2025; ~$89M total), expanding from AI close management into a full finance platform including cash. Proves close automation is a funded standalone category — for us it's a module.
- **FloQast** — mid-market close leader marketing "auditable AI agents," ISO 42001-certified for AI governance. Sets the trust bar: **auditable AI is becoming a certification-level expectation.**
- Also: Truewind, Digits, Rillet (AI ERP), Ledge, Nominal, Finlens, ChatFin, AppZen (AP audit), MindBridge/Trullion/DataSnipper (audit-side AI).

### 2.2 The AI giant move
Intuit's 2025 launch: a "virtual team of AI agents" (payments, accounting, finance, customer hub) doing invoicing, payment tracking, reconciliation — marketed at ~12 hours/month saved. **Honest threat assessment:** they have distribution (7M+ subscribers) and brand trust. What they cannot cheaply do: retrofit consolidation, an immutable audit-grade journal, an open firm platform, and honest global pricing onto QBO's architecture. We win on architecture, price, and the firm channel.

### 2.3 The firm channel (distribution superpower)
- CPA pipeline: crisis-stage, 200k+ shortfall; 81% of firms name staffing as their #1 capacity constraint; companies average 17 unfilled accounting roles (up from 5 in 2025).
- CAS is the growth engine: 17% median growth; 60% of CAS firms at double-digit growth; CAS revenue projected to double in 3 years.
- 70% of firms use AI weekly; toolchains are fragmented (ledger + practice mgmt + portals + tax software don't talk).
- Practice management incumbents (Karbon, Canopy, TaxDome, Jetpack, Financial Cents) manage WORK but don't DO the work. Our wedge: **the platform where AI does the client work and the firm reviews it.**

### 2.4 Regulatory wave (forced adoption)
- **France: Sept 1, 2026** — all VAT-registered businesses must RECEIVE structured e-invoices; large/mid must issue (SMEs issue by 2027); a real-time-tax-control (CTC) regime.
- **Germany:** receiving mandatory since Jan 2025; issuing phases 2026–2028 by turnover (XRechnung/ZUGFeRD, EN 16931).
- **Belgium live Jan 2026; Poland KSeF 2026;** Spain Verifactu and others following. Standards: **PEPPOL BIS, EN 16931, PINT**; access-point certification is the door.
- Consequence: an accounting platform that is PEPPOL-native in 2026 wins the EU mandate wave; one that isn't is locked out.

### 2.5 Legacy gaps (confirmed pain)
- QBO & Xero: no native multi-entity consolidation or intercompany elimination — third-party apps required; manual consolidation stretches close from ~5 to 15+ days; cross-entity reports that don't balance.
- QBO inventory: no bin/warehouse, no barcode, no manufacturing, valuation errors at scale. Xero: weaker native inventory, no US payroll.
- QBO 2025: steep price increases with features removed; desktop sunset backlash; hard user caps (3–25).
- NetSuite: TCO $100K–$500K, 3–6 month implementations, per-module creep, over-complex for finance-only. Intacct: similar price, finance-first but narrow.

---

## 3. Product — the Full Accounting Coverage Matrix

Segments: **S0** solo/self-employed · **S1** SME (2–200) · **S2** mid-market/institutions (200–5,000; multi-entity groups, funds, nonprofits) · **F** accounting firms (white-label AI staff + client portfolio).

Today-legend (from the prodway.md audit): ✅ real · 🟡 partial/broken · ❌ missing · 🔌 integrate via partner.

| Domain | Capability | S0 | S1 | S2 | F | Today | Decision |
|---|---|---|---|---|---|---|---|
| General ledger | Double-entry journal, COA, numbering | ✅ | ✅ | ✅ | ✅ | ✅ | Keep — migrate onto Engine v2 (§4) |
| General ledger | Immutable audit-grade journal (no UPDATE/DELETE, hash-chained) | ✅ | ✅ | ✅ | ✅ | ❌ | **Build — Epoch 1 core** |
| General ledger | Reversals-only corrections, period locks | ✅ | ✅ | ✅ | ✅ | 🟡 | Build |
| General ledger | Dimensions/segments (dept, project, grant, fund) | ✅ | ✅ | ✅ | ✅ | 🟡 | Build as Engine metadata |
| AP | Bills, approvals, partial payments, vendor credits | ✅ | ✅ | ✅ | ✅ | 🟡 | Complete |
| AP | Payment runs (ACH/SEPA/card), positive pay | ✅ | ✅ | ✅ | ✅ | ❌ | 🔌 PSP partner + build orchestration |
| AR | Invoices, recurring, credit notes, statements, dunning | ✅ | ✅ | ✅ | ✅ | 🟡 | Complete credit notes + dunning |
| AR | Payments: links, PSP checkout, auto-matching | ✅ | ✅ | ✅ | ✅ | 🟡 | Complete |
| AR | **E-invoicing (PEPPOL/EN 16931, country CTC)** | ✅ | ✅ | ✅ | ✅ | ❌ | **Build — EU wedge (Epoch 3)** |
| Banking | Feeds (Plaid/Mono/Stitch), matching, reconciliation | ✅ | ✅ | ✅ | ✅ | ✅ (demo money must die) | Keep + harden |
| Banking | **Statement-based recon workflow** | ✅ | ✅ | ✅ | ✅ | ❌ | Build — Epoch 2 |
| Expenses | Receipts OCR, cards, claims, policy engine | ✅ | ✅ | ✅ | ✅ | 🟡 | Complete policy engine |
| Fixed assets | Register, schedules, disposal | ✅ | ✅ | ✅ | ✅ | ✅ | Keep |
| Inventory | Items, COGS (FIFO/avg), multi-location, PO→bill | — | ✅ | ✅ | — | ❌ | Build lite (Epoch 2); heavy WMS 🔌 |
| Payroll | Runs + filings | — | ✅ | ✅ | — | ❌ | 🔌 partner with GL sync first; own payroll per-region later |
| Close | Checklist, recon templates, accruals/prepaids, flux, timeline | ✅ | ✅ | ✅ | ✅ | 🟡 (not durable) | Close Center v2 on Engine — Epoch 1 |
| Revenue | Deferred revenue, subscriptions, ASC 606/IFRS 15 lite | — | ✅ | ✅ | — | ❌ | Epoch 3 |
| Leases | ASC 842/IFRS 16 schedules | — | — | ✅ | — | ❌ | Epoch 4 (template-driven) |
| Grants/Nonprofit | Fund accounting, donor restrictions, budget vs actual | ✅ | ✅ | ✅ | ✅ | 🟡 | Complete (already spec'd in toAINative.md) |
| Multi-currency | FX, revaluation, per-line currency stamping | ✅ | ✅ | ✅ | ✅ | 🟡 | Complete + rate sourcing |
| Multi-entity | Intercompany, eliminations, **consolidated P&L/BS/CF**, CTA | — | ✅ | ✅ | ✅ | ❌ (stub) | **Build — Epoch 3 (the NetSuite kill)** |
| Tax | VAT/GST/sales-tax engine, returns prep, MTD | ✅ | ✅ | ✅ | ✅ | ❌ | Epoch 2 (prep); filings 🔌 |
| Year-end | 1099-NEC/MISC prep, year-end pack | — | ✅ | ✅ | ✅ | ❌ | Epoch 4 |
| Budgets | Budgets vs actual, scenarios, forecasts | ✅ | ✅ | ✅ | ✅ | 🟡 | Complete |
| Reporting | P&L/BS/CF, segments, custom report builder, board pack | ✅ | ✅ | ✅ | ✅ | 🟡 | Rebuild on read models (§4.3) |
| Controls | Roles, approval chains, SoD, locks, audit trail | ✅ | ✅ | ✅ | ✅ | 🟡 | Build approval-chain + SoD engine |
| Trust | SOC 2, GDPR, residency, immutable logs | ✅ | ✅ | ✅ | ✅ | 🟡 | Epoch 3 program |
| API | Public REST + webhooks + OAuth apps | ✅ | ✅ | ✅ | ✅ | 🟡 | GA + app marketplace |
| Firm workspace | Client portfolio, work mgmt, review/lockdown, white-label | — | — | — | ✅ | ❌ | **Build — Epoch 3 (the Basis kill)** |

**Enforced rule:** every S0/S1 capability ships AI-first (AI does it, human approves decisions); every S2 capability ships controls-first (approval chains, SoD, locks, evidence); F gets the same ledger with a management layer on top.

---

## 4. Ledger Engine v2 — the core we rebuild (and the scale story)

The single most important decision in this plan. Today's journal (`journal_entries` + `journal_entry_lines` with mutable status columns, approval-time UPDATEs, in-memory idempotency, non-atomic transactions on the default driver) cannot be the foundation for "kill all accounting." We rebuild the core once, correctly, then move every module onto it. Modeled on what Monzo/Modern Treasury/TigerBeetle-class systems proved: **an append-only, event-sourced, double-entry journal with CQRS read projections, partitioned by tenant.**

### 4.1 Immutable journal (the event store)

- `journal_events` is **append-only**: INSERT-only table; the application DB role has UPDATE/DELETE revoked, enforced by triggers too.
- Every posting is one **event** containing: id (ULID), entity_id, period, effective date, source (agent/user/import/integration), actor, lines (account, debit/credit in integer minor units, currency + rate + base amount, dimensions), idempotency_key, and `prev_event_hash` — a **hash chain** making the books tamper-evident (verifyable by any auditor with a single query).
- **Corrections are events too**: a reversal event references the original event, carries a reason, and never mutates it. Draft state lives OUTSIDE the journal (a draft workspace table); only validated, balanced, period-open postings become events. This kills the whole class of "approval flips draft→posted via bare UPDATE" bugs found in the audit.
- Idempotency: unique index on (entity_id, idempotency_key) — retries can never double-post (database-guaranteed, not in-memory maps).

### 4.2 Posting service (single point of entry)

- One internal service owns writes: validate (TrustGuard: balance, open period, account active, entity scope) → append event → update projections, in one real DB transaction (this requires the prodway Wave-0 driver fix: transactional Postgres, not neon-http).
- Queue-backed for bulk (bank feeds, imports, agent batches): workers consume ordered per-entity streams; per-entity ordering makes the ledger single-writer per entity — **race conditions are eliminated by construction, not by hope**.
- Every module (AR, AP, expenses, payroll sync, close adjustments, e-invoicing) posts through this service. No module writes ledger tables directly. This is the enforcement of the AGENTS.md "Ledger Agent is the single point of entry" rule — in code, not convention.

### 4.3 CQRS read models (why queries never touch raw events)

- `account_balances` (entity, account, period, debit, credit) maintained incrementally by the posting consumer; rebuildable from events at any time (self-healing + reconciliation-proof).
- Period-end **snapshots at close**: the close is a lock event; locked periods read from immutable snapshots — that's what makes the audit trail "audit-grade" and the close instant to reopen/report.
- Report queries (P&L/BS/CF, trial balance, consolidation inputs) read projections only — p95 < 150ms regardless of journal size.

### 4.4 Scale path to millions of concurrent users (phased, no rewrites)

| Phase | Architecture | Capacity | Trigger to move |
|---|---|---|---|
| A (now) | Single Postgres (Neon, transactional driver) + read replica + Redis cache/sessions; native table partitioning of `journal_events` by HASH(entity_id) and RANGE(period) | ~10–50k active entities | sustained CPU/IO or 200ms+ p95 |
| B | Shard: N Postgres clusters by entity hash behind a routing layer (Citus first, app-level router as fallback); control plane (identity/orgs/billing) in its own DB; Trigger.dev/Temporal for durable jobs | ~500k entities, 1M+ concurrent sessions | cross-region demand, residency |
| C | Regional cells (EU / US / Africa+ME), tenants pinned by residency choice; global control plane; per-cell read models; pub/sub fan-out for live streams (Redis at B, NATS/Kafka-class at C) | millions of concurrent users | global launch |
- Consistency model: an entity's ledger is single-writer and strongly consistent inside its shard; cross-entity reads (consolidation, admin) are eventually-consistent read models with bounded staleness (seconds) — this is exactly how banks do it.
- Everything stateless at the edge: Vercel for UI/edge; posting/ingestion/agent workers on dedicated compute; R2 for documents; pgvector per shard for RAG.
- Targets: p95 API < 200ms · posting confirmation < 500ms (sync) / seconds (bulk) · 99.95% core SLA · RPO < 1 min (PITR) · RTO < 1 h · cost target < $0.50/entity/month at 100k entities.
- Load tests exist in repo (`load-tests/`) — wire them into CI against staging before every epoch gate.

### 4.5 Migration (how we get there without stopping the business)

1. Build Engine v2 alongside (new schema, new service, feature-flagged).
2. Dual-write shadow: current postings mirror into `journal_events`; nightly verifier proves balances match (self-check = trust).
3. Cut read models for reporting first (zero-risk win: reports get faster + reconcile).
4. Cut posting over module-by-module (expenses → AR → AP → journal UI → close).
5. Backfill history as immutable events; freeze old tables read-only. Old paths die with their feature flags.

---

## 5. AI Operating Model v2 — from "chatbot claims" to auditable AI staff

The audit showed the inference is real but the *accountability* layer is decorative (hardcoded confidence, invisible runs, non-durable approvals). This is the section that makes "the AI does your accounting" TRUE and defensible — and matches where the market is going (FloQast's "auditable AI agents", ISO 42001).

### 5.1 Honest confidence (kill the 210 literals)
- Confidence is **computed, never declared**: extraction field-scores (OCR), retrieval scores (RAG), tool-verification results (did the query return the invoice?), and historical correction rates per (agent, task-type, entity) combine into one score per action.
- Thresholds keep their meaning because the number means something: < 0.7 supervisor review, < 0.4 human queue — driven by the computed value.
- Every AI answer in the UI links its **evidence** (the exact transactions/records used) in one click. "Why do you say cash is X?" must always answer itself.

### 5.2 Agent contracts (per-agent specs, enforced)
- Every write-action agent posts through the Posting Service (§4.2) with a declared intent type; the service enforces limits (max amount, allowed accounts, required approval tiers by policy).
- HITL policy per entity is configurable (approval chains, thresholds, SoD rules) — S2/F demand this; S0 gets sane defaults.
- Every agent action leaves: event (journal or domain), audit row (actor, evidence, confidence, outcome), and a reversible path. Failure = visible task failure, never silent success (audit Part 6 rules).

### 5.3 Evals as a product system
- Golden datasets per agent (categorization, extraction, close adjustments, anomaly detection) run in CI; a PR that drops accuracy cannot merge.
- Trace every run to LangFuse with the PII redaction already built; ops dashboards read real run data (fixing the writer/reader mismatch is a prerequisite, already spec'd in prodway Wave 2).

### 5.4 The firm-specific AI (the Basis kill)
- Firms get a **workforce view**: N client ledgers, each with its AI staff doing the CAS work (categorize, reconcile, accrue, draft reports), producing a review queue for firm staff.
- Review workflow: sample-based or full review, tick-and-tie evidence, lockdown sign-off, client-ready output. The firm's reviewer signs; the platform records who reviewed what and when (this is the deliverable CAS firms actually sell).
- White-label: firms brand it; we power it. Pricing per client ledger at a fraction of a bookkeeper's salary — the economics are the sales pitch.

---

## 6. UX Overhaul — from "beginner" to the best-designed accounting product on earth

The owner's assessment is correct: today's UI is functional but not defensible. The redesign to come is not reskinning — it's a design system plus interaction standards that every surface is rebuilt on.

### 6.1 Ledger Design System (name TBD)
- **Tokens**: color (semantic money colors: income/expense/neutral/warning; dark mode first-class), type scale (tabular numerals for ALL money — non-negotiable for accounting), 4pt spacing, motion (150–250ms, purposeful only).
- **Primitives**: MoneyInput (currency-aware, decimals enforced by currency), DataGrid (virtualized, sticky headers, inline edit, bulk actions, saved views), DecisionCard (the approve/reject/evidence unit), PeriodPicker, EntitySwitcher (with guaranteed cache isolation — the audit's P0), AuditTimeline, ApprovalChainViewer, EvidenceDrawer.
- **Standards**: WCAG 2.2 AA; keyboard-first (every surface operable without mouse); skeleton → content, never zeros-as-data; every error state has a next action; optimistic UI only where the mutation is idempotent and reversible.
- Visual regression tests (Storybook + Chromatic-class) gate every PR — "looks fine" becomes provable.

### 6.2 Surface model (evolves the 5-surface AI-native architecture)
1. **Command Center** (chat + tasks + approvals inline) — as built in phases A–C, kept and polished.
2. **Operations** (money in/out, decisions-first) — as built in Phase B.
3. **Financial Pulse** (AI-narrated health, reports, budgets, forecasts).
4. **Ledger** (books: journal, COA, trial balance, account detail, audit).
5. **Close Center** (checklist, reconciliations, flux, timeline, sign-off) — promoted from a page to a first-class surface for S1+.
6. **Firm Workspace** (new, F only): client portfolio, work management, review queue, white-label settings.
- Module pattern stays: every surface opens with what needs a decision, not a table; tables exist for auditors and power users with saved views.

### 6.3 What "production-grade" means per screen (acceptance bar)
- Every number: tabular, right-aligned, currency-marked, period-scoped, traceable to ledger in ≤ 2 clicks.
- Every list: virtualized, filterable, saveable views, exportable.
- Every AI suggestion: evidence drawer + confidence + one-click accept/reject-with-reason.
- Every destructive action: typed confirmation + undoable where reversible + audited always.
- Mobile: the 6 surfaces responsive; receipts capture + approvals + cash view are native-class on phones.

---

## 7. Compliance & Trust (the moat nobody in SMB accounting has)

- **SOC 2 Type I → Type II**: controls mapped from the audit's findings (immutable audit trail, access reviews, change management via CI gates). Start the program at Epoch 1, target Type I by end of Epoch 2, Type II observation window during Epoch 3. Firms and S2 buyers will not sign without it.
- **Audit trail**: hash-chained journal (§4.1) + hash-chained action audit log + exportable evidence packs (auditor account: read-only, per-entity, watermark exports).
- **Data protection**: GDPR (export/delete, DPAs, subprocessor list), residency by region cell (§4.4 Phase C), retention policies per jurisdiction.
- **E-invoicing**: PEPPOL access-point certification + EN 16931/XRechnung/ZUGFeRD/Factur-X/PINT output; per-country CTC adapters (France PPF/PDP direction, Poland KSeF, Belgium, Germany phases). This is Epoch 3 infrastructure with 2026–2028 force-on dates — early = moat.
- **AI governance**: ISO 42001-aligned model management (prompt versioning, eval records, human-oversight evidence) — the differentiator FloQast is already marketing.

---

## 8. Business Model & GTM

### 8.1 Pricing (the anti-QuickBooks pricing)
- **S0 Free/Starter**: AI does the books from bank + receipts; pay for payments and payroll.
- **S1** flat tiers (no per-user tax, no per-feature ransom; unlimited users on every plan — direct contrast with QBO caps).
- **S2** per-entity pricing with consolidation/controls (undercuts NetSuite 10x on TCO; same-day setup vs 3–6 months).
- **F** per-client-ledger SaaS + volume AI-work units; firms margin from reselling CAS, we never compete with firms for clients — we're their production line.

### 8.2 Distribution
1. **Migration importers as the kill weapon**: QBO/Xero/Excel importers (COA mapping, open invoices/bills, historical transactions, attachments, reconciliation state) — switching cost has always protected Intuit; we make it zero.
2. **Firm-led**: 100 design-partner firms (CAS-focused, 5–50 clients each) in Epoch 3 → each firm brings dozens-to-hundreds of client entities. One firm onboarding = 100 S1 customers.
3. **Regulatory wedge (EU)**: PEPPOL-native e-invoicing for the 2026 mandates — businesses must move NOW; being compliant on day one converts mandate panic into signups.
4. **AI-native wedge (US)**: "your books close themselves" for startups (Puzzle's wedge) + CAS automation for firms (Basis's wedge) — both from one platform.

---

## 9. Build Roadmap — Epochs (each has a hard gate; no epoch starts before the previous gate passes)

### Epoch 0 — TRUST (weeks 0–6) = prodway.md Waves 0–3
Driver decision + transactional DB; kill every seed/fake path (review-queue global delete first); entity-switch cache fix; approval-time validation; SSE scoping fixes; admin mutations (permission matrix, transactions, audit, soft-delete); security hardening (token hashing, MFA throttle).
**Gate:** prodway release-standard P0/P1 list empty; staging load test green; no Math.random or seed path reachable in production.

### Epoch 1 — ENGINE (weeks 6–18)
Ledger Engine v2 (§4): immutable hash-chained journal, posting service, CQRS balances, reversal semantics, period locks; dual-write migration; Close Center v2 on the engine (durable sessions, resumable); Stripe billing live; design system foundation + Command Center polish to the §6.3 bar.
**Gate:** every posting in staging goes through the service; nightly verifier proves old == new books; close survives restart/kill/retry; billing collects money.

### Epoch 2 — PRODUCT (months 4–7)
Full S1 coverage: statement-based reconciliation; credit notes + dunning; expenses policy engine; inventory lite; VAT/GST/sales-tax prep engine; payment runs via PSP partner; UX rebuild of all 5 surfaces on the design system; mobile-web parity; SOC 2 Type I.
**Gate:** a real 1-person business and a real 50-person SME run their books end-to-end (close to reports to tax prep) on Xenboox; QBO migration importer beta.

### Epoch 3 — FIRMS + MULTI-ENTITY (months 7–12)
Firm Workspace (portfolio, work mgmt, review/lockdown, white-label); multi-entity consolidation (COA mapping, intercompany, eliminations, CTA, consolidated reports) — the NetSuite kill; ASC 606 lite; e-invoicing/PEPPOL pilot (France/Germany); SOC 2 Type II window; API GA + app marketplace v1; 100 design-partner firms.
**Gate:** one multi-entity group closes consolidated in Xenboox; one firm runs 10+ client ledgers on the AI workforce; PEPPOL pilot invoices exchange with a certified access point.

### Epoch 4 — SCALE (months 12–24)
Shard-out (Phase B architecture); regional cells + residency; 1099/year-end packs; leases; advanced revenue; payroll partnerships per region; app marketplace; enterprise SLAs (99.95%); ISO 42001 certification; public launch campaigns against QBO pricing/consolidation pain.
**Gate:** 1M+ concurrent sessions load-tested; 99.95% achieved over a quarter; enterprise (S2) cohort live.

---

## 10. Current Codebase — keep / fix / kill (from the prodway audit)

**Keep (foundations are good):** auth + MFA + admin control plane; entity-scoping middleware; tRPC infra (procedures, rate limits, idempotency middleware); AR/AP/expenses record layer (permission-gated, audited); agent adapters + gateway; RAG; the AI-native UX skeleton from phases A–C.

**Fix (Epoch 0–1):** everything in prodway's P0/P1 list — driver, review-queue delete, entity-switch cache, approval validation, close durability, SSE scoping, confidence literals, admin mutations.

**Kill:** all `seedDemoData` procedures + UI buttons; demo bank-money generator; every `Math.random()` read path; the neon-http default for posting paths; `.agents/` skill-tree leftovers if unused; the 25-page admin sprawl (consolidate to ~15 per prodway Part 5).

**Rebuild (Epoch 1–3):** the journal core (Engine v2); reporting on read models; Close Center; firm workspace; consolidation; e-invoicing; the design system + all surfaces to the §6.3 bar.

---

## 11. Honest Constraints (what this plan demands)

1. **This is a 12–24 month, multi-engineer effort** for the full vision — but each epoch ships standalone value, and Epoch 0–1 (trust + engine) is ~1 quarter with focused work.
2. **Sequencing is everything:** Engine v2 before consolidation (consolidation on a mutable journal = NetSuite-style complexity debt); design system before surface rebuilds (otherwise we reskin chaos); SOC 2 program starts early because evidence takes time to accumulate.
3. **Accounting correctness is the brand.** One double-posted payroll kills the company; the audit + engine + verifier approach exists because of that.
4. **Firms before ads.** The channel math (100 firms × 50 clients) beats any paid channel; product-led only works after the §6.3 UX bar is real.
5. **Don't build payroll/payments/WMS natively on day one.** Partner, integrate, and own the ledger + AI + controls — the parts nobody else combines.

---

## 12. Sources (web research, 2026-09-06)

- Intuit AI agents launch: investors.intuit.com (Virtual Team of AI Agents press release), quickbooks.intuit.com/ai-accounting, firmofthefuture.com (agentic AI 2025)
- Basis: finance.yahoo.com ($100M Series B, $1.15B, Accel), OpenAI customer stories, SiliconANGLE
- Puzzle: puzzle.io, Tracxn (~$66.5M), puzzle.io blog ($15M Series A, General Catalyst)
- Numeric: numeric.io, SiliconANGLE + PR Newswire ($51M Series B, Nov 2025)
- FloQast: floqast.com (auditable AI agents, ISO 42001); coefficient.io (BlackLine vs FloQast)
- Close market: numeric.io/blog/financial-close-software; ledge.co (NetSuite/FloQast/BlackLine gaps)
- Practice management: karbonhq.com, taxdome.com (Karbon vs Canopy), toaglobal.com, levvy.com, financial-cents.com
- E-invoicing: e-invoice.app (global compliance 2026), Thomson Reuters/Pagero (France), ClearTax (France/Germany), Tungsten Automation (2026 mandates), clearvo.io (EU deadlines), peppol.org
- Legacy gaps: liveflow.com, scalexp.com, datasights.co, gogravity.c
om/blog/quickbooks-multi-entity), fishbowlinventory.com, handifox.com (QBO inventory), workflowautomation.net + connecteam.com (Xero payroll), quickbooks community + reddit (2025 price increases/removed features), invedus.com (user caps)
- Mid-market: brokenrubik.com, blog.proteloinc.com, erpresearch.com, kimberlitepartners.com (NetSuite/Intacct TCO + implementation)
- Firms: cpajournal.com (pipeline crisis), highspring.com + ramp.com (200k shortfall), acculinkcpa.com + safesend.com (81% capacity constraint), aacsb.edu (83% employers), journalofaccountancy.com + cpa.com (CAS growth 17%/doubling), wolterskluwer.com (AI transformation, 70% weekly AI)
- Scale architecture: learn.microsoft.com (multi-tenant storage), docs.citusdata.com (multi-tenant sharding), microservices.io + confluent.io (event sourcing/CQRS), moderntreasury.com (How to Scale a Ledger), monzo.com blog (Cassandra ledger), alexdebrie.com (single-table design), architecture-weekly.com (ledger databases)

---

# GLOBAL EXPANSION — v2 Addendum (2026-09-06)

> Scope expansion ordered by the owner: all markets — developed AND developing — all money rails (banks, mobile money, digital banks), easy switching from any incumbent, AI-native on every continent. Web platform first; native mobile/desktop only after the web reaches production + enterprise grade (§18 gate).

## 13. Global Market Map & Entry Strategy

### 13.1 The three world tiers (and why the usual strategy is wrong)
Incumbents treat "emerging markets" as a discount tier reached last. We invert it: **the developing world is our design center, not our leftover.** Why: (a) most SMEs there have NO accounting software at all (greenfield, not switching cost), (b) mobile-money-native commerce means we can build payments+books as one product from day one, (c) tax authorities are digitizing FAST (Kenya, Nigeria, Ghana 2025–2026) creating compliance pull, (d) Intuit/Xero cannot serve these markets profitably with their cost structure — we can, with AI doing the work a human bookkeeper would.

| Tier | Regions | Reality | Our posture |
|---|---|---|---|
| **T1 Digital-first** | US, UK, EU, Canada, Australia/NZ | Saturated, high switching cost, e-invoicing/PEPPOL wave, QBO price anger | Enter via migration + price + AI; EU regulatory wedge (§15) |
| **T2 Mobile-money native** | East/West Africa (KE, NG, GH, TZ, UG, RW, SN, CI, CM), Egypt, Morocco, Pakistan, Bangladesh, Philippines, Indonesia, Vietnam | SMEs on WhatsApp + mobile money; cash/agent economies; tax mandates arriving now | **Beachhead.** Mobile money rails + WhatsApp AI + local tax clearance built-in |
| **T3 DPI-led** | India (UPI/AA/GST), Brazil (Pix/NF-e), Saudi/UAE (ZATCA/UAE e-inv) | State digital public infrastructure; regulated rails; huge SME bases | Enter when our tax/rail adapters cover their mandates (India AA + GST, Brazil NFS-e, ZATCA wave 24) |

### 13.2 Beachhead sequence (where we launch, in order)
1. **Ghana + Kenya + Nigeria** (home advantage: Gambia-rooted brand, English-speaking, mobile money penetration, live/arriving fiscalisation: Ghana E-VAT, Kenya eTIMS, Nigeria FIRS e-invoicing).
2. **West Africa francophone via partner firms** (CI, SN, CM — French + XOF/XAF; Orange Money + Wave rails; OHADA accounting plan = standardized COA we template).
3. **UK + EU** (PEPPOL/VAT wedge + QBO/Xero migration; firm channel).
4. **India + Brazil + GCC** (DPI adapters mature; ZATCA wave 24 June-2026, UAE July-2026, Brazil NFS-e Jan-2026 are our entry clocks).
5. **US** last on price/consortium strength (hardest market, biggest prize — enter with firm channel + pricing anger + AI).

### 13.3 What "serve everyone" requires per market (the platform checklist)
Local currency + FX source; local tax engine config; local e-invoicing/clearance adapter; local rails (§14); local COA + report pack (balance sheet formats, statutory filings); local language (+RTL where needed); local fiscal calendar (April UK/IN/JP year-ends, OHADA, Gulf Sat–Fri weekends); local data residency option; local payment methods; local support language.

## 14. Money Rails — the Rail Abstraction Layer (banks + mobile money + digital)

**Architecture decision: one internal interface, N adapters.** Every rail implements the same contract: `connect → fetchTransactions(cursor) → normalizedTransaction[]`, `sendPayment(request)`, `webhook(signature, payload)`. The ledger, reconciliation, and AI never know which rail produced a transaction. This is the only way to cover all continents without N codebases.

### 14.1 Rails by region (named, with what they're for)

| Rail class | Providers | Used for |
|---|---|---|
| Open banking (T1) | Plaid (US/CA), TrueLayer + GoCardless Bank Account Data (EU/UK), BASIQ (AU) | Bank feeds, payment initiation |
| Africa open banking | **Mono** (acquired by Flutterwave 2025), **Stitch** (ZA banks direct), OnePipe, Pngme, Zeeh (KE); note: Okra shut down 2025 — the aggregator market is consolidating | Bank feeds where APIs exist; identity/KYC |
| **Mobile money (East)** | **Safaricom Daraja** (M-Pesa KE/TZ), **MTN MoMo API** (UG/RW/GH/CM/CI...), **Airtel Money API** | Collections, disbursements, feeds — the PRIMARY rail for T2 |
| Mobile money (West) | Orange Money, Wave (SN), Moov, Telecash | Same |
| Asia DPI | **UPI** (IN payments), **India Account Aggregator** (RBI-regulated consented bank data — Setu/CAMS/Finvu gateways), Pix (BR), PromptPay (TH), QRIS (ID) | Feeds + payments in DPI markets |
| Digital banks / PSPs | Wise, Revolut, Mercury, Paystack, Flutterwave, dLocal (emerging PSP aggregation) | Feeds + payments for digital-first businesses |
| Cards/wallets | Stripe, Adyen (T1); local schemes per market | Checkout for AR |
| Cash/agent economies | Manual entry + receipt OCR + POS-lite | No rail exists — the AI + mobile capture IS the rail |

### 14.2 Mobile money is a first-class ledger citizen (not an afterthought)
Mobile money has quirks no Western accounting product handles, and they're our advantage:
- **Reversals are frequent** (customer recalls, failed transfers that still notify) — Engine v2's reversal-event model handles this natively.
- **Fee structures**: till/paybill numbers, paybill vs buy-goods vs send-money tariffs, agent float — modeled as first-class concepts with auto-categorized fee accounts.
- **Statement formats** are CSV/PDF exports or C2B callback streams — the ingestion engine normalizes all three.
- **Reconciliation** = matching till collections to invoices to fees — the AI matching engine trains per rail (Daraja callback patterns differ from MoMo).
- Disbursements (paying vendors/salaries via B2C) need idempotent payment intents with rail-specific retry semantics (Daraja: result codes; MoMo: idempotency keys).

### 14.3 Payments in/out strategy
- **Epoch 2–3:** collect via partner PSPs (Paystack/Flutterwave for Africa, Stripe for T1) with webhook → ledger auto-posting. Own payment-intent orchestration (retries, reconciliation, partial refunds) but not the money movement.
- **Later:** direct B2B disbursements over Daraja/MoMo/Airtel APIs for T2 (payroll-lite for 2-person businesses paying via mobile money is a killer feature).
- Every payment event lands as a normalized transaction → AI matches → posts — the same pipeline for a Nairobi till and a London current account.

## 15. Localization & Regulatory Compliance (per market, nothing left to chance)

### 15.1 The localization stack (ordered layers)
1. **Core (Engine v2, market-agnostic):** integer minor units; currency table (ISO 4217 + exceptions: XOF/XAF zero-decimal, MROP...); per-line currency stamping + rate; IAS 21 functional currency; **IAS 29 hyperinflation** (ARS, TR, ZW, VE — restatement engine + USD-functional shortcut used in practice); dimensions (dept/project/fund).
2. **Jurisdiction pack (per market, data-driven):** COA templates (OHADA SYSCOHADA, UK GAAP/FRS 102, Indian Schedule III, US GAAP, IFRS SME); statutory report formats; VAT/GST/sales-tax config (rates, brackets, exemptions, reverse charge, cash vs accrual schemes); filing calendars + fiscal year conventions (Apr UK/IN/JP; OHADA calendar; Gulf Sat–Fri); number/date/locale formats + RTL (Arabic, Hebrew, Urdu, Farsi); language packs (start: EN, FR, AR, ES, PT-BR, HI, SW, AM).
3. **Clearance adapters (the moat):** per-country e-invoicing/fiscalisation integrations (§15.2), each with sandbox certification as a build gate.

### 15.2 E-invoicing & fiscalisation mandate tracker (build queue, sourced 2026-09-06)

| Market | Mandate | Status / clock | Our adapter |
|---|---|---|---|
| France | Facturation électronique + e-reporting (PPF/PDP) | Receive ALL Sept 2026; issue by size to 2027 | PEPPOL/EN 16931 + PDP partner |
| Germany | B2B e-invoicing | Receiving since 2025; issuing 2026–2028 by turnover | XRechnung/ZUGFeRD |
| Belgium / Poland | B2B mandates | Live Jan 2026 (BE); KSeF 2026 (PL) | PEPPOL; KSeF API |
| Saudi | ZATCA Phase 2 (Fatoora) | Wave 24 (≥SAR 375k) integrate by **June 30, 2026**; cryptographic stamping + **invoice hash chaining** | Fatoora API — our Engine's hash-chain mirrors ZATCA's model |
| UAE | 5-corner Peppol-based (DCTCE) | Voluntary July 2026; ≥AED 50M mandatory from Oct/Nov 2026, through 2027 | Accredited service provider partnership |
| India | GST e-invoicing via IRP | AATO ≥ ₹10cr; 30-day reporting window + 2FA (Apr 2025); threshold trending down | IRP/GSP integration |
| Brazil | NF-e / NFS-e / IBS-CBS reform | NFS-e nationwide mandatory Jan 2026; reform validation live; Simples Jan 2027 | NFS-e national standard first |
| Mexico | CFDI 4.0 (PAC clearance) | Fully mandatory; 2026 reform tightening | PAC partner |
| Nigeria | FIRS e-invoicing (FIRSMIS) | Rollout 2025–26: large taxpayers first, SMEs phased | FIRS API + Merchant Buyer Solution |
| Kenya | eTIMS | Mandatory for ALL taxpayers incl. eTIMS Lite | eTIMS Lite/API |
| Ghana | E-VAT (EPRS) | Fiscalisation live | EPRS integration |
| Egypt, Côte d'Ivoire, Uganda, Tunisia, Zimbabwe | Fiscal devices / e-invoicing | Rolling 2025+ | Per-country queue |

### 15.3 Compliance platform (global, non-negotiable)
SOC 2 Type I→II (epoch 2–3), ISO 27001 track, GDPR + per-region privacy (NDPR Nigeria, PDPA, India DPDP, Brazil LGPD), data residency via regional cells (§4.4 Phase C), audit-trail immutability + hash chains (Engine v2), retention schedules per jurisdiction, AI governance aligned to ISO 42001 (the FloQast bar).

## 16. Migration Factory — "switch anyone in a day"

Switching cost is the incumbents' only real moat, so migration is a PRODUCT, not a service:
- **Universal import framework**: QBO, Xero, Sage, Zoho Books, Tally (India), Wave, FreshBooks, spreadsheets/CSV, plus desktop export formats (QBW/SAF-T where readable). Each importer: COA mapping (AI-assisted with human confirm), open items (unpaid invoices/bills), historical transactions (2–5 years), contacts, products/services, attachments, reconciliation state, budgets.
- **Verification report**: pre/post trial balance parity, open-item rollforward, count checks — shown to the user before cutover. "Your books moved and they balance" is the promise.
- **Parallel-run mode**: run Xenboox alongside the old system for one close; the AI flags discrepancies; then flip. Kills the fear.
- **Firm bulk migration**: firm workspace migrates their ENTIRE client book in one flow (the Basis-kill enabler).
- Priority order: QBO + Xero + CSV first (Epoch 2), Tally + Zoho + Sage (Epoch 3), desktop formats (Epoch 4).

## 17. AI-Native for All Continents (the biggest thing)

AI-native is not a chat box. It is the operating model: **the AI does the work, the human decides, the ledger proves it.** Globally, this means:

### 17.1 Channels beyond the web app
- **WhatsApp Business API as a first-class AI channel** (T2 killer feature): a shop owner in Accra or Nairobi talks to Xenboox on WhatsApp — sends a receipt photo → OCR → posted; asks "who owes me?" → answer with evidence; approves a payment → done. WhatsApp is where T2 SMEs already live; we meet them there. Telegram (Asia/Eastern Europe) and Messenger (LATAM) follow the same adapter pattern.
- **Voice-first**: speech-to-text in local languages/accents for bookkeeping by voice ("sold 3 bags of cement for 2,500 cedis, cash") — critical for low-literacy and hands-busy contexts.
- **SMS/USSD fallback**: notifications + approvals for feature-phone contexts; read-only intelligence, never financial writes without confirmation.
- Every channel shares one brain (agents, tools, posting service) — channels are interfaces, not products.

### 17.2 Multilingual & low-bandwidth engineering
- LLM routing: frontier models for EN/FR/ES/PT + strong multilingual models for the rest; cost-tiered routing already in our gateway; local-language eval sets per agent (Hausa, Swahili, Amharic, Bengali, Hindi, Bahasa) — accuracy measured per language, not assumed.
- **Offline-first data capture**: receipt/invoice capture queues locally and syncs when connectivity returns (T2 reality); the ledger never blocks on network.
- Low-bandwidth mode: text-first UI, compressed assets, WhatsApp as the thin client.
- Prompt-injection hardening for document ingestion (receipts/invoices are an attack surface) — already flagged in prodway; mandatory before multi-channel.

### 17.3 The AI-native product loop (same everywhere, tuned per market)
Ingest (rail + OCR + WhatsApp + voice) → AI categorize/match (evidence-linked, computed confidence) → human approves exceptions only → post via Engine v2 → close automatically → narrate (Pulse) → file (tax/clearance adapters). In T1 the differentiator is close/consolidation depth; in T2 it is "your books, done, on WhatsApp, for less than airtime."

## 18. Mobile & Desktop Apps — explicit gate (deferred by owner decision)

The owner's call is correct and now formalized: **web first; native apps only after the web platform passes the full production + enterprise gate.**
- **Gate to open mobile/desktop build** (all must be true): prodway P0/P1 list empty; Epoch 1 (Engine v2 + billing) shipped and verified in production; Epoch 2 UX bar (§6.3) met on all 5 surfaces; SOC 2 Type I attained; 99.9%+ uptime over a full quarter; Stripe-ledger reconciliation automated.
- **Mobile app scope (when unlocked):** receipts/expenses capture (camera + offline queue), approvals (the DecisionCard), cash/Pulse view, WhatsApp-parity AI chat, push notifications. NOT a full ledger client — the phone is a capture/approve device.
- **Desktop app scope (when unlocked):** power-user shell (keyboard-first, bulk operations, offline reporting) — likely Electron/Tauri wrapping the web app with local caching; only if power-user demand proves it.

## 19. Revised Epoch Plan (global integrated; replaces §9 ordering where noted)

- **Epoch 0 — TRUST** (unchanged, weeks 0–6): prodway Waves 0–3. No global features until the house is safe.
- **Epoch 1 — ENGINE** (weeks 6–18): Ledger v2 + Stripe + design system. *Global prep inside Epoch 1:* Rail Abstraction Layer interface + ONE T2 rail adapter (Daraja) and ONE T1 adapter (Plaid or TrueLayer) to prove the contract; currency/locale hardening (XOF/XAF zero-decimal, RTL-ready tokens).
- **Epoch 2 — PRODUCT + BEACHHEAD** (months 4–7): full S1 coverage; UX rebuild; QBO/Xero/CSV importers; **launch Ghana + Kenya + Nigeria**: MTN MoMo + Airtel adapters, WhatsApp channel (receipts + queries + approvals), Ghana E-VAT + Kenya eTIMS adapters, French locale; SOC 2 Type I.
- **Epoch 3 — FIRMS + MULTI-ENTITY + T1 ENTRY** (months 7–12): Firm Workspace; consolidation; PEPPOL (FR/BE/DE) + ZATCA-wave adapter + Nigeria FIRS; francophone West Africa via firms; UK/EU launch; bank rails for T1; Tally/Zoho importers.
- **Epoch 4 — SCALE + DPI MARKETS** (months 12–24): India (GST IRP + Account Aggregator + UPI), Brazil (NFS-e), UAE; sharding Phase B/C + residency cells (EU, Africa, India); voice-first; SMS/USSD; 1099/year-end; ISO 42001; US entry with firm-led motion.
- Each epoch gate now ALSO requires: adapters certified in sandbox for the epoch's markets; localization QA (locale, RTL, language evals) green; residency plan reviewed.

**Standing rule:** every market enters with (1) a jurisdiction pack (§15.1), (2) at least one live rail, (3) a clearance/tax adapter if that market has a mandate, (4) a migration importer for its dominant incumbent, and (5) support in at least one local language or English-with-voice. No partial launches.

## 20. Sources addendum (global research, 2026-09-06)
- Mobile money rails: developer.safaricom.co.ke (Daraja 3.0), cedapay.com (M-Pesa/MTN/Airtel/Orange integration guide), iterativebilling.com + neocube.tech (auto-reconciliation, country fragmentation), fundkit.dev, helloduty.com
- Africa tax digitization: banqup.com (e-invoicing in Africa), innovatetax.com (2025 mandates: Nigeria, Côte d'Ivoire, Kenya, Egypt), sovos.com (fiscalisation), fonoa.com (real-time control), vatit.com (Kenya eTIMS)
- ZATCA: zatca.gov.sa roll-out phases (Wave 24 ≥SAR 375k, June 30 2026). UAE: hawksford.com (July 2026 voluntary, AED 50M mandatory late 2026). India: gimbooks.com (₹10cr AATO, 30-day window, 2FA). Brazil: Thomson Reuters/Pagero (NFS-e Jan 2026, IBS/CBS). Mexico: ecosio.com (CFDI 4.0)
- Africa open banking: mono.co (acquired by Flutterwave 2025), stitch.money, openbanking.ng (aggregator analysis; Okra shutdown), theflip.africa
- India DPI: sahamati.org.in + setu.co (Account Aggregator), accion.org (AA for MSME), productgrowth.in (AA framework)

### 4.6 Decision Record — "Rebuild vs Rewrite" (2026-09-06, owner asked; senior call)

**Question:** should we rebuild the entire platform from scratch to be perfect, AI-native, at competitor parity, with easy migration?

**Decision: staged rebuild with hard core replacement.** Greenfield-rewrite the core and surfaces; keep the audit-proven foundations; delete everything fake. Rationale:
- A from-scratch rewrite would also rebuild the parts the audit proved excellent (auth/MFA/revocation, admin control plane, entity scoping, tRPC infra, model gateway, post-remediation AR/AP/expenses record layer, 2,700 tests) — months of waste and zero revenue in the meantime.
- Keep-and-patch is impossible for the journal: a mutable ledger (UPDATE-based approvals, string money, in-memory idempotency) cannot be incrementally mutated into the immutable hash-chained engine the vision (and ZATCA) requires. Same for the UI: reskinning can't reach the §6.3 production bar.
- Therefore: **Rebuild greenfield** = Ledger Engine v2, Close Center v2, reporting read models, design system + all six surfaces, rail abstraction + adapters, jurisdiction/tax packs, firm workspace, migration factory, admin telemetry with real writers. **Keep** = auth/admin identity, entity scoping, tRPC infra, domain record logic (re-pointed onto the posting service), model gateway/RAG, agent skeleton, tests. **Delete** = all seeds/demo money/Math.random paths, neon-http default on posting paths, admin sprawl.
- Execution order is §4.5 (build alongside → dual-write shadow + nightly verifier → cut read models → cut posting module-by-module → backfill, freeze old tables) and the epoch gates in §9/§19. No code starts before Epoch 0 approval (prodway Waves 0–3).
