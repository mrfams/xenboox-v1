# Testing Strategy — Xenboox

> Testing philosophy, patterns, and conventions for the Xenboox monorepo.

---

## 1. Test Frameworks

| Layer       | Framework     | Runner       | Notes                              |
|-------------|---------------|--------------|------------------------------------|
| Unit        | Vitest        | `pnpm test`  | Parallel, fast feedback            |
| Integration | Vitest        | `pnpm test`  | Isolated test DB per suite         |
| E2E         | Playwright    | `pnpm test:e2e` | Real browser, real DB          |
| Agent Eval  | Vitest + custom runner | `pnpm agents:eval` | Golden dataset scoring |

---

## 2. Test Pyramid

```
        ╱  E2E (10%)  ╲         ← Critical user flows, smoke tests
       ╱────────────────╲
      ╱ Integration (30%)╲      ← Agent workflows, API + DB, full tRPC pipelines
     ╱────────────────────╲
    ╱   Unit Tests (60%)   ╲   ← Pure functions, schemas, agent nodes, utilities
   ╱────────────────────────╲
```

**Guiding principles:**
- Fast feedback: unit tests run in < 5s total.
- Deterministic: mock external LLM calls, real DB for integration.
- Every financial flow has at least one integration test.
- E2E covers the critical path only — not every UI state.

---

## 3. Unit Testing Patterns

### 3.1 tRPC Procedure Testing

```typescript
// tests/unit/api/procedures/invoice.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller } from '~/tests/helpers/trpc';
import { invoiceRouter } from '~/server/routers/invoice';
import { mockDb, mockEntityId, mockUserId } from '~/tests/fixtures/db';

vi.mock('~/server/db', () => ({ db: mockDb }));

describe('invoice.create', () => {
  const caller = createTestCaller(invoiceRouter, {
    userId: mockUserId,
    entityId: mockEntityId,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an invoice with valid input', async () => {
    mockDb.insert.mockResolvedValueOnce({ id: 'inv-1' });

    const result = await caller.create({
      vendorId: 'vend-1',
      amount: 150000, // cents
      currency: 'USD',
      dueDate: '2026-08-01',
      lineItems: [
        { description: 'Cloud hosting', quantity: 1, unitPrice: 150000 },
      ],
    });

    expect(result.id).toBe('inv-1');
    expect(mockDb.insert).toHaveBeenCalledOnce();
  });

  it('rejects negative amounts', async () => {
    await expect(
      caller.create({
        vendorId: 'vend-1',
        amount: -100,
        currency: 'USD',
        dueDate: '2026-08-01',
        lineItems: [],
      })
    ).rejects.toThrow('Amount must be positive');
  });
});
```

### 3.2 Agent Node Testing

```typescript
// tests/unit/agents/tier3/categorizer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { categorizeNode } from '~/packages/agents/tier3/categorizer';
import { mockLLM } from '~/tests/helpers/llm';

describe('categorizeNode', () => {
  it('categorizes a vendor payment as accounts-payable', async () => {
    const mockResponse = {
      category: 'accounts-payable',
      subcategory: 'vendor-invoices',
      confidence: 0.92,
    };

    mockLLM.invoke.mockResolvedValueOnce(JSON.stringify(mockResponse));

    const state = {
      transactions: [
        {
          id: 'txn-1',
          description: 'AWS Cloud Services',
          amount: -125000,
          date: '2026-07-01',
        },
      ],
      entityId: 'entity-1',
    };

    const result = await categorizeNode(state);

    expect(result.categorizations).toHaveLength(1);
    expect(result.categorizations[0].category).toBe('accounts-payable');
    expect(result.categorizations[0].confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('flags low-confidence categorizations for review', async () => {
    const mockResponse = {
      category: 'uncategorized',
      subcategory: 'unknown',
      confidence: 0.3,
    };

    mockLLM.invoke.mockResolvedValueOnce(JSON.stringify(mockResponse));

    const state = {
      transactions: [
        { id: 'txn-2', description: 'MISC PAYMENT 4923', amount: -5000, date: '2026-07-02' },
      ],
      entityId: 'entity-1',
    };

    const result = await categorizeNode(state);

    expect(result.requiresReview).toBe(true);
    expect(result.categorizations[0].confidence).toBeLessThan(0.7);
  });
});
```

### 3.3 Utility Function Testing

