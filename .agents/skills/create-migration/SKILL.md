---
name: create-migration
description: Guides database schema changes using Drizzle ORM in Xenboox. Loops through edit → generate → review → verify → push → typecheck for each schema change.
license: MIT
metadata:
  author: xenboox
  category: database
  version: 2.0.0
  workflow: loop
---

# Create Migration — Loop Mode (Edit → Generate → Review → Verify → Push)

## Role

You are a **Schema Engineer** at Xenboox. You don't just edit a schema and declare done. You edit, generate the migration, review the SQL, verify no data loss, push, typecheck, and test. Each step has a gate — you don't move to the next until the current one passes.

**Workflow Mode:** LOOP (per schema change)

- **Edit:** Modify Drizzle schema
- **Generate:** Run `pnpm db:generate`
- **Review:** Read the SQL, check for destructive operations
- **Verify:** No data loss, correct types, correct references
- **Push:** Apply migration
- **Typecheck:** Verify types match
- **Test:** Verify data still works

**Non-negotiable rules:**

1. Never hand-write SQL migrations — always use `pnpm db:generate`
2. Always review generated SQL before applying
3. Always verify no data loss (DROP COLUMN, DROP TABLE)
4. Always run typecheck after migration
5. Always check entity scoping on new tables

---

## Execution Graph

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ EDIT     │───▶│ GENERATE │───▶│ REVIEW   │───▶│ VERIFY   │
│ Schema   │    │ Migration│    │ SQL      │    │ No data  │
│ changes  │    │ file     │    │ generated│    │ loss     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
                                                      │
┌──────────┐    ┌──────────┐    ┌──────────┐         │
│ TEST     │◀───│ TYPECHECK│◀───│ PUSH     │◀────────┘
│ Data     │    │ Types    │    │ Apply    │
│ intact   │    │ match    │    │ migration│
└──────────┘    └──────────┘    └──────────┘
```

---

## Phase 0: Plan — Define the Schema Change

Before editing anything, define what you're changing:

### Schema Change Definition

```markdown
## Migration: [description]

**Type:** [new table | add column | add index | modify column | data migration]
**Domain:** [which accounting domain?]
**Table(s):** [which tables affected?]

### Changes

1. [Change 1: e.g., "Add expenses table with entityId, name, amount, status"]
2. [Change 2: e.g., "Add index on expenses.entity_id"]

### Risks

- [Any destructive operations? DROP COLUMN?]
- [Any required columns on existing tables?]
- [Any data migration needed?]
```

### Work Queue

```
MIGRATION QUEUE:
┌────┬──────────────────────────────┬──────────┬──────────┐
│ #  │ Change                       │ Type     │ Status   │
├────┼──────────────────────────────┼──────────┼──────────┤
│ 1  │ Create expenses table        │ new      │ ⬜       │
│ 2  │ Create expense_lines table   │ new      │ ⬜       │
│ 3  │ Add status enum              │ enum     │ ⬜       │
│ 4  │ Add index on entity_id       │ index    │ ⬜       │
│ 5  │ Add composite index          │ index    │ ⬜       │
└────┴──────────────────────────────┴──────────┴──────────┘

MIGRATION: [name] | 0/5 changes
```

---

## Phase 1: EDIT — Modify Drizzle Schema

### Step 1: Find the Schema File

```
packages/db/schema/
├── auth.ts              # users, accounts, sessions
├── organization.ts      # organizations, entities, user_entity_access
├── accounting.ts        # chart_of_accounts, journal_entries
├── ap-ar.ts             # suppliers, invoices_ap, sales_invoices
├── treasury.ts          # bank_accounts, bank_transactions
├── cash.ts              # cash_accounts, imprest_floats
├── mobile-money.ts      # mobile_money_accounts
├── tax.ts               # tax records
├── documents.ts         # documents, document_links
├── audit.ts             # audit_log, agent_activity
└── helpers.ts           # shared column builders
```

### Step 2: Edit the Schema

```typescript
// packages/db/schema/{domain}.ts
import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  pgIndex,
} from "drizzle-orm/pg-core";
import { entityId, timestamps, uuidId } from "./helpers";

// Create enum first (if new status values needed)
export const expenseStatusEnum = pgEnum("expense_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
  "paid",
]);

// New table
export const expenses = pgTable("expenses", {
  id: uuidId(),
  entityId: entityId, // REQUIRED — entity scoping
  name: text("name").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: expenseStatusEnum("status").notNull().default("draft"),
  date: timestamp("date").notNull().defaultNow(),
  ...timestamps,
});

// Line items
export const expenseLines = pgTable("expense_lines", {
  id: uuidId(),
  expenseId: uuid("expense_id")
    .notNull()
    .references(() => expenses.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => chartOfAccounts.id),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
  ...timestamps,
});

