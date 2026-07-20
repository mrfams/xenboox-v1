# Agent Spec: Ledger Agent

> Filled from `AGENT_SPEC_TEMPLATE.md`. This is the proof-case spec — the framework docs get revised based on what breaks here before being replicated across the other 10 MVP agents.

---

## 1. Identity

| Field         | Value                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| Agent name    | Ledger Agent                                                                                                    |
| Tier          | Worker                                                                                                          |
| Reports to    | Controller Agent                                                                                                |
| Oversees      | (none — leaf worker agent)                                                                                      |
| PRD reference | §6.5 "Ledger Agent"; §6.7 Layer 1                                                                               |
| Model         | claude-haiku-4-5 for routine posting; claude-sonnet-4-6 for anomalous/ambiguous account classification (see §8) |

## 2. Mandate

The Ledger Agent is the single point of entry to the general ledger. It receives structured posting requests from every other agent, validates and enforces double-entry integrity on every entry, maintains the chart of accounts, and is the sole source of truth for account balances and trial balance. No other agent — including the CFO Agent — writes to the ledger directly. If it isn't posted through the Ledger Agent, it didn't happen.

## 3. Scope Boundary

**This agent MUST:**

- Accept structured journal entry requests from any other agent (AP, AR, Cash, Mobile Money, Asset, Inventory, Payroll, Tax, Expense — anything that generates a financial event)
- Validate every entry balances (debits = credits) before posting
- Maintain and enforce the chart of accounts (reject postings to non-existent or inactive accounts)
- Own opening and closing balances for every period, for every account, for every entity
- Produce trial balance on demand, scoped to entity_id and date range
- Reject and return structured errors for any entry that fails validation — never silently adjust an unbalanced entry to force it to balance

**This agent MUST NEVER:**

- Accept a journal entry directly from a human — all human-initiated corrections route through Controller Agent, which posts via this agent
- Post an entry that doesn't balance, under any circumstance, regardless of which agent requested it or how it's phrased
- Guess an account classification when the requesting agent's categorization is ambiguous — that ambiguity is either resolved by the requesting agent before it reaches Ledger Agent, or escalated (see §9), never resolved by Ledger Agent inventing a plausible account
- Access or return data for any entity_id other than the one in the current request context
- Modify a posted entry — corrections are new offsetting entries, the original is never overwritten (audit trail integrity, PRD §6.7 Layer 4)

## 4. Inputs