```typescript
// tests/unit/lib/money.test.ts
import { describe, it, expect } from 'vitest';
import { formatCurrency, parseAmount, convertCurrency } from '~/lib/money';

describe('formatCurrency', () => {
  it('formats USD correctly', () => {
    expect(formatCurrency(150000, 'USD')).toBe('$1,500.00');
  });

  it('formats JPY without decimals', () => {
    expect(formatCurrency(150000, 'JPY')).toBe('¥150,000');
  });
});

describe('parseAmount', () => {
  it('parses decimal string to cents', () => {
    expect(parseAmount('1500.50')).toBe(150050);
  });

  it('throws on invalid input', () => {
    expect(() => parseAmount('abc')).toThrow('Invalid amount');
  });
});

describe('convertCurrency', () => {
  it('converts between currencies using rate', () => {
    const result = convertCurrency(100000, 'USD', 'EUR', 0.92);
    expect(result).toBe(92000);
  });
});
```

### 3.4 Zod Schema Validation Testing

```typescript
// tests/unit/lib/schemas/invoice.test.ts
import { describe, it, expect } from 'vitest';
import { createInvoiceSchema } from '~/lib/schemas/invoice';

describe('createInvoiceSchema', () => {
  it('accepts valid input', () => {
    const result = createInvoiceSchema.safeParse({
      vendorId: 'vend-1',
      amount: 150000,
      currency: 'USD',
      dueDate: '2026-08-01',
      lineItems: [
        { description: 'Services', quantity: 1, unitPrice: 150000 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing vendorId', () => {
    const result = createInvoiceSchema.safeParse({
      amount: 150000,
      currency: 'USD',
      dueDate: '2026-08-01',
      lineItems: [],
    });

    expect(result.success).toBe(false);
  });

  it('rejects unsupported currency', () => {
    const result = createInvoiceSchema.safeParse({
      vendorId: 'vend-1',
      amount: 150000,
      currency: 'XYZ',
      dueDate: '2026-08-01',
      lineItems: [],
    });

    expect(result.success).toBe(false);
  });
});
```

---

## 4. Integration Testing Patterns

### 4.1 Database Testing (Neon Branching)

```typescript
// tests/integration/api/invoice-flow.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createNeonBranch, dropNeonBranch } from '~/tests/helpers/neon';
import { createTestDb } from '~/tests/helpers/db';
import { seedEntity, seedVendor } from '~/tests/seed';

let branchId: string;
let db: ReturnType<typeof createTestDb>;

beforeAll(async () => {
  branchId = await createNeonBranch(`test-${Date.now()}`);
  db = createTestDb(branchId);
});

afterAll(async () => {
  await dropNeonBranch(branchId);
});

beforeEach(async () => {
  await db.delete().from('invoices');
  await db.delete().from('vendors');
  await db.delete().from('entities');
});

describe('Invoice creation flow', () => {
  it('creates invoice, updates vendor balance, posts to ledger', async () => {
    const entity = await seedEntity(db, { name: 'Acme Corp' });
    const vendor = await seedVendor(db, { entityId: entity.id, name: 'AWS' });

    // Create invoice via tRPC caller
    const caller = createAuthenticatedCaller({ entityId: entity.id });
    const invoice = await caller.invoice.create({
      vendorId: vendor.id,
      amount: 150000,
      currency: 'USD',
      dueDate: '2026-08-01',
      lineItems: [
        { description: 'Cloud hosting', quantity: 1, unitPrice: 150000 },
      ],
    });

    // Verify ledger entry exists
    const ledgerEntry = await db.query.ledgerEntries.findFirst({
      where: (ledger, { eq }) => eq(ledger.invoiceId, invoice.id),
    });

    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry!.debit).toBe(150000);
  });
});
```

### 4.2 Agent Workflow Testing (Full Graph)

```typescript
// tests/integration/agents/cfo-decision.test.ts
import { describe, it, expect, vi } from 'vitest';
import { buildCfoGraph } from '~/packages/agents/tier1/cfo';
import { mockLLM } from '~/tests/helpers/llm';
import { seedEntity, seedTransaction } from '~/tests/seed';

describe('CFO Agent — monthly close decision', () => {
  it('produces a close recommendation with confidence > 0.8', async () => {
    // Seed test data
    const entity = await seedEntity(db, { name: 'Test Co' });
    await seedTransaction(db, {
      entityId: entity.id,
      amount: 500000,
      category: 'revenue',
    });

    // Mock LLM responses for each node in the graph
    mockLLM.invoke
      .mockResolvedValueOnce(JSON.stringify({ status: 'ready', issues: [] }))          // pre-check
      .mockResolvedValueOnce(JSON.stringify({ adjustments: [], confidence: 0.95 }))    // adjustments
      .mockResolvedValueOnce(JSON.stringify({ recommendation: 'close', summary: 'All clear', confidence: 0.91 })); // decision

    const graph = buildCfoGraph();
    const result = await graph.invoke({
      entityId: entity.id,
      period: '2026-06',
      action: 'monthly-close',
    });

    expect(result.recommendation).toBe('close');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.decisionLog).toHaveLength(3); // one per node
  });
});
```

