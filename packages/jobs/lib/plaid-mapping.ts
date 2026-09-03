// Plaid transaction → bank_transactions mapping helpers.
//
// Single source of truth for the amount/type convention so the sync job's
// main run, its pagination helper, and (previously) the router all agree.
//
// Plaid amount semantics (docs): POSITIVE = cash debited (money OUT, e.g. a
// purchase); NEGATIVE = cash credited (money IN, e.g. a deposit/refund).
// Our schema stores positive magnitudes with direction in `type`.

export type PlaidLikeTx = {
  amount: number;
};

/** direction for a Plaid transaction: money OUT → "withdrawal", IN → "deposit". */
export function plaidType(tx: PlaidLikeTx): "deposit" | "withdrawal" {
  return tx.amount >= 0 ? "withdrawal" : "deposit";
}

/** stored magnitude (always positive). */
export function plaidMagnitude(tx: PlaidLikeTx): string {
  return String(Math.abs(tx.amount));
}

/** Pure mapper for an added/modified Plaid transaction update. */
export function mapPlaidTransaction(tx: {
  transaction_id: string;
  account_id: string;
  amount: number;
  date: string;
  datetime?: string;
  name: string;
  merchant_name?: string;
  payment_channel?: string;
  pending: boolean;
}) {
  return {
    transactionId: tx.transaction_id,
    accountId: tx.account_id,
    type: plaidType(tx),
    amount: plaidMagnitude(tx),
    date: tx.date,
    valueDate: tx.datetime?.split("T")[0] ?? tx.date,
    name: tx.name,
    merchantName: tx.merchant_name,
    paymentChannel: tx.payment_channel,
    pending: tx.pending,
  };
}