| Input                            | Source                                                                                                     | Format                                                                    | Validation required before processing                                                    |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Journal entry request            | Any worker agent (AP, AR, Cash, Mobile Money, Asset, Inventory, Expense) or Controller Agent (corrections) | `JournalEntryRequest` schema — see `tools/post-journal-entry-contract.md` | Schema conformance, entity_id present and matches context, all referenced accounts exist |
| Trial balance request            | Controller Agent, Reporting Agent, CFO Agent                                                               | `TrialBalanceRequest` — entity_id, period start/end                       | entity_id present, period valid (start ≤ end, within entity's fiscal history)            |
| Chart of accounts change request | Controller Agent only (never a worker agent directly)                                                      | `ChartOfAccountsChangeRequest`                                            | Requesting agent must be Controller Agent — reject from any other source                 |

## 5. Outputs

| Output               | Destination                                        | Schema             | Required fields                                                                                                        |
| -------------------- | -------------------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Posting confirmation | Requesting agent + Controller Agent (async notify) | `PostingResult`    | `entry_id`, `entity_id`, `posted_at`, `balanced: true`, `confidence`                                                   |
| Posting rejection    | Requesting agent                                   | `PostingRejection` | `reason_code`, `human_readable_reason`, `failed_rule`                                                                  |
| Trial balance        | Requesting agent                                   | `TrialBalance`     | `entity_id`, `period`, `accounts[]` (each with debit/credit totals), `total_debits`, `total_credits`, `balanced: bool` |

All outputs structured (JSON), no free-text posting confirmations. Schemas live in `/schemas/ledger-agent/`.

## 6. Tools This Agent Can Call

| Tool                       | Purpose                                                        | Read/Write |
| -------------------------- | -------------------------------------------------------------- | ---------- |
| `post_journal_entry`       | Commit a validated, balanced entry to the ledger               | Write      |
| `get_trial_balance`        | Compute trial balance for entity + period                      | Read       |
| `get_chart_of_accounts`    | Retrieve active accounts for entity                            | Read       |
| `update_chart_of_accounts` | Add/deactivate an account (Controller-initiated only)          | Write      |
| `get_account_balance`      | Single account balance lookup (used internally for validation) | Read       |

Contracts: `post-journal-entry-contract.md` and `get-trial-balance-contract.md` (this pass). Remaining three tools follow the same template, deferred until Ledger Agent's core posting path is proven.

## 7. Deterministic Rules Enforced On This Agent's Output

| Rule                                                                                                         | Enforcement point                                                                       |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| Debits must equal credits on every entry                                                                     | `post_journal_entry` tool — DB constraint + application check, rejects before commit    |
| Every account referenced must exist and be active in the entity's chart of accounts                          | `post_journal_entry` tool — foreign key + status check                                  |
| entity_id on the entry must match every account referenced (accounts don't cross entities)                   | `post_journal_entry` tool — DB-level row security, not just application check           |
| Posted entries are immutable                                                                                 | DB layer — no UPDATE permitted on posted entries, only INSERT of new offsetting entries |
| Trial balance must always equal total debits = total credits, or the trial balance itself is flagged invalid | `get_trial_balance` tool — computed check on every call, never assumed                  |

None of the above are prompt instructions to the model. They are hard constraints in the tool/DB layer per `TOOL_CONTRACT_TEMPLATE.md` §5. The model's job is to construct a correct request; it is never trusted to self-certify that the request is valid.

## 8. Confidence Scoring

Ledger Agent's confidence score is narrower in scope than most agents — the double-entry math itself is deterministic (either it balances or it doesn't, no confidence gradient applies there). What the score actually measures:

- **Account classification confidence** — when the requesting agent's entry references an account by description rather than exact account code (should be rare — most callers should already resolve to exact account codes, but Document Agent-originated entries during onboarding/backfill may not), Ledger Agent's confidence reflects how sure it is that the mapped account is correct.
- **Precedent match** — does this entry pattern match prior entries for this entity/account combination, or is it a first-of-its-kind posting.

Composite per `CONFIDENCE_AND_ESCALATION.md` §2.2 — deterministic signals (does it balance, do accounts exist) dominate; these are pass/fail, not gradient, and any failure forces escalation regardless of the classification-confidence component.

## 9. Escalation Triggers

| Trigger condition                                                                                    | Escalates to                                                                                      | Escalation type                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Entry does not balance                                                                               | Controller Agent + originating agent, simultaneously                                              | Block                                                                                                |
| Referenced account does not exist / is inactive                                                      | Controller Agent + originating agent                                                              | Block                                                                                                |
| Account classification confidence < 0.75 (ambiguous description-based mapping)                       | Controller Agent                                                                                  | Block (entry held, not posted, until resolved)                                                       |
| Entry references an entity_id mismatch between the request and any account                           | Controller Agent + CFO Agent (treated as potential cross-entity data leak, per PRD §9.2 severity) | Block, immediate                                                                                     |
| First-of-its-kind posting pattern for this entity (no precedent in golden dataset or entity history) | Controller Agent                                                                                  | Flag (posts if otherwise valid, but surfaced for review)                                             |
| Correction request received (offsetting entry for a prior posting)                                   | Controller Agent                                                                                  | Notify (always — corrections are inherently worth a second set of eyes even when mechanically valid) |

Deviation from `CONFIDENCE_AND_ESCALATION.md` §3 default thresholds: Ledger Agent uses **Block**, not the default "hold for review," for account-classification ambiguity — justification: this is the last checkpoint before something becomes an immutable posted record, the cost of a wrong guess here is higher than in upstream agents where the entry can still be corrected before it reaches the ledger.

## 10. Failure Modes & Recovery

- **Known failure mode:** requesting agent sends an entry with a plausible but wrong account code (e.g. categorization error upstream that passes schema validation because the account exists, just isn't the _right_ account). Ledger Agent's deterministic checks cannot catch this — it's a valid entry that's substantively wrong. This is why Controller Agent reviews all postings (PRD §6.4) rather than trusting Ledger Agent's validation alone; Ledger Agent guarantees _mechanical_ correctness, Controller Agent is the check on _substantive_ correctness.
- **Recovery:** corrections are new offsetting entries per §3. Original entry stays in the audit trail, marked as corrected, never deleted.
- **Audit Agent** continuously samples posted entries against the golden dataset independent of Controller Agent's review — a second, asynchronous check (PRD §6.5 Audit Agent, §6.7 Layer 2).

## 11. Golden Dataset Coverage

Link: `datasets/ledger-agent-golden.yaml`

Current status (this build pass — see §13, not yet at floor):

- `happy_path`: 6 (floor: 20)
- `edge_case`: 4 (floor: 15)
- `adversarial`: 3 (floor: 10)
- `ambiguous`: 3 (floor: 10)
- **Total: 16 of 55 minimum — `coverage_sufficient: false`.** Per `GOLDEN_DATASET_SPEC.md` §4, harness runs are informative only until this floor is met; does not yet gate deploy.

Not yet covered: multi-currency postings (PRD §12 realized/unrealized FX entries), inter-company eliminations (§9.6 — Phase 3 anyway), high-volume batch posting during onboarding backfill (§13).

## 12. Cross-Agent Dependencies

- **Upstream (feeds Ledger Agent):** AP Agent, AR Agent, Cash Agent, Mobile Money Agent, Reconciliation Agent (indirectly, via Treasury), Asset Agent, Inventory Agent, Expense Agent, Payroll Worker Agent (Phase 2), Tax Agent (Phase 2)
- **Downstream (depends on Ledger Agent):** Controller Agent (review), Reporting Agent (trial balance → all financial statements), Analytics Agent, CFO Agent (indirectly via Controller summaries)
- **Flow tests:** every flow in `CROSS_AGENT_FLOW_TESTS.md` §3 passes through Ledger Agent — it is the one agent common to all of them. Its handoff schema is the highest-leverage thing to keep stable.

## 13. Open Questions

- Batch posting performance/validation approach for onboarding historical backfill (PRD §13 — "up to 24 hours" for multi-year reconstruction) — does each historical entry get full real-time validation or a bulk-validated batch mode? Leaning toward: same validation rules, batched for throughput, but no relaxation of the balance/account-existence checks even in bulk mode.
- Exact confidence threshold for "first-of-its-kind posting pattern" flag (§9) — currently just "no precedent exists," may need refinement once real entity history exists to compare against.

---

## Spec Sign-off Checklist

- [x] Scope boundary reviewed — no overlap with Controller Agent (Controller reviews/approves substantive correctness, Ledger enforces mechanical correctness and is sole poster)
- [x] All outputs have a defined schema (schemas to be written in `/schemas/ledger-agent/` — tracked as build task)
- [ ] All tools listed have contracts written — 2 of 5 done this pass (`post_journal_entry`, `get_trial_balance`); remaining 3 deferred
- [x] All deterministic rules identified and mapped to enforcement layer
- [x] Escalation triggers are concrete
- [ ] Golden dataset exists with minimum coverage — 16/55, below floor, tracked in §11
- [x] Cross-agent flows this agent participates in are identified
