"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui"
import {
  AlertTriangle,
  Check,
  X,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Laptop,
  Cloud,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type FieldConflict,
  type MergeStrategy,
  getStrategyLabel,
  getStrategyDescription,
} from "@/lib/merge-strategies"

// ─── Types ────────────────────────────────────────────────────────────────────

type ConflictResolutionProps = {
  conflicts: FieldConflict[]
  localUpdatedAt: string | null
  remoteUpdatedAt: string | null
  onResolve: (strategy: MergeStrategy, resolutions?: FieldConflict[]) => void
  onDismiss: () => void
}

// ─── Strategy Options ─────────────────────────────────────────────────────────

const STRATEGIES: MergeStrategy[] = [
  "last-write-wins",
  "local-wins",
  "remote-wins",
  "deep-merge",
  "manual",
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function ConflictResolution({
  conflicts,
  localUpdatedAt,
  remoteUpdatedAt,
  onResolve,
  onDismiss,
}: ConflictResolutionProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<MergeStrategy>("deep-merge")
  const [expandedConflict, setExpandedConflict] = useState<number | null>(null)
  const [manualResolutions, setManualResolutions] = useState<Record<number, unknown>>({})
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  const handleResolve = () => {
    if (selectedStrategy === "manual") {
      // Apply manual resolutions
      const resolutions = conflicts.map((c, i) => ({
        ...c,
        resolvedValue: manualResolutions[i] !== undefined ? manualResolutions[i] : c.resolvedValue,
        resolvedBy: "manual" as const,
      }))
      onResolve("manual", resolutions)
    } else {
      onResolve(selectedStrategy)
    }
  }

  const handleManualResolution = (index: number, value: unknown) => {
    setManualResolutions((prev) => ({ ...prev, [index]: value }))
  }

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          Settings Conflict Detected
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Conflict summary */}
        <div className="rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-amber-900/50">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Settings were modified on <strong>another device</strong> while you were offline.
          </p>
          <div className="mt-2 flex items-center gap-4 text-xs text-amber-600 dark:text-amber-400">
            <div className="flex items-center gap-1">
              <Laptop className="h-3 w-3" />
              <span>Local: {localUpdatedAt ? formatTime(localUpdatedAt) : "Unknown"}</span>
            </div>
            <ArrowRight className="h-3 w-3" />
            <div className="flex items-center gap-1">
              <Cloud className="h-3 w-3" />
              <span>Remote: {remoteUpdatedAt ? formatTime(remoteUpdatedAt) : "Unknown"}</span>
            </div>
          </div>
        </div>

        {/* Conflict count */}
        <p className="text-sm text-muted-foreground">
          <strong>{conflicts.length}</strong> setting{conflicts.length !== 1 ? "s" : ""} conflict{conflicts.length !== 1 ? "s" : ""} found
        </p>

        {/* Strategy selection */}
        <div className="space-y-2">
          <p className="text-sm font-medium">How would you like to resolve this?</p>
          <div className="space-y-2">
            {STRATEGIES.map((strategy) => (
              <label
                key={strategy}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors",
                  selectedStrategy === strategy
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="merge-strategy"
                  value={strategy}
                  checked={selectedStrategy === strategy}
                  onChange={() => setSelectedStrategy(strategy)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium">{getStrategyLabel(strategy)}</p>
                  <p className="text-xs text-muted-foreground">
                    {getStrategyDescription(strategy)}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Manual resolution (if selected) */}
        {selectedStrategy === "manual" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Resolve each conflict:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {conflicts.map((conflict, index) => (
                <ConflictItem
                  key={conflict.path}
                  conflict={conflict}
                  index={index}
                  isExpanded={expandedConflict === index}
                  onToggle={() =>
                    setExpandedConflict(expandedConflict === index ? null : index)
                  }
                  onResolve={(value) => handleManualResolution(index, value)}
                  resolvedValue={manualResolutions[index]}
                />
              ))}
            </div>
          </div>
        )}

        {/* Conflict details (collapsible) */}
        {selectedStrategy !== "manual" && conflicts.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Conflicting settings:</p>
            <div className="space-y-1">
              {conflicts.map((conflict) => (
                <div
                  key={conflict.path}
                  className="flex items-center justify-between rounded border bg-white/50 px-2 py-1 text-xs dark:bg-amber-900/30"
                >
                  <span className="font-mono">{conflict.path}</span>
                  <span className="text-muted-foreground">
                    {String(conflict.localValue)} → {String(conflict.remoteValue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
            <AlertDialogTrigger asChild>
              <Button className="flex-1" disabled={selectedStrategy === "manual" && Object.keys(manualResolutions).length === 0}>
                <Check className="mr-2 h-4 w-4" />
                Apply Resolution
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm conflict resolution</AlertDialogTitle>
                <AlertDialogDescription>
                  You are about to resolve {conflicts.length} conflict{conflicts.length !== 1 ? "s" : ""} using{" "}
                  <strong>{getStrategyLabel(selectedStrategy)}</strong>.
                  {selectedStrategy === "manual" && (
                    <span> You have resolved {Object.keys(manualResolutions).length} of {conflicts.length} conflicts.</span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResolve}>
                  <Check className="mr-1 h-3 w-3" />
                  Confirm Resolution
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="outline" onClick={onDismiss}>
            <X className="mr-2 h-4 w-4" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Conflict Item ────────────────────────────────────────────────────────────

function ConflictItem({
  conflict,
  index,
  isExpanded,
  onToggle,
  onResolve,
  resolvedValue,
}: {
  conflict: FieldConflict
  index: number
  isExpanded: boolean
  onToggle: () => void
  onResolve: (value: unknown) => void
  resolvedValue: unknown
}) {
  return (
    <div className="rounded-lg border bg-white dark:bg-amber-900/30">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between p-2 text-left"
      >
        <span className="text-sm font-mono">{conflict.path}</span>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-2 border-t p-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950">
              <p className="font-medium text-blue-700 dark:text-blue-300">Local</p>
              <p className="font-mono">{JSON.stringify(conflict.localValue)}</p>
            </div>
            <div className="rounded border border-emerald-200 bg-emerald-50 p-2 dark:border-emerald-800 dark:bg-emerald-950">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">Remote</p>
              <p className="font-mono">{JSON.stringify(conflict.remoteValue)}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant={resolvedValue === conflict.localValue ? "default" : "outline"}
              onClick={() => onResolve(conflict.localValue)}
            >
              <Laptop className="mr-1 h-3 w-3" />
              Keep Local
            </Button>
            <Button
              size="sm"
              variant={resolvedValue === conflict.remoteValue ? "default" : "outline"}
              onClick={() => onResolve(conflict.remoteValue)}
            >
              <Cloud className="mr-1 h-3 w-3" />
              Keep Remote
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return new Date(dateStr).toLocaleDateString()
}
