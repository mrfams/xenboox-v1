# Merge /new Routes into Production

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all AI-native `/new` page content into the production routes, delete the `/new` directories, and fix internal links.

**Architecture:** Each `/new/page.tsx` is a complete replacement of its parent `page.tsx`. The operation is: read `/new`, write as original, move error files, delete `/new`. One internal link needs updating.

**Tech Stack:** Next.js App Router file system routing. No code changes — only file moves.

**Spec:** User request: "i want everything in /dashboard to be in /dashboard/new" (meaning: merge /new into originals)

---

## Surfaces to Merge

| #   | Source (new)                             | Destination (original)               | Error file? |
| --- | ---------------------------------------- | ------------------------------------ | ----------- |
| 1   | `dashboard/new/page.tsx`                 | `dashboard/page.tsx`                 | Yes         |
| 2   | `dashboard/activity-hub/new/page.tsx`    | `dashboard/activity-hub/page.tsx`    | No          |
| 3   | `dashboard/financial-pulse/new/page.tsx` | `dashboard/financial-pulse/page.tsx` | Yes         |
| 4   | `dashboard/operations/new/page.tsx`      | `dashboard/operations/page.tsx`      | Yes         |
| 5   | `dashboard/ledger/new/page.tsx`          | `dashboard/ledger/page.tsx`          | No          |

## Internal Links to Fix

Only 1 link references a `/new` path:

- `dashboard/new/page.tsx` line 688: `href="/dashboard/activity-hub/new"` → change to `href="/dashboard/activity-hub"`

## What Gets Preserved

Original files NOT touched (still needed):

- `loading.tsx` in each surface directory
- `error.tsx` in surfaces that don't have a `/new/error.tsx`
- All sub-route directories (e.g., `operations/bills/`, `operations/customers/`)
- `layout.tsx` at `dashboard/` level (shared by all)

---

## Task 1: Merge Dashboard Command Center → Mission Control

**Files:**

- Read: `apps/web/app/dashboard/new/page.tsx`
- Overwrite: `apps/web/app/dashboard/page.tsx`
- Move: `apps/web/app/dashboard/new/error.tsx` → `apps/web/app/dashboard/error.tsx`
- Delete: `apps/web/app/dashboard/new/` directory

**Steps:**

- [ ] Copy content from `dashboard/new/page.tsx`
- [ ] Overwrite `dashboard/page.tsx` with the copied content
- [ ] Copy `dashboard/new/error.tsx` to `dashboard/error.tsx`
- [ ] Fix internal link: change `/dashboard/activity-hub/new` to `/dashboard/activity-hub` in the file
- [ ] Delete `dashboard/new/` directory

---

## Task 2: Merge Activity Hub

**Files:**

- Read: `apps/web/app/dashboard/activity-hub/new/page.tsx`
- Overwrite: `apps/web/app/dashboard/activity-hub/page.tsx`
- Delete: `apps/web/app/dashboard/activity-hub/new/` directory

**Steps:**

- [ ] Copy content from `activity-hub/new/page.tsx`
- [ ] Overwrite `activity-hub/page.tsx` with the copied content
- [ ] Delete `activity-hub/new/` directory

---

## Task 3: Merge Financial Pulse

**Files:**

- Read: `apps/web/app/dashboard/financial-pulse/new/page.tsx`
- Overwrite: `apps/web/app/dashboard/financial-pulse/page.tsx`
- Move: `apps/web/app/dashboard/financial-pulse/new/error.tsx` → `apps/web/app/dashboard/financial-pulse/error.tsx`
- Delete: `apps/web/app/dashboard/financial-pulse/new/` directory

**Steps:**

- [ ] Copy content from `financial-pulse/new/page.tsx`
- [ ] Overwrite `financial-pulse/page.tsx` with the copied content
- [ ] Copy `financial-pulse/new/error.tsx` to `financial-pulse/error.tsx`
- [ ] Delete `financial-pulse/new/` directory

---

## Task 4: Merge Operations

**Files:**

- Read: `apps/web/app/dashboard/operations/new/page.tsx`
- Overwrite: `apps/web/app/dashboard/operations/page.tsx`
- Move: `apps/web/app/dashboard/operations/new/error.tsx` → `apps/web/app/dashboard/operations/error.tsx`
- Delete: `apps/web/app/dashboard/operations/new/` directory

**Steps:**

- [ ] Copy content from `operations/new/page.tsx`
- [ ] Overwrite `operations/page.tsx` with the copied content
- [ ] Copy `operations/new/error.tsx` to `operations/error.tsx`
- [ ] Delete `operations/new/` directory

---

## Task 5: Merge Ledger

**Files:**

- Read: `apps/web/app/dashboard/ledger/new/page.tsx`
- Overwrite: `apps/web/app/dashboard/ledger/page.tsx`
- Delete: `apps/web/app/dashboard/ledger/new/` directory

**Steps:**

- [ ] Copy content from `ledger/new/page.tsx`
- [ ] Overwrite `ledger/page.tsx` with the copied content
- [ ] Delete `ledger/new/` directory

---

## Task 6: Verify

**Steps:**

- [ ] Run `pnpm typecheck --filter=web` — must pass
- [ ] Confirm no remaining `/new` directories under `dashboard/`
- [ ] Confirm no remaining references to `/new` paths in codebase
- [ ] Commit: `chore: merge /new AI-native routes into production`
