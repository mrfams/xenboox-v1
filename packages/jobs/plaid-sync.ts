/**
 * Plaid Transaction Sync Job
 *
 * Syncs transactions from Plaid using the /transactions/sync endpoint.
 * Uses cursor-based incremental sync — only fetches new/changed/removed
 * transactions since the last sync. Cursor is stored in bank_connections.metadata.
 *
 * Runs every 6 hours via bank-feed-auto-sync, or on-demand when user clicks "Sync".
 */

import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { plaidMagnitude, plaidType } from "./lib/plaid-mapping";
import { db } from "@xenboox/db";
import {
  bankConnections,
  bankTransactions,
  bankAccounts,
  auditLog,
} from "@xenboox/db/schema";
import { decryptConnectionToken } from "@xenboox/db";
import { eq, and, sql } from "drizzle-orm";

const PLAID_API_URL =
  process.env.PLAID_ENV === "production"
    ? "https://production.plaid.com"
    : "https://sandbox.plaid.com";

export const syncPlaidTransactions = task({
  id: "plaid-sync-transactions",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 3,
  },

  onFailure: dlqOnFailure<{
    connectionId: string;
    entityId: string;
  }>({
    task: "plaid-sync-transactions",
    type: "data_validation",
    severity: "high",
    title: (p) => `Plaid sync failed for connection ${p.connectionId}`,
    entityIdFrom: (p) => p.entityId,
  }),

  run: async (payload: { connectionId: string; entityId: string }) => {
    const { connectionId, entityId } = payload;

    logger.info("Starting Plaid transaction sync", { connectionId, entityId });

    // 1. Get connection details
    const connection = await db.query.bankConnections.findFirst({
      where: eq(bankConnections.id, connectionId),
    });

    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const accessToken = decryptConnectionToken(connection.accessToken);
    if (!accessToken) {
      throw new Error(`No access token for connection: ${connectionId}`);
    }

    // 2. Get stored cursor from metadata (for incremental sync)
    const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
    const cursor = (metadata.plaidCursor as string) ?? undefined;

    // 3. Call Plaid /transactions/sync with cursor
    const plaidResponse = await callPlaidTransactionsSync(accessToken, cursor);

    if (!plaidResponse.ok) {
      const errorBody = await plaidResponse.text();
      logger.error("Plaid API error", {
        connectionId,
        status: plaidResponse.status,
        body: errorBody,
      });

      await db
        .update(bankConnections)
        .set({
          status: "error",
          syncError: `Plaid API error: ${plaidResponse.status}`,
        })
        .where(eq(bankConnections.id, connectionId));

      throw new Error(
        `Plaid API returned ${plaidResponse.status}: ${errorBody}`,
      );
    }

    const plaidData =
      (await plaidResponse.json()) as PlaidTransactionsSyncResponse;

    logger.info("Fetched transactions from Plaid", {
      connectionId,
      added: plaidData.added.length,
      modified: plaidData.modified.length,
      removed: plaidData.removed.length,
      hasMore: plaidData.has_more,
    });

    // 4. Find or create bank account for this connection. Scope the lookup to
    // (entityId + connection identity) — a bare accountNumber match can cross
    // entities or pick the wrong account when two are linked to one bank.
    let bankAccountId: string | undefined;

    const accountMetadataMatch = await db.query.bankAccounts.findFirst({
      where: and(
        eq(bankAccounts.entityId, entityId),
        sql`${bankAccounts.metadata}->>'connectionId' = ${connectionId}`,
      ),
    });
    const existingAccount =
      accountMetadataMatch ??
      (await db.query.bankAccounts.findFirst({
        where: and(
          eq(bankAccounts.entityId, entityId),
          eq(bankAccounts.bankName, connection.institutionName),
          connection.accountNumber
            ? eq(bankAccounts.accountNumber, connection.accountNumber)
            : undefined,
        ),
      }));

    if (existingAccount) {
      bankAccountId = existingAccount.id;
      // Tag the account with its connection so future syncs resolve exactly.
      await db
        .update(bankAccounts)
        .set({
          metadata: sql`jsonb_set(COALESCE(metadata, '{}'::jsonb), '{connectionId}', ${JSON.stringify(connectionId)}::jsonb)`,
        })
        .where(eq(bankAccounts.id, existingAccount.id));
    } else {
      const [newAccount] = await db
        .insert(bankAccounts)
        .values({
          entityId,
          name: `${connection.institutionName} - ${connection.accountName ?? connection.accountNumber ?? "Unknown"}`,
          bankName: connection.institutionName,
          accountNumber: connection.accountNumber ?? "",
          currency: connection.currency ?? "USD",
          currentBalance: "0",
          metadata: { connectionId },
        })
        .returning();

      bankAccountId = newAccount!.id;
    }

    // 5. Batch dedup — collect all Plaid IDs from added, modified, and removed
    let insertedCount = 0;
    let skippedCount = 0;

    const allPlaidIds = [
      ...plaidData.added.map((tx) => tx.transaction_id),
      ...plaidData.modified.map((tx) => tx.transaction_id),
      ...plaidData.removed.map((tx) => tx.transaction_id),
    ];

    // Query ONLY the IDs on this page (one IN query, not a full-table scan).
    const txByPlaidId = await fetchTxByPlaidIds(entityId, allPlaidIds);

    // 5a. Insert added transactions
    for (const tx of plaidData.added) {
      if (txByPlaidId.has(tx.transaction_id)) {
        skippedCount++;
        continue;
      }

      // Plaid amount semantics (see lib/plaid-mapping.ts): POSITIVE = money
      // OUT, NEGATIVE = money IN. Stored as magnitude + direction in `type`.
      await db.insert(bankTransactions).values({
        entityId,
        bankAccountId: bankAccountId!,
        transactionDate: tx.date,
        valueDate: tx.datetime?.split("T")[0] ?? tx.date,
        description: tx.name,
        reference: tx.payment_channel ?? undefined,
        amount: plaidMagnitude(tx),
        type: plaidType(tx),
        balance: undefined,
        source: "plaid",
        metadata: {
          plaidTransactionId: tx.transaction_id,
          plaidAccountId: tx.account_id,
          plaidCategory: tx.category,
          plaidMerchantName: tx.merchant_name,
          plaidPaymentChannel: tx.payment_channel,
          plaidPending: tx.pending,
          plaidIsoCurrencyCode: tx.iso_currency_code,
          plaidUnofficialCurrencyCode: tx.unofficial_currency_code,
        },
      });

      insertedCount++;
    }

    // 6. Process modified transactions (update existing records by Plaid ID)
    let updatedCount = 0;
    for (const tx of plaidData.modified) {
      const match = txByPlaidId.get(tx.transaction_id);
      if (match) {
        await db
          .update(bankTransactions)
          .set({
            description: tx.name,
            amount: plaidMagnitude(tx),
            type: plaidType(tx),
            metadata: {
              ...match.metadata,
              plaidCategory: tx.category,
              plaidMerchantName: tx.merchant_name,
              plaidPending: tx.pending,
            },
          })
          .where(eq(bankTransactions.id, match.id));
        updatedCount++;
      }
    }

    // 7. Process removed transactions (soft-delete by Plaid ID in metadata)
    let removedCount = 0;
    for (const tx of plaidData.removed) {
      const match = txByPlaidId.get(tx.transaction_id);
      if (match) {
        await db
          .update(bankTransactions)
          .set({
            metadata: {
              ...match.metadata,
              plaidRemoved: true,
              plaidRemovedAt: new Date().toISOString(),
            },
          })
          .where(eq(bankTransactions.id, match.id));
        removedCount++;
      }
    }

    // 8. Handle pagination — if has_more, sync next page
    let nextCursor = plaidData.next_cursor;
    let totalPages = 1;

    if (plaidData.has_more && nextCursor) {
      // Recursive pagination via re-triggering
      const paginationResult = await paginatePlaidSync(
        accessToken,
        nextCursor,
        entityId,
        bankAccountId!,
      );
      insertedCount += paginationResult.inserted;
      updatedCount += paginationResult.updated;
      removedCount += paginationResult.removed;
      totalPages += paginationResult.pages;
      nextCursor = paginationResult.finalCursor;
    }

    // 9. Update connection status and store cursor
    await db
      .update(bankConnections)
      .set({
        status: "active",
        lastSyncedAt: new Date(),
        syncError: null,
        metadata: {
          ...metadata,
          plaidCursor: nextCursor,
          plaidLastSyncAt: new Date().toISOString(),
          plaidTotalPages: totalPages,
        },
      })
      .where(eq(bankConnections.id, connectionId));

    // 10. Audit log
    await db.insert(auditLog).values({
      entityId,
      action: "plaid.sync",
      entityType: "bank_connection",
      entityIdRef: connectionId,
      newValues: {
        transactionsInserted: insertedCount,
        transactionsUpdated: updatedCount,
        transactionsRemoved: removedCount,
        transactionsSkipped: skippedCount,
        totalPages,
      },
    });

    logger.info("Plaid sync completed", {
      connectionId,
      inserted: insertedCount,
      updated: updatedCount,
      removed: removedCount,
      skipped: skippedCount,
      pages: totalPages,
    });

    return {
      success: true,
      transactionsInserted: insertedCount,
      transactionsUpdated: updatedCount,
      transactionsRemoved: removedCount,
      transactionsSkipped: skippedCount,
      pages: totalPages,
    };
  },
});

