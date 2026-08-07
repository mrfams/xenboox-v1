"use client";

import { createTRPCReact, httpBatchLink } from "@trpc/react-query";

import type { AppRouter } from "@/server/routers/_app";

export const trpc = createTRPCReact<AppRouter>();

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        maxURLLength: 2048,
        headers() {
          const entityId =
            typeof window !== "undefined" && typeof localStorage !== "undefined"
              ? localStorage.getItem("currentEntityId")
              : null;
          return {
            "x-entity-id": entityId || "",
            "x-idempotency-key": generateIdempotencyKey(),
          };
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
