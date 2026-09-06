// ─── Entity-switch cache isolation (Epoch 0 / N6) ───────────────────────────
//
// tRPC sends x-entity-id per request (lib/trpc/client.ts), so React Query
// cache keys do NOT include the entity. Switching entities without removing
// cached queries renders the PREVIOUS entity's financial data (prodway
// Part 4 #9, P0). The only safe policy on switch: remove everything, refetch
// what's mounted, and surface a real loading state until it settles.

import type { QueryClient } from "@tanstack/react-query";

export async function resetEntityCaches(queryClient: QueryClient): Promise<void> {
  // Remove ALL queries — session/auth queries refetch cheaply, and financial
  // staleness is never acceptable. Predicate kept explicit for future narrowing.
  queryClient.removeQueries();
  // Refetch whatever is mounted so the UI settles into the new entity's truth.
  await queryClient.refetchQueries({ type: "active" });
}
