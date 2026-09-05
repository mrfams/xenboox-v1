# toAINative.md — Xenboox AI-Native Redesign (Blank-Slate Spec)

> Status: BUILT 2026-09-05 — see BUILD_LOG entry. Pending CI (typecheck/tests)
>   + authenticated visual pass (§8 acceptance).
> Goal: production-grade AI-native UX. Users see work getting done, never the org chart.
> Date: 2026-09-05

---

## 1. The problem (what's wrong today)

1. **Right rail is 3 things pretending to be 1.** `Agents` (live runs) + `Tasks` (tasks table) + `Chat` (conversations) are one job — "what's being done for me" — split across three data sources and three tabs.
2. **Activity Hub has no identity.** `All / Decisions / Activity / Tasks` re-renders the rail as a page plus a raw notification feed. The 4th tab proves the duplication.
3. **Agents leak into the UX.** Users see `CFO Agent`, `Ledger Agent`, tool names (`search_knowledge`), delegation arrows (`CFO → Controller`), confidence % (`92% confidence`), durations (`1.4s`), and pipeline internals (`Input Intake, Memory Retrieval, Session/Context Load 165ms, Permission & Entity Scoping, Route & Task Dispatch, Audit Trail Logging (PII Redacted)…`).
4. **Thinking shows plumbing, not thought.** Expanding "thought for 3ms" shows step labels + timings instead of readable reasoning like Claude / ChatGPT / DeepSeek (collapsed by default, human sentences when expanded).
5. **Clicking a task ejects you.** Task click navigates to `/dashboard/activity-hub` instead of showing what happened on that task inline.

---

## 2. The mental model (coding-agent analogy)

Like Cursor / Claude Code for accounting:

> **A Task = a conversation + the work it did + any approvals it needs.**

- The user never thinks "show me the live run for my conversation's task." They think "chase what's owed" and want to see that job.
- Switching tasks = switching sessions (same as Cursor session switching).
- Approvals happen inline, like accepting a diff — you never leave the thread to approve.
- Agent identity is internal (LangFuse + audit trail keep it). The user sees one worker: Xenboox.

### Backend gap that forces today's mess

- `tasks` rows have no `conversationId`.
- `ops_live_runs` rows have no `conversationId`.
- `conversations` have no link to runs/tasks.

So clicking a task *cannot* show "what has been going on." **Fix: every chat turn that spawns work writes `conversationId` onto the run/task.** Then task click = load conversation + run status + artifacts + approvals together. One id, three lenses.

---

## 3. `/dashboard` — blank-slate spec (Command Center)

Not a dashboard. A **work session**. Two panes:

### 3a. Center — the current job

**Empty state (no conversation yet):**
- Greeting (role-aware, one line).
- One-line AI briefing ("3 bills overdue, payroll runs Friday") with 1–2 action links.
- 4 mission cards (goal-shaped briefs, not prompt examples): Run the close / Chase what's owed / Clean up the bank feed / Where did the cash go?
- Getting-started checklist (dismissible, first-run only).

**Active state (conversation):**
- Chat thread. User bubbles right, AI answers left with rendered artifacts inline (invoices, tables, charts, documents, reports).
- **Approvals render inline as cards** with Approve / Reject + note field. Reject-with-note teaches the agent. Approving here resolves the underlying escalation (same mutation the hub uses) — chat and queue stay in sync.
- **Thought block** above each answer: one collapsed `Thought` line (see §5). Collapsed by default once answered; shimmer (`Thinking…`) while streaming.
- Command bar at bottom: text + file attach + suggestions + cancel-while-streaming. Disclaimer line stays.
- History lives behind the `History` button (existing `ConversationSidebar`). No history tab in the rail.

### 3b. Right — Tasks. One list, no tabs.

Header: `Tasks` + running count + failed badge. One scroll list grouped:

1. **Needs you** (waiting/approval, failed/blocked) — top, amber/red.
2. **Running** (in_progress/queued) — progress bar + current step in plain words.
3. **Done** (completed, last ~10, collapsed "more").

Each row: **what it's doing** ("Chasing 4 overdue invoices"), progress, age. No agent names, no `CFO Agent`, no tool names, no confidence %, no `live_run` / `close_task` source chips.

**Click behavior (critical): does NOT navigate away.**
1. Loads that task's thread into center (follow-ups reuse the same `conversationId`).
2. Shows task detail inline (expanding header above the thread or side drawer):
   - Status + what was asked + what got done (artifact list with open/download).
   - What needs you (same Approve/Reject card as chat).
   - Reply box: "Ask a follow-up on this task…" → continues the same conversation.

**What dies:** Agents tab (`AgentStream` removed from user path — keep component for ops/debug only), Chat/conversations tab (duplicates History), source badges, agent avatars in rail.

