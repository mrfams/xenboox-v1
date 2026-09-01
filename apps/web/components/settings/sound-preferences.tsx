"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Switch } from "@/components/ui";
import { Volume2, VolumeX } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { setSoundEnabled } from "@/lib/backup-chime";

export function SoundPreferences() {
  const [enabled, setEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  const { data: settings } = trpc.settings.get.useQuery();
  const setSettings = trpc.settings.set.useMutation();

  useEffect(() => {
    if (
      settings &&
      typeof (settings as Record<string, unknown>).soundEnabled === "boolean"
    ) {
      setEnabled((settings as Record<string, unknown>).soundEnabled as boolean);
    }
    setMounted(true);
  }, [settings]);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    setSoundEnabled(checked);
    // DB-persistent (cross-device) — soundEnabled is now in userSettings
    setSettings.mutate({ soundEnabled: checked } as never);
  };

  if (!mounted) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {enabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
          Sound Effects
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Play subtle sound effects for important actions like backup
          completion.
        </p>
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">Backup chime</p>
            <p className="text-xs text-muted-foreground">
              Play a chime when a settings backup is created
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={handleToggle} />
        </div>
      </CardContent>
    </Card>
  );
}
