---
name: create-module
description: Scaffolds a complete new accounting module in Xenboox including database schema, tRPC router, frontend components, page route, and agent tools. Loops through scaffold → typecheck → fix → test → verify for each layer.
license: MIT
metadata:
  author: xenboox
  category: module-scaffolding
  version: 2.0.0
  workflow: loop
---

# Create Module — Loop Mode (Scaffold → Typecheck → Test → Verify)

> **Reference:** `.agents/skills/OPERATING_STANDARD.md` — This skill follows the core operating standard for all employees.

## Role

You are a **Module Builder** at Xenboox. You don't just scaffold files and declare done. You scaffold each layer, typecheck it, fix errors, test it, verify it works, and only move to the next layer when the current one is solid. Each layer must pass its gate before you build the next.

**Workflow Mode:** LOOP (Prompt Chaining with gates per layer)

- **Layer 1: Schema** — scaffold → generate migration → verify
- **Layer 2: Router** — scaffold → typecheck → fix → verify entity scoping
- **Layer 3: Frontend** — scaffold → typecheck → fix → verify rendering
- **Layer 4: Page** — scaffold → typecheck → fix → verify navigation
- **Layer 5: Agent Tools** (optional) — scaffold → typecheck → verify
- **Layer 6: Integration** — full typecheck → full test → quality gate

**Non-negotiable rules:**

1. Each layer must typecheck before building the next
2. Entity scoping is verified on every query and mutation
3. Audit trail is verified on every mutation
4. Full typecheck passes before declaring done
5. You report progress — "Layer 3/6: Frontend (typecheck passed, 0 errors)"

---

## Execution Graph

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ LAYER 1  │───▶│ LAYER 2  │───▶│ LAYER 3  │───▶│ LAYER 4  │───▶│ LAYER 5  │
│ Schema   │    │ Router   │    │ Frontend │    │ Page     │    │ Agent    │
│          │    │          │    │          │    │          │    │ Tools    │
│ GATE:    │    │ GATE:    │    │ GATE:    │    │ GATE:    │    │ GATE:    │
│ migrate  │    │ typecheck│    │ typecheck│    │ typecheck│    │ typecheck│
│ works    │    │ + entity │    │ + renders│    │ + routes │    │ + entity │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
      │               │               │               │               │
      └───────────────┴───────────────┴───────────────┴───────────────┘
                                  │
                          ┌───────▼───────┐
                          │ LAYER 6       │
                          │ Integration   │
                          │ Full check    │
                          │ Full test     │
                          │ Quality gate  │
                          └───────────────┘
```

---

## Phase 0: Plan — Define the Module

Before scaffolding anything, define what you're building:

### Module Definition

```markdown
## Module: [module-name]

**Purpose:** [What does this module do?]
**Entity:** [Which entity type does it belong to?]
**Agent:** [Which agent owns it? (if any)]
**Phase:** [Which MVP phase?]
**Surface:** [Which of the 5 surfaces does this belong to?]

### Tables

- [table_name]: [purpose]
- [table_name_lines]: [purpose] "detail/line items"

### API Procedures

- list: [what it returns]
- getById: [what it returns]
- create: [what it creates]
- update: [what it updates]
- delete: [if applicable]

### Pages

- /dashboard/[module-name]: [list view]
- /dashboard/[module-name]/[id]: [detail view] (if needed)

### Agent Tools (if applicable)

- [tool_name]: [what it does]

### AI-Native Patterns

- [ ] Does this module use AI-native patterns? (confidence indicators, decision cards, narrative flow)
- [ ] Which surface does this belong to? (Command Center, Activity Hub, Financial Pulse, Ledger, Operations)
- [ ] Does this require human-in-the-loop approval?
- [ ] Does AI handle the work, or is this manual?
```

### Work Queue

```
MODULE QUEUE:
┌────┬──────────────────────────┬──────────┬──────────┐
│ #  │ Layer                    │ Status   │ Gate     │
├────┼──────────────────────────┼──────────┼──────────┤
│ 1  │ Schema (Drizzle)         │ ⬜       │ migrate  │
│ 2  │ Router (tRPC)            │ ⬜       │ typecheck│
│ 3  │ Frontend components      │ ⬜       │ typecheck│
│ 4  │ Page route               │ ⬜       │ typecheck│
│ 5  │ Agent tools (optional)   │ ⬜       │ typecheck│
│ 6  │ Integration test         │ ⬜       │ all pass │
└────┴──────────────────────────┴──────────┴──────────┘

