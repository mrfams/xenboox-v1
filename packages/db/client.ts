import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// ─── DB driver — Pool when USE_RLS=true (WebSocket, DB-layer RLS active), else neon-http (app-layer primary) ──
// See ADR-RLS-POOL.md and DATABASE.md §0006. Default is neon-http for backwards compat and edge caching;
// set USE_RLS=true + Neon WebSocket access to activate FORCE RLS at the DB layer.
//
// NOTE: the client is typed with the FULL schema (instantiation expression on
// the generic `drizzle` factory) so `db.query.<table>` is available to every
// consumer. An un-instantiated `ReturnType<typeof drizzle>` would resolve the
// default `Record<string, never>` schema and type `.query` as `{}`.
type DbClient =
  | ReturnType<typeof drizzleHttp<typeof schema>>
  | ReturnType<typeof drizzlePool<typeof schema>>;

let _db: DbClient;
if (process.env.USE_RLS === "true") {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  _db = drizzlePool(pool, { schema });
  // eslint-disable-next-line no-console -- operational log, not per-request
  console.info(
    "[db] Pool RLS enabled (WebSocket) — DB-layer enforcement active",
  );
} else {
  const sql = neon(process.env.DATABASE_URL!);
  _db = drizzleHttp(sql, { schema });
  if (process.env.NODE_ENV !== "test") {
    // eslint-disable-next-line no-console -- operational log
    console.warn(
      "[db] RLS app-layer only (neon-http) — set USE_RLS=true for DB-layer enforcement (see ADR-RLS-POOL)",
    );
  }
}

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

export const db = _db as DbClient;

// Re-export all table types for convenience
export type Database = DbClient;
