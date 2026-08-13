<!-- /autoplan restore point: ~/.gstack/projects/xenboox unavailable (gstack absent) — working tree snapshot at plan time: uncommitted notification-badge system + tax/seed/mobile work. My commit stages ONLY feature files. -->

# Plan: Sidebar attention indicators — "something needs you, and it's _there_"

## What

The sidebar must tell a user, at a glance and in the collapsed icon rail, that
something needs them and **where**. Two situations cover the ask:

1. **Action required — the agent is waiting on you** (pending ingestion reviews,
   agent escalations/approvals, rejected docs, failed close, recon
   discrepancies, budget exceeded, overdue invoices).
2. **New results — work finished but not yet viewed** (report ready, close
   complete, payroll processed, auto-posted entries, invoice reminders).

Today the sidebar only shows a red count pill on **Inbox**, and only in the
expanded state (`lg:hidden lg:group-hover:inline-flex`). Collapsed (the default
desktop state, 4.25rem icon rail) there is **no signal at all**.

### The design: a two-tone "attention map" on the nav

- **Every destination that can hold unread work gets an indicator**, so the
  user knows _where_ to go, not just _that_ something happened.
- **Two tones, two meanings** (learnable, WCAG-visible, matches the existing
  badge language in `notification-badge.tsx`):
  - `action` (destructive red, **pulsing**) = "blocked on you — agent waiting,
    approval needed, failed work". Red already means actionable workload here.
  - `new` (primary indigo, static) = "fresh results to view". Indigo already
    means "something new" for the bell badge.
- **Collapsed rail**: a small colored **dot** overlays the icon corner —
  always visible without hovering. Pulse animation announces action items.
- **Expanded state**: the dot is replaced by a **tone-colored count pill**
  (red for action, indigo for new), so the count is one hover away.
- **Bottom strip** (replaces the old "N processing · N pending" bar): when
  anything needs the user, a compact row appears — pulsing red
  "**N need your attention**" → links to Inbox (the review queue), or indigo
  "**N new updates**" → links to the notifications page. Processing-only keeps
  the existing "agents at work" pulse.

### Data model (pure, testable)

`computeAttentionSignals()` combines three existing data sources, all already
fetched/kept-fresh elsewhere (no new server surface):

| Source                                                             | Feeds                | Freshness                                                                                                                        |
| ------------------------------------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ingestion.getStats` (pendingReview, failed, processing)           | Inbox action count   | 30s poll + window focus                                                                                                          |
| `ingestion.listAgentApprovals` (count)                             | Inbox action count   | 60s poll + window focus                                                                                                          |
| `notifications.list({limit:20, onlyUnread:true})` bucketed by type | per-destination dots | **real-time via the shared SSE cache** (top-nav's `useUnreadNotifications` writes to the same query key — no second EventSource) |

Notification type → destination map (future types default to Inbox/new):

| Type                                                                  | Destination    | Tone   |
| --------------------------------------------------------------------- | -------------- | ------ |
| ingestion_review / ingestion_rejected / agent_escalation / agent_flag | Inbox          | action |
| ingestion_posted                                                      | Inbox          | new    |
| report_ready                                                          | Reports        | new    |
| close_complete                                                        | Close Center   | new    |
| close_failed                                                          | Close Center   | action |
| payroll_processed                                                     | Payroll        | new    |
| overdue_invoice                                                       | Invoicing      | action |
| invoice_reminder                                                      | Invoicing      | new    |
| recon_discrepancy                                                     | Reconciliation | action |
| budget_alert                                                          | Dashboard      | new    |
| budget_exceeded / system_alert                                        | Dashboard      | action |

Tone precedence per destination: `action` beats `new` (an agent waiting on you
outranks "fresh results" on the same page). Inbox's authoritative action count
= `pendingReview + agentApprovals + failed` (failed docs fold in — they need
action too). Totals drive the bottom strip.

## File List

| File                                                | Action                                                                                                                               |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web/lib/hooks/use-attention-signals.ts`       | **New** — pure `computeAttentionSignals` + destination map + `useAttentionSignals` hook                                              |
| `apps/web/components/layout/notification-badge.tsx` | Modify — add `AttentionDot`, add `tone` to `CountPill` (already untracked/uncommitted; staged with this feature)                     |
| `apps/web/components/layout/sidebar.tsx`            | Modify — attentionKey per nav item, dots+pills, AttentionStrip, drop old `useApprovalCounts`/`ApprovalCounts`/`countKey`/`showCount` |
| `apps/web/__tests__/attention-signals.test.ts`      | **New** — pure-function tests                                                                                                        |
| `apps/web/__tests__/notification-badge.test.tsx`    | Modify — AttentionDot + tone tests                                                                                                   |
| `BUILD_LOG.md`                                      | Modify — session entry                                                                                                               |

