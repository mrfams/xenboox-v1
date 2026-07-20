import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { db } from "@xenboox/db";
import { eq, and, desc } from "drizzle-orm";
import {
  chartOfAccounts,
  journalEntries,
  journalEntryLines,
} from "@xenboox/db/schema/accounting";
import { validateDoubleEntry as validateDoubleEntryRule } from "./accounting-rules";

export const validateDoubleEntry = tool(
  async ({ lines }) => {
    // Delegate to centralized accounting rules engine for deterministic validation
    const result = validateDoubleEntryRule(
      lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
      })),
    );

    return {
      success: true,
      balanced: result.balanced,
      totalDebit: result.totalDebit,
      totalCredit: result.totalCredit,
      difference: result.difference,
      lineCount: result.lineCount,
      errors: result.errors,
    };
  },
  {
    name: "validate_double_entry",
    description:
      "Validate that journal entry lines balance (debits == credits) and follow double-entry rules. Delegates to centralized accounting rules engine.",
    schema: z.object({
      lines: z.array(
        z.object({
          accountId: z.string(),
          debit: z.string(),
          credit: z.string(),
        }),
      ),
    }),
  },
);

export const getAccountBalance = tool(
  async ({ entityId, accountCode }) => {
    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, accountCode),
      ),
    });

    if (!account) {
      return { success: false, error: `Account ${accountCode} not found` };
    }

    const entries = await db.query.journalEntries.findMany({
      where: and(
        eq(journalEntries.entityId, entityId),
        eq(journalEntries.status, "posted"),
      ),
    });

    let balance = 0;
    for (const entry of entries) {
      const lines = await db.query.journalEntryLines.findMany({
        where: eq(journalEntryLines.journalEntryId, entry.id),
      });
      for (const line of lines) {
        if (line.accountId === account.id) {
          balance += Number(line.debit) - Number(line.credit);
        }
      }
    }

    return {
      success: true,
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      balance,
    };
  },
  {
    name: "get_account_balance",
    description: "Get the current balance of a specific account by code",
    schema: z.object({
      entityId: z.string().uuid(),
      accountCode: z.string(),
    }),
  },
);

export const getJournalEntryLines = tool(
  async ({ entityId, entryId }) => {
    const entry = await db.query.journalEntries.findFirst({
      where: and(
        eq(journalEntries.id, entryId),
        eq(journalEntries.entityId, entityId),
      ),
    });

    if (!entry) {
      return { success: false, error: "Journal entry not found" };
    }

    const lines = await db.query.journalEntryLines.findMany({
      where: eq(journalEntryLines.journalEntryId, entryId),
    });

    return {
      success: true,
      entry: {
        id: entry.id,
        entryNumber: entry.entryNumber,
        description: entry.description,
        status: entry.status,
        date: entry.date,
      },
      lines: lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        description: l.description,
      })),
    };
  },
  {
    name: "get_journal_entry_lines",
    description: "Get the lines of a specific journal entry",
    schema: z.object({
      entityId: z.string().uuid(),
      entryId: z.string().uuid(),
    }),
  },
);

export const getRecentJournalEntries = tool(
  async ({ entityId, limit }) => {
    const entries = await db.query.journalEntries.findMany({
      where: eq(journalEntries.entityId, entityId),
      orderBy: [desc(journalEntries.createdAt)],
      limit: limit ?? 20,
    });

    return {
      success: true,
      entries: entries.map((e) => ({
        id: e.id,
        entryNumber: e.entryNumber,
        description: e.description,
        status: e.status,
        date: e.date,
        reference: e.reference,
      })),
    };
  },
  {
    name: "get_recent_journal_entries",
    description: "Get recent journal entries for an entity",
    schema: z.object({
      entityId: z.string().uuid(),
      limit: z.number().int().min(1).max(100).optional(),
    }),
  },
);

export const getAccountByCode = tool(
  async ({ entityId, code }) => {
    const account = await db.query.chartOfAccounts.findFirst({
      where: and(
        eq(chartOfAccounts.entityId, entityId),
        eq(chartOfAccounts.code, code),
      ),
    });

    if (!account) {
      return { success: false, error: `Account ${code} not found` };
    }

    return {
      success: true,
      account: {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        parentId: account.parentId,
        isActive: account.isActive,
      },
    };
  },
  {
    name: "get_account_by_code",
    description: "Look up a chart of accounts entry by its code",
    schema: z.object({
      entityId: z.string().uuid(),
      code: z.string(),
    }),
  },
);
