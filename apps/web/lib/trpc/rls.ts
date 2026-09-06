// ─── RLS-safe transaction (Epoch 0 / N2) ────────────────────────────────────
//
// On the pooled (transactional) driver, RLS GUCs must be TRANSACTION-scoped:
// `set_config(key, value, true)` == SET LOCAL, which vanishes at COMMIT or
// ROLLBACK. Session-level GUCs on a pooled connection would leak one tenant's
// identity into the next request on the same connection.
//
// Every request-scoped query batch that DB-layer RLS policies evaluate must
// run inside this helper. Posting paths adopt it in Batch 2+ (graph nodes);
// until then app-layer entity scoping remains the active enforcement.

type Tx = {
  execute: (query: { sql: unknown }) => Promise<unknown>;
};

export async function withRlsTransaction<T>(
  tx: Tx,
  userId: string,
  entityId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  await tx.execute({
    sql: `SELECT set_config('app.current_user_id', '${escapeLiteral(userId)}', true)`,
  });
  await tx.execute({
    sql: `SELECT set_config('app.current_entity_id', '${escapeLiteral(entityId)}', true)`,
  });
  return fn(tx);
}

/** Postgres literal escaping for GUC values (ids are uuids/text we control). */
function escapeLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