**Data:** single query — `trpc.tasks.list` (+ approvals joined). Never stitch `liveRuns` + `tasks` + `notifications` in the client.

---

## 4. `/dashboard/activity-hub` — blank-slate spec (Review Queue)

**Verdict: keep the route, kill the feed.** The hub is not a second dashboard. It is the one place for **things blocked on a human**.

### What it contains (two sections, nothing else)

1. **`Needs you (n)`** — approvals, escalations, exceptions only.
   - Two-pane triage: queue left, brief right (what / why the agent recommends / evidence / amount).
   - Actions: Approve / Reject (+note) / Snooze 1h / Ask the CFO (opens item as a dashboard task thread via `?prompt=`).
   - Keyboard: `j/k` move, `a` approve, `r` reject-with-note, `s` snooze, batch select + approve-all.
   - Badges the sidebar. Empty state: "All clear — nothing needs your attention."
2. **`Tasks (n/m)`** — full-page version of the rail. Same query, same component, more room. Status filter chips (All / Running / Done / Failed). Clicking a task shows the same inline detail as the dashboard drawer.

### What dies
- `All` tab, `Activity`/FYI feed (`month_end_complete`, `bank_statement_needed` as inbox cards, `report_ready`, etc. — those are just completed tasks, already in Tasks → Done).
- Raw notification stitching (`listAgentAlerts` + `list` merged client-side). Notifications become task/approval state or disappear.
- `ProvenanceBadge` with agent name + confidence % in the brief pane. Keep evidence + amount; drop the org chart.
- "Completed today" collapsible filler.

### The split
- **Dashboard = do work.** Chat + tasks.
- **Hub = unblock work.** Decide what AI can't.
- Same task object in both, different lens. One source (`tasks.list` + approvals).

### Open decision (needs user call)
- ~~Keep URL `/dashboard/activity-hub` or move to `/dashboard/tasks`?~~ Decided 2026-09-05: `/dashboard/tasks`. Activity Hub redirects.

### Future build — grant & project spend tracking (DO NOT FORGET)
- QBR + donor-reporting routes are deleted in Phase C (prompt wrappers, not surfaces).
- The real need underneath: orgs that receive grants (or run projects) want to see **how the money was spent** — per-grant / per-project spend vs budget, burn, remaining, simple report/export.
- When rebuilding: NOT a CRUD page. A Financial Pulse artifact + chat flow — "Show me how the X grant was spent" renders burn vs budget inline with download; exceptions land in Tasks → Needs you. Revisit after Phase C.

---

## 5. Thinking UX spec (Claude/ChatGPT pattern)

### Rules
- **Collapsed by default** once the answer streams. Shimmer (`Thinking…`) only while working with no content yet.
- **Max 3–4 first-person sentences** per turn. Plain verbs. No step labels, no timings, no agent names, no tool names, no delegation rows.
- Full trace (steps, timings, agent names, tool calls, confidence, token/cost) stays in **LangFuse + audit trail only**, plus an optional `Details` expander for debug. Default user never sees it.
- Header drops `Xenboox AI · 92% confidence · 1.4s`. Answer carries the work.

### Good (ship this)
> Thought ⌄
> Checking which invoices are overdue… Found 4 totalling GHS 18,200… Drafting reminders for each customer…

### Bad (today — never ship)
> Input Intake / Memory Retrieval / Session/Context Load 165ms / Intent & Context Resolution 166ms / Permission & Entity Scoping 82ms / Route & Task Dispatch 668ms / Summary Aggregation 0ms / Agent Disagreement Detection 0ms / Escalation & Confidence Gate 162ms / Response Synthesis 1ms / Audit Trail Logging (PII Redacted) 84ms

### Server contract
- `thinking` SSE events carry only `{ text }` (human sentence). No `agent: "CFO Agent"`, no `label`, no `durationMs`.
- Pipeline `emitStep` keeps `step/label/durationMs` for telemetry; adds separate `userNote` for the client. Internal labels (`Permission & Entity Scoping`, `Route & Task Dispatch`, `Audit Trail Logging…`) never leave the server.
- Cap ~4 thinking events per turn; drop the pre-pipeline fake lines (`Input Intake`, `Memory Retrieval` ×2).

### Components
- `thinking-reveal.tsx`: rewrite — header `Thought` + chevron, `isExpanded` default `false`, body = plain sentences, no avatars, no `Agents` roster chips, no `N steps · Ns`.
- `streaming-message.tsx`: render `ThinkingReveal` + answer only. Remove `AgentActivityBlock` (agents/tools/delegations) from user path. Keep documents/approvals/creation cards.
- `thinking-steps.tsx` (chat): align to same collapsed-narrative behavior.
- `agent-activity-block.tsx`: keep file for internal/debug behind flag only, not rendered in chat.

