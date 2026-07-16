# REALTIME_STRATEGY.md — Real-Time Update Strategy

> How Xenboox delivers live updates across dashboards, agent activity, chat, and notifications.
> Decision record for SSE vs polling vs third-party services, with Vercel-native constraints.

---

## 1. Real-Time Requirements

| Use Case | Update Frequency | Data Volume | Priority |
|----------|-----------------|-------------|----------|
| **Dashboard KPIs** (cash position, revenue) | On agent action completion | Low (single numbers) | Critical |
| **Agent activity feed** | During agent execution | Medium (event stream) | High |
| **Chat streaming** | Token-by-token during LLM response | High (text stream) | Critical |
| **Notification delivery** | Within 30s of event | Low (single notification) | High |
| **Budget utilization bars** | After budget update | Low (single number) | Medium |
| **Invoice list refresh** | After create/update | Low (list diff) | Medium |
| **Reconciliation status** | During reconciliation run | Medium (status updates) | Medium |

---

## 2. Decision: SSE + Polling Hybrid

After evaluating options against Vercel constraints:

| Criterion | SSE (Server-Sent Events) | Polling (tRPC Query) | Pusher/Ably | WebSocket |
|-----------|--------------------------|---------------------|-------------|-----------|
| Vercel support | ✅ Native (Route Handlers) | ✅ Native | ✅ SDK but extra cost | ❌ Requires adapter |
| Serverless compatible | ✅ (with timeout mgmt) | ✅ | ✅ | ❌ Persistent connections |
| Connection cost | None | Minimal | ~$49/mo starter | N/A |
| Setup complexity | Low | Trivial | Medium | High |
| Bidirectional | ❌ Server→Client only | ✅ Request→Response | ✅ Both | ✅ Both |
| Auto-reconnect | ✅ `EventSource` built-in | ✅ tRPC retry | ✅ SDK handles | Manual |
| Latency | ~100ms | ~5s (poll interval) | ~50ms | ~50ms |

### Final Decision

```
┌──────────────────────────────────────────────────────────────┐
│                    REAL-TIME STRATEGY                        │
│                                                              │
│  SSE (Server-Sent Events)                                    │
│  ├── Chat message streaming (via /api/chat/stream)           │
│  ├── Agent activity feed (live agent actions)                │
│  └── Dashboard KPI updates (short-lived SSE sessions)        │
│                                                              │
│  Polling (tRPC Query with refetchInterval)                   │
│  ├── Notification unread count                                │
│  ├── Invoice / transaction list refresh                      │
│  └── Long-running task status checks                         │
│                                                              │
│  No third-party service (Pusher/Ably)                        │
│  → Adds cost, dependency, and vendor lock-in                  │
│  → SSE + polling covers all needs at near-zero infra cost     │
│  → Can add later if mobile push requires it                   │
└──────────────────────────────────────────────────────────────┘
```

**Rationale:**

1. **Vercel serverless functions are stateless** — WebSockets and Pusher add operational complexity that doesn't match the architecture
2. **SSE works natively** with Vercel's `ReadableStream` — no infrastructure changes
3. **Chat already uses SSE** (see `STREAMING_CHAT_ARCHITECTURE.md`) — consistent pattern
4. **Dashboard data changes are infrequent** (triggered by agent actions, not user interactions) — short-lived SSE connections or polling at 15-30s intervals are sufficient
5. **Cost savings** — Pusher starts at $49/mo for production; Ably is similarly priced. SSE + polling costs nothing extra
6. **Future mobile** can add WebSocket / push later, but web doesn't need it now

---

## 3. SSE Implementation for Multi-Use

### SSE Connection Manager

