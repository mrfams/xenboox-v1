import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

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
