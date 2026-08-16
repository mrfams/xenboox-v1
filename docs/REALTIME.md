# Realtime Surfaces & Degraded Modes

> Last updated: Aug 16, 2026 · Owner: Platform · Reference: ROADTOPRODUCTION.md §16.1/§16.2
>
> Rule: **no realtime surface may be silently stale.** When the realtime
> channel is down, the UI shows a `Reconnecting…` indicator and falls back to
> polling. Everything below is enforced by the Redis-backed SSE layer
> (`apps/web/lib/sse/broadcast.ts`) + per-hook reconnect/poll backstops.

## 1. Surface Classification

| #   | Surface                                | Transport                                          | Source of truth                         | Immediacy                                |
| --- | -------------------------------------- | -------------------------------------------------- | --------------------------------------- | ---------------------------------------- |
| 1   | **Agent-run progress** (agent-monitor) | SSE (`/api/agent-events`) + DB polling             | `ops_live_runs` / `ops_live_run_events` | Near-real-time (events pushed)           |
| 2   | **Notifications** (badge / top-nav)    | SSE + **30s poll backstop** + window-focus refetch | `notifications` table                   | Push for instant badge; poll reconciles  |
| 3   | **Chat streaming**                     | SSE — single HTTP request per stream               | Agent pipeline (no in-memory map)       | Real-time tokens                         |
| 4   | **Attention signals** (sidebar dots)   | Same EventSource as #1 (piggybacked)               | `ops_live_runs`                         | Near-real-time                           |
| 5   | **Month-end close progress**           | DB polling (dashboard queries)                     | `close` state machine tables            | Polled (30s) — acceptable, close is HITL |
| 6   | **Bank sync status**                   | DB polling                                         | bank accounts / sync runs               | Polled — sync is async by design         |

## 2. Degraded Modes (never silently stale)

| Surface            | Channel down → indicator                               | Fallback                                                                                                  |
| ------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Agent-run progress | `Reconnecting…` (exponential backoff, capped attempts) | Agent-monitor polls `ops_live_runs`; runs are persisted by `persistAgentRun()` (§8.2) so no event is lost |
| Notifications      | Reconnect timer; badge stays correct within 30s        | The **30s poll + focus refetch is the source of truth** — SSE only accelerates it                         |
| Chat streaming     | Stream error surfaces inline in the chat UI            | Retry sends the request again (stateless — each stream is one request, serverless-safe)                   |
| Close progress     | n/a (no SSE)                                           | Polling with visible progress state in the close UI                                                       |
| Bank sync          | n/a (no SSE)                                           | Polling; sync runs continue server-side (Trigger.dev)                                                     |

## 3. Design rules (enforced)

1. **Never trust the in-memory map.** SSE events are published to Redis
   (`publishSseEvent`) and drained by polling loops (`drainSseEvents`) so
   broadcasts survive serverless cold starts and work across Vercel
   instances. The local `activeConnections` Map in `/api/agent-events` is
   only a same-instance fast path.
2. **Every SSE hook has an `onerror` reconnect path.** `use-realtime-agent-events`,
   `use-unread-notifications`, `use-attention-signals` all reconnect with
   backoff and never silently drop.
3. **DB is always the backstop.** Every surface reads its state from tables
   the UI can poll; SSE is an acceleration layer, never the only path.
4. **Chat streaming is stateless per request** (`/api/chat/stream` builds one
   `ReadableStream` per request) — no cross-request state, so it is safe on
   serverless and needs no degraded mode beyond retry.

## 4. When Redis is unavailable

`publishSseEvent`/`drainSseEvents` no-op gracefully (see `broadcast.ts`
`hasRedis()`), and every surface falls back to its DB polling mode — the
degraded behavior IS the documented default for surfaces 5–6, and the
poll-backstop for surfaces 1–2.
