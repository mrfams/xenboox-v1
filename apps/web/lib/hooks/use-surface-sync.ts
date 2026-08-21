"use client";

import { useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";

// ─── Surface Sync ──────────────────────────────────────────────────────────
//
// Cross-surface real-time updates via SSE. When an action happens on one
// surface (e.g., approval in Activity Hub), this hook listens for the
// data_changed event and invalidates the relevant tRPC queries so other
// surfaces (e.g., Financial Pulse KPIs) update automatically.
//
// Usage:
//   useSurfaceSync({ entityId, surfaces: ["activity-hub", "financial-pulse"] });

export type Surface =
  | "command-center"
  | "activity-hub"
  | "financial-pulse"
  | "ledger"
  | "operations"
  | "all";

type DataChangedEvent = {
  type: "data_changed";
  surface: Surface;
  entity: string;
  action: string;
  timestamp: string;
};

// Map surfaces to the tRPC query keys they should invalidate
const SURFACE_QUERY_MAP: Record<Surface, string[][]> = {
  "command-center": [
    ["dashboard", "getDashboardData"],
    ["dashboard", "getDashboardSuggestions"],
    ["chat", "listConversations"],
  ],
  "activity-hub": [
    ["approvals", "list"],
    ["ingestion", "getStats"],
    ["notifications", "list"],
    ["notifications", "unreadCount"],
  ],
  "financial-pulse": [
    ["dashboard", "getDashboardData"],
    ["reports", "getPnlOverview"],
    ["dashboard", "getScenarioData"],
  ],
  ledger: [
    ["journal", "listWithDetails"],
    ["journal", "getTabCounts"],
    ["journal", "getTrialBalance"],
    ["coa", "listHierarchy"],
  ],
  operations: [
    ["banking", "getOverview"],
    ["banking", "getCashPosition"],
    ["banking", "listTransactions"],
    ["bills", "getOverview"],
    ["customers", "listCustomers"],
    ["fiscal", "getCloseStatus"],
  ],
  all: [
    ["dashboard", "getDashboardData"],
    ["dashboard", "getDashboardSuggestions"],
    ["approvals", "list"],
    ["notifications", "unreadCount"],
    ["journal", "listWithDetails"],
    ["banking", "getOverview"],
  ],
};

interface UseSurfaceSyncOptions {
  entityId: string;
  surfaces?: Surface[];
  enabled?: boolean;
}

export function useSurfaceSync({
  entityId,
  surfaces = ["all"],
  enabled = true,
}: UseSurfaceSyncOptions) {
  const utils = trpc.useUtils();
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const reconnectAttemptsRef = useRef(0);

  // Collect all query keys to invalidate for the given surfaces
  const queryKeys = surfaces.flatMap((s) => SURFACE_QUERY_MAP[s] ?? []);

  const invalidateQueries = useCallback(
    (surface: Surface) => {
      // Invalidate queries for the specific surface AND "all" queries
      const keysToInvalidate = [
        ...(SURFACE_QUERY_MAP[surface] ?? []),
        ...SURFACE_QUERY_MAP.all,
      ];

      for (const key of keysToInvalidate) {
        const [router, procedure] = key;
        try {
          // Access the router and invalidate the procedure
          const routerUtils = (utils as Record<string, unknown>)[router] as
            Record<string, { invalidate?: () => Promise<void> }> | undefined;
          if (routerUtils && typeof routerUtils === "object") {
            const proc = routerUtils[procedure];
            if (proc && typeof proc === "object" && "invalidate" in proc) {
              void proc.invalidate();
            }
          }
        } catch {
          // Ignore — query may not exist yet
        }
      }
    },
    [utils],
  );

  const connect = useCallback(() => {
    if (!enabled || !entityId) return;

    // Disconnect existing
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = new URL("/api/agent-events", window.location.origin);
    url.searchParams.set("entityId", entityId);

    const eventSource = new EventSource(url.toString());
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      reconnectAttemptsRef.current = 0;
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle data_changed events — the core of cross-surface sync
        if (data.type === "data_changed" && data.surface) {
          invalidateQueries(data.surface);
        }

        // Handle notification events — invalidate activity hub + command center
        if (data.type === "notification_created") {
          invalidateQueries("activity-hub");
          invalidateQueries("command-center");
        }

        // Handle run completion — invalidate activity hub + command center
        if (data.type === "run_completed" || data.type === "run_failed") {
          invalidateQueries("activity-hub");
          invalidateQueries("command-center");
        }

        // Handle approval needed — invalidate activity hub
        if (data.type === "approval_needed") {
          invalidateQueries("activity-hub");
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      eventSource.close();

      // Reconnect with exponential backoff
      const attempt = reconnectAttemptsRef.current;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectAttemptsRef.current++;
        connect();
      }, delay);
    };
  }, [entityId, enabled, invalidateQueries]);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, enabled]);

  return { invalidateQueries };
}

// ─── Emit Data Changed ─────────────────────────────────────────────────────
//
// Helper to emit a data_changed event after a mutation completes.
// Call this from any surface after a successful tRPC mutation.
//
// Usage:
//   await approvals.resolve.mutateAsync({...});
//   await emitDataChanged("activity-hub", "approval_resolved", entityId);

export async function emitDataChanged(
  surface: Surface,
  action: string,
  entityId: string,
): Promise<void> {
  try {
    await fetch("/api/agent-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entityId,
        event: {
          type: "data_changed",
          surface,
          action,
          entity: surface,
          timestamp: new Date().toISOString(),
        },
      }),
    });
  } catch {
    // Non-critical — sync is best-effort
  }
}
