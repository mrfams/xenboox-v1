# Skill: Create Module
> Use this when building a new accounting module (payroll, invoicing, assets, budget, etc.) in Xenboox.

## Prerequisites

- Read `AGENTS.md` for project conventions
- Read `DATABASE.md` for schema patterns
- Read `ARCHITECTURE.md` for API and component patterns
- Determine which MVP phase this module belongs to

## Steps

### 1. Define the Module Schema

Create the Drizzle schema file in `packages/db/schema/`:

```typescript
// packages/db/schema/{module-name}.ts
import { pgTable, uuid, text, numeric, boolean, timestamp, pgEnum } from "drizzle-orm/pg-core"
import { entityId, timestamps, uuidId } from "./helpers"

// Status enum — never use raw strings
export const moduleStatusEnum = pgEnum("module_status", [
  "draft", "active", "completed", "cancelled"
])

// Main table
export const moduleItems = pgTable("module_items", {
  id: uuidId(),
  entityId: entityId,                          // REQUIRED — entity scoping
  name: text("name").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: moduleStatusEnum("status").notNull().default("draft"),
  // ... domain-specific columns
  ...timestamps                               // created_at, updated_at
})

// Line items (detail table)
export const moduleItemLines = pgTable("module_item_lines", {
  id: uuidId(),
  moduleId: uuid("module_id").notNull().references(() => moduleItems.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => chartOfAccounts.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  ...timestamps
})
```

### 2. Create the tRPC Router

```typescript
// packages/api/routers/{module-name}.ts
import { router, protectedProcedure } from "../trpc"
import { entityScoped } from "../middleware/entity-scoping"
import { z } from "zod"

export const moduleRouter = router({
  list: protectedProcedure
    .use(entityScoped)
    .input(z.object({
      status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0)
    }))
    .query(async ({ ctx, input }) => {
      return db.query.moduleItems.findMany({
        where: and(
          eq(moduleItems.entityId, ctx.entityId),
          input.status ? eq(moduleItems.status, input.status) : undefined
        ),
        orderBy: desc(moduleItems.createdAt),
        limit: input.limit,
        offset: input.offset,
        with: { moduleItemLines: true }
      })
    }),

  getById: protectedProcedure
    .use(entityScoped)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.moduleItems.findFirst({
        where: and(
          eq(moduleItems.id, input.id),
          eq(moduleItems.entityId, ctx.entityId)  // Entity scoping
        ),
        with: { moduleItemLines: true }
      })
    }),

  create: protectedProcedure
    .use(entityScoped)
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      amount: z.number().positive(),
      lines: z.array(z.object({
        accountId: z.string().uuid(),
        description: z.string().min(1),
        amount: z.number().positive()
      })).min(1)
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await db.transaction(async (tx) => {
        const item = await tx.insert(moduleItems).values({
          entityId: ctx.entityId,
          name: input.name,
          description: input.description,
          amount: input.amount.toString()
        }).returning()

        const lines = await tx.insert(moduleItemLines).values(
          input.lines.map(line => ({
            moduleId: item[0].id,
            accountId: line.accountId,
            description: line.description,
            amount: line.amount.toString()
          }))
        ).returning()

        // Audit trail
        await tx.insert(auditLog).values({
          entityId: ctx.entityId,
          userId: ctx.session.user.id,
          action: "module_item.created",
          entityType: "module_item",
          entityIdRef: item[0].id,
          changes: { after: { ...input } }
        })

        return { item: item[0], lines }
      })

      return result
    }),

  update: protectedProcedure
    .use(entityScoped)
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      status: z.enum(["draft", "active", "completed", "cancelled"]).optional()
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input
      return db.update(moduleItems)
        .set(updates)
        .where(and(
          eq(moduleItems.id, id),
          eq(moduleItems.entityId, ctx.entityId)
        ))
    })
})
```

### 3. Register the Router

```typescript
// packages/api/routers/_app.ts
import { moduleRouter } from "./{module-name}"

export const appRouter = router({
  // ... existing routers
  module: moduleRouter
})

export type AppRouter = typeof appRouter
```

### 4. Create the Frontend Components

```typescript
// apps/web/components/{module-name}/module-list.tsx
"use client"

import { trpc } from "@/lib/trpc/client"
import { useEntity } from "@/hooks/use-entity"

export function ModuleList() {
  const { entityId } = useEntity()
  const { data: items, isLoading } = trpc.module.list.useQuery({
    entityId
  })

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

### 5. Create the Page Route

```typescript
// apps/web/app/(dashboard)/{module-name}/page.tsx
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

### 6. Create Agent Tools (if agent-owned module)

If this module has a dedicated agent, add tools to `packages/agents/tier3/{agent-name}/tools.ts`:

```typescript
export const createModuleItem = tool(
  async ({ entityId, name, amount, lines }) => {
    // Validate
    if (amount <= 0) return { success: false, error: "Amount must be positive" }

    // Create in database
    const item = await db.insert(moduleItems).values({
      entityId,
      name,
      amount: amount.toString(),
      status: "active"
    }).returning()

    // Post journal entry via Ledger Agent
    await invokeLedgerAgent({
      entityId,
      action: "post_journal_entry",
      data: {
        description: `Module item: ${name}`,
        entries: lines.map(l => ({
          accountId: l.accountId,
          debit: l.type === "debit" ? l.amount : 0,
          credit: l.type === "credit" ? l.amount : 0
        }))
      }
    })

    return { success: true, itemId: item[0].id, confidence: 0.95 }
  },
  { /* tool metadata */ }
)
```

## Code Patterns

### Helper Column Builders

```typescript
// packages/db/schema/helpers.ts
import { uuid, timestamp } from "drizzle-orm/pg-core"

export const uuidId = () => uuid("id").primaryKey().defaultRandom()
export const entityId = uuid("entity_id").notNull().references(/* ... */)
export const timestamps = {
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow()
}
```

### Status Enums

```typescript
// Always use pgEnum, never raw strings
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft", "sent", "viewed", "paid", "overdue", "voided"
])
```

### Zod Input Validation

```typescript
// Every procedure validates input with zod
const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  amount: z.number().positive("Amount must be positive"),
  date: z.string().datetime(),
  lines: z.array(z.object({
    accountId: z.string().uuid(),
    amount: z.number().positive()
  })).min(1, "At least one line required")
})
```

## Common Pitfalls

1. **Missing entityId** — Every table and query MUST have entity scoping.
2. **Raw string statuses** — Always use `pgEnum`. Never use `text` for status fields.
3. **No audit trail** — Every mutation must log to `audit_log`.
4. **No zod validation** — Every procedure input must be validated.
5. **Missing cascade deletes** — Line items must cascade delete when parent is deleted.
6. **Forgetting `createdAt`/`updatedAt`** — Use the `timestamps` helper.
7. **Not registering the router** — Add to `_app.ts` after creating.

## Verification

1. `pnpm typecheck` — passes
2. `pnpm lint` — passes
3. `pnpm db:generate` — migration generated successfully
4. Test CRUD: create, read, update, list all work with entity scoping
5. Test unauthorized: request without auth returns 401
6. Test cross-entity: request for wrong entity returns empty/403
7. Verify audit log entries are created on mutations