MODULE: [name] | 0/6 layers complete
```

---

## Layer 1: Schema

### Step 1: Create Schema File

Create `packages/db/schema/{module-name}.ts`:

```typescript
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { entityId, timestamps, uuidId } from "./helpers";

// Status enum — never use raw strings
export const moduleStatusEnum = pgEnum("module_status", [
  "draft",
  "active",
  "completed",
  "cancelled",
]);

// Main table
export const moduleItems = pgTable("module_items", {
  id: uuidId(),
  entityId: entityId, // REQUIRED — entity scoping
  name: text("name").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: moduleStatusEnum("status").notNull().default("draft"),
  ...timestamps,
});

// Line items (detail table)
export const moduleItemLines = pgTable("module_item_lines", {
  id: uuidId(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => moduleItems.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => chartOfAccounts.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  ...timestamps,
});
```

### Step 2: Schema Quality Gate

```
□ Every table has `id` (uuid), `createdAt`, `updatedAt`?
□ Every table has `entityId`?
□ Status fields use `pgEnum`, not `text`?
□ Foreign keys have `onDelete` specified?
□ Line items cascade delete on parent?
□ Numeric fields use precision/scale for money?
```

### Step 3: Generate Migration

```bash
pnpm db:generate
```

- [ ] Migration generated successfully
- [ ] Migration SQL looks correct (no drops, no data loss)
- [ ] No errors in generation

**Gate:** Migration generates cleanly before moving to Router.

---

## Layer 2: Router

### Step 1: Create Router File

Create `apps/web/server/routers/{module-name}.ts`:

```typescript
import { router, protectedProcedure } from "../trpc";
import { entityScoped } from "../middleware/entity-scoping";
import { z } from "zod";

export const moduleRouter = router({
  list: protectedProcedure
    .use(entityScoped)
    .input(
      z.object({
        status: z
          .enum(["draft", "active", "completed", "cancelled"])
          .optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      return db.query.moduleItems.findMany({
        where: and(
          eq(moduleItems.entityId, ctx.entityId),
          input.status ? eq(moduleItems.status, input.status) : undefined,
        ),
        orderBy: desc(moduleItems.createdAt),
        limit: input.limit,
        offset: input.offset,
        with: { moduleItemLines: true },
      });
    }),

  getById: protectedProcedure
    .use(entityScoped)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.moduleItems.findFirst({
        where: and(
          eq(moduleItems.id, input.id),
          eq(moduleItems.entityId, ctx.entityId),
        ),
        with: { moduleItemLines: true },
      });
    }),

  create: protectedProcedure
    .use(entityScoped)
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        amount: z.number().positive(),
        lines: z
          .array(
            z.object({
              accountId: z.string().uuid(),
              description: z.string().min(1),
              amount: z.number().positive(),
            }),
          )
          .min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await db.transaction(async (tx) => {
        const item = await tx
          .insert(moduleItems)
          .values({
            entityId: ctx.entityId,
            name: input.name,
            description: input.description,
            amount: input.amount.toString(),
          })
          .returning();

        const lines = await tx
          .insert(moduleItemLines)
          .values(
            input.lines.map((line) => ({
              moduleId: item[0].id,
              accountId: line.accountId,
              description: line.description,
              amount: line.amount.toString(),
            })),
          )
          .returning();

        // Audit trail
        await tx.insert(auditLog).values({
          entityId: ctx.entityId,
          userId: ctx.session.user.id,
          action: "module_item.created",
          entityType: "module_item",
          entityIdRef: item[0].id,
          changes: { after: { ...input } },
        });

        return { item: item[0], lines };
      });
      return result;
    }),

  update: protectedProcedure
    .use(entityScoped)
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        status: z
          .enum(["draft", "active", "completed", "cancelled"])
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      return db
        .update(moduleItems)
        .set(updates)
        .where(
          and(eq(moduleItems.id, id), eq(moduleItems.entityId, ctx.entityId)),
        );
    }),
});
```

### Step 2: Register Router

```typescript
// apps/web/server/routers/_app.ts
import { moduleRouter } from "./{module-name}";

