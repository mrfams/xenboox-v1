---
name: create-api-route
description: Creates or modifies tRPC API endpoints in the Xenboox platform with proper Zod validation, entity scoping, audit trail, and error handling. Use when adding new API endpoints, modifying existing procedures, or troubleshooting tRPC routes.
license: MIT
metadata:
  author: xenboox
  category: api-infrastructure
---

## Prerequisites

- Read `AGENTS.md` for API conventions
- Read `ARCHITECTURE.md` for tRPC patterns
- Identify which domain the route belongs to (AP, AR, cash, etc.)

## Steps

### 1. Define Zod Input Schema

Every procedure MUST validate input with zod. No exceptions.

```typescript
import { z } from "zod";

// List/query schema
const listSchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  sortBy: z.enum(["createdAt", "amount", "date"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Create schema
const createSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    amount: z.number().positive("Amount must be positive"),
    currency: z.string().length(3).default("GMD"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    accountId: z.string().uuid(),
    description: z.string().max(1000).optional(),
    lines: z
      .array(
        z.object({
          accountId: z.string().uuid(),
          description: z.string().min(1),
          debit: z.number().min(0),
          credit: z.number().min(0),
        }),
      )
      .min(1, "At least one line item required"),
  })
  .refine(
    (data) => {
      const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
      return Math.abs(totalDebit - totalCredit) < 0.01;
    },
    { message: "Total debits must equal total credits" },
  );

// Update schema (partial)
const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255).optional(),
  status: z.enum(["draft", "active", "completed", "cancelled"]).optional(),
});
```

### 2. Create the Router File

```typescript
// packages/api/routers/{domain}.ts
import { router, protectedProcedure } from "../trpc"
import { entityScoped } from "../middleware/entity-scoping"
import { z } from "zod"
import { db } from "@xenboox/db"
import { eq, and, desc, like, sql } from "drizzle-orm"

export const {domain}Router = router({
  // ─── LIST ────────────────────────────────────
  list: protectedProcedure
    .use(entityScoped)
    .input(listSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(table.entityId, ctx.entityId)
      ]

      if (input.status) {
        conditions.push(eq(table.status, input.status))
      }
      if (input.search) {
        conditions.push(like(table.name, `%${input.search}%`))
      }

      const data = await db.query.table.findMany({
        where: and(...conditions),
        orderBy: input.sortOrder === "desc"
          ? desc(table[input.sortBy])
          : table[input.sortBy],
        limit: input.limit,
        offset: input.offset
      })

      const total = await db.select({ count: sql<number>`count(*)` })
        .from(table)
        .where(and(...conditions))

      return { data, total: total[0].count }
    }),

  // ─── GET BY ID ───────────────────────────────
  getById: protectedProcedure
    .use(entityScoped)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await db.query.table.findFirst({
        where: and(
          eq(table.id, input.id),
          eq(table.entityId, ctx.entityId)
        ),
        with: { lines: true }
      })

      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found"
        })
      }

      return item
    }),

  // ─── CREATE ──────────────────────────────────
  create: protectedProcedure
    .use(entityScoped)
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await db.transaction(async (tx) => {
        // 1. Create main record
        const item = await tx.insert(table).values({
          entityId: ctx.entityId,
          name: input.name,
          amount: input.amount.toString(),
          date: input.date,
          accountId: input.accountId,
          description: input.description
        }).returning()

        // 2. Create line items
        await tx.insert(tableLines).values(
          input.lines.map(line => ({
            itemId: item[0].id,
            accountId: line.accountId,
            description: line.description,
            debit: line.debit.toString(),
            credit: line.credit.toString()
          }))
        )

        // 3. Post journal entry via Ledger Agent
        await invokeLedgerAgent({
          entityId: ctx.entityId,
          action: "post_journal_entry",
          data: {
            description: `${input.name}`,
            reference: item[0].id,
            entries: input.lines.flatMap(l => [
              ...(l.debit > 0 ? [{
                accountId: l.accountId,
                debit: l.debit,
                credit: 0,
                description: l.description
              }] : []),
              ...(l.credit > 0 ? [{
                accountId: l.accountId,
                debit: 0,
                credit: l.credit,
                description: l.description
              }] : [])
            ])
          }
        })

        // 4. Audit trail
        await tx.insert(auditLog).values({
          entityId: ctx.entityId,
          userId: ctx.session.user.id,
          action: "{domain}.created",
          entityType: "{domain}",
          entityIdRef: item[0].id,
          changes: { after: input }
        })

        return item[0]
      })

      return result
    }),

  // ─── UPDATE ──────────────────────────────────
  update: protectedProcedure
    .use(entityScoped)
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input

      // Verify ownership
      const existing = await db.query.table.findFirst({
        where: and(
          eq(table.id, id),
          eq(table.entityId, ctx.entityId)
        )
      })

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Item not found"
        })
      }

      return db.update(table)
        .set(updates)
        .where(and(
          eq(table.id, id),
          eq(table.entityId, ctx.entityId)
        ))
    }),

  // ─── DELETE (soft delete) ────────────────────
  delete: protectedProcedure
    .use(entityScoped)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return db.update(table)
        .set({ status: "voided" })
        .where(and(
          eq(table.id, input.id),
          eq(table.entityId, ctx.entityId)
        ))
    })
})
```

