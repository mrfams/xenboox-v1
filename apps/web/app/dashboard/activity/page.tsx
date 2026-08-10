"use client";

import { useState } from "react";
import { ScrollText } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { ModulePageShell } from "@/components/module/module-page-shell";
import {
  ActivityLogView,
  type ActivityEvent,
  type AuditVerification,
} from "@/components/audit/activity-log-view";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function ActivityLogPage() {
  const { entityId, entityRole, isLoaded } = useEntity();
  const [isExporting, setIsExporting] = useState(false);
  const enabled = isLoaded && !!entityId;
  // Tiered visibility (ADR-0007): owners/admins see the full trail with
  // verification + export; regular members get a scoped view of their own
  // actions and agent activity, without sensitive metadata.
  const isPrivileged = entityRole === "owner" || entityRole === "admin";

  const list = trpc.audit.list.useQuery(
    { limit: 100, offset: 0 },
    { enabled, refetchInterval: 30_000 },
  );
  const verify = trpc.audit.verify.useQuery(undefined, {
    enabled: enabled && isPrivileged,
  });
  const utils = trpc.useUtils();

  const scoped = list.data?.scoped ?? !isPrivileged;

  const events: ActivityEvent[] = (list.data?.logs ?? []).map((log) => ({
    id: log.id,
    seq: log.seq,
    action: log.action,
    entityType: log.entityType,
    entityIdRef: log.entityIdRef,
    actorType: log.actorType,
    userId: log.userId,
    agentId: log.agentId,
    reason: log.reason,
    oldValues: log.oldValues,
    newValues: log.newValues,
    createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : null,
    ipAddress: log.ipAddress,
    sessionId: log.sessionId,
    requestId: log.requestId,
    userAgent: log.userAgent,
  }));

  const verification: AuditVerification = verify.data ?? {
    valid: false,
    status: "unchained",
    checkedCount: 0,
    firstBrokenSeq: null,
  };

  const handleExport = async (format: "json" | "csv") => {
    if (!entityId || !isPrivileged) return;
    setIsExporting(true);
    try {
      const data = await utils.audit.export.fetch({ format });
      if (!data) return;
      const slug = entityId.slice(0, 8);
      if (format === "json") {
        downloadBlob(
          new Blob([JSON.stringify(data, null, 2)], {
            type: "application/json",
          }),
          `xenboox-audit-trail-${slug}.json`,
        );
      } else if ("csv" in data) {
        downloadBlob(
          new Blob([data.csv], { type: "text/csv" }),
          `xenboox-audit-trail-${slug}.csv`,
        );
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModulePageShell
      title="Activity Log"
      description="Every action by your team and by Xenboox agents — recorded in a tamper-evident, verifiable chain."
      icon={ScrollText}
    >
      <ActivityLogView
        events={events}
        verification={verification}
        isVerifying={verify.isFetching}
        scoped={scoped}
        onVerify={() => verify.refetch()}
        onExportJson={() => handleExport("json")}
        onExportCsv={() => handleExport("csv")}
      />
    </ModulePageShell>
  );
}
