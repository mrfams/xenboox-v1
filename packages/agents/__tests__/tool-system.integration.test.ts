/**
 * Tool System Integration Tests — Real Database
 *
 * These tests run against a real PostgreSQL database (Neon).
 * They verify the complete tool system end-to-end:
 * - Real grant lookups from the tool_grants table
 * - Real audit logging to audit_log and agent_activity tables
 * - Real input validation via zod schemas
 * - Real tool execution with database queries
 *
 * IMPORTANT: These tests require DATABASE_URL to be set.
 * They use a test-specific entity ID to isolate test data.
 * All test data is cleaned up in afterAll.
 *
 * Run with: pnpm test --filter=@xenboox/agents -- --testPathPattern=integration
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@xenboox/db";
import { eq, and, sql } from "drizzle-orm";
// Note: sql is used for raw queries in cleanup
import {
  toolGrants,
  auditLog,
  agentActivity,
  chartOfAccounts,
} from "@xenboox/db/schema";
import {
  entities,
  organizations,
  userEntityAccess,
  users,
} from "@xenboox/db/schema/organization";
import {
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";

// ─── Test Constants ───────────────────────────────────────────────────────

const TEST_ENTITY_ID = "00000000-0000-0000-0000-000000000099"; // Test entity
const TEST_USER_ID = "00000000-0000-0000-0000-000000000098"; // Test user
const TEST_ORG_ID = "00000000-0000-0000-0000-000000000097"; // Test org

// Account IDs for testing (using existing seed data pattern)
const CASH_ACCOUNT_ID = "00000000-0000-0000-0000-000000000001"; // Assume this exists from seed
const BANK_ACCOUNT_ID = "00000000-0000-0000-0000-000000000002"; // Assume this exists from seed

// ─── Helpers ──────────────────────────────────────────────────────────────

function makeCtx(agentName: string) {
  return {
    entityId: TEST_ENTITY_ID,
    agentName,
    userId: TEST_USER_ID,
    traceId: `test-trace-${Date.now()}`,
    timestamp: new Date(),
  };
}

// ─── Setup & Teardown ─────────────────────────────────────────────────────

let dbAvailable = false;

beforeAll(async () => {
  console.log("\n[integration] Setting up test data...");

  // Check if database is available
  try {
    await db.execute(sql`SELECT 1`);
    dbAvailable = true;
  } catch {
    console.warn(
      "[integration] Database not available — tests will be skipped",
    );
    console.warn(
      "[integration] Set DATABASE_URL in .env to enable integration tests",
    );
    return;
  }

  // 1. Create test organization
  await db
    .insert(organizations)
    .values({
      id: TEST_ORG_ID,
      name: "Test Organization",
      slug: "test-org-integration",
      type: "business",
      plan: "free",
      ownerId: TEST_USER_ID,
    })
    .onConflictDoNothing();

  // 2. Create test entity
  await db
    .insert(entities)
    .values({
      id: TEST_ENTITY_ID,
      organizationId: TEST_ORG_ID,
      name: "Test Entity",
      type: "company",
      currency: "GMD",
      country: "GM",
      fiscalYearEnd: "12",
    })
    .onConflictDoNothing();

  // 3. Create test user
  await db
    .insert(users)
    .values({
      id: TEST_USER_ID,
      name: "Test User",
      email: "test-integration@xenboox.com",
    })
    .onConflictDoNothing();

  // 4. Grant user access to test entity
  await db
    .insert(userEntityAccess)
    .values({
      userId: TEST_USER_ID,
      entityId: TEST_ENTITY_ID,
      role: "owner",
      grantedBy: TEST_USER_ID,
    })
    .onConflictDoNothing();

  // 5. Create test tool grants
  const testGrants = [
    // CFO: read-only tools
    {
      agentName: "cfo",
      toolName: "get_account_balance",
      action: "execute" as const,
    },
    {
      agentName: "cfo",
      toolName: "get_recent_journal_entries",
      action: "execute" as const,
    },
    {
      agentName: "cfo",
      toolName: "get_account_by_code",
      action: "execute" as const,
    },

    // Controller: read + validate
    {
      agentName: "controller",
      toolName: "get_account_balance",
      action: "execute" as const,
    },
    {
      agentName: "controller",
      toolName: "validate_double_entry",
      action: "execute" as const,
    },
    {
      agentName: "controller",
      toolName: "get_account_by_code",
      action: "execute" as const,
    },

    // Ledger: validate + read
    {
      agentName: "ledger",
      toolName: "validate_double_entry",
      action: "execute" as const,
    },
    {
      agentName: "ledger",
      toolName: "get_account_balance",
      action: "execute" as const,
    },
    {
      agentName: "ledger",
      toolName: "get_account_by_code",
      action: "execute" as const,
    },

    // Treasury: read only
    {
      agentName: "treasury",
      toolName: "get_account_balance",
      action: "execute" as const,
    },

    // Document: minimal
    {
      agentName: "document",
      toolName: "get_account_by_code",
      action: "execute" as const,
    },
  ];

  for (const grant of testGrants) {
    await db
      .insert(toolGrants)
      .values({
        entityId: TEST_ENTITY_ID,
        ...grant,
        isActive: true,
        grantedBy: "test-setup",
        notes: "Integration test grant",
      })
      .onConflictDoNothing();
  }

  // 6. Create test chart of accounts entries
  const testAccounts = [
    {
      id: CASH_ACCOUNT_ID,
      code: "1010",
      name: "Test Cash",
      type: "asset",
      subtype: "cash",
    },
    {
      id: BANK_ACCOUNT_ID,
      code: "1020",
      name: "Test Bank",
      type: "asset",
      subtype: "bank_account",
    },
  ];

  for (const acct of testAccounts) {
    await db
      .insert(chartOfAccounts)
      .values({
        id: acct.id,
        entityId: TEST_ENTITY_ID,
        code: acct.code,
        name: acct.name,
        type: acct.type as any,
        subtype: acct.subtype as any,
        isActive: true,
      })
      .onConflictDoNothing();
  }

  console.log("[integration] Test data created.");
});

afterAll(async () => {
  if (!dbAvailable) return;
  console.log("\n[integration] Cleaning up test data...");

  // Clean up in reverse order of dependencies
  await db
    .delete(agentActivity)
    .where(eq(agentActivity.entityId, TEST_ENTITY_ID));
  await db.delete(auditLog).where(eq(auditLog.entityId, TEST_ENTITY_ID));
  await db.delete(toolGrants).where(eq(toolGrants.entityId, TEST_ENTITY_ID));
  await db
    .delete(journalEntryLines)
    .where(
      sql`journal_entry_id IN (SELECT id FROM journal_entries WHERE entity_id = ${TEST_ENTITY_ID})`,
    );
  await db
    .delete(journalEntries)
    .where(eq(journalEntries.entityId, TEST_ENTITY_ID));
  await db
    .delete(chartOfAccounts)
    .where(eq(chartOfAccounts.entityId, TEST_ENTITY_ID));
  await db
    .delete(userEntityAccess)
    .where(eq(userEntityAccess.entityId, TEST_ENTITY_ID));
  await db.delete(entities).where(eq(entities.id, TEST_ENTITY_ID));
  await db.delete(organizations).where(eq(organizations.id, TEST_ORG_ID));
  await db.delete(users).where(eq(users.id, TEST_USER_ID));

  console.log("[integration] Test data cleaned up.");
});

// ─── Integration Tests ────────────────────────────────────────────────────

const describeDb = dbAvailable ? describe : describe.skip;

describeDb("Tool System Integration — Real Database", () => {
  describe("Grant Lookup (checkGrant)", () => {
    it("finds entity-level grant in database", async () => {
      // Import the actual executor (no mocks)
      const { checkGrant } = await import("../core/tool-executor");

      const result = await checkGrant(
        TEST_ENTITY_ID,
        "cfo",
        "get_account_balance",
      );

      expect(result.allowed).toBe(true);
      expect(result.grantFound).toBe(true); // Found in DB, not default config
    });

    it("denies tool not in entity grants", async () => {
      const { checkGrant } = await import("../core/tool-executor");

      // CFO does NOT have validate_double_entry in our test grants
      const result = await checkGrant(
        TEST_ENTITY_ID,
        "cfo",
        "validate_double_entry",
      );

      expect(result.allowed).toBe(false);
      expect(result.grantFound).toBe(false);
    });

    it("allows controller to use validate_double_entry", async () => {
      const { checkGrant } = await import("../core/tool-executor");

      const result = await checkGrant(
        TEST_ENTITY_ID,
        "controller",
        "validate_double_entry",
      );

      expect(result.allowed).toBe(true);
      expect(result.grantFound).toBe(true);
    });

    it("allows ledger to use validate_double_entry", async () => {
      const { checkGrant } = await import("../core/tool-executor");

      const result = await checkGrant(
        TEST_ENTITY_ID,
        "ledger",
        "validate_double_entry",
      );

      expect(result.allowed).toBe(true);
      expect(result.grantFound).toBe(true);
    });

    it("denies unknown agent (not in grants table)", async () => {
      const { checkGrant } = await import("../core/tool-executor");

      const result = await checkGrant(
        TEST_ENTITY_ID,
        "unknown_agent",
        "get_account_balance",
      );

      expect(result.allowed).toBe(false);
    });

    it("denies inactive grant", async () => {
      // Temporarily create an inactive grant
      const grantId = `test-inactive-${Date.now()}`;
      await db.insert(toolGrants).values({
        id: grantId,
        entityId: TEST_ENTITY_ID,
        agentName: "test_inactive",
        toolName: "get_account_balance",
        action: "execute",
        isActive: false, // Inactive
        grantedBy: "test",
      });

      const { checkGrant } = await import("../core/tool-executor");

      const result = await checkGrant(
        TEST_ENTITY_ID,
        "test_inactive",
        "get_account_balance",
      );

      expect(result.allowed).toBe(false);

      // Cleanup
      await db.delete(toolGrants).where(eq(toolGrants.id, grantId));
    });
  });

  describe("Tool Execution (executeTool)", () => {
    it("executes validate_double_entry with real validation", async () => {
      const { executeTool } = await import("../core/tool-executor");

      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: CASH_ACCOUNT_ID, debit: "100.00", credit: "0.00" },
            { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "100.00" },
          ],
        },
        makeCtx("ledger"),
      );

      expect(result.result.success).toBe(true);
      expect(result.allowed).toBe(true);
      expect(result.result.data).toBeDefined();
      expect(result.result.confidence).toBe(1.0); // Balanced
    });

    it("returns low confidence for unbalanced entry", async () => {
      const { executeTool } = await import("../core/tool-executor");

      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: CASH_ACCOUNT_ID, debit: "100.00", credit: "0.00" },
            { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "99.00" },
          ],
        },
        makeCtx("ledger"),
      );

      expect(result.result.success).toBe(true);
      expect(result.result.confidence).toBe(0.0); // Unbalanced
    });

    it("denies CFO from using validate_double_entry", async () => {
      const { executeTool } = await import("../core/tool-executor");

      const result = await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: CASH_ACCOUNT_ID, debit: "100.00", credit: "0.00" },
            { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "100.00" },
          ],
        },
        makeCtx("cfo"), // CFO doesn't have this tool
      );

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("Access denied");
      expect(result.allowed).toBe(false);
    });

    it("validates input schema (rejects invalid input)", async () => {
      const { executeTool } = await import("../core/tool-executor");

      const result = await executeTool(
        "validate_double_entry",
        { invalid: "input" }, // Missing 'lines' field
        makeCtx("ledger"),
      );

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("validation");
    });

    it("returns error for unknown tool", async () => {
      const { executeTool } = await import("../core/tool-executor");

      const result = await executeTool(
        "nonexistent_tool",
        {},
        makeCtx("ledger"),
      );

      expect(result.result.success).toBe(false);
      expect(result.result.error).toContain("not found");
    });
  });

  describe("Audit Trail (Real DB)", () => {
    it("logs successful tool execution to audit_log", async () => {
      const { executeTool } = await import("../core/tool-executor");
      const traceId = `audit-test-${Date.now()}`;

      await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: CASH_ACCOUNT_ID, debit: "50.00", credit: "0.00" },
            { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "50.00" },
          ],
        },
        { ...makeCtx("ledger"), traceId },
      );

      // Verify audit log was created
      const logs = await db.query.auditLog.findMany({
        where: and(
          eq(auditLog.entityId, TEST_ENTITY_ID),
          eq(auditLog.entityIdRef, traceId),
        ),
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
      expect(logs[0].action).toContain("validate_double_entry");
      expect(logs[0].entityType).toBe("tool_execution");
    });

    it("logs denied tool execution to audit_log", async () => {
      const { executeTool } = await import("../core/tool-executor");
      const traceId = `audit-denied-${Date.now()}`;

      await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: CASH_ACCOUNT_ID, debit: "50.00", credit: "0.00" },
            { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "50.00" },
          ],
        },
        { ...makeCtx("cfo"), traceId }, // CFO denied
      );

      // Verify denied attempt was logged
      const logs = await db.query.auditLog.findMany({
        where: and(
          eq(auditLog.entityId, TEST_ENTITY_ID),
          sql`action LIKE ${"%.denied%"}`,
        ),
      });

      expect(logs.length).toBeGreaterThanOrEqual(1);
    });

    it("logs to agent_activity table", async () => {
      const { executeTool } = await import("../core/tool-executor");
      const traceId = `activity-test-${Date.now()}`;

      await executeTool(
        "validate_double_entry",
        {
          lines: [
            { accountId: CASH_ACCOUNT_ID, debit: "25.00", credit: "0.00" },
            { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "25.00" },
          ],
        },
        { ...makeCtx("ledger"), traceId },
      );

      // Verify agent activity was logged
      const activities = await db.query.agentActivity.findMany({
        where: eq(agentActivity.entityId, TEST_ENTITY_ID),
        orderBy: [sql`${agentActivity.createdAt} DESC`],
        limit: 5,
      });

      expect(activities.length).toBeGreaterThanOrEqual(1);
      expect(activities[0].agentName).toBe("ledger");
      expect(activities[0].action).toContain("validate_double_entry");
    });
  });

  describe("Batch Execution (executeToolCalls)", () => {
    it("executes multiple tools in sequence against real DB", async () => {
      const { executeToolCalls } = await import("../core/tool-executor");

      const results = await executeToolCalls(
        [
          {
            name: "validate_double_entry",
            arguments: {
              lines: [
                { accountId: CASH_ACCOUNT_ID, debit: "100.00", credit: "0.00" },
                { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "100.00" },
              ],
            },
          },
          {
            name: "validate_double_entry",
            arguments: {
              lines: [
                { accountId: CASH_ACCOUNT_ID, debit: "200.00", credit: "0.00" },
                { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "200.00" },
              ],
            },
          },
        ],
        makeCtx("ledger"),
      );

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.result.success)).toBe(true);
      expect(results.every((r) => r.allowed)).toBe(true);
    });

    it("stops on first error with stopOnError", async () => {
      const { executeToolCalls } = await import("../core/tool-executor");

      const results = await executeToolCalls(
        [
          { name: "nonexistent_tool", arguments: {} },
          {
            name: "validate_double_entry",
            arguments: {
              lines: [
                { accountId: CASH_ACCOUNT_ID, debit: "100.00", credit: "0.00" },
                { accountId: BANK_ACCOUNT_ID, debit: "0.00", credit: "100.00" },
              ],
            },
          },
        ],
        makeCtx("ledger"),
        true, // stopOnError
      );

      expect(results).toHaveLength(1);
      expect(results[0].result.success).toBe(false);
    });
  });

  describe("Concurrent Access (Real DB)", () => {
    it("handles 10 concurrent tool executions", async () => {
      const { executeTool } = await import("../core/tool-executor");

      const promises = Array.from({ length: 10 }, (_, i) =>
        executeTool(
          "validate_double_entry",
          {
            lines: [
              {
                accountId: CASH_ACCOUNT_ID,
                debit: `${(i + 1) * 10}.00`,
                credit: "0.00",
              },
              {
                accountId: BANK_ACCOUNT_ID,
                debit: "0.00",
                credit: `${(i + 1) * 10}.00`,
              },
            ],
          },
          makeCtx("ledger"),
        ),
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(10);
      expect(results.every((r) => r.result.success)).toBe(true);
      expect(results.every((r) => r.result.confidence === 1.0)).toBe(true); // All balanced
    });
  });

  describe("Get Agent Grants (Admin Query)", () => {
    it("returns all grants for an agent", async () => {
      const { getAgentGrants } = await import("../core/tool-executor");

      const grants = await getAgentGrants(TEST_ENTITY_ID, "cfo");

      expect(grants.length).toBeGreaterThanOrEqual(3); // We seeded 3 for CFO
      expect(grants.every((g) => g.isActive)).toBe(true);
      expect(grants.every((g) => g.toolName)).toBeTruthy();
    });

    it("returns empty for agent with no grants", async () => {
      const { getAgentGrants } = await import("../core/tool-executor");

      const grants = await getAgentGrants(TEST_ENTITY_ID, "nonexistent_agent");

      expect(grants).toHaveLength(0);
    });
  });
});
