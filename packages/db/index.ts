// The drizzle client lives in ./client (its own module) so lib/* files can
// import the Database type without a package-root `export *` cycle.
export { db, type Database } from "./client";

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
export {
  notifyEntityUsers,
  clearEntityFailureNotifications,
  type EntityNotificationInput,
} from "./lib/notify-entity";
