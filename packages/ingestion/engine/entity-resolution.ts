/**
 * Entity Resolution Engine
 *
 * Matches extracted document data (vendor names, customer names, employee names,
 * bank account numbers, etc.) to existing records in the database.
 *
 * This implements Stage 4 of the ingestion pipeline.
 */

import { db } from "@xenboox/db";
import { eq, and, sql } from "drizzle-orm";
import {
  suppliers,
  customers,
  employees,
  bankAccounts,
} from "@xenboox/db/schema";
import { purchaseOrders } from "@xenboox/db/schema/ap-ar";
import { fixedAssets } from "@xenboox/db/schema/fixed-assets";
import type { ResolvedEntities } from "../core/types";

// ─── Configuration ──────────────────────────────────────────────────────────

interface MatchConfig {
  /** Minimum similarity score (0-1) to consider a match */
  threshold: number;
  /** Whether to perform fuzzy matching on names */
  fuzzyMatch: boolean;
  /** Whether to create unmatched entities automatically */
  autoCreate: boolean;
}

const DEFAULT_CONFIG: MatchConfig = {
  threshold: 0.6,
  fuzzyMatch: true,
  autoCreate: false,
};

// ─── Main Resolver ──────────────────────────────────────────────────────────

/**
 * Resolve all entities referenced in the extracted document data.
 * Searches for vendors, customers, employees, bank accounts, assets,
 * and projects. Returns the resolved entities with confidence scores.
 *
 * @param entityId - The entity to scope searches to
 * @param extractedData - The extracted document fields
 * @param config - Optional matching configuration
 */
export async function resolveEntities(
  entityId: string,
  extractedData: Record<string, unknown>,
  config: Partial<MatchConfig> = {},
): Promise<ResolvedEntities> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const dataStr = JSON.stringify(extractedData).toLowerCase();

  const resolved: ResolvedEntities = {};

  // ── Resolve Vendor ──────────────────────────────────────────────────────
  const vendorName = findField(extractedData, [
    "vendorName",
    "supplierName",
    "merchantName",
    "vendor",
    "supplier",
    "payee",
    "sellerName",
  ]);
  if (vendorName) {
    const vendor = await resolveSupplier(entityId, vendorName, cfg);
    if (vendor) {
      resolved.vendor = vendor;
    } else if (dataStr.includes("vendor") || dataStr.includes("supplier")) {
      resolved.unmatched = resolved.unmatched ?? [];
      resolved.unmatched.push({
        type: "vendor",
        name: vendorName,
        suggestion: `Create vendor "${vendorName}"`,
      });
    }
  }

  // ── Resolve Customer ────────────────────────────────────────────────────
  const customerName = findField(extractedData, [
    "customerName",
    "clientName",
    "billTo",
    "customer",
    "client",
    "payerName",
  ]);
  if (customerName) {
    const customer = await resolveCustomer(entityId, customerName, cfg);
    if (customer) {
      resolved.customer = customer;
    } else if (dataStr.includes("customer") || dataStr.includes("client")) {
      resolved.unmatched = resolved.unmatched ?? [];
      resolved.unmatched.push({
        type: "customer",
        name: customerName,
        suggestion: `Create customer "${customerName}"`,
      });
    }
  }

  // ── Resolve Employee ────────────────────────────────────────────────────
  const employeeName = findField(extractedData, [
    "employeeName",
    "name",
    "preparedBy",
    "submittedBy",
    "employee",
  ]);
  if (employeeName && isPayrollOrExpenseContext(dataStr)) {
    const employee = await resolveEmployee(entityId, employeeName, cfg);
    if (employee) {
      resolved.employee = employee;
    } else if (dataStr.includes("employee") || dataStr.includes("payroll")) {
      resolved.unmatched = resolved.unmatched ?? [];
      resolved.unmatched.push({
        type: "employee",
        name: employeeName,
        suggestion: `Create employee "${employeeName}"`,
      });
    }
  }

  // ── Resolve Bank Account ────────────────────────────────────────────────
  const accountNumber = findField(extractedData, [
    "bankAccountNumber",
    "accountNumber",
    "sourceAccount",
    "destinationAccount",
    "account",
  ]);
  const bankName = findField(extractedData, [
    "bankName",
    "bank",
    "financialInstitution",
  ]);
  if (accountNumber || bankName) {
    const bankAccount = await resolveBankAccount(
      entityId,
      accountNumber ?? "",
      bankName ?? "",
      cfg,
    );
    if (bankAccount) {
      resolved.bankAccount = bankAccount;
    }
  }

  // ── Resolve Fixed Asset (for asset-related documents) ────────────────────
  if (
    dataStr.includes("asset") ||
    dataStr.includes("equipment") ||
    dataStr.includes("depreciation")
  ) {
    const assetName = findField(extractedData, [
      "assetName",
      "itemDescription",
      "description",
      "asset",
    ]);
    if (assetName) {
      const asset = await resolveAsset(entityId, assetName, cfg);
      if (asset) {
        resolved.asset = asset;
      }
    }
  }

  // ── Resolve Purchase Order ──────────────────────────────────────────────
  const poNumber = findField(extractedData, [
    "poNumber",
    "purchaseOrderNumber",
    "referenceNumber",
    "poRef",
  ]);
  if (poNumber) {
    const po = await resolvePurchaseOrder(entityId, poNumber, cfg);
    if (po) {
      resolved.po = po;
    }
  }

  return resolved;
}

