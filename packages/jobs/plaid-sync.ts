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
import { db } from "@xenboox/db";
import {
  bankConnections,
  bankTransactions,
  bankAccounts,
  auditLog,
} from "@xenboox/db/schema";
import { eq, and } from "drizzle-orm";

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

    if (!connection.accessToken) {
      throw new Error(`No access token for connection: ${connectionId}`);
    }

    // 2. Get stored cursor from metadata (for incremental sync)
    const metadata = (connection.metadata ?? {}) as Record<string, unknown>;
    const cursor = (metadata.plaidCursor as string) ?? undefined;

    // 3. Call Plaid /transactions/sync with cursor
    const plaidResponse = await callPlaidTransactionsSync(
      connection.accessToken,
      cursor,
    );

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

    // 4. Find or create bank account for this connection
    let bankAccountId: string | undefined;

    const existingAccount = await db.query.bankAccounts.findFirst({
      where: and(
        eq(bankAccounts.entityId, entityId),
        eq(bankAccounts.accountNumber, connection.accountNumber ?? ""),
      ),
    });

    if (existingAccount) {
      bankAccountId = existingAccount.id;
    } else {
      const [newAccount] = await db
        .insert(bankAccounts)
        .values({
          entityId,
          name: `${connection.institutionName} - ${connection.accountName ?? connection.accountNumber ?? "Unknown"}`,
          bankName: connection.institutionName,
          accountNumber: connection.accountNumber ?? "",
          currency: connection.currency ?? "GMD",
          currentBalance: "0",
        })
        .returning();

      bankAccountId = newAccount!.id;
    }

    // 5. Process added transactions
    let insertedCount = 0;
    let skippedCount = 0;

    for (const tx of plaidData.added) {
      // Dedup by Plaid transaction_id stored in metadata
      const plaidTxId = tx.transaction_id;
      const existing = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.description, tx.name),
        ),
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Determine type from amount sign
      const amount = Math.abs(tx.amount);
      const txType = tx.amount >= 0 ? "deposit" : "withdrawal";

      await db.insert(bankTransactions).values({
        entityId,
        bankAccountId: bankAccountId!,
        transactionDate: tx.date,
        valueDate: tx.datetime?.split("T")[0] ?? tx.date,
        description: tx.name,
        reference: tx.payment_channel ?? undefined,
        amount: String(amount),
        type: txType,
        balance: undefined, // Plaid sync doesn't always provide balance
        source: "plaid",
        metadata: {
          plaidTransactionId: plaidTxId,
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

    // 6. Process modified transactions (update existing records)
    let updatedCount = 0;
    for (const tx of plaidData.modified) {
      // Find existing transaction by Plaid ID in metadata
      const existing = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.description, tx.name),
        ),
      });

      if (existing) {
        await db
          .update(bankTransactions)
          .set({
            description: tx.name,
            amount: String(Math.abs(tx.amount)),
            type: tx.amount >= 0 ? "deposit" : "withdrawal",
            metadata: {
              ...(existing.metadata as Record<string, unknown>),
              plaidPending: tx.pending,
              plaidMerchantName: tx.merchant_name,
            },
          })
          .where(eq(bankTransactions.id, existing.id));
        updatedCount++;
      }
    }

    // 7. Process removed transactions (soft-delete by marking as removed in metadata)
    let removedCount = 0;
    for (const tx of plaidData.removed) {
      const existing = await db.query.bankTransactions.findFirst({
        where: and(eq(bankTransactions.entityId, entityId)),
      });

      if (existing) {
        await db
          .update(bankTransactions)
          .set({
            metadata: {
              ...(existing.metadata as Record<string, unknown>),
              plaidRemoved: true,
              plaidRemovedAt: new Date().toISOString(),
            },
          })
          .where(eq(bankTransactions.id, existing.id));
        removedCount++;
      }
    }

    // 8. Handle pagination — if has_more, sync next page
    let nextCursor = plaidData.next_cursor;
    let totalPages = 1;

    if (plaidData.has_more && nextCursor) {
      // Recursive pagination via re-triggering
      const paginationResult = await paginatePlaidSync(
        connection.accessToken,
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

    // Process added
    for (const tx of data.added) {
      const existing = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.description, tx.name),
        ),
      });

      if (existing) continue;

      const amount = Math.abs(tx.amount);
      const txType = tx.amount >= 0 ? "deposit" : "withdrawal";

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
      const existing = await db.query.bankTransactions.findFirst({
        where: and(
          eq(bankTransactions.entityId, entityId),
          eq(bankTransactions.description, tx.name),
        ),
      });

      if (existing) {
        await db
          .update(bankTransactions)
          .set({
            description: tx.name,
            amount: String(Math.abs(tx.amount)),
            type: tx.amount >= 0 ? "deposit" : "withdrawal",
          })
          .where(eq(bankTransactions.id, existing.id));
        updated++;
      }
    }

    // Process removed
    for (const tx of data.removed) {
      const existing = await db.query.bankTransactions.findFirst({
        where: eq(bankTransactions.entityId, entityId),
      });

      if (existing) {
        await db
          .update(bankTransactions)
          .set({
            metadata: {
              ...(existing.metadata as Record<string, unknown>),
              plaidRemoved: true,
              plaidRemovedAt: new Date().toISOString(),
            },
          })
          .where(eq(bankTransactions.id, existing.id));
        removed++;
      }
    }

    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  return { inserted, updated, removed, pages, finalCursor: cursor };
}