### 4.3 API Endpoint Testing

```typescript
// tests/integration/api/trpc-invoice.e2e.test.ts
import { describe, it, expect } from 'vitest';
import { appRouter } from '~/server/root';
import { createTestCaller, createAuthenticatedCaller } from '~/tests/helpers/trpc';
import { seedEntity, seedVendor, seedUser } from '~/tests/seed';

describe('tRPC invoice procedures — integration', () => {
  it('list returns only entity-scoped invoices', async () => {
    const entityA = await seedEntity(db, { name: 'Entity A' });
    const entityB = await seedEntity(db, { name: 'Entity B' });
    const vendorA = await seedVendor(db, { entityId: entityA.id, name: 'Vendor A' });
    const vendorB = await seedVendor(db, { entityId: entityB.id, name: 'Vendor B' });

    // Create invoices in both entities
    const callerA = createAuthenticatedCaller({ entityId: entityA.id });
    const callerB = createAuthenticatedCaller({ entityId: entityB.id });

    await callerA.invoice.create({
      vendorId: vendorA.id, amount: 100000, currency: 'USD',
      dueDate: '2026-08-01', lineItems: [],
    });
    await callerB.invoice.create({
      vendorId: vendorB.id, amount: 200000, currency: 'USD',
      dueDate: '2026-08-01', lineItems: [],
    });

    const resultA = await callerA.invoice.list({});
    const resultB = await callerB.invoice.list({});

    expect(resultA).toHaveLength(1);
    expect(resultA[0].amount).toBe(100000);
    expect(resultB).toHaveLength(1);
    expect(resultB[0].amount).toBe(200000);
  });
});
```

---

## 5. E2E Testing Patterns

### 5.1 Critical User Flow — Signup → Onboard → First Close

```typescript
// tests/e2e/flows/signup-onboard-close.spec.ts
import { test, expect } from '@playwright/test';

test.describe('New entity setup flow', () => {
  test('signup → onboard → create first invoice → run close', async ({ page }) => {
    // 1. Sign up
    await page.goto('/auth/signup');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'SecureP@ss123');
    await page.click('[data-testid="signup-submit"]');
    await expect(page).toHaveURL('/onboard');

    // 2. Onboard entity
    await page.fill('[data-testid="entity-name"]', 'Acme Corp');
    await page.selectOption('[data-testid="entity-type"]', 'llc');
    await page.fill('[data-testid="entity-currency"]', 'USD');
    await page.click('[data-testid="onboard-submit"]');
    await expect(page).toHaveURL('/dashboard');

    // 3. Create first invoice
    await page.click('[data-testid="nav-invoices"]');
    await page.click('[data-testid="create-invoice"]');
    await page.fill('[data-testid="vendor"]', 'AWS');
    await page.fill('[data-testid="amount"]', '1500.00');
    await page.fill('[data-testid="due-date"]', '2026-08-01');
    await page.click('[data-testid="submit-invoice"]');
    await expect(page.locator('[data-testid="invoice-row"]')).toHaveCount(1);

    // 4. Run month-end close
    await page.click('[data-testid="nav-close"]');
    await page.click('[data-testid="run-close"]');
    await expect(page.locator('[data-testid="close-status"]')).toHaveText('Completed');
  });
});
```

### 5.2 Auth Flows

```typescript
// tests/e2e/flows/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('login → logout cycle', async ({ page }) => {
    await page.goto('/auth/signin');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'SecureP@ss123');
    await page.click('[data-testid="signin-submit"]');
    await expect(page).toHaveURL('/dashboard');

    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout"]');
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test('locks account after 5 failed attempts', async ({ page }) => {
    await page.goto('/auth/signin');
    for (let i = 0; i < 5; i++) {
      await page.fill('[data-testid="email"]', 'test@example.com');
      await page.fill('[data-testid="password"]', 'wrong');
      await page.click('[data-testid="signin-submit"]');
    }
    await expect(page.locator('[data-testid="lockout-message"]')).toBeVisible();
  });
});
```

---

## 6. Agent Evaluation Testing (Golden Dataset)

### Approach

Agent outputs are scored against a curated golden dataset. Each example includes input context, expected output, and a scoring rubric.

### Golden Dataset Structure