```typescript
// apps/web/lib/sse/sse-manager.ts
// Central registry for active SSE connections by entity + user

type SSEClient = {
  id: string
  userId: string
  entityId: string
  writer: WritableStreamDefaultWriter
  controller: ReadableStreamController
  connectedAt: Date
  subscriptions: Set<string>  // "dashboard" | "activity" | "notifications"
}

class SSEManager {
  private clients = new Map<string, SSEClient[]>()
  private encoder = new TextEncoder()

  register(entityId: string, userId: string, subscriptions: string[]): {
    stream: ReadableStream
    clientId: string
  } {
    const clientId = crypto.randomUUID()
    let controller: ReadableStreamController
    const stream = new ReadableStream({
      start(c) { controller = c },
    })

    // Register client
    if (!this.clients.has(entityId)) this.clients.set(entityId, [])
    this.clients.get(entityId)!.push({
      id: clientId, userId, entityId,
      writer: null!, // filled by route handler
      controller: controller!,
      connectedAt: new Date(),
      subscriptions: new Set(subscriptions),
    })

    return { stream, clientId }
  }

  unregister(entityId: string, clientId: string) {
    const clients = this.clients.get(entityId) ?? []
    this.clients.set(entityId, clients.filter(c => c.id !== clientId))
  }

  broadcast(entityId: string, event: string, data: unknown) {
    const clients = this.clients.get(entityId) ?? []
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    const encoded = this.encoder.encode(message)

    for (const client of clients) {
      try {
        client.controller.enqueue(encoded)
      } catch {
        // Client disconnected — will be cleaned up on next write
      }
    }
  }

  broadcastToUser(entityId: string, userId: string, event: string, data: unknown) {
    const clients = this.clients.get(entityId) ?? []
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
    const encoded = this.encoder.encode(message)

    for (const client of clients) {
      if (client.userId !== userId) continue
      try {
        client.controller.enqueue(encoded)
      } catch { /* ignore */ }
    }
  }
}

export const sseManager = new SSEManager()
```

### Unified SSE Route

```typescript
// apps/web/app/api/sse/route.ts
import { auth } from "@/lib/auth"
import { sseManager } from "@/lib/sse/sse-manager"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const entityId = url.searchParams.get("entityId")
  const subscribe = url.searchParams.get("subscribe")?.split(",") ?? ["dashboard"]

  if (!entityId) {
    return Response.json({ error: "entityId required" }, { status: 400 })
  }

  const { stream, clientId } = sseManager.register(entityId, session.user.id, subscribe)

  req.signal.addEventListener("abort", () => {
    sseManager.unregister(entityId, clientId)
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}
```

### Client Hook

```typescript
// apps/web/lib/hooks/use-sse.ts
"use client"

import { useEffect, useRef, useCallback } from "react"

type SSEOptions = {
  entityId: string
  subscribe?: string[]
  onDashboardUpdate?: (data: any) => void
  onActivity?: (data: any) => void
  onNotification?: (data: any) => void
}

export function useSSE(options: SSEOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)

  const connect = useCallback(() => {
    const params = new URLSearchParams({
      entityId: options.entityId,
      subscribe: (options.subscribe ?? ["dashboard"]).join(","),
    })

    const es = new EventSource(`/api/sse?${params}`)
    eventSourceRef.current = es

    es.addEventListener("dashboard_update", (e) => {
      options.onDashboardUpdate?.(JSON.parse(e.data))
    })

    es.addEventListener("agent_activity", (e) => {
      options.onActivity?.(JSON.parse(e.data))
    })

    es.addEventListener("notification", (e) => {
      options.onNotification?.(JSON.parse(e.data))
    })

    es.onerror = () => {
      // EventSource auto-reconnects
      console.warn("[SSE] Connection lost, reconnecting...")
    }
  }, [options.entityId, options.subscribe?.join(",")])

  useEffect(() => {
    connect()
    return () => eventSourceRef.current?.close()
  }, [connect])

  return { reconnect: connect }
}
```

---

## 4. Dashboard Real-Time Updates

### Trigger: Agent Posts to Ledger

When any agent posts a journal entry, the dashboard numbers must reflect the change:

