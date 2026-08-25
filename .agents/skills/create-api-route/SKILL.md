---
name: create-api-route
description: Creates or modifies tRPC API endpoints in the Xenboox platform with proper Zod validation, entity scoping, audit trail, and error handling. Loops through create → validate → typecheck → test for each procedure.
license: MIT
metadata:
  author: xenboox
  category: api-infrastructure
  version: 2.0.0
  workflow: loop
---

# Create API Route — Loop Mode (Create → Validate → Typecheck → Test)

> **Reference:** `.agents/skills/OPERATING_STANDARD.md` — This skill follows the core operating standard for all employees.

## Role

You are an **API Builder** at Xenboox. You don't just scaffold procedures and declare done. You create each procedure, validate input with zod, typecheck, verify entity scoping, test CRUD, and only move to the next procedure when the current one is solid.

**Workflow Mode:** LOOP (per procedure)

- **Create:** Scaffold procedure with zod schema
- **Typecheck:** Verify types align
- **Verify:** Entity scoping, audit trail, error handling
- **Test:** CRUD + auth + validation
- **Loop:** Until all procedures pass

**Non-negotiable rules:**

1. Every procedure uses `protectedProcedure` with `entityScoped`
2. Every input validated with zod (no raw strings)
3. Every mutation creates audit trail entry
4. Every query filters by `ctx.entityId`
5. Full typecheck passes before declaring done

---

## Execution Graph

```
┌─────────────────────────────────────────────────────┐
│                  PROCEDURE LOOP                     │
│                                                     │
│  For each procedure (list, getById, create, update): │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│    │ CREATE   │───▶│ TYPECHECK│───▶│ VERIFY   │    │
│    │ Scaffold │    │ Fix type │    │ Entity   │    │
│    │ + zod    │    │ errors   │    │ scoping  │    │
│    └──────────┘    └──────────┘    │ Audit    │    │
│                                    │ Error    │    │
│                                    └──────────┘    │
│                                                     │
│  After all procedures:                              │
│    ┌──────────┐    ┌──────────┐    ┌──────────┐    │
│    │ REGISTER │───▶│ FULL     │───▶│ TEST     │    │
│    │ Router   │    │ TYPECHECK│    │ CRUD     │    │
│    │ + _app   │    │          │    │ + auth   │    │
│    └──────────┘    └──────────┘    └──────────┘    │
└─────────────────────────────────────────────────────┘
```

---

## Phase 0: Plan — Define the Router

Before scaffolding, define what you're building:

### Router Definition

```markdown
## Router: [domain]Router

**Domain:** [Which accounting domain?]
**Table:** [Which DB table?]
**Procedures:**

- list: [what it returns, filters]
- getById: [what it returns]
- create: [what it creates, journal entry?]
- update: [what it updates]
- delete: [soft delete?]

**Zod schemas:**

- listSchema: status, search, limit, offset, sortBy, sortOrder
- createSchema: name, amount, date, lines (with debit=credit validation)
- updateSchema: id + optional fields
```

### Work Queue

```
PROCEDURE QUEUE:
┌────┬────────────┬──────────┬──────────┬──────────┐
│ #  │ Procedure  │ Type     │ Status   │ Gate     │
├────┼────────────┼──────────┼──────────┼──────────┤
│ 1  │ list       │ query    │ ⬜       │ entity   │
│ 2  │ getById    │ query    │ ⬜       │ entity   │
│ 3  │ create     │ mutation │ ⬜       │ audit    │
│ 4  │ update     │ mutation │ ⬜       │ audit    │
│ 5  │ delete     │ mutation │ ⬜       │ audit    │
└────┴────────────┴──────────┴──────────┴──────────┘

ROUTER: [domain] | 0/5 procedures
```

---

## The Procedure Loop

For EVERY procedure in the queue:

### Step 1: Define Zod Schema

