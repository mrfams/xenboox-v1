"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useEntity } from "@/lib/entity-context";
import type { PageContextPayload } from "@/lib/chat/page-context";

// ─── Page Context Hook ─────────────────────────────────────────────────────
//
// Auto-detects the current dashboard surface and builds a PageContextPayload
// that gets passed to the AI chat. This way the AI knows what the user is
// looking at and can give more relevant responses.
//
// Example: User is on Financial Pulse looking at revenue → AI gets context
// about the revenue KPI, its value, change vs prior period, etc.

const SURFACE_CONFIG: Record<
  string,
  { page: string; module: string; notes?: string }
> = {
  "/dashboard": {
    page: "Command Center",
    module: "chat",
    notes:
      "Primary AI chat interface. User can ask anything about their accounting.",
  },
  "/dashboard/tasks": {
    page: "Tasks",
    module: "approvals",
    notes: "Review queue. Items requiring approval or review, plus every job.",
  },
  "/dashboard/ingestion": {
    page: "Documents",
    module: "documents",
    notes: "Document upload and review inbox.",
  },
  "/dashboard/financial-pulse": {
    page: "Financial Pulse",
    module: "reports",
    notes: "AI-narrated financial health. KPIs, trends, and scenarios.",
  },
  "/dashboard/ledger": {
    page: "Ledger",
    module: "journal",
    notes:
      "Accounting records. Journal entries, chart of accounts, trial balance.",
  },
  "/dashboard/operations": {
    page: "Operations",
    module: "banking",
    notes: "Money flow. Bank accounts, transactions, compliance.",
  },
  "/dashboard/settings": {
    page: "Settings",
    module: "settings",
    notes: "User and entity settings.",
  },
};

export function usePageContext(): PageContextPayload | undefined {
  const pathname = usePathname();
  const { entityId } = useEntity();

  return useMemo(() => {
    if (!pathname) return undefined;

    // Find the matching surface config
    let config = SURFACE_CONFIG[pathname];
    if (!config) {
      // Try prefix matching for nested routes
      for (const [route, cfg] of Object.entries(SURFACE_CONFIG)) {
        if (pathname.startsWith(route + "/")) {
          config = cfg;
          break;
        }
      }
    }

    if (!config) return undefined;

    return {
      page: config.page,
      module: config.module,
      notes: config.notes,
    };
  }, [pathname]);
}

// ─── Focus Context ─────────────────────────────────────────────────────────
//
// Builds a focus context for a specific record (e.g., a journal entry,
// invoice, or transaction). This is like @-mentioning a file in Cursor —
// the AI answers about THIS specific record.

export function buildFocusContext(params: {
  kind: string;
  label: string;
  id?: string;
  fields?: Array<{ label: string; value: string }>;
}): PageContextPayload["focus"] {
  return {
    kind: params.kind,
    label: params.label,
    id: params.id,
    fields: params.fields,
  };
}