```typescript
// packages/agents/core/after-action.ts
// Called after every agent action completes
import { sseManager } from "@/lib/sse/sse-manager"
import { db } from "@xenboox/db"

export async function broadcastDashboardUpdate(entityId: string) {
  // Fetch fresh KPIs
  const [cashPosition, revenue, expenses] = await Promise.all([
    getCashPosition(entityId),
    getMonthRevenue(entityId, new Date()),
    getMonthExpenses(entityId, new Date()),
  ])

  sseManager.broadcast(entityId, "dashboard_update", {
    type: "kpi_refresh",
    cashPosition,
    revenue,
    expenses,
    timestamp: new Date().toISOString(),
  })
}

// Called at the end of every agent workflow
export async function afterAgentAction(params: {
  entityId: string
  action: string
  result: unknown
}) {
  // Always broadcast dashboard update if financial data changed
  if (isFinancialAction(params.action)) {
    await broadcastDashboardUpdate(params.entityId)
  }

  // Broadcast activity event
  sseManager.broadcast(params.entityId, "agent_activity", {
    type: "action_completed",
    action: params.action,
    timestamp: new Date().toISOString(),
  })
}
```

### Client: Dashboard Revalidation

```typescript
// apps/web/components/dashboard/kpi-cards.tsx
"use client"

import { trpc } from "@/lib/trpc"
import { useSSE } from "@/lib/hooks/use-sse"

export function KPICards({ entityId }: { entityId: string }) {
  const utils = trpc.useUtils()

  // SSE listener for real-time updates
  useSSE({
    entityId,
    subscribe: ["dashboard"],
    onDashboardUpdate: (data) => {
      // Invalidate tRPC cache to refetch
      utils.dashboard.kpis.invalidate({ entityId })
    },
  })

  // tRPC query with stale-while-revalidate
  const { data: kpis } = trpc.dashboard.kpis.useQuery(
    { entityId },
    {
      staleTime: 30_000,    // Consider fresh for 30s
      refetchInterval: 60_000, // Fallback: poll every 60s
    },
  )

  return (
    <div className="grid grid-cols-3 gap-4">
      <KPICard title="Cash Position" value={kpis?.cashPosition} />
      <KPICard title="Revenue (MTD)" value={kpis?.revenue} />
      <KPICard title="Expenses (MTD)" value={kpis?.expenses} />
    </div>
  )
}
```

### Dashboard Refresh Decision Matrix

| Trigger | SSE Broadcast | tRPC Invalidation | Fallback Poll |
|---------|--------------|-------------------|---------------|
| Agent posts journal entry | ✅ Immediate | ✅ Invalidate KPIs | 60s |
| Agent completes reconciliation | ✅ Immediate | ✅ Invalidate recon status | 30s |
| Invoice created/updated | ❌ (low pri) | ❌ (user will refresh) | 30s |
| Budget alert fires | ✅ High priority | ✅ Invalidate budget bars | 60s |
| Entity settings change | ❌ | ❌ | Manual refresh |

---

## 5. Agent Activity Feed

### SSE Events for Agent Actions

```typescript
// Broadcast pattern:
// From any agent node, after executing
sseManager.broadcast(entityId, "agent_activity", {
  type: "agent_action",
  agentId: "controller-agent",
  action: "querying_trial_balance",
  status: "in_progress",    // "in_progress" | "completed" | "failed"
  description: "Querying trial balance for June 2026",
  confidence: 0.92,
  durationMs: 3200,
  timestamp: new Date().toISOString(),
})
```

### Activity Feed Component

```typescript
// apps/web/components/dashboard/agent-activity-feed.tsx
"use client"

import { useState } from "react"
import { useSSE } from "@/lib/hooks/use-sse"

type Activity = {
  id: string
  agentId: string
  action: string
  status: string
  description: string
  confidence?: number
  durationMs?: number
  timestamp: string
}

export function AgentActivityFeed({ entityId }: { entityId: string }) {
  const [activities, setActivities] = useState<Activity[]>([])

  useSSE({
    entityId,
    subscribe: ["activity"],
    onActivity: (data: Activity) => {
      setActivities((prev) => {
        const updated = [{ ...data, id: crypto.randomUUID() }, ...prev]
        return updated.slice(0, 50) // Keep last 50
      })
    },
  })

  return (
    <div className="space-y-2">
      <h3>Agent Activity</h3>
      {activities.map((a) => (
        <div key={a.id} className="flex items-center gap-2 text-sm">
          <span className={`w-2 h-2 rounded-full ${
            a.status === "in_progress" ? "bg-blue-500 animate-pulse" :
            a.status === "completed" ? "bg-green-500" : "bg-red-500"
          }`} />
          <span className="font-mono text-xs text-muted-foreground">{a.agentId}</span>
          <span>{a.description}</span>
          {a.confidence && (
            <span className="text-xs text-muted-foreground">
              ({(a.confidence * 100).toFixed(0)}%)
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
```

