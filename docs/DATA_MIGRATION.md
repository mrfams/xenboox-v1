# Data Migration Strategy

> How Xenboox onboards organizations migrating from other accounting tools.

---

## 1. Migration Sources

| Source | Type | Complexity | Recommended Approach |
|--------|------|-----------|---------------------|
| QuickBooks Online | Connected API | Low | Merge.dev Unified API |
| Xero | Connected API | Low | Merge.dev Unified API |
| Excel/CSV exports | File upload | Medium | Custom parser with AI column mapping |
| Paper records | Manual | High | Guided data entry wizard + OCR |

**Prioritization**: QBO and Xero first (bulk of SMB market in target regions). Excel/CSV second. Paper records handled via partner bookkeepers.

---

## 2. Merge.dev Integration

Merge.dev provides a Unified Accounting API that abstracts QBO, Xero, and 10+ other accounting platforms behind a single integration.

### Implementation Flow

```
User clicks "Import from QuickBooks"
  → Xenboox redirects to Merge Link (hosted OAuth UI)
  → User authorizes access in QBO/Xero
  → Merge webhook fires `accounting.connection.created`
  → Xenboox starts syncing via Merge Common Models
```

### Merge Common Models We Use

| Common Model | Xenboox Mapping | Direction |
|-------------|----------------|-----------|
| `Account` | `chart_of_accounts` | Pull |
| `Transaction` | `journal_entries` | Pull |
| `Invoice` | `invoices` | Pull |
| `Payment` | `payments` | Pull |
| `Vendor` | `vendors` | Pull |
| `Customer` | `customers` | Pull |
| `BalanceSheet` | Opening balances | Pull |
| `JournalEntry` | Historical entries | Pull |

### Merge Link Configuration

```typescript
// packages/db/schema/migrations/merge-connection.ts
import { pgTable, uuid, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const mergeConnections = pgTable("merge_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  mergeAccountToken: text("merge_account_token").notNull(),
  integrationSlug: text("integration_slug").notNull(), // "quickbooks" | "xero"
  status: text("status").notNull().default("syncing"), // syncing | complete | failed | disconnected
  commonModelsSynced: jsonb("common_models_synced").$type<string[]>(),
  lastSyncAt: timestamp("last_sync_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### Rate Limiting

Merge respects provider rate limits. We poll via webhooks + periodic resync:
- Initial sync: full pull of all enabled Common Models
- Incremental: webhook-driven on `Transaction` and `Account` changes
- Periodic: full resync every 24h during migration window

---

## 3. Chart of Accounts Mapping

### The CoA Mapping Problem

QBO and Xero allow arbitrary account names. Xenboox uses a standardized CoA based on IFRS for SMEs (tailored for African entities). We need a two-phase mapping:

### Phase 1: Automated Mapping (AI-powered)

```
QBO Account Name           →  Xenboox Standard Account
───────────────────────────────────────────────────────
"Sales of Goods"           →  4000 Revenue
"Service Income"           →  4100 Service Revenue
"Rent Expense"             →  5100 Rent & Occupancy
"Office Supplies"          →  5200 Office Expenses
"Bank Charges"             →  5300 Bank Fees
"Accounts Receivable"      →  1200 Trade Receivables
"Accounts Payable"         →  2100 Trade Payables
"Opening Balance Equity"   →  3100 Retained Earnings
```

**Algorithm**:
1. Tokenize source account name
2. Embed using sentence-transformers (`all-MiniLM-L6-v2`)
3. Cosine similarity against Xenboox CoA embeddings
4. Confidence > 0.85 → auto-map
5. Confidence 0.60–0.85 → suggest to user in wizard
6. Confidence < 0.60 → flag for manual mapping

### Phase 2: Manual Mapping UI

During the onboarding wizard, users review unmapped accounts:

```
[QBO: "Miscellaneous Coffee Expenses"] → [Dropdown: Select Xenboox Account]
  Suggested: 5200 Office Expenses (72% confidence)
  Suggested: 5110 Meals & Entertainment (64% confidence)
  Or: [Create New Account]