export const appRouter = router({
  // ... existing routers
  module: moduleRouter,
});
```

### Step 3: Router Quality Gate

```bash
pnpm typecheck --filter=web
```

```
□ Typecheck passes (0 errors in new files)?
□ Every procedure uses `protectedProcedure`?
□ Every procedure uses `entityScoped` middleware?
□ Every query filters by `ctx.entityId`?
□ Every mutation creates audit trail entry?
□ Input validated with zod on every procedure?
□ Transactions used for multi-table writes?
```

**Gate:** Typecheck passes + entity scoping verified before moving to Frontend.

---

## Layer 3: Frontend Components

### Step 1: Create Components

Create component files in `apps/web/components/{module-name}/`:

```typescript
// module-list.tsx
"use client"
import { trpc } from "@/lib/trpc/client"
import { useEntity } from "@/hooks/use-entity"

export function ModuleList() {
  const { entityId } = useEntity()
  const { data: items, isLoading } = trpc.module.list.useQuery({ entityId })

  if (isLoading) return <ModuleListSkeleton />

  return (
    <div className="space-y-4">
      {items?.map(item => (
        <ModuleCard key={item.id} item={item} />
      ))}
    </div>
  )
}
```

### Step 2: Frontend Quality Gate

```bash
pnpm typecheck --filter=web
```

```
□ Typecheck passes (0 errors in new files)?
□ Components use `"use client"` directive?
□ Components use tRPC hooks for data fetching?
□ Components use `useEntity()` for entity context?
□ Loading states included (skeleton)?
□ Empty states included?
□ Error states included?
```

**Gate:** Typecheck passes before moving to Page.

---

## Layer 4: Page Route

### Step 1: Create Page

```typescript
// apps/web/app/dashboard/{module-name}/page.tsx
import { ModuleList } from "@/components/{module-name}/module-list"

export default function ModulePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Module Name</h1>
      <ModuleList />
    </div>
  )
}
```

### Step 2: Add to Sidebar Navigation

```typescript
// apps/web/components/layout/sidebar.tsx
// Add to the appropriate section
{
  label: "Module Name",
  href: "/dashboard/{module-name}",
  icon: ModuleIcon,
}
```

### Step 3: Page Quality Gate

```bash
pnpm typecheck --filter=web
```

```
□ Typecheck passes?
□ Page route exists and is accessible?
□ Sidebar navigation includes new page?
□ Page renders without errors?
```

**Gate:** Typecheck passes before moving to Agent Tools.

---

## Layer 5: Agent Tools (Optional)

Only if this module has a dedicated agent.

### Step 1: Create Agent Tools

```typescript
// packages/agents/tier3/{agent-name}/tools.ts
export const createModuleItem = tool(
  async ({ entityId, name, amount, lines }) => {
    if (amount <= 0)
      return { success: false, error: "Amount must be positive" };

    const item = await db
      .insert(moduleItems)
      .values({
        entityId,
        name,
        amount: amount.toString(),
        status: "active",
      })
      .returning();

    await invokeLedgerAgent({
      entityId,
      action: "post_journal_entry",
      data: {
        description: `Module item: ${name}`,
        entries: lines.map((l) => ({
          accountId: l.accountId,
          debit: l.type === "debit" ? l.amount : 0,
          credit: l.type === "credit" ? l.amount : 0,
        })),
      },
    });

    return { success: true, itemId: item[0].id, confidence: 0.95 };
  },
  {/* tool metadata */},
);
```

### Step 2: Agent Tool Quality Gate

```bash
pnpm typecheck --filter=agents
```

```
□ Typecheck passes?
□ Tool accepts entityId as first parameter?
□ All DB queries scoped to entityId?
□ Tool returns structured result with confidence?
□ Tool logs to audit trail?
```

---

## Layer 6: Integration — Final Verification

### Step 1: Full Typecheck

```bash
pnpm typecheck
```

- [ ] 0 errors across all packages

### Step 2: Full Lint

```bash
pnpm lint
```

- [ ] 0 lint errors in new files

### Step 3: Generate Migration (final)

```bash
pnpm db:generate
```

- [ ] Migration generates cleanly
- [ ] Migration SQL is correct

### Step 4: Test CRUD

Manually verify or write tests for:

- [ ] **Create:** Create a record via tRPC → record exists in DB with correct entityId
- [ ] **Read:** List records → only returns records for current entity
- [ ] **Read:** Get by ID → returns record with correct entity scoping
- [ ] **Update:** Update a record → changes persist, audit trail created
- [ ] **Delete:** Delete a record → soft/hard delete works, cascade works

### Step 5: Test Security

- [ ] **Unauthorized:** Request without auth returns 401
- [ ] **Cross-entity:** Request for wrong entity returns empty/403
- [ ] **Input validation:** Invalid input rejected with clear error

### Step 6: Test Audit Trail

- [ ] Create mutation → audit log entry exists
- [ ] Update mutation → audit log entry exists
- [ ] Audit entry includes: userId, action, entityType, entityIdRef, changes

### Integration Quality Gate

```
□ pnpm typecheck: 0 errors?
□ pnpm lint: 0 errors in new files?
□ pnpm db:generate: migration clean?
□ CRUD works with entity scoping?
□ Unauthorized returns 401?
□ Cross-entity returns empty/403?
□ Audit trail on all mutations?
```

### AI-Native Quality Gate

```
□ AI-native patterns present? (confidence indicators, decision cards, narrative flow)
□ Module belongs to correct surface? (Command Center, Activity Hub, Financial Pulse, Ledger, Operations)
□ Human-in-the-loop approval present where needed?
□ AI handles the work, not manual workflows?
□ No SaaS anti-patterns? (complex nav, multi-step forms, dashboard overload)
□ Loading states show agent thinking?
□ Error states explain what went wrong and next steps?
□ Empty states suggest what to do next?
```

---

## Progress Reporting

### During Build

```
MODULE BUILD: Expenses
Layer: 3/6 — Frontend Components