---

## 6. tRPC Query Caching + Real-Time Interaction

### How They Work Together

tRPC's query cache (built on TanStack Query) provides the stale-while-revalidate layer. SSE provides the invalidation trigger:

```typescript
// Pattern: SSE event → tRPC cache invalidation → UI re-render

// 1. SSE delivers "something changed"
// 2. Client calls utils.[router].[procedure].invalidate()
// 3. TanStack Query marks cache as stale
// 4. Next time component renders, it refetches fresh data
// 5. If still fresh (within staleTime), returns cached data
```

### Cache Configuration Per Query Type

```typescript
// apps/web/lib/trpc/query-config.ts
import { TRPCQueryOptions } from "@trpc/react-query"

type QueryConfig = {
  staleTime: number    // How long data is considered fresh (ms)
  gcTime: number       // How long to keep in cache after unmount (ms)
  refetchInterval: number | false  // Polling fallback
}

export const queryConfigs: Record<string, QueryConfig> = {
  // Dashboard — fast refresh, SSE invalidates
  dashboardKpis: {
    staleTime: 30_000,
    gcTime: 60_000,
    refetchInterval: false, // SSE handles updates
  },

  // Lists — moderate tolerance for staleness
  invoiceList: {
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchInterval: 30_000, // Poll as fallback
  },

  // Static data — rarely changes
  chartOfAccounts: {
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchInterval: false,
  },

  // Notification count — polling is fine
  notificationCount: {
    staleTime: 0,
    gcTime: 60_000,
    refetchInterval: 30_000,
  },
}
```

### Global Invalidation on SSE Event

```typescript
// apps/web/lib/hooks/use-sse-invalidation.ts
"use client"

import { trpc } from "@/lib/trpc"
import { useSSE } from "./use-sse"

// Maps SSE event types to tRPC procedures to invalidate
const INVALIDATION_MAP: Record<string, string[]> = {
  dashboard_update: ["dashboard.kpis"],
  agent_activity:   ["dashboard.recentActivity"],
  recon_update:     ["reconciliation.status", "dashboard.kpis"],
  budget_alert:     ["budget.summary", "dashboard.kpis"],
  notification:     ["notifications.unreadCount"],
}

export function useSSEInvalidation(entityId: string) {
  const utils = trpc.useUtils()

  useSSE({
    entityId,
    subscribe: Object.keys(INVALIDATION_MAP),
    onDashboardUpdate: () => {
      for (const query of INVALIDATION_MAP.dashboard_update) {
        ;(utils as any)[query.split(".")[0]][query.split(".")[1]].invalidate({ entityId })
      }
    },
    // ... other handlers
  })
}
```

---

## 7. Vercel Deployment Considerations

### Serverless Function Constraints

| Constraint | Impact on SSE | Mitigation |
|------------|--------------|------------|
| 300s timeout | SSE connection can't stay open >5 min | Short-lived SSE sessions (30s–120s), auto-reconnect |
| Cold starts | First SSE connection delayed 1-3s | `minInstances: 1` for `/api/sse` in production |
| Concurrent connections | Soft limit per function instance | Multiple users → multiple function instances |
| Memory (max 1024MB) | Large event buffers | Keep SSE messages small, no history in memory |

### SSE Session Lifecycle

```
Client connects → GET /api/sse
├── Serverless function starts (warm or cold)
├── Auth check (fast: ~50ms)
├── SSE stream opened
├── Messages pushed for up to 120s
├── Client receives "keepalive" every 30s
└── Connection closed (client navigates away or 120s timeout)
    └── Client EventSource auto-reconnects
```

### Production Configuration

```json
// apps/web/vercel.json (or vercel.json at root)
{
  "functions": {
    "api/sse/route.ts": {
      "maxDuration": 120,
      "minInstances": 1
    },
    "api/chat/stream/route.ts": {
      "maxDuration": 120,
      "minInstances": 1
    }
  }
}
```

### Edge Functions vs Serverless

