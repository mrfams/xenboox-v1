"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Switch,
} from "@/components/ui";
import { Brain, Check, X, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

type AIPreferences = {
  autoReconcile: boolean;
  autoCategorize: boolean;
  aiAlerts: boolean;
  dailyDigest: boolean;
};

const DEFAULT_PREFS: AIPreferences = {
  autoReconcile: true,
  autoCategorize: true,
  aiAlerts: true,
  dailyDigest: true,
};

export function AIPreferencesSummary() {
  const { data: session } = useSession();
  const [prefs, setPrefs] = useState<AIPreferences>(DEFAULT_PREFS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Server is source of truth — cross-device, survives cache clear
  const getSettings = trpc.settings.get.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const setSettingsMutation = trpc.settings.set.useMutation();

  useEffect(() => {
    if (getSettings.data) {
      const serverSettings = getSettings.data as Record<string, unknown>;
      const aiPrefs = serverSettings.aiPreferences as AIPreferences | undefined;
      if (aiPrefs) {
        setPrefs({ ...DEFAULT_PREFS, ...aiPrefs });
      } else {
        setPrefs(DEFAULT_PREFS);
      }
      setIsLoaded(true);
    } else if (getSettings.isError) {
      setPrefs(DEFAULT_PREFS);
      setIsLoaded(true);
    }
  }, [getSettings.data, getSettings.isError]);

  const updatePref = (key: keyof AIPreferences, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setHasChanges(false);
    if (session?.user?.id) {
      setSettingsMutation.mutate({ aiPreferences: prefs });
    }
    toast.success("AI preferences saved");
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFS);
    if (session?.user?.id) {
      setSettingsMutation.mutate({ aiPreferences: DEFAULT_PREFS });
    }
    setHasChanges(false);
    toast.success("AI preferences reset to defaults");
  };

  const enabledCount = Object.values(prefs).filter(Boolean).length;
  const totalCount = Object.keys(prefs).length;

  if (!isLoaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status summary */}
        <div className="flex items-center justify-between rounded-lg bg-primary/5 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {enabledCount} of {totalCount} AI features enabled
              </p>
              <p className="text-xs text-muted-foreground">
                {enabledCount === totalCount
                  ? "All AI features are active"
                  : enabledCount === 0
                    ? "All AI features are disabled"
                    : "Some AI features are active"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {Object.entries(prefs).map(([key, value]) => (
              <div
                key={key}
                className={`h-2 w-2 rounded-full ${value ? "bg-balanced-green" : "bg-muted"}`}
                title={`${key}: ${value ? "on" : "off"}`}
              />
            ))}
          </div>
        </div>

        {/* Individual toggles */}
        <div className="space-y-3">
          <PrefToggle
            label="Auto-Reconciliation"
            description="AI matches bank transactions to journal entries"
            enabled={prefs.autoReconcile}
            onChange={(v) => updatePref("autoReconcile", v)}
          />
          <PrefToggle
            label="Smart Categorization"
            description="AI suggests expense categories"
            enabled={prefs.autoCategorize}
            onChange={(v) => updatePref("autoCategorize", v)}
          />
          <PrefToggle
            label="Anomaly Alerts"
            description="AI notifies of unusual transactions"
            enabled={prefs.aiAlerts}
            onChange={(v) => updatePref("aiAlerts", v)}
          />
          <PrefToggle
            label="Daily Digest"
            description="Morning summary of financial metrics"
            enabled={prefs.dailyDigest}
            onChange={(v) => updatePref("dailyDigest", v)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Reset to defaults
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
            <Save className="mr-1 h-3 w-3" />
            {hasChanges ? "Save changes" : "Saved"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PrefToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-6 w-6 items-center justify-center rounded-full ${
            enabled ? "bg-balanced-green/10" : "bg-muted"
          }`}
        >
          {enabled ? (
            <Check className="h-3 w-3 text-balanced-green" />
          ) : (
            <X className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onChange} />
    </div>
  );
}
