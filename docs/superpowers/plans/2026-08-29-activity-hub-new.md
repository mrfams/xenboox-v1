# Activity Hub New — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/activity-hub/new` with all features from the old activity hub — stats, filters, batch ops, snooze with auto-restore, completed section, and all 5 data sources — adapted to the AI-native keyboard-triage paradigm.

**Architecture:** Split-pane layout (queue + brief). Keyboard-first triage (j/k/a/r/s/b). Decision briefs (What/Why/Evidence). All data from existing tRPC endpoints — no new backend code.

**Tech Stack:** Next.js 15, React, tRPC, Tailwind, Lucide icons, sonner toasts

**Spec:** `docs/superpowers/specs/2026-08-29-activity-hub-new-design.md`

## Global Constraints

- Entity scoping on all queries (`entityId` from `useEntity()`)
- `protectedProcedure` for all tRPC calls
- No new database tables or tRPC endpoints
- All mutations exist already: `approvals.resolve`, `ingestion.rejectReview`, `notifications.markAsRead`
- Follow existing code conventions: `kebab-case.ts` files, `PascalCase.tsx` components
- Use `cn()` from `@/lib/utils` for conditional classes
- Use `toast` from `sonner` for notifications

---

## Task 1: Create Snooze Picker Component

**Files:**

- Create: `apps/web/components/activity-hub/snooze-picker.tsx`

**Interfaces:**

- Consumes: nothing (standalone)
- Produces: `<SnoozePicker onSelect={fn} onCancel={fn} />`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useEffect, useCallback } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type SnoozeDuration = {
  label: string;
  shortcut: string;
  ms: number;
};

const DURATIONS: SnoozeDuration[] = [
  { label: "1 hour", shortcut: "1", ms: 3_600_000 },
  { label: "4 hours", shortcut: "2", ms: 14_400_000 },
  { label: "Tomorrow", shortcut: "3", ms: 86_400_000 },
  { label: "Next week", shortcut: "4", ms: 604_800_000 },
];

