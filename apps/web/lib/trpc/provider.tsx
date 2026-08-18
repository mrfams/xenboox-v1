"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";

import { trpc } from "@/lib/trpc/client";

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

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 60 seconds - data stays fresh longer
            gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache longer
            refetchOnWindowFocus: false,
            refetchOnMount: false, // Don't refetch if data is fresh
            refetchOnReconnect: false,
            retry: 1,
            retryDelay: 1000,
          },
        },
      }),
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          headers() {
            // Guard both window AND localStorage — localStorage is not always
            // present (unit tests, privacy modes, some SSR paths).
            const entityId =
              typeof window !== "undefined" &&
              typeof localStorage !== "undefined"
                ? localStorage.getItem("currentEntityId")
                : null;
            return {
              "x-entity-id": entityId || "",
            };
          },
        }),
      ],
    }),
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
