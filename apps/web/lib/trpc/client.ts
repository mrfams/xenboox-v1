"use client";

import { createTRPCReact, httpBatchLink } from "@trpc/react-query";

import type { AppRouter } from "@/server/routers/_app";
import {
  deriveIdempotencyKey,
  idempotencySourceForBatch,
} from "@/lib/trpc/idempotency-key";

export const trpc = createTRPCReact<AppRouter>();

/**
 * Resolve the API base URL for server-side tRPC calls.
 *
 * Order: NEXT_PUBLIC_APP_URL (explicit production link) → VERCEL_URL
 * (Vercel preview) → localhost for local dev only. In production builds the
 * localhost branch is never reachable: NEXT_PUBLIC_APP_URL is always set in
 * the Vercel environment (see apps/web/.env.example) and VERCEL_URL is
 * present on preview deployments.
 */
function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_APP_URL must be set in production — cannot resolve API base URL.",
    );
  }
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        maxURLLength: 2048,
        async headers({ opList }) {
          const entityId =
            typeof window !== "undefined" && typeof localStorage !== "undefined"
              ? localStorage.getItem("currentEntityId")
              : null;
          const headers: Record<string, string> = {
            "x-entity-id": entityId || "",
          };
          // Stable per-mutation key so retries/double-clicks dedupe on the
          // server (§19.2). Fresh random keys defeat the middleware.
          const source = idempotencySourceForBatch(entityId || "", opList);
          if (source) {
            headers["x-idempotency-key"] = await deriveIdempotencyKey(source);
          }
          return headers;
        },
      }),
    ],
  });
}

export const trpcOptions = {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  },
};
