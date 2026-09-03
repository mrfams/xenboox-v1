/**
 * Mono Transaction Sync Job
 *
 * Syncs transactions from Mono API for connected bank accounts.
 * Runs periodically or on-demand when user clicks "Sync".
 */

import { task, logger } from "@trigger.dev/sdk";
import { triggerClient } from "./trigger-client";
import { dlqOnFailure } from "./lib/dlq";
import { db, decryptConnectionToken } from "@xenboox/db";
import {
  bankConnections,
  bankTransactions,
  bankAccounts,
  auditLog,
} from "@xenboox/db/schema";
import { eq, and, desc } from "drizzle-orm";

const MONO_API_URL = "https://api.withmono.com";

export const syncMonoTransactions = task({
  id: "mono-sync-transactions",
  maxDuration: 300,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 10_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 5,
  },

  onFailure: dlqOnFailure<{
    connectionId: string;
    entityId: string;
    providerConnectionId: string;
  }>({
    task: "mono-sync-transactions",
    type: "data_validation",
    severity: "high",
    title: (p) => `Bank sync failed for connection ${p.connectionId}`,
    entityIdFrom: (p) => p.entityId,
  }),

  run: async (payload: {
    connectionId: string;
    entityId: string;
    providerConnectionId: string;
  }) => {
    const { connectionId, entityId, providerConnectionId } = payload;

    logger.info("Starting Mono transaction sync", { connectionId, entityId });

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

    // 2. Fetch transactions from Mono API
    const monoResponse = await fetch(
      `${MONO_API_URL}/accounts/${providerConnectionId}/transactions`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!monoResponse.ok) {
      const errorBody = await monoResponse.text();
      logger.error("Mono API error", {
        connectionId,
        status: monoResponse.status,
        body: errorBody,
      });

      await db
        .update(bankConnections)
        .set({
          status: "error",
          syncError: `Mono API error: ${monoResponse.status}`,
        })
        .where(eq(bankConnections.id, connectionId));

      throw new Error(`Mono API returned ${monoResponse.status}: ${errorBody}`);
    }

    const monoData = (await monoResponse.json()) as {
      data?: Array<{
        id: string;
        amount: number;
        type: "debit" | "credit";
        narration: string;
        date: string;
        balance: number;
        reference?: string;
        category?: string;
      }>;
    };

    const transactions = monoData.data ?? [];

    logger.info("Fetched transactions from Mono", {
      connectionId,
      count: transactions.length,
    });

    // 3. Find or create bank account for this connection
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
          name: `${connection.institutionName} - ${connection.accountNumber ?? "Unknown"}`,
          bankName: connection.institutionName,
          accountNumber: connection.accountNumber ?? "",
          currency: connection.currency ?? "USD",
          currentBalance: "0",
        })
        .returning();

      bankAccountId = newAccount!.id;
    }

    // 4. Batch dedup — collect all Mono IDs, query once
    let insertedCount = 0;
    let skippedCount = 0;

    const monoIds = transactions.map((tx) => tx.id);
    const existingMonoIds = new Set<string>();
    if (monoIds.length > 0) {
      // Query in chunks to avoid IN clause limits
      const CHUNK = 500;
      for (let i = 0; i < monoIds.length; i += CHUNK) {
        const chunk = monoIds.slice(i, i + CHUNK);
        // Check metadata->>'monoId' for dedup
        const existing = await db.query.bankTransactions.findMany({
          where: and(eq(bankTransactions.entityId, entityId)),
          columns: { metadata: true },
        });
        for (const row of existing) {
          const meta = (row.metadata ?? {}) as Record<string, unknown>;
          if (meta.monoId && chunk.includes(meta.monoId as string)) {
            existingMonoIds.add(meta.monoId as string);
          }
        }
      }
    }

    for (const tx of transactions) {
      if (existingMonoIds.has(tx.id)) {
        skippedCount++;
        continue;
      }

      await db.insert(bankTransactions).values({
        entityId,
        bankAccountId: bankAccountId!,
        transactionDate: tx.date,
        description: tx.narration,
        reference: tx.reference,
        amount: String(Math.abs(tx.amount / 100)), // Mono amounts are in kobo/cents
        type: tx.type === "credit" ? "deposit" : "withdrawal",
        balance: String(tx.balance / 100),
        source: "mono",
        metadata: {
          monoId: tx.id,
          monoCategory: tx.category,
          rawAmount: tx.amount,
        },
      });

      insertedCount++;
    }

    // 5. Update connection status
    await db
      .update(bankConnections)
      .set({
        status: "active",
        lastSyncedAt: new Date(),
        syncError: null,
      })
      .where(eq(bankConnections.id, connectionId));

    // 6. Update bank account balance from latest transaction
    if (transactions.length > 0) {
      const latestTx = transactions[0]!;
      await db
        .update(bankAccounts)
        .set({ currentBalance: String((latestTx.balance ?? 0) / 100) })
        .where(eq(bankAccounts.id, bankAccountId!));
    }

    // 7. Audit log
    await db.insert(auditLog).values({
      entityId,
      action: "mono.sync",
      entityType: "bank_connection",
      entityIdRef: connectionId,
      newValues: {
        transactionsInserted: insertedCount,
        transactionsSkipped: skippedCount,
        totalFetched: transactions.length,
      },
    });

    logger.info("Mono sync completed", {
      connectionId,
      inserted: insertedCount,
      skipped: skippedCount,
    });

    return {
      success: true,
      transactionsInserted: insertedCount,
      transactionsSkipped: skippedCount,
      totalFetched: transactions.length,
    };
  },
});