export function SnoozePicker({
  onSelect,
  onCancel,
}: {
  onSelect: (ms: number) => void;
  onCancel: () => void;
}) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      const idx = DURATIONS.findIndex((d) => d.shortcut === e.key);
      if (idx !== -1) {
        e.preventDefault();
        onSelect(DURATIONS[idx].ms);
      }
    },
    [onSelect, onCancel],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleKey]);

  return (
    <div
      role="menu"
      aria-label="Snooze duration"
      className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-card px-2 py-1.5 shadow-sm"
    >
      <Clock className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
      {DURATIONS.map((d) => (
        <button
          key={d.ms}
          type="button"
          role="menuitem"
          onClick={() => onSelect(d.ms)}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
            "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          {d.label}
          <kbd className="ml-1 rounded bg-muted px-1 py-0.5 font-mono text-[9px]">
            {d.shortcut}
          </kbd>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck --filter=@xenboox/web 2>&1 | grep snooze-picker`
Expected: No errors in snooze-picker

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/activity-hub/snooze-picker.tsx
git commit -m "feat(activity-hub): add snooze picker component with keyboard shortcuts"
```

---

## Task 2: Create Decision Brief Pane

**Files:**

- Create: `apps/web/components/activity-hub/decision-brief-pane.tsx`
- Reference: `apps/web/app/dashboard/activity-hub/new/page.tsx` (existing brief pane to extract from)

**Interfaces:**

- Consumes: `DecisionItem` type, `SEVERITY_META` (will be defined in the same file or imported)
- Produces: `<DecisionBriefPane item busy noteOpen note onNoteChange onToggleNote onDecide onSnooze onAskAi />`

- [ ] **Step 1: Create the component by extracting from current page**

Copy the existing `DecisionBriefPane` and `Section` components from `activity-hub/new/page.tsx` (lines 360-450) into this new file. Keep the same interface. Add the `ProvenanceBadge` import.

```tsx
"use client";

import { ThumbsDown, ThumbsUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProvenanceBadge } from "@/components/ai-native-v2/provenance";

// Re-export the DecisionItem type and SEVERITY_META for consumers
export type DecisionItem = {
  id: string;
  itemType: "agent_activity" | "ingestion" | "notification";
  severity: "urgent" | "approval" | "review" | "info";
  title: string;
  summary: string;
  rationale?: string;
  agentName?: string;
  confidence?: number;
  sourceDoc?: string;
  amount?: string;
  createdAt?: string | Date;
  evidence?: Record<string, unknown>;
};

export const SEVERITY_META = {
  urgent: { icon: /* will be passed as prop or imported */, tone: "text-error-clay", label: "Urgent" },
  approval: { icon: /* ... */, tone: "text-attention-amber", label: "Approval" },
  review: { icon: /* ... */, tone: "text-primary", label: "Review" },
  info: { icon: /* ... */, tone: "text-muted-foreground", label: "FYI" },
} as const;
```

Note: The `icon` fields in `SEVERITY_META` need to be actual Lucide components. Import `AlertTriangle`, `FileCheck`, `Clock`, `Bell` from lucide-react and use them directly.

- [ ] **Step 2: Full implementation**

Extract the `DecisionBriefPane` and `Section` components exactly as they exist in the current page. The file should export:

- `DecisionItem` type
- `SEVERITY_META` constant
- `DecisionBriefPane` component
- `Section` component (internal, not exported)

- [ ] **Step 3: Verify it compiles**

Run: `pnpm typecheck --filter=@xenboox/web 2>&1 | grep decision-brief-pane`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/activity-hub/decision-brief-pane.tsx
git commit -m "feat(activity-hub): extract decision brief pane component"
```

---

## Task 3: Rewrite Main Page — Core Layout + Data + Keyboard

**Files:**

- Rewrite: `apps/web/app/dashboard/activity-hub/new/page.tsx`

**Interfaces:**

- Consumes: `SnoozePicker` from Task 1, `DecisionBriefPane` + types from Task 2
- Produces: Complete page with status strip, queue pane, brief pane, keyboard handler

**Note:** This is the biggest task. We rewrite the entire page to include:

1. All 5 data sources (agent approvals, agent alerts, pending reviews, notifications, daily close exceptions)
2. Status strip with queue health + filter tabs
3. Queue pane with keyboard triage (j/k/a/r/s)
4. Brief pane (using extracted component)
5. Snooze with auto-restore
6. Dedup logic across data sources

- [ ] **Step 1: Write the complete page**

The page structure:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileCheck,
  Inbox,
  Clock,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useSurfaceSync } from "@/lib/hooks/use-surface-sync";
import { emitDataChanged } from "@/lib/hooks/use-surface-sync";
import { useSrAnnounce } from "@/lib/hooks/use-sr-announce";
import { SnoozePicker } from "@/components/activity-hub/snooze-picker";
import {
  DecisionBriefPane,
  type DecisionItem,
  SEVERITY_META,
} from "@/components/activity-hub/decision-brief-pane";

type FilterType = "all" | "urgent" | "approval" | "review" | "info";

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "urgent", label: "Urgent" },
  { key: "approval", label: "Approvals" },
  { key: "review", label: "Reviews" },
  { key: "info", label: "FYI" },
];
```

Key sections of the page:

**Data fetching** — all 5 sources:

```tsx
const { data: agentApprovals } = trpc.ingestion.listAgentApprovals.useQuery(
  { limit: 50 },
  { enabled: !!entityId, refetchInterval: 15_000 },
);
const { data: alerts } = trpc.notifications.listAgentAlerts.useQuery(
  { limit: 20, unreadOnly: false },
  { enabled: !!entityId, refetchInterval: 15_000 },
);
const { data: ingestionStats } = trpc.ingestion.getStats.useQuery(undefined, {
  enabled: !!entityId,
  refetchInterval: 30_000,
});
const { data: notifications } = trpc.notifications.list.useQuery(
  { limit: 20, onlyUnread: false },
  { enabled: !!entityId, refetchInterval: 30_000 },
);
const { data: dailyCloseExceptions } = trpc.dailyClose.getExceptions.useQuery(
  undefined,
  { enabled: !!entityId, refetchInterval: 30_000 },
);
```

**Build items** — dedup by `title + type`:

```tsx
const items: DecisionItem[] = useMemo(() => {
  const out: DecisionItem[] = [];
  const seen = new Set<string>();

  // 1. Agent approvals
  if (agentApprovals?.items) {
    /* ... same as current ... */
  }

  // 2. Agent alerts
  if (alerts?.alerts) {
    /* ... same as current ... */
  }

  // 3. Pending reviews (NEW)
  if (ingestionStats && ingestionStats.pendingReview > 0) {
    if (!seen.has("pending-review")) {
      seen.add("pending-review");
      out.push({
        id: "pending-review",
        itemType: "ingestion",
        severity: "review",
        title: `${ingestionStats.pendingReview} document(s) need review`,
        summary: "Documents processed by AI, awaiting your verification",
        agentName: "Document Agent",
      });
    }
  }

  // 4. Notifications (NEW)
  if (notifications) {
    for (const n of notifications.slice(0, 5)) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      out.push({
        id: n.id,
        itemType: "notification",
        severity: "info",
        title: n.title,
        summary: n.body ?? "",
      });
    }
  }

  // 5. Daily close exceptions (NEW)
  if (dailyCloseExceptions) {
    for (const run of dailyCloseExceptions) {
      const key = `daily-close-${run.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const exceptions = (run.exceptions ?? []) as Array<{
        description: string;
      }>;
      out.push({
        id: key,
        itemType: "notification",
        severity: "urgent",
        title: `Daily close exception — ${run.closeDate}`,
        summary:
          exceptions.map((e) => e.description).join("; ") ||
          "Exceptions detected",
        agentName: "Daily Close Pipeline",
      });
    }
  }

  const order = { urgent: 0, approval: 1, review: 2, info: 3 } as const;
  return out.sort((x, y) => order[x.severity] - order[y.severity]);
}, [
  agentApprovals,
  alerts,
  ingestionStats,
  notifications,
  dailyCloseExceptions,
]);
```

**Snooze state** — client-side with auto-restore:

```tsx
const [snoozed, setSnoozed] = useState<Record<string, { restoreAt: number }>>(
  {},
);

const handleSnooze = useCallback((item: DecisionItem, ms: number) => {
  setSnoozed((p) => ({ ...p, [item.id]: { restoreAt: Date.now() + ms } }));
  toast.info(`Snoozed for ${formatDuration(ms)}`, {
    action: { label: "Restore", onClick: () => handleUnsnooze(item.id) },
  });
  setTimeout(() => {
    setSnoozed((p) => {
      const n = { ...p };
      delete n[item.id];
      return n;
    });
  }, ms);
}, []);

const handleUnsnooze = useCallback((id: string) => {
  setSnoozed((p) => {
    const n = { ...p };
    delete n[id];
    return n;
  });
}, []);
```

**Filter + sort:**

```tsx
const [filter, setFilter] = useState<FilterType>("all");

const visible = useMemo(() => {
  return items.filter((i) => {
    if (snoozed[i.id]) return false;
    if (filter === "all") return true;
    return i.severity === filter;
  });
}, [items, filter, snoozed]);
```

**Keyboard handler** — all keys:

```tsx
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement)?.tagName.match(/INPUT|TEXTAREA|SELECT/))
      return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    switch (e.key) {
      case "j":
      case "ArrowDown":
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, visible.length - 1));
        break;
      case "k":
      case "ArrowUp":
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
        break;
      case "a":
        if (!batchMode && selected) void decide(selected, "approve");
        break;
      case "r":
        if (!batchMode && selected) {
          setNoteFor(selected.id);
          e.preventDefault();
        }
        break;
      case "s":
        if (!batchMode && selected) setSnoozeFor(selected.id);
        break;
      case "b":
        setBatchMode((b) => !b);
        break;
      case "1":
        setFilter("all");
        break;
      case "2":
        setFilter("urgent");
        break;
      case "3":
        setFilter("approval");
        break;
      case "4":
        setFilter("review");
        break;
      case "5":
        setFilter("info");
        break;
      case "Escape":
        setNoteFor(null);
        setSnoozeFor(null);
        setBatchMode(false);
        setSelectedIds(new Set());
        break;
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [visible, selected, decide, batchMode]);
```

**Render structure:**

```tsx
return (
  <div className="flex h-full min-h-0 flex-col pb-16 md:pb-0">
    {/* Status Strip */}
    <StatusStrip
      urgentCount={...}
      approvalCount={...}
      reviewCount={...}
      completedCount={...}
      snoozedCount={...}
      filter={filter}
      onFilterChange={setFilter}
    />

    {visible.length === 0 ? (
      /* Empty state */
    ) : (
      <div className="grid min-h-0 flex-1 lg:grid-cols-[380px_1fr]">
        {/* Queue Pane */}
        <div className="min-h-0 overflow-y-auto border-b border-border/40 lg:border-b-0 lg:border-r">
          {visible.map((item, idx) => (
            /* Queue item row — same as current but with batch checkbox */
          ))}
          {/* Batch Bar — when batchMode && selectedIds.size > 0 */}
        </div>

        {/* Brief Pane */}
        <div className="min-h-0 overflow-y-auto">
          {selected ? (
            <DecisionBriefPane ... />
          ) : (
            /* Select prompt */
          )}
        </div>
      </div>
    )}

    {/* Completed Section */}
    <CompletedSection count={completedCount} />
  </div>
);
```

- [ ] **Step 2: Verify it compiles**

Run: `pnpm typecheck --filter=@xenboox/web 2>&1 | grep "activity-hub/new"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/dashboard/activity-hub/new/page.tsx
git commit -m "feat(activity-hub): rebuild new page with all data sources, filters, keyboard triage"
```

---

## Task 4: Add Batch Operations

**Files:**

- Modify: `apps/web/app/dashboard/activity-hub/new/page.tsx`

**Interfaces:**

- Consumes: existing page state
- Produces: batch mode toggle, multi-select, batch approve/reject

- [ ] **Step 1: Add batch state + handler**

Add to the page component:

```tsx
const [batchMode, setBatchMode] = useState(false);
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);