```typescript
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
    currency: z.string().length(3).default("USD"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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

### Step 2: Create Procedure

```typescript
// In router file
export const {domain}Router = router({
  list: protectedProcedure
    .use(entityScoped)
    .input(listSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(table.entityId, ctx.entityId)];

      if (input.status) conditions.push(eq(table.status, input.status));
      if (input.search) conditions.push(like(table.name, `%${input.search}%`));

      const data = await db.query.table.findMany({
        where: and(...conditions),
        orderBy: input.sortOrder === "desc"
          ? desc(table[input.sortBy])
          : table[input.sortBy],
        limit: input.limit,
        offset: input.offset,
      });

      const total = await db.select({ count: sql<number>`count(*)` })
        .from(table)
        .where(and(...conditions));

      return { data, total: total[0].count };
    }),

  getById: protectedProcedure
    .use(entityScoped)
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const item = await db.query.table.findFirst({
        where: and(eq(table.id, input.id), eq(table.entityId, ctx.entityId)),
        with: { lines: true },
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      return item;
    }),

  create: protectedProcedure
    .use(entityScoped)
    .input(createSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await db.transaction(async (tx) => {
        const item = await tx.insert(table).values({
          entityId: ctx.entityId,
          name: input.name,
          amount: input.amount.toString(),
          date: input.date,
          accountId: input.accountId,
          description: input.description,
        }).returning();

        await tx.insert(tableLines).values(
          input.lines.map(line => ({
            itemId: item[0].id,
            accountId: line.accountId,
            description: line.description,
            debit: line.debit.toString(),
            credit: line.credit.toString(),
          }))
        );

        // Audit trail
        await tx.insert(auditLog).values({
          entityId: ctx.entityId,
          userId: ctx.session.user.id,
          action: "{domain}.created",
          entityType: "{domain}",
          entityIdRef: item[0].id,
          changes: { after: input },
        });

        return item[0];
      });
      return result;
    }),

  update: protectedProcedure
    .use(entityScoped)
    .input(updateSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const existing = await db.query.table.findFirst({
        where: and(eq(table.id, id), eq(table.entityId, ctx.entityId)),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });

      return db.update(table)
        .set(updates)
        .where(and(eq(table.id, id), eq(table.entityId, ctx.entityId)));
    }),

  delete: protectedProcedure
    .use(entityScoped)
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return db.update(table)
        .set({ status: "voided" })
        .where(and(eq(table.id, input.id), eq(table.entityId, ctx.entityId)));
    }),
});
```

### Step 3: Procedure Quality Gate (per procedure)

```
□ Uses protectedProcedure?
□ Uses entityScoped middleware?
□ Input validated with zod?
□ Query filters by ctx.entityId?
□ Mutation creates audit trail entry?
□ Multi-table writes wrapped in db.transaction()?
□ Error handling with TRPCError (not thrown strings)?
□ Returns structured response?
```

### Step 4: Typecheck This Procedure

```bash
pnpm typecheck --filter=web
```

```
□ Typecheck passes for this procedure?
□ Zod types align with DB schema types?
□ Return types are correct?
```

**Gate:** Typecheck passes before moving to next procedure.

---

## After All Procedures: Register + Test

### Register Router

```typescript
// apps/web/server/routers/_app.ts
import { {domain}Router } from "./{domain}";

export const appRouter = router({
  // ... existing
  {domain}: {domain}Router,
});
```

### Full Typecheck

```bash
pnpm typecheck --filter=web
```

- [ ] 0 errors across all files

### Test CRUD

```bash
# Or write automated tests
```

```
□ Create: valid input → 201, record in DB with correct entityId
□ List: returns only records for current entity
□ GetById: returns record with correct entity scoping
□ Update: changes persist, audit trail created
□ Delete: soft delete works (status → voided)
```

### Test Security

```
□ Unauthorized: request without auth → 401
□ Cross-entity: request for wrong entity → empty/403
□ Invalid input: bad data → descriptive error message
□ Missing required field: → validation error
□ Negative amount: → "Amount must be positive"
```

### Test Audit Trail

```
□ Create mutation → audit log entry exists
□ Update mutation → audit log entry exists
□ Audit entry: userId, action, entityType, entityIdRef, changes
```

---

## Progress Reporting

### During Build

```
API ROUTE: expensesRouter
Procedure: 4/5 — update

├── list:     ✅ — typecheck passed, entity scoping verified
├── getById:  ✅ — typecheck passed, NOT_FOUND error handled
├── create:   ✅ — typecheck passed, audit trail verified, transaction used
├── update:   🔄 — typecheck: 1 error (wrong import path), fixing...
├── delete:   ⬜ pending

Register: ⬜ pending
Full typecheck: ⬜ pending
CRUD test: ⬜ pending
```

### Final Report

```markdown
## API Route: [domain]Router

### Status: ✅ COMPLETE

### Procedures

| #   | Procedure | Type     | Typecheck | Entity Scoping | Audit | Status |
| --- | --------- | -------- | --------- | -------------- | ----- | ------ |
| 1   | list      | query    | ✅        | ✅             | —     | ✅     |
| 2   | getById   | query    | ✅        | ✅             | —     | ✅     |
| 3   | create    | mutation | ✅        | ✅             | ✅    | ✅     |
| 4   | update    | mutation | ✅        | ✅             | ✅    | ✅     |
| 5   | delete    | mutation | ✅        | ✅             | ✅    | ✅     |

### Verification