// ─── Individual Resolvers ───────────────────────────────────────────────────

async function resolveSupplier(
  entityId: string,
  name: string,
  config: MatchConfig,
): Promise<{ id: string; name: string; confidence: number } | null> {
  // Exact match on name
  const exact = await db.query.suppliers.findFirst({
    where: and(
      eq(suppliers.entityId, entityId),
      eq(suppliers.isActive, true),
      sql`LOWER(${suppliers.name}) = LOWER(${name})`,
    ),
  });
  if (exact) return { id: exact.id, name: exact.name, confidence: 0.98 };

  if (!config.fuzzyMatch) return null;

  // Fuzzy match — use SQL LIKE to narrow candidates before scoring
  const searchWords = name.toLowerCase().split(/\s+/).filter(Boolean);
  const likeConditions = searchWords.map(
    (w) => sql`LOWER(${suppliers.name}) LIKE ${"%" + w + "%"}`,
  );

  const candidateSuppliers = await db.query.suppliers.findMany({
    where: and(
      eq(suppliers.entityId, entityId),
      eq(suppliers.isActive, true),
      ...likeConditions,
    ),
  });

  const scored = scoreNameMatches(
    candidateSuppliers.map((s) => ({ id: s.id, name: s.name })),
    name,
  );
  if (scored.length > 0 && scored[0].score >= config.threshold) {
    return {
      id: scored[0].id,
      name: scored[0].name,
      confidence: scored[0].score,
    };
  }

  return null;
}

async function resolveCustomer(
  entityId: string,
  name: string,
  config: MatchConfig,
): Promise<{ id: string; name: string; confidence: number } | null> {
  const exact = await db.query.customers.findFirst({
    where: and(
      eq(customers.entityId, entityId),
      eq(customers.isActive, true),
      sql`LOWER(${customers.name}) = LOWER(${name})`,
    ),
  });
  if (exact) return { id: exact.id, name: exact.name, confidence: 0.98 };

  if (!config.fuzzyMatch) return null;

  const searchWords = name.toLowerCase().split(/\s+/).filter(Boolean);
  const likeConditions = searchWords.map(
    (w) => sql`LOWER(${customers.name}) LIKE ${"%" + w + "%"}`,
  );

  const candidateCustomers = await db.query.customers.findMany({
    where: and(
      eq(customers.entityId, entityId),
      eq(customers.isActive, true),
      ...likeConditions,
    ),
  });

  const scored = scoreNameMatches(
    candidateCustomers.map((c) => ({ id: c.id, name: c.name })),
    name,
  );
  if (scored.length > 0 && scored[0].score >= config.threshold) {
    return {
      id: scored[0].id,
      name: scored[0].name,
      confidence: scored[0].score,
    };
  }

  return null;
}

async function resolveEmployee(
  entityId: string,
  name: string,
  config: MatchConfig,
): Promise<{ id: string; name: string; confidence: number } | null> {
  const exact = await db.query.employees.findFirst({
    where: and(
      eq(employees.entityId, entityId),
      eq(employees.isActive, true),
      sql`LOWER(${employees.name}) = LOWER(${name})`,
    ),
  });
  if (exact) return { id: exact.id, name: exact.name, confidence: 0.98 };

  if (!config.fuzzyMatch) return null;

  const searchWords = name.toLowerCase().split(/\s+/).filter(Boolean);
  const likeConditions = searchWords.map(
    (w) => sql`LOWER(${employees.name}) LIKE ${"%" + w + "%"}`,
  );

  const candidateEmployees = await db.query.employees.findMany({
    where: and(
      eq(employees.entityId, entityId),
      eq(employees.isActive, true),
      ...likeConditions,
    ),
  });

  const scored = scoreNameMatches(
    candidateEmployees.map((e) => ({ id: e.id, name: e.name })),
    name,
  );
  if (scored.length > 0 && scored[0].score >= config.threshold) {
    return {
      id: scored[0].id,
      name: scored[0].name,
      confidence: scored[0].score,
    };
  }

  return null;
}

