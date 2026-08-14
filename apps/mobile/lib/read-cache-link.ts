import { observable } from "@trpc/server/observable";
import type { TRPCLink } from "@trpc/client";
import type { AppRouter } from "@xenboox/api/app-router";
import { cacheRead, getCachedRead } from "./offline-storage";
import { getCurrentEntityId } from "./auth";

/**
 * Read-through offline cache link (§7.1).
 *
 * Sits in front of httpBatchLink. On every successful query it writes the
 * result to the SQLite read_cache (entity-scoped, 24h TTL). On network failure
 * (offline / 5xx) it falls back to the cached payload so list and detail
 * screens keep rendering real data instead of an error.
 *
 * Mutations and subscriptions are never cached.
 */
export const readCacheLink: TRPCLink<AppRouter> = () => {
  return ({ op, next }) => {
    return observable((observer) => {
      const subscription = next(op).subscribe({
        next(envelope) {
          // Cache successful query payloads for offline read-through.
          if (
            op.type === "query" &&
            envelope.result &&
            "type" in envelope.result &&
            envelope.result.type === "data"
          ) {
            void (async () => {
              try {
                const entityId = await getCurrentEntityId();
                if (!entityId) return;
                const key = cacheKeyForOp(op.path, op.input);
                await cacheRead(key, entityId, envelope.result.data);
              } catch {
                // Cache writes must never break the request path.
              }
            })();
          }
          observer.next(envelope);
        },
        async error(cause) {
          // Network failure → try to serve the last-known-good payload.
          if (op.type === "query") {
            try {
              const entityId = await getCurrentEntityId();
              if (entityId) {
                const key = cacheKeyForOp(op.path, op.input);
                const cached = await getCachedRead(key, entityId);
                if (cached) {
                  observer.next({
                    result: { type: "data", data: cached.data },
                    context: { cached: true },
                  });
                  observer.complete();
                  return;
                }
              }
            } catch {
              // Fall through to the original error.
            }
          }
          observer.error(cause);
        },
        complete() {
          observer.complete();
        },
      });
      return () => subscription.unsubscribe();
    });
  };
};

function cacheKeyForOp(path: string, input: unknown): string {
  const hash = stableHash(input ?? null);
  return `q:${path}:${hash}`;
}

/** Deterministic, dependency-free hash for cache keys. */
function stableHash(value: unknown): string {
  const raw = JSON.stringify(value);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}
