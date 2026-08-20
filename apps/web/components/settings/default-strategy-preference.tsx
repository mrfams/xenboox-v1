"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
import { Settings, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type MergeStrategy,
  getStrategyLabel,
  getStrategyDescription,
} from "@/lib/merge-strategies";

// ─── Types ────────────────────────────────────────────────────────────────────

type DefaultStrategyPreferenceProps = {
  currentStrategy: MergeStrategy;
  onSave: (prefs: { defaultMergeStrategy: MergeStrategy }) => void;
};

// ─── Strategy Options ─────────────────────────────────────────────────────────

const STRATEGIES: MergeStrategy[] = [
  "last-write-wins",
  "local-wins",
  "remote-wins",
  "deep-merge",
  "manual",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function DefaultStrategyPreference({
  currentStrategy,
  onSave,
}: DefaultStrategyPreferenceProps) {
  const [selected, setSelected] = useState<MergeStrategy>(currentStrategy);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSelected(currentStrategy);
  }, [currentStrategy]);

  const handleSelect = (strategy: MergeStrategy) => {
    setSelected(strategy);
    setHasChanges(strategy !== currentStrategy);
  };

  const handleSave = () => {
    onSave({ defaultMergeStrategy: selected });
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Default Conflict Resolution
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Choose how conflicts are resolved by default when settings change on
          multiple devices. You can always override this when a conflict occurs.
        </p>

        <div className="space-y-2">
          {STRATEGIES.map((strategy) => (
            <label
              key={strategy}
              className={cn(
                "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                selected === strategy
                  ? "border-primary bg-primary/5"
                  : "border-muted hover:bg-muted/50",
              )}
            >
              <input
                type="radio"
                name="default-strategy"
                value={strategy}
                checked={selected === strategy}
                onChange={() => handleSelect(strategy)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {getStrategyLabel(strategy)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getStrategyDescription(strategy)}
                </p>
              </div>
              {selected === strategy && (
                <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              )}
            </label>
          ))}
        </div>

        <Button onClick={handleSave} disabled={!hasChanges} className="w-full">
          <Check className="mr-2 h-4 w-4" />
          {hasChanges ? "Save Preference" : "No changes"}
        </Button>
      </CardContent>
    </Card>
  );
}