// ─── Plaid API Helpers ──────────────────────────────────────────────────────

type PlaidTransactionsSyncResponse = {
  added: Array<{
    transaction_id: string;
    account_id: string;
    amount: number;
    date: string;
    datetime?: string;
    name: string;
    merchant_name?: string;
    category?: string[];
    payment_channel?: string;
    pending: boolean;
    iso_currency_code?: string;
    unofficial_currency_code?: string;
  }>;
  modified: Array<{
    transaction_id: string;
    account_id: string;
    amount: number;
    date: string;
    name: string;
    merchant_name?: string;
    category?: string[];
    pending: boolean;
  }>;
  removed: Array<{
    transaction_id: string;
  }>;
  next_cursor: string;
  has_more: boolean;
  request_id: string;
};

async function callPlaidTransactionsSync(
  accessToken: string,
  cursor?: string,
): Promise<Response> {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET must be set");
  }

  return fetch(`${PLAID_API_URL}/transactions/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "PLAID-CLIENT-ID": clientId,
      "PLAID-SECRET": secret,
    },
    body: JSON.stringify({
      access_token: accessToken,
      cursor: cursor ?? null,
      count: 500,
    }),
  });
}

/**
 * Paginate through all pages of a Plaid transactions/sync response.
 * Plaid returns max 500 transactions per call; this handles the rest.
 */
async function paginatePlaidSync(
  accessToken: string,
  startCursor: string,
  entityId: string,
  bankAccountId: string,
): Promise<{
  inserted: number;
  updated: number;
  removed: number;
  pages: number;
  finalCursor: string;
}> {
  let cursor = startCursor;
  let inserted = 0;
  let updated = 0;
  let removed = 0;
  let pages = 0;
  let hasMore = true;

  while (hasMore) {
    const response = await callPlaidTransactionsSync(accessToken, cursor);

    if (!response.ok) {
      logger.error("Plaid pagination API error", {
        status: response.status,
        page: pages + 1,
      });
      break;
    }

    const data = (await response.json()) as PlaidTransactionsSyncResponse;
    pages++;

    // Query ONLY the IDs on this page (one IN query per page, not a
    // full-table scan of every entity transaction on every page).
    const allPlaidIds = [
      ...data.added.map((tx) => tx.transaction_id),
      ...data.modified.map((tx) => tx.transaction_id),
      ...data.removed.map((tx) => tx.transaction_id),
    ];

    const txByPlaidId = await fetchTxByPlaidIds(entityId, allPlaidIds);

    // Process added
    for (const tx of data.added) {
      if (txByPlaidId.has(tx.transaction_id)) continue;

      // Plaid: positive = money OUT (withdrawal); negative = money IN.
      const amount = plaidMagnitude(tx);
      const txType = plaidType(tx);

      await db.insert(bankTransactions).values({
        entityId,
        bankAccountId,
        transactionDate: tx.date,
        valueDate: tx.datetime?.split("T")[0] ?? tx.date,
        description: tx.name,
        reference: tx.payment_channel ?? undefined,
        amount: String(amount),
        type: txType,
        source: "plaid",
        metadata: {
          plaidTransactionId: tx.transaction_id,
          plaidAccountId: tx.account_id,
          plaidCategory: tx.category,
          plaidMerchantName: tx.merchant_name,
          plaidPaymentChannel: tx.payment_channel,
          plaidPending: tx.pending,
          plaidIsoCurrencyCode: tx.iso_currency_code,
        },
      });

      inserted++;
    }

    // Process modified
    for (const tx of data.modified) {
      const match = txByPlaidId.get(tx.transaction_id);
      if (match) {
        await db
          .update(bankTransactions)
          .set({
            description: tx.name,
            amount: plaidMagnitude(tx),
            type: plaidType(tx),
            metadata: {
              ...match.metadata,
              plaidCategory: tx.category,
              plaidMerchantName: tx.merchant_name,
              plaidPending: tx.pending,
            },
          })
          .where(eq(bankTransactions.id, match.id));
        updated++;
      }
    }

    // Process removed
    for (const tx of data.removed) {
      const match = txByPlaidId.get(tx.transaction_id);
      if (match) {
        await db
          .update(bankTransactions)
          .set({
            metadata: {
              ...match.metadata,
              plaidRemoved: true,
              plaidRemovedAt: new Date().toISOString(),
            },
          })
          .where(eq(bankTransactions.id, match.id));
        removed++;
      }
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  return { inserted, updated, removed, pages, finalCursor: cursor };
}

/**
 * Fetch existing bank transactions by their Plaid IDs (entity-scoped).
 * Chunked IN query — never a full-table scan of the entity's transactions.
 */
async function fetchTxByPlaidIds(
  entityId: string,
  plaidIds: string[],
): Promise<Map<string, { id: string; metadata: Record<string, unknown> }>> {
  const result = new Map<
    string,
    { id: string; metadata: Record<string, unknown> }
  >();
  if (plaidIds.length === 0) return result;

  const CHUNK = 500;
  for (let i = 0; i < plaidIds.length; i += CHUNK) {
    const chunk = plaidIds.slice(i, i + CHUNK);
    const rows = await db
      .select({ id: bankTransactions.id, metadata: bankTransactions.metadata })
      .from(bankTransactions)
      .where(
        and(
          eq(bankTransactions.entityId, entityId),
          sql`${bankTransactions.metadata}->>'plaidTransactionId' IN ${chunk}`,
        ),
      );
    for (const row of rows) {
      const meta = (row.metadata ?? {}) as Record<string, unknown>;
      const plaidId = meta.plaidTransactionId as string | undefined;
      if (plaidId) {
        result.set(plaidId, { id: row.id, metadata: meta });
      }
    }
  }
  return result;
}
