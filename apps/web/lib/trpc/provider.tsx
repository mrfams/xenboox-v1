"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { createTRPCClient, trpc } from "@/lib/trpc/client";

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

  // Single source of truth for tRPC links (sessionExpiryLink + idempotency)
  // is apps/web/lib/trpc/client.ts :: createTRPCClient(). Dedupe here.
  const [trpcClient] = useState(() => createTRPCClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