├── Layer 1 (Schema):     ✅ — migration generated, 2 tables
├── Layer 2 (Router):     ✅ — typecheck passed, 5 procedures
├── Layer 3 (Frontend):   🔄 — typecheck: 2 errors, fixing...
│   Error 1: Missing import for useEntity (line 5)
│   Error 2: Wrong type for item.status (line 23)
├── Layer 4 (Page):       ⬜ pending
├── Layer 5 (Agent):      ⬜ pending
└── Layer 6 (Integration): ⬜ pending

Typecheck: 2 errors (fixing)
```

### Final Report

```markdown
## Module: [Name]

### Status: ✅ COMPLETE

### Layers Built

| #   | Layer       | Files                         | Typecheck | Gate                       |
| --- | ----------- | ----------------------------- | --------- | -------------------------- |
| 1   | Schema      | schema/{name}.ts              | ✅        | ✅ Migration generated     |
| 2   | Router      | routers/{name}.ts             | ✅        | ✅ Entity scoping verified |
| 3   | Frontend    | components/{name}/*.tsx       | ✅        | ✅ Loading/empty states    |
| 4   | Page        | app/dashboard/{name}/page.tsx | ✅        | ✅ Sidebar added           |
| 5   | Agent       | agents/tier3/{agent}/tools.ts | ✅        | ✅ Confidence scoring      |
| 6   | Integration | —                             | ✅        | ✅ All checks pass         |

### Files Created/Modified

- packages/db/schema/{name}.ts (created)
- packages/db/migrations/XXXX.sql (generated)
- apps/web/server/routers/{name}.ts (created)
- apps/web/server/routers/_app.ts (modified)
- apps/web/components/{name}/*.tsx (created)
- apps/web/app/dashboard/{name}/page.tsx (created)
- apps/web/components/layout/sidebar.tsx (modified)
- packages/agents/tier3/{agent}/tools.ts (modified)

### Verification

- pnpm typecheck: ✅ 0 errors
- pnpm lint: ✅ 0 errors
- Entity scoping: ✅ All queries scoped
- Audit trail: ✅ All mutations logged
- CRUD: ✅ Create, read, update, list work
- Security: ✅ 401 on unauthorized, 403 on cross-entity
```

---

## Code Patterns

### Helper Column Builders

```typescript
export const uuidId = () => uuid("id").primaryKey().defaultRandom();
export const entityId = uuid("entity_id").notNull().references(/* ... */);
export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
};
```

### Status Enums

```typescript
// Always use pgEnum, never raw strings
export const moduleStatusEnum = pgEnum("module_status", [
  "draft",
  "active",
  "completed",
  "cancelled",
]);
```

### Zod Input Validation

```typescript
const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().datetime(),
  lines: z
    .array(
      z.object({
        accountId: z.string().uuid(),
        amount: z.number().positive(),
      }),
    )
    .min(1, "At least one line required"),
});
```

---

## Common Pitfalls

1. **Missing entityId** — Every table and query MUST have entity scoping
2. **Raw string statuses** — Always use `pgEnum`, never `text`
3. **No audit trail** — Every mutation must log to `audit_log`
4. **No zod validation** — Every procedure input must be validated
5. **Missing cascade deletes** — Line items must cascade on parent delete
6. **Forgetting timestamps** — Use the `timestamps` helper
7. **Not registering router** — Add to `_app.ts` after creating
8. **Typecheck after each layer** — Don't build all layers then discover 50 errors
9. **Missing loading/empty states** — Frontend must handle loading and empty
10. **SaaS anti-patterns** — Don't build complex navigation, multi-step forms, or manual workflows
11. **Missing AI-native patterns** — Add confidence indicators, decision cards, narrative flow where appropriate

---

## Failure Recovery

### Typecheck errors after scaffolding

1. Read the error message carefully
2. Fix import paths (most common issue)
3. Fix type mismatches (check schema vs router types)
4. Re-run typecheck after each fix
5. Max 5 fix attempts per layer before escalating

### Migration generation fails

1. Check schema for syntax errors
2. Check references point to existing tables
3. Check enum definitions are valid
4. Fix and re-run `pnpm db:generate`

### Entity scoping verification fails

1. Check every query has `eq(table.entityId, ctx.entityId)`
2. Check `entityId` comes from session, not user input
3. Check cross-entity queries return empty

### Budget Guard

- Max **5 typecheck fix attempts** per layer
- Max **2 full passes** on integration gate
- If budget exceeded: report progress, list remaining layers

---

## AI-Native Module Design

Since Xenboox is AI-native, every module must follow the AI-native design standard.

### AI-Native Module Principles

1. **AI handles the work** — Module should use AI agents for data entry, categorization, reconciliation
2. **Human makes decisions** — Module surfaces decisions via Activity Hub, not manual forms
3. **Confidence-driven** — All AI outputs carry calibrated confidence scores
4. **Proactive** — Module surfaces what needs attention, not waiting for user to navigate
5. **5-Surface model** — Module output appears on the right surface (Command Center, Activity Hub, Financial Pulse, Ledger, Operations)

### AI-Native Module Checklist

When scaffolding a new module:

```
AI-NATIVE MODULE CHECK:
□ Does this module use AI agents for work (not manual user forms)?
□ Does this module surface decisions via Activity Hub (not SaaS-style pages)?
□ Does this module have confidence indicators on AI outputs?
□ Does this module explain what AI is doing (narrative flow)?
□ Does this module avoid SaaS anti-patterns (complex nav, multi-step forms)?
□ Does this module fit the 5-surface model?
□ Does this module use decision cards for human-in-the-loop?
□ Does this module have proactive alerts (not just data display)?
```

### AI-Native Module Patterns

| Pattern                   | Implementation                                  | Layer       |
| ------------------------- | ----------------------------------------------- | ----------- |
| **Confidence Indicators** | Visual confidence on all AI outputs             | Frontend    |
| **Decision Cards**        | Approve/reject UI for human decisions           | Frontend    |
| **Narrative Flow**        | AI explains what it did and why                 | Frontend    |
| **Agent Tools**           | LangGraph tools for the module's domain         | Agent Tools |
| **Audit Trail**           | Every mutation logged with who, what, when, why | Router      |
| **Entity Scoping**        | Every query scoped to entityId                  | All layers  |
| **Proactive Alerts**      | AI surfaces anomalies and opportunities         | Frontend    |
| **Confidence Scoring**    | Agent outputs carry calibrated confidence       | Agent Tools |

### Evidence-Based Completion

```
EVIDENCE PACKAGE:
├── Module: [name]
├── Layers: [6/6 complete]
├── Schema: [generated, entity-scoped]
├── Router: [typecheck passed, entity scoping verified]
├── Frontend: [renders, AI-native patterns present]
├── Page: [navigable, fits 5-surface model]
├── Agent tools: [if applicable, typecheck passed]
├── Integration: [full typecheck pass]
└── AI-native gate: [PASS]
```
