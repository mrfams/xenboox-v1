import * as SQLite from "expo-sqlite/legacy";
import type {
  SQLError,
  SQLResultSet,
  SQLTransaction,
} from "expo-sqlite/legacy";
import { Platform } from "react-native";

const db = SQLite.openDatabase("xenboox_offline.db");

export type OfflineTransaction = {
  id: string;
  type: "invoice" | "journal" | "payment" | "expense";
  entityId: string;
  data: string;
  status: "pending" | "synced" | "failed";
  createdAt: string;
  updatedAt: string;
};

const READ_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — stale-while-offline window

export type CachedRead = {
  data: unknown;
  fetchedAt: string;
};

export function initOfflineDB() {
  db.transaction((tx: SQLTransaction) => {
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS offline_transactions (
        id TEXT PRIMARY KEY NOT NULL,
        type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_status ON offline_transactions (status)
    `);

    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_entity_id ON offline_transactions (entity_id)
    `);

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS read_cache (
        cache_key TEXT PRIMARY KEY NOT NULL,
        entity_id TEXT NOT NULL,
        data TEXT NOT NULL,
        fetched_at TEXT NOT NULL
      )
    `);

    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_read_cache_entity ON read_cache (entity_id)
    `);
  });
}

export function cacheRead(
  key: string,
  entityId: string,
  data: unknown,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "INSERT OR REPLACE INTO read_cache (cache_key, entity_id, data, fetched_at) VALUES (?, ?, ?, ?)",
        [key, entityId, JSON.stringify(data), now],
        () => resolve(),
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

export function getCachedRead(
  key: string,
  entityId: string,
): Promise<CachedRead | null> {
  return new Promise((resolve) => {
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "SELECT data, fetched_at FROM read_cache WHERE cache_key = ? AND entity_id = ?",
        [key, entityId],
        (_tx: SQLTransaction, result: SQLResultSet) => {
          if (result.rows.length === 0) {
            resolve(null);
            return;
          }
          const row = result.rows.item(0);
          const fetchedAt = new Date(row.fetched_at).getTime();
          if (Date.now() - fetchedAt > READ_CACHE_TTL_MS) {
            resolve(null);
            return;
          }
          try {
            resolve({ data: JSON.parse(row.data), fetchedAt: row.fetched_at });
          } catch {
            resolve(null);
          }
        },
        () => {
          resolve(null);
          return false;
        },
      );
    });
  });
}

export function clearExpiredReadCache(): Promise<void> {
  return new Promise((resolve, reject) => {
    const cutoff = new Date(Date.now() - READ_CACHE_TTL_MS).toISOString();
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "DELETE FROM read_cache WHERE fetched_at < ?",
        [cutoff],
        () => resolve(),
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

export function getPendingTransactions(): Promise<OfflineTransaction[]> {
  return new Promise((resolve, reject) => {
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "SELECT * FROM offline_transactions WHERE status = 'pending' ORDER BY created_at ASC",
        [],
        (_tx: SQLTransaction, result: SQLResultSet) => {
          const transactions: OfflineTransaction[] = [];
          for (let i = 0; i < result.rows.length; i++) {
            transactions.push(result.rows.item(i));
          }
          resolve(transactions);
        },
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

export function saveTransaction(
  transaction: Omit<OfflineTransaction, "status" | "createdAt" | "updatedAt">,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "INSERT OR REPLACE INTO offline_transactions (id, type, entity_id, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
        [
          transaction.id,
          transaction.type,
          transaction.entityId,
          transaction.data,
          now,
          now,
        ],
        () => resolve(),
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

export function markTransactionSynced(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "UPDATE offline_transactions SET status = 'synced', updated_at = ? WHERE id = ?",
        [now, id],
        () => resolve(),
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

export function markTransactionFailed(
  id: string,
  error: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "UPDATE offline_transactions SET status = 'failed', updated_at = ? WHERE id = ?",
        [now, id],
        () => resolve(),
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

export function clearSyncedTransactions(
  olderThanHours: number = 24,
): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "DELETE FROM offline_transactions WHERE status = 'synced' AND updated_at < datetime('now', ?)",
        [`-${olderThanHours} hours`],
        () => resolve(),
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}

export function getSyncStats(): Promise<{
  pending: number;
  synced: number;
  failed: number;
}> {
  return new Promise((resolve, reject) => {
    db.transaction((tx: SQLTransaction) => {
      tx.executeSql(
        "SELECT status, COUNT(*) as count FROM offline_transactions GROUP BY status",
        [],
        (_tx: SQLTransaction, result: SQLResultSet) => {
          const stats = { pending: 0, synced: 0, failed: 0 };
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i);
            if (row.status === "pending") stats.pending = row.count;
            if (row.status === "synced") stats.synced = row.count;
            if (row.status === "failed") stats.failed = row.count;
          }
          resolve(stats);
        },
        (_tx: SQLTransaction, error: SQLError) => {
          reject(error);
          return false;
        },
      );
    });
  });
}
