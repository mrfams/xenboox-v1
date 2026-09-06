// ─── Development-only guard (Epoch 0 / N4) ──────────────────────────────────
//
// Any procedure that seeds demo data, fabricates metrics, or mutates state in
// ways that must never happen in production calls devOnly() as its first
// statement. In production this throws UNAUTHORIZED with a plain-English
// message — the procedure does not run, does not write, and does not lie.

import { TRPCError } from "@trpc/server";

export function devOnly(procedureName: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: `${procedureName} is a development-only tool and is disabled in production.`,
    });
  }
}

/** Non-tRPC variant for route handlers (returns a status code instead). */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
