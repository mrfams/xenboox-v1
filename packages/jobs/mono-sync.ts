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
import { eq, and, desc, sql } from "drizzle-orm";

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

    // 2. Fetch ALL transactions from Mono API — paginated. Mono returns
    // `meta.next` (a full URL) until the list is exhausted; the old code
    // fetched only page 1 and silently truncated accounts with more than one
    // page of history.
    type MonoTransaction = {
      id: string;
      amount: number;
      type: "debit" | "credit";
      narration: string;
      date: string;
      balance: number;
      reference?: string;
      category?: string;
    };
    type MonoPage = {
      data?: MonoTransaction[];
      meta?: { total?: number; page?: number; next?: string | null };
    };

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    };

    const fetchPage = async (url: string): Promise<MonoPage> => {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errorBody = await res.text();
        logger.error("Mono API error", {
          connectionId,
          status: res.status,
          body: errorBody,
        });
        await db
          .update(bankConnections)
          .set({
            status: "error",
            syncError: `Mono API error: ${res.status}`,
          })
          .where(eq(bankConnections.id, connectionId));
        throw new Error(`Mono API returned ${res.status}: ${errorBody}`);
      }
      return (await res.json()) as MonoPage;
    };

    const transactions: MonoTransaction[] = [];
    let nextUrl: string | null =
      `${MONO_API_URL}/accounts/${providerConnectionId}/transactions?page=1`;
    let pages = 0;
    const MAX_PAGES = 100; // hard cap: 100 × page size guards runaway loops
    while (nextUrl && pages < MAX_PAGES) {
      const page = await fetchPage(nextUrl);
      transactions.push(...(page.data ?? []));
      pages++;
      nextUrl = page.meta?.next ?? null;
    }

    logger.info("Fetched transactions from Mono", {
      connectionId,
      count: transactions.length,
      pages,
    });

    // 3. Find or create bank account for this connection. Scope the lookup to
    // (entityId + bankName + accountNumber) so two entities with the same
    // accountNumber can never cross-match, and a connection's own account is
    // preferred via metadata.connectionId when present.
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

    // 4. Batch dedup — collect all Mono IDs and query ONLY those IDs
    // (chunked IN query; the old code scanned the entity's entire
    // transaction table inside every chunk — quadratic and wrong).
    let insertedCount = 0;
    let skippedCount = 0;

    const monoIds = transactions.map((tx) => tx.id);
    const existingMonoIds = new Set<string>();
    if (monoIds.length > 0) {
      const CHUNK = 500;
      for (let i = 0; i < monoIds.length; i += CHUNK) {
        const chunk = monoIds.slice(i, i + CHUNK);
        const existing = await db
          .select({ metadata: bankTransactions.metadata })
          .from(bankTransactions)
          .where(
            and(
              eq(bankTransactions.entityId, entityId),
              sql`${bankTransactions.metadata}->>'monoId' IN ${chunk}`,
            ),
          );
        for (const row of existing) {
          const meta = (row.metadata ?? {}) as Record<string, unknown>;
          const monoId = meta.monoId as string | undefined;
          if (monoId) existingMonoIds.add(monoId);
        }
      }
    }

    // Mono returns amounts in the currency's minor unit (kobo for NGN,
    // cents for USD). Only divide when the account is a minor-unit currency.
    const minorUnitCurrencies = new Set([
      "NGN",
      "USD",
      "EUR",
      "GBP",
      "KES",
      "GHS",
      "ZAR",
      "CAD",
      "AUD",
    ]);
    const accountCurrency = (connection.currency ?? "NGN").toUpperCase();
    const toMajor = (minor: number) =>
      minorUnitCurrencies.has(accountCurrency) ? minor / 100 : minor; // already in major units

    for (const tx of transactions) {
      if (existingMonoIds.has(tx.id)) {
        skippedCount++;
        continue;
      }

      const amountMajor = toMajor(tx.amount);
      await db.insert(bankTransactions).values({
        entityId,
        bankAccountId: bankAccountId!,
        transactionDate: tx.date,
        description: tx.narration,
        reference: tx.reference,
        amount: String(Math.abs(amountMajor)),
        type: tx.type === "credit" ? "deposit" : "withdrawal",
        balance:
          tx.balance !== undefined && tx.balance !== null
            ? String(toMajor(tx.balance))
            : undefined,
        source: "mono",
        metadata: {
          monoId: tx.id,
          monoCategory: tx.category,
          rawAmount: tx.amount,
          currency: accountCurrency,
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