```

### CoA Schema

```typescript
// packages/db/schema/accounting/chart-of-accounts.ts
export const chartOfAccountsMappings = pgTable("coa_mappings", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  migrationId: uuid("migration_id").notNull(),
  sourceAccountId: text("source_account_id").notNull(),
  sourceAccountName: text("source_account_name").notNull(),
  sourceAccountType: text("source_account_type"),
  targetAccountId: uuid("target_account_id"),
  mappingConfidence: numeric("mapping_confidence"),
  mappingMethod: text("mapping_method").default("ai"), // ai | manual | created
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 4. Historical Data Import

### Lookback Period

| Entity Type | Recommended Lookback | Rationale |
|-------------|--------------------|-----------|
| Startup (<1yr) | Full history | Limited data volume |
| Operating (1-3yr) | 12 months | Sufficient for trend analysis |
| Established (3+yr) | 24 months | Year-over-year comparison |
| Enterprise | 36 months (or last fiscal year-end + current YTD) | Regulatory requirements |

### Data Transformation Rules

| Source Object | Xenboox Target | Transform |
|--------------|---------------|-----------|
| QBO Invoice | `invoices` | Map statuses (Open→draft, Paid→paid, Overdue→overdue) |
| QBO Payment | `payments` | Link to invoice via `invoiceId` |
| QBO JournalEntry | `journal_entries` | Split into individual line items, map accounts |
| QBO Transaction | `journal_entries` + `ledger_entries` | Every transaction becomes a journal entry with debit/credit lines |
| Xero Contact | `customers` / `vendors` | Deduplicate by email, merge contacts |
| Xero Account | `chart_of_accounts` | Run through CoA mapping pipeline |

### Timeline Format

All historical dates are preserved as-is. The migration records a `source_timestamp` alongside the Xenboox `created_at` so the ledger timeline remains intact.

---

## 5. Opening Balances

### Strategy

1. **Pull latest Balance Sheet** from source (Merge `/balance-sheet` endpoint)
2. **Determine cutover date** (user selects: "Start fresh from January 1, 2026" or "Continue from today")
3. **Generate opening journal entry**:

```typescript
{
  entryDate: cutoverDate,
  description: "Opening balance brought forward",
  lines: [
    // Assets (debit balances)
    { accountCode: "1200", debit: 150000.00, credit: 0 },    // Trade Receivables
    { accountCode: "1100", debit: 250000.00, credit: 0 },    // Cash at Bank
    // Liabilities (credit balances)
    { accountCode: "2100", debit: 0, credit: 80000.00 },     // Trade Payables
    // Equity
    { accountCode: "3100", debit: 0, credit: 320000.00 },    // Retained Earnings
  ],
  type: "opening_balance",
  locked: true, // Cannot be edited after creation
}
```

4. **Lock the entry**: Opening balance entries are immutable. Adjustments require a correcting entry in the current period.

5. **Reconciliation check**: Total debits must equal total credits. If not, flag for user review.

---

## 6. Migration UX — Onboarding Wizard

### Steps

```
Step 1: Welcome & Source Selection
  └─ Choose: QuickBooks Online | Xero | Upload CSV | Manual Entry

Step 2: Connect (if API)
  └─ Merge Link OAuth flow
  └─ Progress bar: "Connecting to QuickBooks..."

Step 3: Select Data to Import
  └─ Checkboxes: ☑ Chart of Accounts  ☑ Customers  ☑ Vendors
                   ☑ Invoices  ☑ Payments  ☑ Historical Transactions
  └─ Lookback period: Last [12] months (dropdown)

Step 4: Review Account Mapping
  └─ Auto-mapped: 42/45 accounts (green)
  └─ Needs review: 3 accounts (yellow)
  └─ Unmappable: 0 accounts (red)
  └─ [Edit Mappings] button

Step 5: Set Cutover Date
  └─ Calendar picker
  └─ Preview: "Opening balance will be D 150,000.00"

Step 6: Import Preview
  └─ Summary table:
  │ Item                  │ Source    │ Target    │ Count │
  │ Accounts              │ QBO       │ Xenboox   │ 45    │
  │ Customers             │ QBO       │ Xenboox   │ 128   │
  │ Invoices (open)       │ QBO       │ Xenboox   │ 34    │
  │ Historical entries    │ QBO       │ Xenboox   │ 1,247 │
  │ Opening balance       │ Generated │ Xenboox   │ D 150K│
  └─ [Start Import] button

Step 7: Import Progress
  └─ Real-time progress per model
  └─ Errors inline: "3 invoices failed — invalid currency"

Step 8: Validation Summary
  └─ ✅ Chart of Accounts: 45/45 synced
  └─ ✅ Customers: 128/128 synced
  └─ ⚠️ Invoices: 34/37 synced (3 skipped — see details)
  └─ ✅ Historical data: 1,247 entries
  └─ ✅ Opening balance: D 150,000.00
  └─ Balance check: ✅ Debits = Credits

Step 9: Done
  └─ "Your data is imported. Review your dashboard →"
  └─ Optional: [Rollback if something looks wrong]
```

### Implementation: Wizard Component

```typescript
// apps/web/components/onboarding/migration-wizard.tsx
"use client";

import { useMergeLink } from "@mergeapi/react-link";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

const STEPS = [
  "source", "connect", "scope", "mapping",
  "cutover", "preview", "importing", "validation", "done"
] as const;

export function MigrationWizard() {
  const [step, setStep] = useState<(typeof STEPS)[number]>("source");
  const [progress, setProgress] = useState<MigrationProgress>({...});

  return (
    <div className="max-w-2xl mx-auto py-8">
      <StepIndicator current={STEPS.indexOf(step)} total={STEPS.length} />
      {step === "source" && <SourceSelector onSelect={...} />}
      {step === "connect" && <MergeConnect onConnected={...} />}
      {step === "done" && <MigrationSummary progress={progress} />}
    </div>
  );
}
```

---

## 7. Data Validation

### Balance Check Framework

Every migration runs a validation suite on completion:

| Check | Method | Action on Failure |
|-------|--------|-------------------|
| Debits = Credits | Sum all journal entry lines | Block migration, flag for review |
| Opening balance equals source | Compare total assets/liabilities/equity | Warning, allow proceed |
| Invoice count matches | Compare source vs target count | Warning with difference shown |
| No orphan transactions | Every invoice line references valid account | Auto-fix unmapped → suspense account |
| Currency consistency | All amounts use entity's base currency | Flag mismatched entries |
| Duplicate detection | SHA256 hash of source IDs | Deduplicate on re-import |
| Date sanity | No future dates in historical import | Move to current period |

### Migration Audit Report

After import, generate a PDF report containing:
- Migration ID and timestamp
- Source system and entity name
- Count of each object type imported
- Number of errors/warnings
- Balance sheet comparison (source vs target)
- Opening balance journal entry (for auditor review)

---

## 8. Migration Status Tracking

### Database Schema

```typescript
// packages/db/schema/migrations/schema.ts
import { pgTable, uuid, text, timestamp, jsonb, numeric, boolean } from "drizzle-orm/pg-core";

export const migrations = pgTable("migrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityId: uuid("entity_id").notNull(),
  sourceType: text("source_type").notNull(), // quickbooks | xero | csv | manual
  sourceName: text("source_name"), // "My Business QBO"
  status: text("status").notNull().default("pending"),
  // pending | connecting | syncing | mapping | importing | validating | completed | failed | rolled_back
  step: text("step").notNull().default("pending"),
  mergeConnectionId: uuid("merge_connection_id"),
  cutoverDate: timestamp("cutover_date").notNull(),
  openingBalanceEntryId: uuid("opening_balance_entry_id"),
  stats: jsonb("stats").$type<{
    accountsTotal: number;
    accountsMapped: number;
    customersImported: number;
    vendorsImported: number;
    invoicesImported: number;
    historicalEntries: number;
    errors: number;
    warnings: number;
  }>(),
  validationPassed: boolean("validation_passed"),
  errorLog: jsonb("error_log").$type<Array<{
    model: string;
    sourceId: string;
    message: string;
    severity: "error" | "warning";
  }>>(),
  rollbackId: uuid("rollback_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const migrationModels = pgTable("migration_models", {
  id: uuid("id").defaultRandom().primaryKey(),
  migrationId: uuid("migration_id").notNull().references(() => migrations.id),
  modelName: text("model_name").notNull(), // "chart_of_accounts", "customers", etc.
  status: text("status").notNull().default("pending"), // pending | syncing | completed | failed
  sourceCount: numeric("source_count"),
  importedCount: numeric("imported_count"),
  errorCount: numeric("error_count").default("0"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});
```

### Migration Polling API

```typescript
// tRPC router for migration progress
export const migrationRouter = router({
  getStatus: protectedProcedure
    .input(z.object({ migrationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { entityId } = ctx.session;
      const migration = await db.query.migrations.findFirst({
        where: and(
          eq(migrations.id, input.migrationId),
          eq(migrations.entityId, entityId)
        ),
      });
      return migration;
    }),

  getModels: protectedProcedure
    .input(z.object({ migrationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.migrationModels.findMany({
        where: eq(migrationModels.migrationId, input.migrationId),
      });
    }),
});
```

---

## 9. Rollback

### Rollback Strategy

A rollback reverses a migration by deleting all imported data and restoring the pre-migration state.

### Implementation

```typescript
async function rollbackMigration(migrationId: string, entityId: string) {
  const migration = await db.query.migrations.findFirst({
    where: and(
      eq(migrations.id, migrationId),
      eq(migrations.entityId, entityId)
    ),
  });

  if (!migration || migration.status === "rolled_back") {
    throw new Error("Migration not found or already rolled back");
  }

  await db.transaction(async (tx) => {
    // 1. Delete opening balance entry
    if (migration.openingBalanceEntryId) {
      await tx.delete(journalEntries)
        .where(eq(journalEntries.id, migration.openingBalanceEntryId));
    }

    // 2. Delete all imported data by migration source ID tag
    const modelsToClear = [
      "chart_of_accounts", "customers", "vendors",
      "invoices", "payments", "journal_entries", "ledger_entries"
    ];
    for (const model of modelsToClear) {
      await tx.execute(
        sql`DELETE FROM ${sql.identifier(model)}
            WHERE entity_id = ${entityId}
            AND source_migration_id = ${migrationId}`
      );
    }

    // 3. Mark migration as rolled back
    await tx.update(migrations)
      .set({ status: "rolled_back", updatedAt: new Date() })
      .where(eq(migrations.id, migrationId));
  });
}
```

### Rollback Guards

- **Time window**: Rollback only allowed within 7 days of migration completion
- **Dependency check**: Cannot roll back if user has created transactions in the current period
- **Audit trail**: Rollback itself is recorded as an audit event
- **Confirmation**: User must type "ROLLBACK" to confirm

### Rollback Schema

```typescript
export const migrationRollbacks = pgTable("migration_rollbacks", {
  id: uuid("id").defaultRandom().primaryKey(),
  migrationId: uuid("migration_id").notNull().references(() => migrations.id),
  entityId: uuid("entity_id").notNull(),
  reason: text("reason"),
  recordsDeleted: jsonb("records_deleted").$type<Record<string, number>>(),
  performedBy: uuid("performed_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 10. Excel/CSV Import

### The Messy CSV Problem

African accounting data in CSV form is notoriously inconsistent:
- Mixed date formats (`01/02/2024`, `2024-01-02`, `Jan 2, 2024`)
- Multi-currency in single column
- Missing headers
- Merged cells, subtotals mixed with data rows
- UTF-8 vs Latin-1 encoding issues
- Amounts with "D" prefix, "GMD" suffix, or comma separators

### CSV Parser Architecture

```
Upload CSV
  → Detect encoding (chokidar/icu)
  → Parse with PapaParse (header detection)
  → Run schema inference:
      • Column type detection (date, numeric, string)
      • Date format detection
      • Currency prefix/suffix stripping
  → Present to user:
      "We detected: Column A = Date, Column B = Description, Column C = Amount"
      [Confirm] [Adjust]
  → Transform rows:
      • Normalize dates → ISO 8601
      • Parse amounts → Decimal
      • Strip "D", "GMD", "XOF", "USD" prefixes
      • Remove subtotal rows
  → Run through standard import pipeline
```

### Implementation

```typescript
// packages/agents/tier3/csv-import-agent.ts
import { parse } from "csv-parse/sync";
import iconv from "iconv-lite";
import { z } from "zod";

interface DetectedColumn {
  index: number;
  header: string;
  type: "date" | "amount" | "description" | "reference" | "unknown";
  confidence: number;
}

export class CsvImportAgent {
  async parse(buffer: Buffer): Promise<{
    columns: DetectedColumn[];
    rows: Record<string, string>[];
    encoding: string;
  }> {
    // 1. Detect encoding
    const encoding = this.detectEncoding(buffer);

    // 2. Decode
    const decoded = iconv.decode(buffer, encoding);

    // 3. Parse
    const records = parse(decoded, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
    });

    // 4. Infer schema
    const columns = this.inferColumns(records);
    const headers = columns.map((c) => c.header);

    // 5. Map to standard format
    const rows = records.slice(1).map((row: string[]) => {
      const entry: Record<string, string> = {};
      columns.forEach((col) => {
        entry[col.header] = row[col.index] || "";
      });
      return entry;
    });

    return { columns, rows, encoding };
  }

  private inferColumns(records: string[][]): DetectedColumn[] {
    if (records.length < 2) return [];
    const headers = records[0];
    const sampleRows = records.slice(1, 6);

    return headers.map((header, index) => {
      const values = sampleRows.map((r) => r[index]).filter(Boolean);
      return {
        index,
        header,
        type: this.detectColumnType(values),
        confidence: this.calculateConfidence(values),
      };
    });
  }

  private detectColumnType(values: string[]): DetectedColumn["type"] {
    // Date patterns
    if (values.every((v) => /^\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}$/.test(v))) {
      return "date";
    }
    // Amount patterns: "1,234.56", "D 1,234", "1 234 F", "-500"
    if (values.every((v) => /^[DGMdgm]?\s?[\d,\.\s]+$/.test(v.trim()))) {
      return "amount";
    }
    // Reference patterns: "INV-001", "TXN123"
    if (values.every((v) => /^[A-Z]+[-]?\d+$/.test(v))) {
      return "reference";
    }
    return "description";
  }

  private calculateConfidence(values: string[]): number {
    // Based on consistency of format across sample rows
    return 0.85; // Simplified
  }
}
```

### CSV Template

Users without data to import can download a Xenboox CSV template:

| date | description | reference | debit | credit | account_code | notes |
|------|-------------|-----------|-------|--------|-------------|-------|
| 2026-01-15 | Sale to ABC Corp | INV-001 | 15000 | | 4000 | |
| 2026-01-15 | Bank deposit | | | 15000 | 1100 | |

### AI-Assisted Column Mapping

When the parser can't identify a column, an LLM agent reviews the column name + sample values and suggests a mapping:

```typescript
const prompt = `You are mapping CSV columns to accounting fields.
Column header: "${header}"
Sample values: ${sampleValues.join(", ")}
Available fields: date, description, reference, debit, credit, account_code, notes

Which field does this column map to? Reply with JSON: { "field": "...", "confidence": 0-1 }`;
```

---

## Data Retention After Migration

- Source data is kept for 90 days after migration completion
- After 90 days, raw imported data is archived to Cold storage (Cloudflare R2)
- Migration metadata and audit trail are retained permanently
- Opening balance entries are permanent and immutable