| | Edge (Vercel Edge Runtime) | Serverless (Node.js) |
|--|---------------------------|---------------------|
| SSE Support | ❌ Limited (no `ReadableStream` in all Edge runtimes) | ✅ Full support |
| DB Access | ❌ No pg driver | ✅ Full |
| Cold Start | ~50ms | ~500ms |
| **Decision** | ❌ Use serverless | ✅ Use serverless functions |

---

## 8. Cache Invalidation Strategy

### Invalidation Cascade

```
Agent Action Completes
    │
    ▼
broadcastDashboardUpdate(entityId)
    │
    ├──▶ SSE: "dashboard_update" → Client invalidates dashboard.kpis
    │
    ├──▶ SSE: "agent_activity" → Client prepends to activity feed
    │
    └──▶ (If financial) → Trigger budget check
                            │
                            ▼
                       SSE: "budget_alert" (if threshold exceeded)
                            │
                            ▼
                       Client invalidates budget.summary
                            │
                            ▼
                       SSE: "notification" (if user opted in)
```

### Optimistic Updates (Transactions)

For user-initiated mutations (approve invoice, record payment):

```typescript
// Pattern: tRPC mutation with optimistic update
trpc.invoices.approve.useMutation({
  onMutate: async (input) => {
    // Cancel outgoing queries
    await utils.invoices.list.cancel()

    // Snapshot previous value
    const previous = utils.invoices.list.getData({ entityId })

    // Optimistically update cache
    utils.invoices.list.setData({ entityId }, (old) => {
      if (!old) return old
      return old.map((inv) =>
        inv.id === input.invoiceId
          ? { ...inv, status: "approved" }
          : inv
      )
    })

    return { previous }
  },
  onError: (err, input, context) => {
    // Rollback on error
    utils.invoices.list.setData({ entityId }, context?.previous)
  },
  onSettled: () => {
    // Refetch to ensure consistency
    utils.invoices.list.invalidate({ entityId })
  },
})
```

---

## 9. Event Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     EVENT FLOW                                  │
│                                                                  │
│  Agent Action (Trigger.dev Job)                                 │
│      │                                                           │
│      ├── Post journal entry (Database transaction)               │
│      │                                                           │
│      └── Call afterAgentAction()                                 │
│              │                                                   │
│              ├── sseManager.broadcast(entityId, "agent_activity")│
│              │       │                                           │
│              │       └── EventSource delivers to browser          │
│              │           → ActivityFeed prepends item            │
│              │                                                   │
│              └── broadcastDashboardUpdate(entityId)              │
│                      │                                           │
│                      └── sseManager.broadcast(entityId, "dash")  │
│                              │                                   │
│                              └── EventSource delivers             │
│                                  → KPICards invalidates cache    │
│                                  → tRPC refetches fresh data     │
│                                  → UI re-renders                 │
│                                                                  │
│  User Action (tRPC Mutation)                                     │
│      │                                                           │
│      ├── Optimistic UI update (instant)                          │
│      ├── Mutation completes                                       │
│      └── onSettled: invalidate related queries                    │
│              │                                                   │
│              └── (If agent action triggered) Follow agent flow    │
│                                                                  │
│  Polling Fallback (every 30-60s)                                 │
│      │                                                           │
│      └── refetchInterval on tRPC queries                         │
│          → Catches any missed SSE events                         │
│          → Ensures eventual consistency                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Future: Mobile Push Notifications

When mobile apps are built:

```typescript
// Future pattern — extend SSE manager to also send push
export async function broadcastWithPush(entityId: string, event: string, data: unknown) {
  // 1. Broadcast to SSE-connected web clients
  sseManager.broadcast(entityId, event, data)

  // 2. Send push to mobile clients
  const mobileTokens = await getDeviceTokens(entityId)
  for (const token of mobileTokens) {
    await sendPushNotification(token, { event, data })
  }
}
```

This keeps the same event-driven architecture. SSE handles web; push handles mobile. No architectural change required.

---

*Last updated: July 2026*
*Reference: STREAMING_CHAT_ARCHITECTURE.md for chat SSE, ARCHITECTURE.md §4 for tRPC patterns, NOTIFICATION_SYSTEM.md for notification delivery*