// Indexes
export const expenseEntityIdx = pgIndex("idx_expenses_entity").on(
  expenses.entityId,
);
export const expenseStatusIdx = pgIndex("idx_expenses_entity_status").on(
  expenses.entityId,
  expenses.status,
);
```

### Step 3: Edit Quality Gate

```
□ Every table has `id` (uuid), `createdAt`, `updatedAt`?
□ Every table has `entityId`?
□ Status fields use `pgEnum`, not `text`?
□ Foreign keys have `onDelete` specified?
□ Line items cascade delete on parent?
□ Numeric fields use precision/scale for money?
□ Indexes on entity_id and commonly queried columns?
□ No raw strings for status?
```

---

## Phase 2: GENERATE — Create Migration File

### Step 1: Generate

```bash
pnpm db:generate
```

### Step 2: Generate Quality Gate

```
□ Migration file created in packages/db/migrations/?
□ No errors during generation?
□ Migration file has correct name/number?
```

**Gate:** Migration generates cleanly before reviewing SQL.

---

## Phase 3: REVIEW — Read the Generated SQL

### Step 1: Read the Migration File

```sql
-- Example generated migration
CREATE TYPE "expense_status" AS ENUM('draft', 'pending', 'approved', 'rejected', 'paid');

CREATE TABLE "expenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "entity_id" uuid NOT NULL REFERENCES "entities"("id"),
  "name" text NOT NULL,
  "description" text,
  "status" "expense_status" NOT NULL DEFAULT 'draft',
  "amount" numeric(15,2) DEFAULT '0',
  "date" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE "expense_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "expense_id" uuid NOT NULL REFERENCES "expenses"("id") ON DELETE CASCADE,
  "account_id" uuid NOT NULL REFERENCES "chart_of_accounts"("id"),
  "description" text NOT NULL,
  "amount" numeric(15,2) DEFAULT '0',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX "idx_expenses_entity" ON "expenses" ("entity_id");
CREATE INDEX "idx_expenses_entity_status" ON "expenses" ("entity_id", "status");
```

### Step 2: Review Checklist

```
DESTRUCTIVE OPERATIONS CHECK:
□ No DROP COLUMN? (data loss!)
□ No DROP TABLE? (data loss!)
□ No ALTER COLUMN TYPE? (may fail with existing data)
□ No ALTER COLUMN SET NOT NULL without default? (fails if rows exist)
□ No TRUNCATE? (data loss!)

CORRECTNESS CHECK:
□ Column types match Drizzle schema?
□ Defaults match Drizzle schema?
□ Foreign keys reference correct tables?
□ ON DELETE behavior correct (CASCADE for children, RESTRICT for references)?
□ Indexes created on correct columns?
□ Enum values match Drizzle enum definition?
```

### Step 3: Review Quality Gate

```
□ No destructive operations?
□ All column types correct?
□ All defaults correct?
□ All foreign keys correct?
□ All indexes present?
□ No data loss risk?
```

**Gate:** SQL reviewed and safe before pushing.

---

## Phase 4: VERIFY — Check for Data Safety

### If Adding Columns to Existing Tables

```
ADDING COLUMN TO EXISTING TABLE:
□ New column is nullable? (safe to add)
□ OR new column has default value? (safe to add)
□ OR table is empty? (safe to add NOT NULL)
□ NOT NULL without default on populated table? → BLOCKED (will fail)
```

### If Modifying Existing Columns

```
MODIFYING COLUMN:
□ Changing type? Will existing data convert safely?
□ Adding NOT NULL? Does every row have a value?
□ Changing default? Affects existing rows?
□ Narrowing type? (e.g., varchar(255) → varchar(100)) Will data fit?
```

### If Dropping Columns/Tables

```
DROPPING:
□ Checked for foreign key references?
□ Checked application code for usage?
□ Created backup?
□ Added to deprecated list first?
□ Waited sufficient time for code to deploy without column?
```

---

## Phase 5: PUSH — Apply Migration

### Step 1: Push

```bash
# Development
pnpm db:push

# Or apply migration file
pnpm db:migrate
```

### Step 2: Push Quality Gate

```
□ Migration applied without errors?
□ No constraint violations?
□ No foreign key violations?
```

---

## Phase 6: TYPECHECK — Verify Types Match

### Step 1: Typecheck

```bash
pnpm typecheck
```

### Step 2: Typecheck Quality Gate

```
□ 0 type errors?
□ Schema types align with application code?
□ Any code referencing old column names updated?
```

---

## Phase 7: TEST — Verify Data Integrity

### Step 1: Visual Verification

```bash
pnpm db:studio
```

```
□ New table visible in Drizzle Studio?
□ New columns visible?
□ Indexes visible?
□ Enum values correct?
□ Existing data intact?
```

### Step 2: Application Verification

```
□ Application connects to database?
□ Existing queries still work?
□ New schema types usable in tRPC routers?
□ No runtime errors?
```

---

## Progress Reporting

### During Work

```
MIGRATION: Add expenses module
Change: 3/5 — Add indexes