- pnpm typecheck: ✅ 0 errors
- Entity scoping: ✅ All queries filter by ctx.entityId
- Audit trail: ✅ All mutations logged
- CRUD: ✅ Create, read, update, list, delete work
- Auth: ✅ 401 on unauthorized
- Cross-entity: ✅ Empty/403 on wrong entity
- Validation: ✅ Invalid input rejected with clear error
```

---

## Code Patterns

### ProtectedProcedure with Entity Scoping

```typescript
const protectedProcedure = t.procedure.use(authMiddleware).use(entityScoped);
// ctx.session — user session
// ctx.entityId — current entity (scoped)
// ctx.entityRole — user's role in this entity
```

### Error Handling

```typescript
throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
throw new TRPCError({ code: "FORBIDDEN", message: "No access to this entity" });
throw new TRPCError({
  code: "BAD_REQUEST",
  message: "Debits must equal credits",
});
```

### Pagination Pattern

```typescript
const data = await db.query.table.findMany({
  where: and(...conditions),
  orderBy: desc(table.createdAt),
  limit: input.limit + 1,
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

---

## Common Pitfalls

1. **Missing entity scoping** — Every query MUST filter by `ctx.entityId`
2. **No input validation** — Every procedure MUST use zod
3. **Hardcoded user ID** — Always use `ctx.session.user.id`
4. **No audit trail** — Every mutation MUST log to `audit_log`
5. **Direct DB access from frontend** — Always go through tRPC
6. **Forgetting to register router** — Add to `_app.ts`
7. **Not invalidating cache** — Use `trpc.useUtils()` after mutations
8. **No transaction on multi-table writes** — Use `db.transaction()`
9. **SaaS anti-patterns** — Don't build APIs for manual workflows that AI should handle
10. **Missing AI-native patterns** — Add confidence scoring, narrative responses where appropriate

---

## Failure Recovery

### Typecheck errors

1. Read error message carefully
2. Fix import paths (most common)
3. Fix zod schema types vs DB schema types
4. Re-run typecheck after each fix
5. Max 5 fix attempts per procedure

### Entity scoping verification fails

1. Check every query has `eq(table.entityId, ctx.entityId)`
2. Check `entityId` comes from session, not user input
3. Check cross-entity queries return empty

### Audit trail missing

1. Check every mutation has `tx.insert(auditLog).values({...})`
2. Check userId comes from `ctx.session.user.id`
3. Check entityType and entityIdRef are correct

### Budget Guard

- Max **5 typecheck fix attempts** per procedure
- Max **2 full passes** on integration gate
- If budget exceeded: report progress, list remaining procedures

---

## AI-Native API Patterns

### When to Add AI-Native Patterns

Not every API needs AI-native patterns. Add them when:

- The API is consumed by an AI agent
- The API returns decisions that need human approval
- The API involves confidence scoring
- The API is part of a workflow that AI manages

### Confidence Scoring in Responses

For APIs that return AI-generated results:

```typescript
// Add confidence to responses
return {
  data: results,
  confidence: 0.94,
  reasoning: "Based on transaction patterns and vendor history",
  requiresApproval: true,
};
```

### Narrative Responses

For APIs that explain what AI did:

```typescript
// Add narrative to mutations
return {
  success: true,
  narrative: "AI categorized 47 transactions. 3 need your review.",
  actions: [
    { type: "approve", label: "Approve all" },
    { type: "review", label: "Review 3 flagged" },
  ],
};
```

### Decision Card Patterns

For APIs that require human-in-the-loop:

```typescript
// Return decision cards
return {
  decisions: [
    {
      id: "dec_123",
      type: "approval",
      title: "Approve vendor payment?",
      description: "AI recommends paying $1,250 to Acme Corp",
      confidence: 0.92,
      options: [
        { label: "Approve", value: "approve" },
        { label: "Reject", value: "reject" },
        { label: "Defer", value: "defer" },
      ],
    },
  ],
};
```

### Agent Tool Integration

For APIs consumed by LangGraph agents:

```typescript
// Return structured results for agent consumption
return {
  result: data,
  confidence: 0.95,
  reasoning: "Transaction matches vendor pattern with 95% confidence",
  suggestedAction: "categorize_as_office_supplies",
  evidence: [
    "Vendor: Office Depot",
    "Description: Paper and toner",
    "Amount: $47.99 (within normal range)",
  ],
};
```

---

## AI-Native API Quality Gate

Before declaring API route complete:

```
AI-NATIVE API GATE:
□ Entity scoping verified on ALL queries (ctx.entityId in WHERE)?
□ Audit trail populated on ALL mutations?
□ Confidence field included in AI-generated responses?
□ Narrative/reasoning included where AI makes decisions?
□ Decision card pattern used for human-in-the-loop approvals?
□ No SaaS anti-patterns (manual workflows AI should handle)?
□ Error messages are plain English, not stack traces?
□ Agent tool integration returns structured results?
```

### Evidence-Based Completion

```
EVIDENCE PACKAGE:
├── Router: [name]
├── Procedures: [count] (list, getById, create, update, delete)
├── Typecheck: [0 errors]
├── Entity scoping: [verified on all queries]
├── Audit trail: [populated on all mutations]
├── Validation: [zod schemas on all inputs]
├── AI-native patterns: [confidence, narrative, decision cards]
└── CRUD test: [all operations verified]
```
