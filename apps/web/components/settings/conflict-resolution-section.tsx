"use client";

import { useSettingsSync } from "@/lib/hooks/use-settings-sync";
import { ConflictResolution } from "@/components/settings/conflict-resolution";
import { ConflictResolutionHistory } from "@/components/settings/conflict-resolution-history";
import { DefaultStrategyPreference } from "@/components/settings/default-strategy-preference";

export function ConflictResolutionSection() {
  const { conflict, resolveConflict, dismissConflict, updateSyncPreferences } =
    useSettingsSync();

  return (
    <div className="space-y-6">
      {conflict.hasConflict && (
        <ConflictResolution
          conflicts={conflict.conflicts}
          localUpdatedAt={conflict.localUpdatedAt}
          remoteUpdatedAt={conflict.remoteUpdatedAt}
          onResolve={(strategy) => resolveConflict(strategy)}
          onDismiss={dismissConflict}
        />
      )}
      <ConflictResolutionHistory />
      <DefaultStrategyPreference
        currentStrategy={conflict.mergeStrategy}
        onSave={updateSyncPreferences}
      />
    </div>
  );
}
