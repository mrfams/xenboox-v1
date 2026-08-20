"use client";

import { useSettingsSync } from "@/lib/hooks/use-settings-sync";
import { SyncStatus } from "@/components/settings/sync-status";
import { RealTimeSyncIndicator } from "@/components/settings/real-time-sync-indicator";
import { SettingsAuditLog } from "@/components/settings/settings-audit-log";

export function SyncSection() {
  const {
    isCloudEnabled,
    isSyncing,
    lastSyncedAt,
    error,
    conflict,
    forceSync,
    resolveConflict,
    dismissConflict,
  } = useSettingsSync();

  return (
    <div className="space-y-6">
      <SyncStatus
        isCloudEnabled={isCloudEnabled}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        error={error}
        onForceSync={forceSync}
      />
      <RealTimeSyncIndicator
        isCloudEnabled={isCloudEnabled}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        error={error}
        hasRemoteChanges={conflict.hasConflict}
        remoteUpdatedAt={conflict.remoteUpdatedAt}
        onForceSync={forceSync}
        onAcceptRemote={() => resolveConflict("remote-wins")}
        onDismissRemote={dismissConflict}
      />
      <SettingsAuditLog />
    </div>
  );
}
