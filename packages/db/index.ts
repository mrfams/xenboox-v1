import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const _db = drizzle(sql, { schema });

/**
 * Transaction shim for neon-http driver.
 * The neon-http driver throws "No transactions support" — every router that
 * uses db.transaction would 500. We fall back to executing the callback
 * without a real DB transaction (still sequential, just not atomic). Callers
 * that need atomicity should clean up manually on failure inside the callback.
 * If the driver ever gains real transaction support (e.g. switch to Pool),
 * the native path is used.
 */
const anyDb = _db as unknown as {
  transaction?: (cb: (tx: typeof _db) => Promise<unknown>) => Promise<unknown>;
};
if (typeof anyDb.transaction === "function") {
  const orig = anyDb.transaction.bind(anyDb);
  anyDb.transaction = async (cb: (tx: typeof _db) => Promise<unknown>) => {
    try {
      return await orig(cb as never);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (
        msg.includes("No transactions support") ||
        msg.includes("transactions support")
      ) {
        // eslint-disable-next-line no-console -- fallback is expected on neon-http
        console.warn(
          "[db] neon-http transaction fallback — executing without real transaction",
        );
        return await cb(_db);
      }
      throw e;
    }
  };
}

export const db = _db as typeof _db;

// Re-export all table types for convenience
export type Database = typeof db;
export * from "./schema";
export {
  encryptConnectionToken,
  decryptConnectionToken,
  isTokenEncrypted,
} from "./lib/bank-token-encryption";
export { isMoneyIn, signedBankAmount } from "./lib/bank-amount";
export type { BankTxType } from "./lib/bank-amount";
export {
  categorizeByDescription,
  matchBankRules,
  mapProviderCategory,
  normalizeTxType,
  CANONICAL_CATEGORIES,
  type CategoryMatch,
  type CategorizeInput,
  type BankRuleLike,
  type CanonicalCategory,
} from "./lib/bank-categorizer";
export {
  buildBankJournalLines,
  deriveBankCode,
  resolveBankGlAccount,
  resolveCategoryGlAccount,
  type BankLedgerLine,
  type BankLedgerTx,
  type CoaRow,
} from "./lib/bank-ledger";
export {
  balanceEquationError,
  runningBalanceIssues,
  type BalanceRow,
} from "./lib/bank-statement-validation";
