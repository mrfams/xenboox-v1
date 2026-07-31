"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  FileEdit,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";

function formatValue(val: Record<string, unknown> | null | undefined): string {
  if (!val) return "N/A";
  const rate =
    val.rate ?? (val.rateOrBands as { rate?: unknown } | undefined)?.rate;
  if (rate) return `${rate}%`;
  return JSON.stringify(val);
}

export function RuleChangeProposals() {
  const { data: proposals, isLoading } =
    trpc.complianceLiveness.listRuleChangeProposals.useQuery(
      { status: "pending" },
      { refetchInterval: 30_000 },
    );

  const confirmMutation = trpc.complianceLiveness.confirmRuleChange.useMutation(
    {
      onSuccess: () => {
        setConfirmingId(null);
      },
    },
  );

  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleConfirm = (proposalId: string, userId: string) => {
    setConfirmingId(proposalId);
    confirmMutation.mutate({ proposalId, userId });
  };

  const pendingCount = proposals?.length ?? 0;

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 rounded bg-muted" />
          <div className="h-20 w-full rounded bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileEdit className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Rule Change Proposals</h3>
        </div>
        {pendingCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
            {pendingCount} pending
          </span>
        )}
      </div>

      {!proposals || proposals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500" />
          <p className="text-sm text-muted-foreground">
            No pending rule changes
          </p>
          <p className="text-[10px] text-muted-foreground">
            Rule sets are current for all jurisdictions
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {proposals.map((p) => (
            <div
              key={p.id}
              className="border-l-2 border-amber-300 px-4 py-3 transition-colors hover:bg-accent/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span className="text-xs font-medium truncate block">
                      {p.jurisdiction} — {p.ruleName}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {p.sourceCitation
                      ? `Source: ${p.sourceCitation}`
                      : "No source citation"}
                    {p.sourceConfidence !== null &&
                      ` · Confidence: ${(p.sourceConfidence * 100).toFixed(0)}%`}
                  </p>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-3 rounded-md bg-muted/50 p-2">
                <div>
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                    Current
                  </span>
                  <p className="mt-0.5 font-mono text-xs">
                    {formatValue(p.oldValue)}
                  </p>
                </div>
                <div>
                  <span className="text-[9px] font-medium uppercase tracking-wider text-amber-600">
                    Proposed
                  </span>
                  <p className="mt-0.5 font-mono text-xs text-amber-700">
                    {formatValue(p.newValue)}
                  </p>
                </div>
              </div>

              {p.effectiveDate && (
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Effective: {new Date(p.effectiveDate).toLocaleDateString()}
                </p>
              )}

              {p.sourceUrl && (
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View source
                </a>
              )}

              {p.status === "pending" && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => handleConfirm(p.id, "current-user")}
                    disabled={confirmingId === p.id}
                    className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {confirmingId === p.id
                      ? "Confirming..."
                      : "Confirm & Apply"}
                  </button>
                  <button className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:bg-accent">
                    <XCircle className="h-3 w-3" />
                    Reject
                  </button>
                </div>
              )}

              {p.status === "confirmed" && (
                <p className="mt-2 text-[10px] text-green-600">
                  Confirmed by {p.confirmedBy ?? "system"} on{" "}
                  {p.confirmedAt
                    ? new Date(p.confirmedAt).toLocaleDateString()
                    : "unknown"}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="border-t px-4 py-2 text-[9px] text-muted-foreground">
        Rule changes are never auto-applied. Human confirmation required.
      </div>
    </div>
  );
}