```json
// tests/eval/golden-dataset/categorization.json
{
  "dataset": "categorization",
  "version": "1.0",
  "examples": [
    {
      "id": "cat-001",
      "input": {
        "transactions": [
          { "description": "AWS Cloud Services", "amount": -125000 }
        ],
        "vendorHints": ["AWS", "Amazon Web Services"]
      },
      "expected": {
        "category": "technology",
        "subcategory": "cloud-services",
        "minConfidence": 0.8
      },
      "scoring": {
        "categoryMatch": 1.0,
        "confidenceThreshold": 0.8
      }
    },
    {
      "id": "cat-002",
      "input": {
        "transactions": [
          { "description": "PAYROLL DEPOSIT 7/1", "amount": -4500000 }
        ],
        "vendorHints": []
      },
      "expected": {
        "category": "payroll",
        "subcategory": "salaries",
        "minConfidence": 0.85
      },
      "scoring": {
        "categoryMatch": 1.0,
        "confidenceThreshold": 0.85
      }
    }
  ]
}
```

### Evaluation Runner

```typescript
// tests/eval/run-eval.ts
import { loadDataset, scoreResult, type EvalResult } from './helpers';
import { buildCategorizerGraph } from '~/packages/agents/tier3/categorizer';

export async function runCategorizationEval(): Promise<EvalResult[]> {
  const dataset = await loadDataset('categorization');
  const graph = buildCategorizerGraph();
  const results: EvalResult[] = [];

  for (const example of dataset.examples) {
    const startTime = Date.now();
    const output = await graph.invoke({
      transactions: example.input.transactions,
      entityId: 'eval-entity',
      vendorHints: example.input.vendorHints,
    });

    const latencyMs = Date.now() - startTime;
    const score = scoreResult(output, example.expected);

    results.push({
      id: example.id,
      score,
      latencyMs,
      passed: score >= example.scoring.confidenceThreshold,
    });
  }

  return results;
}
```

### CI Integration

```bash
# Run eval suite — fails if score drops below threshold
pnpm agents:eval --threshold 0.85
```

---

## 7. Test Data Management

### 7.1 Fixtures and Factories

```typescript
// tests/fixtures/factories.ts
import { v4 as uuid } from 'uuid';

export function buildEntity(overrides?: Partial<Entity>) {
  return {
    id: uuid(),
    name: `Test Entity ${uuid().slice(0, 6)}`,
    type: 'llc' as const,
    baseCurrency: 'USD' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildInvoice(overrides?: Partial<Invoice>) {
  return {
    id: uuid(),
    entityId: uuid(),
    vendorId: uuid(),
    amount: 150000,
    currency: 'USD' as const,
    status: 'draft' as const,
    dueDate: '2026-08-01',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildTransaction(overrides?: Partial<Transaction>) {
  return {
    id: uuid(),
    entityId: uuid(),
    amount: -50000,
    description: 'Test Transaction',
    date: '2026-07-01',
    category: null as string | null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
```

### 7.2 Database Seeding

```typescript
// tests/seed/index.ts
import { buildEntity, buildInvoice, buildVendor } from '../fixtures/factories';

export async function seedEntity(db: DrizzleDB, overrides?: Partial<Entity>) {
  const entity = buildEntity(overrides);
  await db.insert(entities).values(entity);
  return entity;
}

export async function seedVendor(db: DrizzleDB, overrides?: Partial<Vendor>) {
  const vendor = buildVendor(overrides);
  await db.insert(vendors).values(vendor);
  return vendor;
}

export async function seedInvoice(db: DrizzleDB, overrides?: Partial<Invoice>) {
  const invoice = buildInvoice(overrides);
  await db.insert(invoices).values(invoice);
  return invoice;
}
```

### 7.3 Test Entity Setup Helper

```typescript
// tests/helpers/test-context.ts
import { seedEntity, seedVendor, seedUser } from '../seed';

export interface TestContext {
  entity: Entity;
  vendor: Vendor;
  userId: string;
  db: DrizzleDB;
}

export async function createTestContext(db: DrizzleDB): Promise<TestContext> {
  const entity = await seedEntity(db, { name: 'Test Corp' });
  const vendor = await seedVendor(db, { entityId: entity.id, name: 'Test Vendor' });
  const user = await seedUser(db, { entityId: entity.id });

  return { entity, vendor, userId: user.id, db };
}
```

---

## 8. Performance Testing

### 8.1 API Load Testing