## File Order

1. `use-attention-signals.ts` (pure fn + hook)
2. `notification-badge.tsx` (AttentionDot + CountPill tone)
3. `sidebar.tsx` (wire it together)
4. tests → 5. BUILD_LOG.md

## Rules Applied

- Entity scoping: hook queries run only when `entityId` loaded; all existing
  procedures are entity-scoped server-side.
- No new server routes, no schema changes, no new EventSource connections.
- Shared react-query cache keys (`{limit:20, onlyUnread:true}`, `undefined`)
  so SSE real-time flows to the sidebar for free.
- A11y: dots `aria-hidden`, nav Links get an `aria-label` with the count;
  two tones distinguishable by color + pulse (not color alone).
- Reuses `notification-badge-pop` keyframes already in `globals.css`.

## After Building

1. `pnpm test` for `attention-signals.test.ts` + `notification-badge.test.tsx`
2. `pnpm typecheck --filter=web`
3. `pnpm build --filter=web`
4. Code review (deepseek-flash)
5. Commit (conventional, only feature files) + push — only if build passes

## What I Won't Touch

- `ai-sidebar.tsx` (has its own local `useApprovalCounts` — out of scope)
- `top-nav.tsx` / SSE / notifications router / schema / any server code
- The rest of the dirty working tree (tax presets, seed, mobile, marketing)

---

# /autoplan Review (single-model — gstack skills + codex absent, degradation matrix: `[subagent-only]`)

## Phase 1 — CEO Review (Strategy & Scope)

**Mode: SELECTIVE EXPANSION.**

**0A. Premise challenge.**

- P1 "Users miss that an agent is waiting on them" — validated by the product
  itself: every approval flow (ingestion review queue, agent escalations) is
  push-driven today via the bell; the bell is top-nav, the work is in the
  sidebar. Premise accepted.
- P2 "Collapsed rail is the default state" — true by construction
  (`--sidebar-width` 4.25rem). Premise accepted.
- P3 "Notification types can be bucketed to destinations client-side" —
  validated: 15 enum types, all mappable, future types default to Inbox.
  Premise accepted.

**0B. Existing code leverage map.**

| Sub-problem                                 | Existing code                                                              |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| Live unread notification cache (SSE-driven) | `use-unread-notifications.ts` + `/api/agent-events` `notification_created` |
| Approval/ingestion counts                   | `ingestion.getStats`, `ingestion.listAgentApprovals` (already in sidebar)  |
| Pill/badge primitives                       | `notification-badge.tsx` (`CountPill`, `NotificationBadge`)                |
| Pop-in animation                            | `notification-badge-pop` keyframes in `globals.css`                        |

**0C. Dream state.** CURRENT (silent collapsed rail, one red pill) → THIS PLAN
(per-destination two-tone map + strip) → 12-MONTH (attention routing from any
surface: mobile push deep-links to the same destinations, per-item hover
tooltips, priority-ordered inbox).

**0C-bis. Alternatives.**

| Alt                                                | Effort   | Risk | Verdict                                                                 |
| -------------------------------------------------- | -------- | ---- | ----------------------------------------------------------------------- |
| A. Client-side bucketing of shared caches (chosen) | ~4 files | low  | DRY, real-time, no server change                                        |
| B. New `notifications.attentionSummary` tRPC       | +2 files | med  | authoritative but loses SSE real-time unless extra wiring; more surface |
| C. Global top-nav-only indicator                   | tiny     | high | user explicitly asked for _where_ — fails the ask                       |

**0D/0F. Scope decisions logged in audit trail (D1–D7). Mode confirmed.**

