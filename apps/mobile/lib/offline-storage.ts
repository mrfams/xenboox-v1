import * as SQLite from "expo-sqlite"
import { Platform } from "react-native"

const db = SQLite.openDatabase("xenboox_offline.db")

export type OfflineTransaction = {
  id: string
  type: "invoice" | "journal" | "payment" | "expense"
  entityId: string
  data: string
  status: "pending" | "synced" | "failed"
  createdAt: string
  updatedAt: string
}

export function initOfflineDB() {
  db.transaction((tx) => {
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
    `)

    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_status ON offline_transactions (status)
    `)

    tx.executeSql(`
      CREATE INDEX IF NOT EXISTS idx_entity_id ON offline_transactions (entity_id)
    `)
  })
}

export function getPendingTransactions(): Promise<OfflineTransaction[]> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM offline_transactions WHERE status = 'pending' ORDER BY created_at ASC",
        [],
        (_, result) => {
          const transactions: OfflineTransaction[] = []
          for (let i = 0; i < result.rows.length; i++) {
            transactions.push(result.rows.item(i))
          }
          resolve(transactions)
        },
        (_, error) => {
          reject(error)
          return false
        }
      )
    })
  })
}

export function saveTransaction(transaction: Omit<OfflineTransaction, "status" | "createdAt" | "updatedAt">): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString()
    db.transaction((tx) => {
      tx.executeSql(
        "INSERT OR REPLACE INTO offline_transactions (id, type, entity_id, data, status, created_at, updated_at) VALUES (?, ?, ?, ?, 'pending', ?, ?)",
        [transaction.id, transaction.type, transaction.entityId, transaction.data, now, now],
        () => resolve(),
        (_, error) => {
          reject(error)
          return false
        }
      )
    })
  })
}

export function markTransactionSynced(id: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString()
    db.transaction((tx) => {
      tx.executeSql(
        "UPDATE offline_transactions SET status = 'synced', updated_at = ? WHERE id = ?",
        [now, id],
        () => resolve(),
        (_, error) => {
          reject(error)
          return false
        }
      )
    })
  })
}

export function markTransactionFailed(id: string, error: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString()
    db.transaction((tx) => {
      tx.executeSql(
        "UPDATE offline_transactions SET status = 'failed', updated_at = ? WHERE id = ?",
        [now, id],
        () => resolve(),
        (_, error) => {
          reject(error)
          return false
        }
      )
    })
  })
}

export function clearSyncedTransactions(olderThanHours: number = 24): Promise<void> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "DELETE FROM offline_transactions WHERE status = 'synced' AND updated_at < datetime('now', ?)",
        [`-${olderThanHours} hours`],
        () => resolve(),
        (_, error) => {
          reject(error)
          return false
        }
      )
    })
  })
}

export function getSyncStats(): Promise<{ pending: number; synced: number; failed: number }> {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        "SELECT status, COUNT(*) as count FROM offline_transactions GROUP BY status",
        [],
        (_, result) => {
          const stats = { pending: 0, synced: 0, failed: 0 }
          for (let i = 0; i < result.rows.length; i++) {
            const row = result.rows.item(i)
            if (row.status === "pending") stats.pending = row.count
            if (row.status === "synced") stats.synced = row.count
            if (row.status === "failed") stats.failed = row.count
          }
          resolve(stats)
        },
        (_, error) => {
          reject(error)
          return false
        }
      )
    })
  })
}