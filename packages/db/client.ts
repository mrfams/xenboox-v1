import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import ws from "ws";
import * as schema from "./schema";

// ─── DB driver policy (Epoch 0 / N1 — KILLPLAN §4, prodway P0-C1) ───────────
//
// The transactional Pool driver (WebSocket, node-postgres-compatible) is the
// DEFAULT. `db.transaction()` is a REAL transaction on this path — rollback on
// failure, and per-request SET LOCAL RLS GUCs behave correctly. This is the
// driver every posting path runs on.
//
// The neon-http driver is an explicit opt-out (`DB_DRIVER=http`) for edge or
// read-only contexts. It has NO transactions: the fallback shim below keeps
// old call sites from 500ing but is NOT atomic, and this file warns loudly
// whenever it is used. Posting paths must never run on it.
//
// Env:
//   DB_DRIVER   "pool" (default) | "http" (explicit non-transactional opt-out)
//   DATABASE_URL connection string. On serverless, use Neon's pooled endpoint.
//   USE_RLS     legacy flag: when "true", historically switched to Pool. The
//               driver now defaults to Pool regardless; USE_RLS=true additionally
//               enables the DB-layer RLS wiring in lib/trpc (see ADR-RLS-POOL).

type DbClient =
  | ReturnType<typeof drizzleHttp<typeof schema>>
  | ReturnType<typeof drizzlePool<typeof schema>>;

export type DbDriver = "pool" | "http";

function resolveDriver(): DbDriver {
  const raw = (process.env.DB_DRIVER ?? "").toLowerCase();
  if (raw === "http") return "http";
  if (raw === "pool") return "pool";
  // Legacy: USE_RLS=true was the old way to request the Pool driver.
  if (process.env.USE_RLS === "true") return "pool";
  return "pool"; // default — transactions must be real
}

export const dbDriver: DbDriver = resolveDriver();

let _db: DbClient;
if (dbDriver === "pool") {
  neonConfig.webSocketConstructor = ws as unknown as typeof WebSocket;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL!,
    max: Number(process.env.DB_POOL_MAX ?? 10),
  });
  _db = drizzlePool(pool, { schema });
  if (process.env.NODE_ENV !== "production") {
    console.info("[db] Pool driver (transactional) — DB-layer RLS eligible");
  }
} else {
  const sql = neon(process.env.DATABASE_URL!);
  _db = drizzleHttp(sql, { schema });
  console.warn(
    "[db] neon-http driver selected (DB_DRIVER=http) — transactions are NOT atomic on this path; posting must not run here",
  );
}

/**
 * Non-atomicity guard for the explicit http opt-out. The neon-http driver
 * throws "No transactions support"; this shim executes the callback
 * sequentially WITHOUT rollback so legacy call sites keep functioning, but it
 * is loudly logged and must never wrap financial writes. Production should
 * never select this driver.
 */
const anyDb = _db as unknown as {
  transaction?: (cb: (tx: typeof _db) => Promise<unknown>) => Promise<unknown>;
};
if (dbDriver === "http" && typeof anyDb.transaction === "function") {
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
        console.error(
          "[db] NON-ATOMIC transaction fallback on neon-http — financial writes are unsafe here. Switch DB_DRIVER=pool.",
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