### 3. Register in App Router

```typescript
// packages/api/routers/_app.ts
import { {domain}Router } from "./{domain}"

export const appRouter = router({
  // ... existing
  {domain}: {domain}Router
})

export type AppRouter = typeof appRouter
```

### 4. Use in Frontend

```typescript
// apps/web/hooks/use-{domain}.ts
import { trpc } from "@/lib/trpc/client"

export function useModuleList(filters?: { status?: string }) {
  const { entityId } = useEntity()

  return trpc.{domain}.list.useQuery({
    entityId,
    ...filters
  })
}

export function useCreateItem() {
  const utils = trpc.useUtils()
  const { entityId } = useEntity()

  return trpc.{domain}.create.useMutation({
    onSuccess: () => {
      utils.{domain}.list.invalidate({ entityId })
    }
  })
}
```

## Code Patterns

### ProtectedProcedure with Entity Scoping

```typescript
// ALWAYS use this pattern
const protectedProcedure = t.procedure.use(authMiddleware).use(entityScoped);

// The ctx will have:
// ctx.session — user session
// ctx.entityId — current entity (scoped)
// ctx.entityRole — user's role in this entity
```

### Error Handling

```typescript
import { TRPCError } from "@trpc/server";

// Not found
throw new TRPCError({
  code: "NOT_FOUND",
  message: "Invoice not found",
});

// Forbidden (cross-entity access attempt)
throw new TRPCError({
  code: "FORBIDDEN",
  message: "You do not have access to this entity",
});

// Bad input
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Total debits must equal total credits",
});
```

### Pagination Pattern

```typescript
// Cursor-based pagination for large datasets
const data = await db.query.table.findMany({
  where: and(...conditions),
  orderBy: desc(table.createdAt),
  limit: input.limit + 1, // fetch one extra to detect "has more"
  offset: input.offset,
});

const hasMore = data.length > input.limit;
const items = hasMore ? data.slice(0, -1) : data;

return {
  items,
  hasMore,
  nextOffset: hasMore ? input.offset + input.limit : null,
};
```

## Common Pitfalls

1. **Missing entity scoping** — Every query MUST filter by `ctx.entityId`.
2. **No input validation** — Every procedure MUST use zod.
3. **Hardcoded user ID** — Always use `ctx.session.user.id`.
4. **No audit trail** — Every mutation MUST log to `audit_log`.
5. **Direct DB access from frontend** — Always go through tRPC.
6. **Forgetting to register router** — Add to `_app.ts`.
7. **Not invalidating cache** — Use `trpc.useUtils()` to invalidate after mutations.

## Verification

1. `pnpm typecheck` — passes
2. `pnpm lint` — passes
3. Test with auth: request succeeds with valid session
4. Test without auth: returns 401
5. Test cross-entity: returns empty/403
6. Test validation: invalid input returns descriptive error
7. Verify audit log entries on mutations