---

## 6. Data model changes

| Change | Where | How |
|---|---|---|
| Add `conversationId` to runs/tasks | `@xenboox/db` schema (`ops_live_runs`, `close_tasks`, `daily_close_runs` as applicable) | `pnpm db:generate` migration, nullable FK-style string, indexed; backfill null for old rows |
| `UnifiedTask` gains `conversationId`, `artifacts`, `approvalState` | `apps/web/server/routers/tasks.ts` | Join approvals/escalations + chat artifacts metadata; single shape for rail + hub + detail |
| Drop `agentName/agentInitials/agentColor/confidence` from client shape | same router | Keep server-side for LangFuse; client gets `title/description/status/progress/currentStep(conversation-safe text)/error` |
| Thinking event shape | `app/api/chat/stream/route.ts`, `packages/agents/core/pipeline.ts` | `{ text }` to client; `{ step, label, durationMs, status }` to telemetry only |

Entity scoping: every new query scoped by `entityId` (non-negotiable). RLS preserved.

---

## 7. Build plan

### What
Link tasks↔conversations, unify rail to one Tasks list with inline detail + inline approvals, collapse thinking to human narrative, strip hub to Needs-you + Tasks.

### File List
1. `packages/db/schema/*` (runs/tasks tables) — add `conversationId`
2. `apps/web/server/routers/tasks.ts` — unified shape + joins
3. `packages/agents/core/pipeline.ts` — `userNote` vs telemetry split
4. `apps/web/app/api/chat/stream/route.ts` — safe thinking events only
5. `apps/web/components/workspace/thinking-reveal.tsx` — rewrite
6. `apps/web/components/workspace/streaming-message.tsx` — remove activity block path
7. `apps/web/components/chat/thinking-steps.tsx` — align
8. `apps/web/app/dashboard/page.tsx` — single Tasks rail + task-click-loads-thread + detail drawer
9. `apps/web/app/dashboard/activity-hub/page.tsx` — 2 sections only
10. `apps/web/__tests__/unified-tasks-ux.test.ts` — new guards

### File Order
schema → tasks router → pipeline/route → thinking → dashboard → hub → tests (dependencies flow this way; no file built before its contract exists).

### What Each File Contains
See §3–§6 above (per-file behavior, not just names).

### Rules Applied
- AGENTS.md: web-only, no new sidebar pages without approval, entity scoping always, Plan→Approve→Build→Log, tRPC `protectedProcedure` + zod, confidence gates internal, LangFuse on every agent action, plain-English user errors.
- AI-native: AI absorbs navigation; users see work, never agents.

### After Building
1. `pnpm db:generate` (review SQL, never hand-write) + `pnpm db:migrate` (dev) or `db:push`
2. `pnpm typecheck --filter=web`, `pnpm lint --filter=web`
3. `pnpm test --filter=web` (incl. new `unified-tasks-ux.test.ts`)
4. Manual 3-message pass: thought collapsed by default, expands to sentences, zero agent names; rail one list; task click loads thread inline; hub two sections
5. Update `BUILD_LOG.md` (session entry, module status, next steps)

### What I Won't Touch
- Ledger, Operations, Financial Pulse surfaces
- Sidebar structure/labels (needs separate approval)
- Auth, entity context, RLS policies
- LangFuse logging, audit-trail page, approval mutation semantics
- `AgentStream`/`AgentActivityBlock` files themselves (kept for ops/debug, just unrendered in user path)

### Tests (new file guards)
- Rail renders one surface (no Agents/Chat tabs).
- Thinking has no agent names, no `ms`/timing strings, collapsed by default.
- Hub has no `All/Activity` tabs; needs-you + tasks only.
- Task rows carry `conversationId`; task click loads conversation (mocked).
- Stream route emits no internal labels (`Permission`, `Dispatch`, `Audit Trail`, `Intake`).

---

## 8. What "done" looks like (acceptance)

- [ ] Send a message → see `Thinking…`, then answer with collapsed `Thought`; expanding shows 2–4 readable sentences; no agent names, no timings, no tool names anywhere.
- [ ] Rail shows one Tasks list (Needs you → Running → Done); no tabs.
- [ ] Click a task → thread loads in center with artifacts + approvals + follow-up box; URL stays on `/dashboard`.
- [ ] Approve from chat and from hub do the same thing (same mutation, state syncs both places).
- [ ] Hub shows only Needs-you + Tasks; sidebar badge = needs-you count; empty = "All clear."
- [ ] Typecheck + tests green; BUILD_LOG updated.