async function resolveBankAccount(
  entityId: string,
  accountNumber: string,
  bankName: string,
  config: MatchConfig,
): Promise<{ id: string; name: string; confidence: number } | null> {
  // Try account number match first (highest confidence)
  if (accountNumber) {
    const exact = await db.query.bankAccounts.findFirst({
      where: and(
        eq(bankAccounts.entityId, entityId),
        eq(bankAccounts.accountNumber, accountNumber),
        eq(bankAccounts.isActive, true),
      ),
    });
    if (exact) return { id: exact.id, name: exact.name, confidence: 0.95 };
  }

  // Try bank name fuzzy match
  if (bankName && config.fuzzyMatch) {
    const accounts = await db.query.bankAccounts.findMany({
      where: and(
        eq(bankAccounts.entityId, entityId),
        eq(bankAccounts.isActive, true),
      ),
    });

    const scored = scoreNameMatches(
      accounts.map((a) => ({ id: a.id, name: a.name })),
      bankName,
    );
    if (scored.length > 0 && scored[0].score >= config.threshold) {
      return {
        id: scored[0].id,
        name: scored[0].name,
        confidence: scored[0].score * 0.8,
      };
    }
  }

  return null;
}

async function resolveAsset(
  entityId: string,
  name: string,
  config: MatchConfig,
): Promise<{ id: string; name: string; confidence: number } | null> {
  const exact = await db.query.fixedAssets.findFirst({
    where: and(
      eq(fixedAssets.entityId, entityId),
      eq(fixedAssets.status, "active"),
      sql`LOWER(${fixedAssets.name}) = LOWER(${name})`,
    ),
  });
  if (exact) return { id: exact.id, name: exact.name, confidence: 0.9 };

  if (!config.fuzzyMatch) return null;

  const allAssets = await db.query.fixedAssets.findMany({
    where: and(
      eq(fixedAssets.entityId, entityId),
      eq(fixedAssets.status, "active"),
    ),
  });

  const scored = scoreNameMatches(
    allAssets.map((a) => ({ id: a.id, name: a.name })),
    name,
  );
  if (scored.length > 0 && scored[0].score >= config.threshold) {
    return {
      id: scored[0].id,
      name: scored[0].name,
      confidence: scored[0].score,
    };
  }

  return null;
}

async function resolvePurchaseOrder(
  entityId: string,
  poNumber: string,
  config: MatchConfig,
): Promise<{ id: string; number: string; confidence: number } | null> {
  // Purchase orders use number-based matching with SQL
  const exactPo = await db.query.purchaseOrders.findFirst({
    where: and(
      eq(purchaseOrders.entityId, entityId),
      eq(purchaseOrders.status, "approved"),
      sql`LOWER(${purchaseOrders.poNumber}) = LOWER(${poNumber})`,
    ),
  });
  if (exactPo)
    return { id: exactPo.id, number: exactPo.poNumber, confidence: 0.95 };

  // Partial match
  if (config.fuzzyMatch) {
    const partialPos = await db.query.purchaseOrders.findMany({
      where: and(
        eq(purchaseOrders.entityId, entityId),
        eq(purchaseOrders.status, "approved"),
        sql`LOWER(${purchaseOrders.poNumber}) LIKE LOWER(${"%" + poNumber + "%"}) OR LOWER(${poNumber}) LIKE LOWER(${"%" + sql`COALESCE(${purchaseOrders.poNumber}, '')`} + "%"})`,
      ),
      limit: 5,
    });
    if (partialPos.length > 0) {
      return {
        id: partialPos[0]!.id,
        number: partialPos[0]!.poNumber,
        confidence: 0.7,
      };
    }
  }

  return null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Find the first matching field value from a list of possible field names.
 */
function findField(
  data: Record<string, unknown>,
  possibleNames: string[],
): string | undefined {
  for (const name of possibleNames) {
    const value = data[name];
    if (value && typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Score a list of names against a search string using simple similarity.
 */
function scoreNameMatches(
  items: { id: string; name: string }[],
  searchName: string,
): { id: string; name: string; score: number }[] {
  const searchLower = searchName.toLowerCase().trim();
  const searchWords = searchLower.split(/\s+/).filter(Boolean);

  return items
    .map((item) => {
      const nameLower = item.name.toLowerCase().trim();
      let score = 0;

      // Exact match
      if (nameLower === searchLower) {
        score = 1.0;
      }
      // Contains match
      else if (
        nameLower.includes(searchLower) ||
        searchLower.includes(nameLower)
      ) {
        score = 0.85;
      }
      // Word overlap scoring — exact word matches score higher
      else {
        const nameWords = nameLower.split(/\s+/).filter(Boolean);
        let exactMatches = 0;
        let partialMatches = 0;
        for (const sw of searchWords) {
          if (nameWords.includes(sw)) {
            exactMatches++;
          } else if (
            nameWords.some((nw) => nw.includes(sw) || sw.includes(nw))
          ) {
            partialMatches++;
          }
        }
        const totalWords = Math.max(searchWords.length, nameWords.length);
        score =
          totalWords > 0
            ? (exactMatches * 0.8 + partialMatches * 0.4) / totalWords
            : 0;
      }

      return { id: item.id, name: item.name, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/**
 * Check if the context suggests payroll or expense processing.
 */
function isPayrollOrExpenseContext(dataStr: string): boolean {
  const payrollKeywords = [
    "payroll",
    "salary",
    "wage",
    "employee",
    "staff",
    "compensation",
    "bonus",
    "payslip",
    "pay period",
  ];
  return payrollKeywords.some((kw) => dataStr.includes(kw));
}