**0E. Temporal interrogation.** HOUR 1: dots light up live (SSE), strip links to
Inbox/notifications. HOUR 6+: type map extension = one line per type; tone
system is the whole vocabulary.

**Dual voices: unavailable (`[subagent-only]`) — codex absent, gstack absent.**

**Sections 1–10 (examined, findings auto-decided):**

- Strategy/positioning (1): no finding — internal productivity feature, not a
  differentiator.
- Market/competitive (2): examined — horizontal nav attention indicators are
  table stakes in every accounting SaaS (QuickBooks, Xero, Wave); this plan
  restores parity. No action.
- Scope (3): see D1/D6.
- **Error & Rescue Registry (4):** every `useQuery` already returns safe
  defaults on failure (existing catch → empty/0); sidebar renders no dot when
  data is absent rather than a misleading dot. No new failure mode.
- **Failure Modes Registry (5):** (a) notification cache not yet hydrated →
  count 0 → no dot; acceptable, 30s poll reconciles. (b) SSE reconnect backoff
  → top-nav handles. (c) unread > 20 rows → counts approximate, capped 99+;
  acceptable (ingestion counts are authoritative for Inbox). (d) type map
  drift → default bucket prevents silent loss.
- Team/velocity (6), risk (7), timeline (8), metrics (9), 6-month trajectory
  (10): no findings — 4-file client-side change, no schema/server risk.

**NOT in scope:** ai-sidebar, mobile, server routes, schema, top-nav, the rest
of the dirty tree.

**What already exists:** see leverage map above.

**Dream-state delta:** collapsed rail becomes an attention map; strip becomes
the "agent is waiting" home.

**CEO completion summary:** premises valid; alternatives explored; scope
calibrated (7 destinations, 2 tones); single critical risk (SSE double
connection) designed away via shared cache keys.

## Phase 2 — Design Review (7 dimensions)

Dual voices unavailable — `[subagent-only]`.

1. **Information hierarchy — 9/10.** Attention reads top-down: dot (glance) →
   pill (count on hover) → strip (aggregate + action). Action > new ordering.
2. **Consistency with design system — 9/10.** Reuses the documented badge
   language: indigo = new, red = actionable/errors. Pulse only on action.
3. **Interaction states — 8/10.** Collapsed dot ↔ expanded pill transition is
   the key micro-interaction (dot hides, pill appears, same pop animation).
   Strip states: action / new / processing / none.
4. **Emotional arc — 9/10.** "Agent waiting" reads as urgent (pulsing red)
   without shouting; "results ready" is calm (static indigo). Zero state is a
   quiet rail — no permanent red dots (matches bell philosophy).
5. **Accessibility — 8/10.** aria-labels with counts, aria-hidden dots, tone
   distinguished by color AND pulse/placement; contrast: destructive +
   primary on dark sidebar satisfy AA.
6. **Specificity — 10/10.** Concrete per-item behavior, no generic language.
7. **Responsive — 8/10.** Mobile drawer keeps dot+pill (drawer is full-width,
   both can show); desktop collapsed=dot, hover=pill. `lg:group-hover:hidden`
   on dot, `lg:hidden lg:group-hover:inline-flex` on pill.

**Design litmus scorecard (single voice):** hierarchy 9, consistency 9,
interaction 8, emotion 9, a11y 8, specificity 10, responsive 8 — overall 8.7.

## Phase 3 — Eng Review

Dual voices unavailable — `[subagent-only]`. Read actual code: sidebar.tsx,
notification-badge.tsx, use-unread-notifications.ts, notifications router,
ingestion router, globals.css. Findings:

**1. Architecture.**

```
useUnreadNotifications (top-nav, SSE) ──writes──▶ cache[notifications.list{limit:20,onlyUnread}]
                                                      ▲ shared key
useAttentionSignals (sidebar) ─reads 3 queries──▶ computeAttentionSignals (pure) ─▶ byKey + totals
                                                      │
                                                      ├─▶ NavItem dots/pills (attentionKey map)
                                                      └─▶ AttentionStrip (action→/inbox, new→/notifications)
```

Coupling: none new to server; hook is a pure function + query fan-in. No
dependency cycles. Only risk: two hook callers (Sidebar + strip) — solved by
calling once in Sidebar and passing props.

