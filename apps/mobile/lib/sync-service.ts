import { NetInfo } from "@react-native-community/netinfo";
import {
  getPendingTransactions,
  markTransactionSynced,
  markTransactionFailed,
  clearSyncedTransactions,
} from "./offline-storage";
import { trpc } from "./trpc";
import { getCurrentEntityId } from "./auth";

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;

export function startSyncService() {
  if (syncInterval) return;

  NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      syncOfflineData();
    }
  });

  syncInterval = setInterval(() => {
    syncOfflineData();
  }, 60000);
}

export function stopSyncService() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
}

async function syncOfflineData() {
  if (isSyncing) return;
  isSyncing = true;

  try {
    const entityId = await getCurrentEntityId();
    if (!entityId) return;

    const pending = await getPendingTransactions();
    if (pending.length === 0) {
      await clearSyncedTransactions();
      isSyncing = false;
      return;
    }

    for (const tx of pending) {
      try {
        const data = JSON.parse(tx.data);

        switch (tx.type) {
          case "invoice":
            await trpc.ar.invoices.create.mutate(data);
            break;
          case "journal":
            await trpc.journal.entries.create.mutate(data);
            break;
          case "payment":
            await trpc.ar.invoices.pay.mutate(data);
            break;
          case "expense":
            await trpc.cash.entries.create.mutate(data);
            break;
        }

        await markTransactionSynced(tx.id);
      } catch (error) {
        console.error(`Failed to sync transaction ${tx.id}:`, error);
        await markTransactionFailed(
          tx.id,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    await clearSyncedTransactions();
  } catch (error) {
    console.error("Sync error:", error);
  } finally {
    isSyncing = false;
  }
}

export async function queueOfflineTransaction(
  type: "invoice" | "journal" | "payment" | "expense",
  data: unknown,
) {
  const entityId = await getCurrentEntityId();
  if (!entityId) {
    throw new Error("Cannot queue offline transaction: no entity selected");
  }

  const transaction = {
    id: crypto.randomUUID(),
    type,
    entityId,
    data: JSON.stringify(data),
  };

  return saveTransaction(transaction);
}
