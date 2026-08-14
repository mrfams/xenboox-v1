// ─── Client-side idempotency keys (§19.2) ──────────────────────────────────
//
// The server middleware (`idempotencyMiddleware` in lib/trpc/server.ts) dedupes
// retried mutations via the `x-idempotency-key` header — but only when the key
// is STABLE for a given logical operation. Sending a fresh random UUID per
// request (the previous behavior) defeats it: every retry, double-click, or
// react-query retry arrives with a new key and is executed again.
//
// These helpers derive a deterministic key from (entityId, procedure path,
// canonical input), so the same logical mutation always produces the same key
// while distinct operations never collide. Keys are SHA-256 hex (64 chars) —
// safely under the 255-char column limit.

/** Build the deterministic source string for a mutation. */
export function buildIdempotencySource(
  entityId: string,
  path: string,
  input: unknown,
): string {
  let canonical: string;
  try {
    canonical = JSON.stringify(input ?? null);
  } catch {
    canonical = String(input ?? null);
  }
  return `${entityId}::${path}::${canonical}`;
}

/**
 * Decide whether a tRPC HTTP batch should carry an idempotency key.
 * Returns the key source only for single-mutation batches — queries don't
 * need dedup and multi-op batches can't be represented by one key.
 */
export function idempotencySourceForBatch(
  entityId: string,
  opList: ReadonlyArray<{ type: string; path: string; input: unknown }>,
): string | null {
  if (opList.length !== 1) return null;
  const op = opList[0];
  if (!op || op.type !== "mutation") return null;
  return buildIdempotencySource(entityId, op.path, op.input);
}

/** Deterministic 64-hex-char key for a source string (SHA-256). */
export async function deriveIdempotencyKey(source: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(source),
    );
    return Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
  }
  // Fallback for insecure contexts (shouldn't happen: localhost + HTTPS are
  // both secure contexts) — djb2, deterministic, 16 hex chars.
  let h = 5381;
  for (let i = 0; i < source.length; i++) {
    h = (h * 33) ^ source.charCodeAt(i);
    h >>>= 0;
  }
  return `fb${h.toString(16).padStart(8, "0")}${source.length
    .toString(16)
    .padStart(8, "0")}`;
}