const toggleSelect = useCallback((id: string) => {
  setSelectedIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
}, []);

const selectAll = useCallback(() => {
  const ids = visible
    .filter(
      (i) => i.itemType === "agent_activity" || i.itemType === "ingestion",
    )
    .map((i) => i.id);
  setSelectedIds(new Set(ids));
}, [visible]);

const handleBatchAction = useCallback(
  async (action: "approve" | "reject") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    for (const id of ids) {
      const item = items.find((i) => i.id === id);
      if (item) await decide(item, action);
    }
    setSelectedIds(new Set());
    setBatchMode(false);
  },
  [selectedIds, items, decide],
);
```

- [ ] **Step 2: Add batch bar to queue pane**

At the bottom of the queue pane, when `batchMode && selectedIds.size > 0`:

```tsx
{
  batchMode && selectedIds.size > 0 && (
    <div className="sticky bottom-0 border-t border-border/40 bg-card/95 backdrop-blur-sm px-4 py-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">
          {selectedIds.size} selected
        </span>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <kbd>Space</kbd> select · <kbd>A</kbd> approve · <kbd>R</kbd> reject
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={selectAll}
          className="text-xs text-primary hover:underline"
        >
          Select all
        </button>
        <button
          onClick={() => setSelectedIds(new Set())}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleBatchAction("approve")}
            className="... rounded-lg bg-balanced-green px-3 py-1.5 text-xs font-medium text-white"
          >
            Approve all
          </button>
          <button
            onClick={() => setConfirmRejectOpen(true)}
            className="... rounded-lg bg-error-clay px-3 py-1.5 text-xs font-medium text-white"
          >
            Reject all
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add batch checkbox to queue items**

In the queue item rendering, when `batchMode` is true, show a checkbox before the item:

```tsx
{
  batchMode && (
    <input
      type="checkbox"
      checked={selectedIds.has(item.id)}
      onChange={() => toggleSelect(item.id)}
      className="h-3.5 w-3.5 rounded border-border"
    />
  );
}
```

- [ ] **Step 4: Add reject confirmation dialog**

Same pattern as old page — modal with warning icon, confirm/cancel buttons.

- [ ] **Step 5: Update keyboard handler**

In the keyboard handler, add batch-mode keys:

```tsx
case " ": if (batchMode && selected) { e.preventDefault(); toggleSelect(selected.id); } break;
case "A": if (batchMode && selectedIds.size > 0) { e.preventDefault(); handleBatchAction("approve"); } break;
case "R": if (batchMode && selectedIds.size > 0) { e.preventDefault(); setConfirmRejectOpen(true); } break;
```

- [ ] **Step 6: Verify it compiles**

Run: `pnpm typecheck --filter=@xenboox/web 2>&1 | grep "activity-hub/new"`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add apps/web/app/dashboard/activity-hub/new/page.tsx
git commit -m "feat(activity-hub): add batch operations with keyboard shortcuts"
```

---

## Task 5: Add Completed Section + Polish

**Files:**

- Modify: `apps/web/app/dashboard/activity-hub/new/page.tsx`

**Interfaces:**

- Consumes: `ingestionStats.autoPosted` count
- Produces: collapsible completed section at page bottom

- [ ] **Step 1: Add CompletedSection component**

Add inside the page file (or as a small inline component):

```tsx
function CompletedSection({ count }: { count: number }) {
  const [isOpen, setIsOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="rounded-xl border border-border/50 bg-card/60">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-balanced-green" />
          <span>Completed today</span>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-balanced-green/10 px-1.5 text-[10px] font-bold text-balanced-green">
            {count}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <div className="border-t border-border/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            {count} items resolved automatically by AI agents.{" "}
            <a
              href="/dashboard/audit-trail"
              className="text-primary hover:underline"
            >
              View audit trail
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add to page render**

Place `<CompletedSection count={completedCount} />` after the grid, before the closing `</div>`.

- [ ] **Step 3: Add status strip component**

Extract the status strip into a small component at the top of the page:

```tsx
function StatusStrip({
  urgentCount, approvalCount, reviewCount, completedCount, snoozedCount,
  filter, onFilterChange,
}: { ... }) {
  return (
    <header className="border-b border-border/40 px-4 py-3 sm:px-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <Inbox className="h-4 w-4 text-primary" />
          <h1 className="text-sm font-semibold">Decisions</h1>
          {urgentCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[9px] font-bold text-error-clay">
              {urgentCount} urgent
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {approvalCount} approvals · {reviewCount} reviews
          </span>
          {snoozedCount > 0 && (
            <span className="text-[10px] text-muted-foreground">
              ⏸ {snoozedCount} snoozed
            </span>
          )}
        </div>
        <p className="hidden font-mono text-[10px] text-muted-foreground/60 sm:block">
          j/k move · a approve · r reject · s snooze · b batch
        </p>
      </div>
      {/* Filter tabs */}
      <div className="mt-2 flex items-center gap-1">
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors",
              filter === f.key
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted/50",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Verify it compiles**

Run: `pnpm typecheck --filter=@xenboox/web 2>&1 | grep "activity-hub/new"`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/dashboard/activity-hub/new/page.tsx
git commit -m "feat(activity-hub): add status strip, completed section, and filter tabs"
```

---

## Task 6: Final Typecheck + Lint

**Files:**

- No new files

- [ ] **Step 1: Full typecheck**

Run: `pnpm typecheck --filter=@xenboox/web`
Expected: Only pre-existing errors (treasury-agent, document schema) — no new errors

- [ ] **Step 2: Lint**

Run: `pnpm lint --filter=@xenboox/web`
Expected: No new errors

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(activity-hub): typecheck and lint fixes for new decisions page"
```
