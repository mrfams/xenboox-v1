import { db } from "@xenboox/db";
import { chartOfAccounts } from "@xenboox/db/schema/accounting";
import { eq, and, like, or, sql } from "drizzle-orm";
import type {
  CoaMapping,
  CoaLine,
  SuggestedAccount,
  AccountingTreatment,
} from "../core/types";

// ─── Main Mapper ────────────────────────────────────────────────────────────

/**
 * Map suggested accounts from the accounting treatment to actual COA entries
 * for the entity. Uses code-based exact matching first, then name/subtype fuzzy matching.
 */
export async function mapToChartOfAccounts(
  entityId: string,
  treatment: AccountingTreatment,
): Promise<CoaMapping> {
  const allSuggestions = [
    ...treatment.debitAccounts.map((a) => ({ ...a, side: "debit" as const })),
    ...treatment.creditAccounts.map((a) => ({ ...a, side: "credit" as const })),
  ];

  const debitLines: CoaLine[] = [];
  const creditLines: CoaLine[] = [];
  const unmapped: SuggestedAccount[] = [];

  for (const suggestion of allSuggestions) {
    // Try exact code match first
    let account = await findAccountByCode(entityId, suggestion.suggestedCode);

    // If no exact code match, try name/subtype fuzzy match
    if (!account) {
      account = await findAccountByLabel(
        entityId,
        suggestion.label,
        suggestion.accountType,
      );
    }

    if (account) {
      const line: CoaLine = {
        accountId: account.id,
        accountCode: account.code,
        accountName: account.name,
        amount: suggestion.amount,
        description: suggestion.label,
        confidence:
          suggestion.suggestedCode && account.code === suggestion.suggestedCode
            ? 0.95
            : 0.75,
      };

      if (suggestion.side === "debit") {
        debitLines.push(line);
      } else {
        creditLines.push(line);
      }
    } else {
      // Couldn't find a matching account
      unmapped.push(suggestion);
    }
  }

  // Build line-level confidence map
  const lineConfidence: Record<string, number> = {};
  for (const line of [...debitLines, ...creditLines]) {
    lineConfidence[line.accountCode] = line.confidence;
  }

  return {
    debitLines,
    creditLines,
    lineConfidence,
    unmapped,
  };
}

/**
 * Automatically register unmapped suggested accounts in the COA.
 * Only use when the ingestion confidence is high enough to trust the suggestion.
 */
export async function registerUnmappedAccounts(
  entityId: string,
  unmapped: SuggestedAccount[],
): Promise<CoaLine[]> {
  const newLines: CoaLine[] = [];

  // Find the next available code in the relevant range
  const existingAccounts = await db.query.chartOfAccounts.findMany({
    where: eq(chartOfAccounts.entityId, entityId),
  });

  const existingCodes = new Set(existingAccounts.map((a) => a.code));

  for (const suggestion of unmapped) {
    // Find a unique code
    let code = suggestion.suggestedCode ?? generateCode(suggestion.accountType);
    while (existingCodes.has(code)) {
      code = incrementCode(code);
    }

    // Map the account type to valid enum values
    const validTypes = [
      "asset",
      "liability",
      "equity",
      "revenue",
      "expense",
    ] as const;
    const accountType = validTypes.includes(
      suggestion.accountType as (typeof validTypes)[number],
    )
      ? (suggestion.accountType as (typeof validTypes)[number])
      : "expense";

    const validSubtypes = [
      "current_asset",
      "fixed_asset",
      "bank_account",
      "cash",
      "accounts_receivable",
      "inventory",
      "prepaid",
      "current_liability",
      "long_term_liability",
      "accounts_payable",
      "tax_liability",
      "accrued_liability",
      "owner_equity",
      "retained_earnings",
      "current_year_earnings",
      "sales_revenue",
      "service_revenue",
      "other_income",
      "interest_income",
      "cost_of_goods_sold",
      "operating_expense",
      "payroll_expense",
      "tax_expense",
      "depreciation",
      "interest_expense",
      "other_expense",
    ] as const;
    const subtype = mapTypeToSubtype(accountType);
    const accountSubtype = validSubtypes.includes(
      subtype as (typeof validSubtypes)[number],
    )
      ? (subtype as (typeof validSubtypes)[number])
      : "other_expense";

    // Register the account
    const [account] = await db
      .insert(chartOfAccounts)
      .values({
        entityId,
        code,
        name: suggestion.label,
        type: accountType,
        subtype: accountSubtype,
        description: `Auto-created by ingestion engine: ${suggestion.label}`,
        isActive: true,
      })
      .returning();

    existingCodes.add(code);

    newLines.push({
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      amount: suggestion.amount,
      description: suggestion.label,
      confidence: 0.85,
    });
  }

  return newLines;
}

// ─── Account Lookup Helpers ─────────────────────────────────────────────────

async function findAccountByCode(entityId: string, code?: string) {
  if (!code) return null;

  return db.query.chartOfAccounts.findFirst({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.code, code),
      eq(chartOfAccounts.isActive, true),
    ),
  });
}

async function findAccountByLabel(
  entityId: string,
  label: string,
  accountType: string,
) {
  // Try matching against name or description
  const accounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
      eq(chartOfAccounts.isActive, true),
    ),
  });

  const labelLower = label.toLowerCase();
  const typeMapped = mapLabelToType(label);

  // Score each account by how well it matches
  const scored = accounts
    .map((acc) => {
      let score = 0;

      // Exact name match
      if (acc.name.toLowerCase() === labelLower) score += 10;
      // Partial name match
      else if (
        acc.name.toLowerCase().includes(labelLower) ||
        labelLower.includes(acc.name.toLowerCase())
      )
        score += 5;

      // Type match
      if (acc.type === typeMapped || acc.type === accountType) score += 3;

      // Subtype match
      if (acc.subtype && labelLower.includes(acc.subtype.replace(/_/g, " ")))
        score += 2;

      // Description match
      if (acc.description?.toLowerCase().includes(labelLower)) score += 2;

      return { account: acc, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored[0]?.account ?? null;
}

// ─── Type Helpers ───────────────────────────────────────────────────────────

function mapLabelToType(label: string): string {
  const l = label.toLowerCase();
  if (
    l.includes("expense") ||
    l.includes("cost") ||
    l.includes("payroll") ||
    l.includes("salary")
  )
    return "expense";
  if (
    l.includes("asset") ||
    l.includes("cash") ||
    l.includes("bank") ||
    l.includes("receivable") ||
    l.includes("inventory")
  )
    return "asset";
  if (
    l.includes("liability") ||
    l.includes("payable") ||
    l.includes("loan") ||
    l.includes("tax")
  )
    return "liability";
  if (l.includes("equity") || l.includes("capital") || l.includes("owner"))
    return "equity";
  if (l.includes("revenue") || l.includes("income") || l.includes("sale"))
    return "revenue";
  return "expense";
}

function mapTypeToSubtype(type: string): string {
  const map: Record<string, string> = {
    asset: "current_asset",
    liability: "current_liability",
    equity: "owner_equity",
    revenue: "sales_revenue",
    expense: "operating_expense",
  };
  return map[type] ?? "other_expense";
}

function generateCode(type: string): string {
  const ranges: Record<string, string> = {
    asset: "1020",
    liability: "2010",
    equity: "3010",
    revenue: "4010",
    expense: "7010",
  };
  return ranges[type] ?? "9999";
}

function incrementCode(code: string): string {
  const num = parseInt(code, 10);
  return String(num + 1).padStart(code.length, "0");
}