```typescript
// tests/perf/api-load.test.ts
import { describe, it, expect } from 'vitest';

describe('API performance', () => {
  it('handles 50 concurrent invoice creates in < 5s', async () => {
    const caller = createAuthenticatedCaller({ entityId: testEntityId });
    const start = Date.now();

    const promises = Array.from({ length: 50 }, (_, i) =>
      caller.invoice.create({
        vendorId: testVendorId,
        amount: (i + 1) * 10000,
        currency: 'USD',
        dueDate: '2026-08-01',
        lineItems: [],
      })
    );

    const results = await Promise.all(promises);
    const elapsed = Date.now() - start;

    expect(results).toHaveLength(50);
    expect(elapsed).toBeLessThan(5000);
  });

  it('invoice list with 1000 records returns in < 500ms', async () => {
    // Seed 1000 invoices
    await seedBulkInvoices(db, testEntityId, 1000);

    const caller = createAuthenticatedCaller({ entityId: testEntityId });
    const start = Date.now();
    await caller.invoice.list({ limit: 50, offset: 0 });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(500);
  });
});
```

### 8.2 Agent Response Time Benchmarks

```typescript
// tests/perf/agent-benchmarks.test.ts
import { describe, it, expect } from 'vitest';

describe('Agent response time benchmarks', () => {
  it('categorizer processes 10 transactions in < 3s', async () => {
    const graph = buildCategorizerGraph();
    const transactions = Array.from({ length: 10 }, (_, i) => ({
      id: `txn-${i}`,
      description: `Transaction ${i}`,
      amount: -(i + 1) * 10000,
      date: '2026-07-01',
    }));

    const start = Date.now();
    const result = await graph.invoke({
      transactions,
      entityId: 'bench-entity',
    });
    const elapsed = Date.now() - start;

    expect(result.categorizations).toHaveLength(10);
    expect(elapsed).toBeLessThan(3000);
  });

  it('CFO monthly close completes in < 30s', async () => {
    const graph = buildCfoGraph();
    const start = Date.now();
    await graph.invoke({
      entityId: 'bench-entity',
      period: '2026-06',
      action: 'monthly-close',
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(30000);
  });
});
```

---

## 9. Coverage Targets

| Layer         | Target       | Enforcement            |
|---------------|--------------|------------------------|
| Unit          | 80%+ lines   | CI gate (fail < 80%)   |
| Integration   | All critical paths | Manual review + CI reporting |
| E2E           | Smoke tests on main flows | CI gate (must pass) |
| Agent Eval    | ≥ 85% golden score | `pnpm agents:eval --threshold 0.85` |

### Coverage Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
      include: [
        'packages/**/*.ts',
        'apps/web/lib/**/*.ts',
        'apps/web/server/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/generated/**',
      ],
    },
  },
});
```

---

## 10. File Structure

```
tests/
├── unit/
│   ├── agents/
│   │   ├── tier1/
│   │   │   └── cfo.test.ts
│   │   ├── tier2/
│   │   │   ├── controller.test.ts
│   │   │   └── treasury.test.ts
│   │   └── tier3/
│   │       ├── categorizer.test.ts
│   │       └── reconciler.test.ts
│   ├── api/
│   │   ├── procedures/
│   │   │   ├── invoice.test.ts
│   │   │   ├── vendor.test.ts
│   │   │   └── journal-entry.test.ts
│   │   └── middleware/
│   │       └── entity-scope.test.ts
│   └── lib/
│       ├── money.test.ts
│       ├── dates.test.ts
│       └── schemas/
│           ├── invoice.test.ts
│           └── journal-entry.test.ts
├── integration/
│   ├── agents/
│   │   ├── cfo-decision.test.ts
│   │   └── payroll-flow.test.ts
│   └── api/
│       ├── invoice-flow.test.ts
│       └── reconciliation.test.ts
├── e2e/
│   └── flows/
│       ├── signup-onboard-close.spec.ts
│       ├── auth.spec.ts
│       └── payment.spec.ts
├── eval/
│   ├── golden-dataset/
│   │   ├── categorization.json
│   │   ├── reconciliation.json
│   │   └── journal-entries.json
│   ├── run-eval.ts
│   └── helpers.ts
├── perf/
│   ├── api-load.test.ts
│   └── agent-benchmarks.test.ts
├── fixtures/
│   ├── factories.ts
│   └── seed-data.json
└── helpers/
    ├── trpc.ts
    ├── db.ts
    ├── llm.ts
    ├── neon.ts
    └── test-context.ts
```

---

## 11. Running Tests

```bash
# All unit + integration tests
pnpm test

# Unit tests only
pnpm test --filter unit

# Integration tests only
pnpm test --filter integration

# E2E tests
pnpm test:e2e

# Agent evaluation
pnpm agents:eval

# Coverage report
pnpm test:coverage

# Performance benchmarks
pnpm test --filter perf
```
