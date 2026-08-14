"use client";

import {
  FileDown,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  User,
  Bot,
} from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { RowAiAction } from "@/components/module/row-ai-action";

export type AuditVerification = {
  valid: boolean;
  status: "valid" | "broken" | "unchained";
  checkedCount: number;
  firstBrokenSeq: number | null;
};

export type ActivityEvent = {
  id: string;
  seq: number | null;
  action: string;
  entityType: string;
  entityIdRef: string | null;
  actorType: string | null;
  userId: string | null;
  agentId: string | null;
  reason: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  createdAt: string | null;
  ipAddress: string | null;
  sessionId?: string | null;
  requestId?: string | null;
  userAgent?: string | null;
};

function formatTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ValuePreview({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span>—</span>;
  if (typeof value === "object") {
    return (
      <code className="rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground break-all">
        {JSON.stringify(value)}
      </code>
    );
  }
  return <span>{String(value)}</span>;
}

export function ActivityLogView({
  events,
  verification,
  isVerifying = false,
  scoped = false,
  onVerify,
  onExportJson,
  onExportCsv,
}: {
  events: ActivityEvent[];
  verification: AuditVerification;
  isVerifying?: boolean;
  /** True when the viewer is a regular member seeing a filtered trail. */
  scoped?: boolean;
  onVerify: () => void;
  onExportJson: () => void;
  onExportCsv: () => void;
}) {
  const status =
    verification.status === "valid"
      ? {
          icon: ShieldCheck,
          tone: "text-emerald-600 bg-emerald-50 border-emerald-200",
          label: "Chain integrity verified",
        }
      : verification.status === "broken"
        ? {
            icon: ShieldAlert,
            tone: "text-destructive bg-destructive/5 border-destructive/30",
            label: "Chain integrity broken — possible tampering detected",
          }
        : {
            icon: ShieldQuestion,
            tone: "text-amber-600 bg-amber-50 border-amber-200",
            label: "History not yet chained (backfill pending)",
          };

  const StatusIcon = status.icon;

  return (
    <div className="space-y-4">
      {/* Scoped-view notice (regular members) */}
      {scoped && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
          <ShieldQuestion className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Your activity</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              You&apos;re viewing your own actions and Xenboox agent activity.
              The full audit trail (including IP addresses and session data) is
              available to owners and administrators.
            </p>
          </div>
        </div>
      )}

      {/* Integrity banner — owner/admin only (verification is an evidentiary
          artifact; members see the scoped notice above instead) */}
      {!scoped && (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl border p-3.5",
            status.tone,
          )}
        >
          <StatusIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">{status.label}</p>
            <p className="mt-0.5 text-xs opacity-80">
              {verification.checkedCount > 0
                ? `${verification.checkedCount} events checked in this chain`
                : verification.status === "broken"
                  ? "No events could be verified in sequence."
                  : "No chained events yet."}
              {verification.status === "broken" &&
                verification.firstBrokenSeq != null && (
                  <>
                    {" "}
                    First broken link: event{" "}
                    <span className="font-semibold">
                      #{verification.firstBrokenSeq}
                    </span>
                  </>
                )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onVerify}
            disabled={isVerifying}
            className="shrink-0"
          >
            <RefreshCw
              className={cn(
                "mr-1.5 h-3.5 w-3.5",
                isVerifying && "animate-spin",
              )}
            />
            Verify again
          </Button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {events.length} event{events.length === 1 ? "" : "s"}
          {scoped
            ? " — actions by you and Xenboox agents."
            : " — every action by a person or an agent, in sequence."}
        </p>
        {!scoped && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportJson}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={onExportCsv}>
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        )}
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No activity recorded yet. Actions performed by your team and by
            Xenboox agents will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  #
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  When
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Who
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Action
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Record
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Change
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Reason
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {events.map((event) => (
                <tr
                  key={event.id}
                  className="group relative align-top hover:bg-muted/30"
                >
                  <RowAiAction
                    focus={{
                      kind: "Audit Event",
                      name: `#${event.seq ?? "—"} ${event.action}`,
                      id: event.id,
                      fields: [
                        { label: "Action", value: event.action },
                        {
                          label: "Record",
                          value: event.entityType ?? "—",
                        },
                        {
                          label: "Actor",
                          value:
                            event.actorType === "agent"
                              ? (event.agentId ?? "agent")
                              : event.userId
                                ? event.userId.slice(0, 8)
                                : "system",
                        },
                        { label: "Reason", value: event.reason ?? "—" },
                      ],
                    }}
                  />
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">
                    #{event.seq ?? "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-xs">
                    {formatTime(event.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center gap-1.5">
                      {event.actorType === "agent" ? (
                        <Bot className="h-3.5 w-3.5 text-purple-500" />
                      ) : (
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <span className="text-xs font-medium">
                        {event.actorType === "agent"
                          ? (event.agentId ?? "agent")
                          : event.userId
                            ? event.userId.slice(0, 8)
                            : "system"}
                      </span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {event.action}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span className="text-muted-foreground">
                      {event.entityType}
                    </span>
                    {event.entityIdRef && (
                      <span className="ml-1 font-mono text-[10px] text-muted-foreground/70">
                        {event.entityIdRef.slice(0, 8)}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <div className="flex flex-col gap-1">
                      {event.oldValues != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground/60">was</span>
                          <ValuePreview value={event.oldValues} />
                        </div>
                      )}
                      {event.newValues != null && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground/60">now</span>
                          <ValuePreview value={event.newValues} />
                        </div>
                      )}
                      {event.oldValues == null && event.newValues == null && (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {event.reason ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
