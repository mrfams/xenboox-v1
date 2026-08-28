# Activity Hub New — Design Spec

> **Date:** 2026-08-29
> **Status:** Approved
> **Path:** Architectural

---

## 1. Goal

Bring all features from the existing `/activity-hub` (1872 lines, traditional SaaS dashboard) into `/activity-hub/new` (AI-native decision surface) — adapted to the keyboard-triage, decision-brief paradigm.

## 2. Design Principles

1. **Keyboard-first** — j/k/a/r/s/b for all primary actions
2. **Decision briefs, not cards** — What/Why/Evidence structure
3. **AI absorbs navigation** — number-key filters, not permanent tab bars
4. **Split-pane** — queue (left) + brief (right)
5. **Batch ops for power users** — toggle with `b`, select with Space, act with A/R

## 3. Layout

```
┌─────────────────────────────────────────────────────────┐
│ STATUS STRIP  — queue health + filter tabs + kb hints   │
├──────────────────────┬──────────────────────────────────┤
│                      │                                  │
│   QUEUE PANE         │   BRIEF PANE                    │
│   (keyboard triage)  │   (decision context)            │
│                      │                                  │
│   ┌──────────────┐   │   What / Why / Evidence          │
│   │ BATCH BAR    │   │   Actions + Note                 │
│   │ (when active)│   │   Ask the CFO                    │
│   └──────────────┘   │                                  │
│                      │                                  │
├──────────────────────┴──────────────────────────────────┤
│ COMPLETED SECTION  — collapsible, AI-auto-resolved      │
└─────────────────────────────────────────────────────────┘
```

## 4. Components

### 4.1 Status Strip

Thin, single-line bar at top. Contains:

- Queue health chips: `🔴 3 urgent · 🟡 5 approvals · 📄 2 reviews · 🤖 12 auto-resolved`
- Filter tabs inline: `[All] [Urgent] [Approvals] [Reviews] [FYI]`
- Keyboard hints on right: `j/k · a/r · s`
- Snoozed count (if > 0): `⏸ 2 snoozed`

### 4.2 Queue Pane

List of items, sorted by severity (urgent > approval > review > info). Each item shows:

- Severity icon (colored)
- Title (truncated)
- Confidence % (colored: green ≥80%, amber ≥60%, red <60%)
- Agent name
- Time ago

**Selection:** Blue background on current item. `j/k` or `↑/↓` to move.

**Batch mode:** When active, each item gets a checkbox. `Space` toggles selection. Batch bar appears at bottom.

### 4.3 Batch Bar

Appears at bottom of queue pane when items are selected in batch mode:

- Count: `2 selected`
- Actions: `A approve all` · `R reject all`
- Selection: `Shift+A select all` · `Esc clear`
- Reject-all shows confirmation dialog

### 4.4 Decision Brief Pane

Structured brief for the selected item:

- **Title** with severity icon
- **Provenance badge** (agent name, confidence, source doc)
- **What this is** — summary text
- **Why the agent recommends this** — rationale (if present)
- **Evidence** — key-value pairs from metadata (if present)
- **Actions** — Approve / Reject (with note) / Snooze / Ask the CFO

### 4.5 Snooze Picker

Inline duration picker that appears below the current item when `s` is pressed:

- `1` — 1 hour
- `2` — 4 hours
- `3` — Tomorrow
- `4` — Next week
- `Esc` — Cancel

Implementation: Client-side state with `setTimeout` auto-restore. Same pattern as old page.

### 4.6 Completed Section

Collapsible section at page bottom:

- Collapsed by default
- Shows count from `ingestion.getStats.autoPosted`
- Text: "X items resolved automatically by AI agents."
- Link to audit trail

## 5. Data Sources

| Source                 | Query                           | Mapping                            |
| ---------------------- | ------------------------------- | ---------------------------------- |
| Agent approvals        | `ingestion.listAgentApprovals`  | → approval items                   |
| Agent alerts           | `notifications.listAgentAlerts` | → urgent/approval/info             |
| Pending reviews        | `ingestion.getStats`            | → review items (pendingReview > 0) |
| Notifications          | `notifications.list`            | → info items                       |
| Daily close exceptions | `dailyClose.getExceptions`      | → urgent items                     |

**Dedup:** Same entity may appear as both approval and alert. Dedup by `title + type` key.

## 6. Mutations

All exist already — no new endpoints needed:

- `approvals.resolve` — for agent activity
- `ingestion.rejectReview` — for ingestion items
- `notifications.markAsRead` — for notifications/alerts

## 7. Keyboard Map

| Key            | Action                                         |
| -------------- | ---------------------------------------------- |
| `j/k` or `↑/↓` | Move cursor                                    |
| `a`            | Approve current                                |
| `r`            | Reject current (opens note field)              |
| `s`            | Snooze current (opens duration picker)         |
| `b`            | Toggle batch mode                              |
| `Space`        | Toggle selection (batch mode)                  |
| `Shift+A`      | Select all (batch mode)                        |
| `A`            | Approve all selected (batch mode)              |
| `R`            | Reject all selected (batch mode, with confirm) |
| `1-5`          | Switch filter                                  |
| `Esc`          | Cancel / close / exit batch mode               |

## 8. File List

| File                                       | Contents                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `activity-hub/new/page.tsx`                | Main page — status strip, queue pane, batch bar, completed section, keyboard handler |
| `activity-hub/new/decision-brief-pane.tsx` | Extracted brief pane component                                                       |
| `activity-hub/new/snooze-picker.tsx`       | Inline snooze duration picker                                                        |

## 9. Build Order

1. `snooze-picker.tsx` (standalone, no deps)
2. `decision-brief-pane.tsx` (extracted from current page)
3. `page.tsx` (main page — integrates everything)

## 10. Rules Applied

- Entity scoping on all queries
- zod validation on all mutations
- `protectedProcedure` for all tRPC calls
- No new database tables
- All mutations exist already

## 11. After Building

- `pnpm typecheck --filter=@xenboox/web`
- `pnpm lint --filter=@xenboox/web`
- Manual QA: keyboard triage flow

## 12. What I Won't Touch

- No changes to tRPC routers
- No database schema changes
- No changes to other surfaces
- No new agent code