├── Create expenses table:  ✅ — generated, reviewed, pushed
├── Create expense_lines:   ✅ — generated, reviewed, pushed
├── Add status enum:        ✅ — generated, reviewed, pushed
├── Add entity index:       🔄 — reviewing SQL...
│   CREATE INDEX "idx_expenses_entity" ON "expenses" ("entity_id");
│   ✅ Safe — no destructive operations
├── Add composite index:    ⬜ pending

Typecheck: ⬜ pending
Studio check: ⬜ pending
```

### Final Report

```markdown
## Migration: [Description]

### Status: ✅ COMPLETE

### Changes

| #   | Change                | Type  | Generated | Reviewed | Pushed | Verified |
| --- | --------------------- | ----- | --------- | -------- | ------ | -------- |
| 1   | Create expenses table | new   | ✅        | ✅ Safe  | ✅     | ✅       |
| 2   | Create expense_lines  | new   | ✅        | ✅ Safe  | ✅     | ✅       |
| 3   | Add status enum       | enum  | ✅        | ✅ Safe  | ✅     | ✅       |
| 4   | Add entity index      | index | ✅        | ✅ Safe  | ✅     | ✅       |
| 5   | Add composite index   | index | ✅        | ✅ Safe  | ✅     | ✅       |

### Verification

- pnpm db:generate: ✅ Migration created
- SQL review: ✅ No destructive operations
- pnpm db:push: ✅ Applied successfully
- pnpm typecheck: ✅ 0 errors
- pnpm db:studio: ✅ Tables visible, data intact
```

---

## Schema Patterns

### Every Financial Table

```typescript
export const financialTable = pgTable("financial_table", {
  id: uuidId(),
  entityId: entityId, // Non-negotiable
  // ... domain columns ...
  ...timestamps,
});
```

### Status Fields (Always pgEnum)

```typescript
export const statusEnum = pgEnum("status", ["draft", "active", "completed"]);
// NEVER: status: text("status") — WRONG
```

### Numeric Amounts (Never Float)

```typescript
amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0");
```

### Foreign Keys

```typescript
// Cascade delete for child records
moduleId: uuid("module_id")
  .notNull()
  .references(() => moduleTable.id, { onDelete: "cascade" });

// Reference only (no cascade)
accountId: uuid("account_id")
  .notNull()
  .references(() => chartOfAccounts.id);
```

### Indexes

```typescript
// Entity-scoped (always)
export const entityIdx = pgIndex("idx_table_entity").on(table.entityId);

// Composite for common queries
export const statusIdx = pgIndex("idx_table_entity_status").on(
  table.entityId,
  table.status,
);
```

---

## Dangerous Operations

### Column Drop

```bash
# NEVER drop without checking:
# 1. Foreign key references
# 2. Application code using the column
# 3. Create backup first
# 4. Add to deprecated list before dropping
```

### Data Migration

```typescript
// If splitting/transforming data:
// 1. Create new column
// 2. Write data migration script
// 3. Add NOT NULL after data migrated
// 4. Remove old column in next migration
```

---

## Common Pitfalls

1. **Hand-writing SQL** — Always use `pnpm db:generate`, review but don't write
2. **Missing entity_id** — Every new table MUST have entity scoping
3. **Using float for money** — Always `numeric(15,2)`
4. **Raw string statuses** — Always `pgEnum`
5. **Destructive changes without review** — DROP needs careful review
6. **Forgetting indexes** — Add on entity_id and common query columns
7. **Not running typecheck** — Always after migration
8. **NOT NULL without default on populated table** — Will fail

---

## Failure Recovery

### Migration generation fails

1. Check schema for syntax errors
2. Check references point to existing tables
3. Check enum definitions are valid
4. Fix and re-run `pnpm db:generate`

### Push fails with constraint violation

1. Read the error message
2. Check if existing data violates new constraints
3. Fix data first, then re-push
4. Or make constraint nullable / add default

### Typecheck fails after migration

1. Check for renamed columns/tables
2. Update all references in application code
3. Re-run typecheck

### Budget Guard

- Max **3 generate attempts** per change
- Max **2 push attempts** (if fails, investigate data)
- If budget exceeded: report progress, list remaining changes
