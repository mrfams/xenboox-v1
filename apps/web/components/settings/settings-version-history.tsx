"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
} from "@/components/ui";
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
} from "@/components/ui";
import {
  History,
  RotateCcw,
  Save,
  ChevronDown,
  ChevronUp,
  Tag,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { showUndoToast } from "@/lib/settings-undo";
import { BackupProgressIndicator } from "@/components/settings/backup-progress-indicator";

// ─── Types ────────────────────────────────────────────────────────────────────

type Version = {
  id: string;
  version: number;
  label: string | null;
  settings: Record<string, unknown>;
  createdAt: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsVersionHistory({
  defaultExpanded = false,
}: {
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [restoreTarget, setRestoreTarget] = useState<Version | null>(null);

  const utils = trpc.useContext();

  // Queries
  const { data: versions, isLoading } = trpc.settings.getVersions.useQuery(
    { limit: 10 },
    { enabled: isExpanded },
  );

  // Mutations
  const createVersion = trpc.settings.createVersion.useMutation({
    onSuccess: () => {
      toast.success("Version saved");
      utils.settings.getVersions.invalidate();
      setShowSaveDialog(false);
      setVersionLabel("");
    },
    onError: (err) => toast.error(err.message),
  });

  const restoreVersion = trpc.settings.restoreVersion.useMutation({
    onSuccess: (data) => {
      showUndoToast(`Restored from v${data.restoredFrom}`);
      utils.settings.getVersions.invalidate();
      utils.settings.get.invalidate();
      setRestoreTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  // Auto-versioning before restore
  const [backupJustCompleted, setBackupJustCompleted] = useState(false);
  const createAutoBackup = trpc.settings.createVersion.useMutation({
    onSuccess: () => {
      setBackupJustCompleted(true);
      setTimeout(() => setBackupJustCompleted(false), 1500);
      // Auto-backup created, now proceed with restore
      if (restoreTarget) {
        restoreVersion.mutate({ versionId: restoreTarget.id });
      }
    },
    onError: () => {
      // Even if auto-backup fails, proceed with restore
      if (restoreTarget) {
        restoreVersion.mutate({ versionId: restoreTarget.id });
      }
    },
  });

  const pruneVersions = trpc.settings.pruneVersions.useMutation({
    onSuccess: (data) => {
      if (data.deleted > 0) {
        toast.success(`Cleaned up ${data.deleted} old versions`);
      }
      utils.settings.getVersions.invalidate();
    },
  });

  const handleSaveVersion = () => {
    createVersion.mutate({ label: versionLabel || undefined });
  };

  const handleRestore = () => {
    if (restoreTarget) {
      // Auto-version before restore (backup current settings first)
      createAutoBackup.mutate({
        label: `Auto-backup: before restoring to v${restoreTarget.version}`,
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full"
        >
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Version History
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Save snapshots of your settings to restore later.
            </p>
            <Button size="sm" onClick={() => setShowSaveDialog(true)}>
              <Save className="mr-1 h-3 w-3" />
              Save version
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          ) : !versions || versions.length === 0 ? (
            <div className="rounded-lg border bg-muted/30 p-4 text-center">
              <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                No versions saved yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Save a version before making changes to enable rollback.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <VersionEntry
                  key={version.id}
                  version={version}
                  onRestore={() => setRestoreTarget(version)}
                />
              ))}
            </div>
          )}

          {/* Save Dialog */}
          <AlertDialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Save settings version</AlertDialogTitle>
                <AlertDialogDescription>
                  Create a snapshot of your current settings that you can
                  restore later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-2">
                <label className="text-sm font-medium">Label (optional)</label>
                <input
                  type="text"
                  value={versionLabel}
                  onChange={(e) => setVersionLabel(e.target.value)}
                  placeholder="e.g., Before changing AI preferences"
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  maxLength={100}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSaveVersion}>
                  <Save className="mr-1 h-3 w-3" />
                  Save version
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Restore Dialog */}
          <AlertDialog
            open={!!restoreTarget}
            onOpenChange={(open) => !open && setRestoreTarget(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restore version?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will replace your current settings with version{" "}
                  {restoreTarget?.version}
                  {restoreTarget?.label ? ` (${restoreTarget.label})` : ""}.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <BackupProgressIndicator
                isPending={createAutoBackup.isPending}
                justCompleted={backupJustCompleted}
                idleText="A backup of your current settings will be saved automatically before restoring."
                pendingText="Creating backup..."
                completedText="Backup saved!"
                tooltip={
                  <>
                    <p className="font-medium mb-1">Backup contains:</p>
                    <ul className="space-y-0.5 text-muted-foreground">
                      <li>• Your current settings snapshot</li>
                      <li>• Saved as a new version in Version History</li>
                    </ul>
                    <p className="mt-2 text-muted-foreground">
                      After restoring, you can revert again from Version
                      History.
                    </p>
                  </>
                }
              />
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore}>
                  <RotateCcw className="mr-1 h-3 w-3" />
                  Restore
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      )}
    </Card>
  );
}

// ─── Version Entry ────────────────────────────────────────────────────────────

function VersionEntry({
  version,
  onRestore,
}: {
  version: Version;
  onRestore: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const timeAgo = version.createdAt
    ? formatTimeAgo(version.createdAt)
    : "Unknown";

  // Count settings keys
  const settingsKeys = Object.keys(version.settings || {}).length;

  return (
    <div className="rounded-lg border bg-muted/30 overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          v{version.version}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">
              {version.label || `Version ${version.version}`}
            </p>
            {version.label && (
              <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {timeAgo} · {settingsKeys} setting{settingsKeys !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={onRestore}>
            <RotateCcw className="mr-1 h-3 w-3" />
            Restore
          </Button>
        </div>
      </div>

      {showDetails && (
        <div className="border-t p-3 bg-background">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Settings snapshot
          </p>
          <pre className="rounded bg-muted p-2 text-[10px] overflow-x-auto max-h-40 overflow-y-auto">
            {JSON.stringify(version.settings, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}