**2. Code quality.** Removes dead `countKey`/`showCount`/`ApprovalCounts`
machinery. Reuses `CountPill` instead of duplicating pill markup (the current
sidebar has no duplication — pills were already extracted).

**3. Test review — NEVER SKIP.**

| Codepath                                                                   | Test                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Destination mapping per type                                               | `attention-signals.test.ts` (report_ready→reports/new, close_failed→close/action, …) |
| Inbox authoritative sum (pendingReview+agentApprovals+failed)              | attention-signals tests                                                              |
| Tone precedence (action beats new on same key)                             | attention-signals tests                                                              |
| Unmapped type → inbox/new default                                          | attention-signals tests                                                              |
| Totals aggregation                                                         | attention-signals tests                                                              |
| Zero state renders nothing                                                 | attention-signals + badge tests                                                      |
| CountPill tone variants                                                    | notification-badge.test.tsx                                                          |
| AttentionDot tone + pulse + zero                                           | notification-badge.test.tsx                                                          |
| **Test plan artifact:** this table (inline — gstack artifacts dir absent). |

**4. Performance.** 2 extra lightweight queries (notifications.list + reuse of
stats/approvals already fetched in the same component) with shared cache
keys; zero new polling. No N+1, no new EventSource.

**5. Failure modes (critical gap flags):** none critical. All queries
fail-safe to no-dot.

**NOT in scope / What already exists:** see Phase 1. **Completion summary:**
architecture sound, tests complete (7 new pure-fn cases + 4 badge cases),
performance neutral, security untouched (no new inputs/endpoints).

## Phase 3.5 — DX Review

Skipped — no developer-facing surface (client-only feature, no API/CLI/SDK).

## Cross-phase themes

None across phases (single voice).

## Decision Audit Trail

| #   | Phase | Decision                                                                                        | Class      | Principle  | Rationale                                                                           | Rejected                                  |
| --- | ----- | ----------------------------------------------------------------------------------------------- | ---------- | ---------- | ----------------------------------------------------------------------------------- | ----------------------------------------- |
| D1  | CEO   | 7 destinations get attention keys (Inbox, Reports, Close, Payroll, Invoicing, Recon, Dashboard) | Mechanical | P1/P2      | Every unread-work destination must light up; all in one hook                        | Not limiting to Inbox                     |
| D2  | CEO   | Two tones (action/new), not three                                                               | Taste      | P3/P5      | Red already = actionable; indigo already = new; a third color breaks the vocabulary | Error as separate tone                    |
| D3  | Eng   | Client-side bucketing of shared cache, no new tRPC                                              | Mechanical | P4/P3      | Reuses SSE-real-time cache; server endpoint loses real-time or adds wiring          | attentionSummary router                   |
| D4  | Eng   | No second EventSource — rely on shared query key                                                | Mechanical | P5/P3      | One connection per tab; cache edits flow to all consumers                           | Calling useUnreadNotifications in sidebar |
| D5  | CEO   | Strip links predictably (action→Inbox, new→notifications)                                       | Taste      | P5         | Predictability beats clever routing for a nav summary                               | Link to most-urgent destination           |
| D6  | CEO   | Inbox action count includes failed docs                                                         | Taste      | P1         | Failed work requires action; hiding it understates urgency                          | Keeping total = pending+agent only        |
| D7  | CEO   | Collapsed=dot, expanded=pill, strip=aggregate                                                   | Mechanical | (user ask) | The entire point: signal must be visible in the default collapsed state             | Pills only                                |

## Review Scores (single-model)

- **CEO:** premises valid, scope calibrated, risk (double SSE) engineered out.
- **Design:** 8.7/10 litmus.
- **Eng:** architecture sound, test plan complete (11 cases), perf neutral.
- **DX:** skipped (no developer-facing scope).

## Final Approval Gate — see conversation (ask_user)

---

## GSTACK REVIEW REPORT

- Plan file reviewed by CEO/Design/Eng phases; decision audit trail written.
- Degradation: `[subagent-only]` — gstack skill files and codex CLI absent on
  this machine (checked: `~/.claude/skills/gstack` missing, `codex` missing).
- Premises (P1–P3) accepted after challenge; no user challenges (single voice).
- Taste decisions surfaced: D2, D5, D6.
- Awaiting user approval before implementation per AGENTS.md build workflow.
