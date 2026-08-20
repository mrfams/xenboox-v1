"use client";

import { useState } from "react";
import { SettingsVersionHistory } from "@/components/settings/settings-version-history";
import { RecentOperations } from "@/components/settings/recent-operations";
import { SoundPreferences } from "@/components/settings/sound-preferences";
import { ExportImportSettings } from "@/components/settings/export-import-settings";

export function BackupSection() {
  const [versionHistoryExpanded, setVersionHistoryExpanded] = useState(false);

  return (
    <div className="space-y-6">
      <SettingsVersionHistory defaultExpanded={versionHistoryExpanded} />
      <RecentOperations />
      <SoundPreferences />
      <ExportImportSettings
        onViewBackup={() => setVersionHistoryExpanded(true)}
      />
    </div>
  );
}
