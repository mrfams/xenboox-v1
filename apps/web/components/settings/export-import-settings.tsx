"use client";

import { useState, useRef } from "react";
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
import { Download, Upload, Check, AlertCircle, FileJson } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { showUndoToast } from "@/lib/settings-undo";
import { BackupProgressIndicator } from "@/components/settings/backup-progress-indicator";
import { APP_CONFIG } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportedSettings = {
  version: string;
  exportedAt: string;
  aiPreferences: {
    autoReconcile: boolean;
    autoCategorize: boolean;
    aiAlerts: boolean;
    dailyDigest: boolean;
  } | null;
  notificationPreferences: {
    emailInvoices: boolean;
    emailReports: boolean;
    emailAlerts: boolean;
    pushPayments: boolean;
    pushApprovals: boolean;
  } | null;
  onboarding: {
    completed: boolean;
    currentStep: string | null;
  };
};

// ─── localStorage Keys ────────────────────────────────────────────────────────

const KEYS = {
  aiPreferences: "xenboox_ai_preferences",
  onboardingCompleted: "xenboox_onboarding_completed",
  onboardingStep: "xenboox_onboarding_step",
} as const;

// ─── Helper: Read from localStorage ───────────────────────────────────────────

function readFromStorage<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// ─── Helper: Validate imported settings ───────────────────────────────────────

function validateImportedSettings(data: unknown): data is ExportedSettings {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.version !== "string") return false;
  if (typeof obj.exportedAt !== "string") return false;
  return true;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExportImportSettings({
  onViewBackup,
}: { onViewBackup?: () => void } = {}) {
  const [importPreview, setImportPreview] = useState<ExportedSettings | null>(
    null,
  );
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-versioning before import
  const [backupJustCompleted, setBackupJustCompleted] = useState(false);
  const createVersionMutation = trpc.settings.createVersion.useMutation({
    onSuccess: () => {
      setBackupJustCompleted(true);
      setTimeout(() => setBackupJustCompleted(false), 1500);
    },
    onError: () => {
      // Version creation failure shouldn't block the import
    },
  });

  // ── Export ──

  const handleExport = () => {
    const settings: ExportedSettings = {
      version: APP_CONFIG.version,
      exportedAt: new Date().toISOString(),
      aiPreferences: readFromStorage(KEYS.aiPreferences),
      notificationPreferences: null, // Notifications are server-side, not exported
      onboarding: {
        completed: localStorage.getItem(KEYS.onboardingCompleted) === "true",
        currentStep: localStorage.getItem(KEYS.onboardingStep),
      },
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xenboox-settings-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Settings exported successfully");
  };

  // ── Import: File Selection ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportPreview(null);

    if (!file.name.endsWith(".json")) {
      setImportError("Please select a JSON file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!validateImportedSettings(data)) {
          setImportError("Invalid settings file format");
          return;
        }
        setImportPreview(data);
        setShowImportDialog(true);
      } catch {
        setImportError("Failed to parse JSON file");
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    e.target.value = "";
  };

  // ── Import: Apply ──

  const handleImportApply = () => {
    if (!importPreview) return;

    // Auto-version before import
    createVersionMutation.mutate({
      label: "Auto-backup: before settings import",
    });

    // Apply AI preferences
    if (importPreview.aiPreferences) {
      localStorage.setItem(
        KEYS.aiPreferences,
        JSON.stringify(importPreview.aiPreferences),
      );
    }

    // Apply onboarding status
    if (importPreview.onboarding.completed) {
      localStorage.setItem(KEYS.onboardingCompleted, "true");
    } else {
      localStorage.removeItem(KEYS.onboardingCompleted);
    }

    if (importPreview.onboarding.currentStep) {
      localStorage.setItem(
        KEYS.onboardingStep,
        importPreview.onboarding.currentStep,
      );
    } else {
      localStorage.removeItem(KEYS.onboardingStep);
    }

    setShowImportDialog(false);
    setImportPreview(null);
    showUndoToast("Settings imported");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-4 w-4" />
          Export / Import Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Export your preferences to a JSON file, or import settings from
          another device.
        </p>
        {/* Export Summary */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Will export:
          </p>
          <div className="space-y-1">
            <ExportItem label="AI Preferences" available={true} />
            <ExportItem label="Onboarding Status" available={true} />
            <ExportItem
              label="Notification Preferences"
              available={false}
              note="Server-side"
            />
          </div>
        </div>
        {/* Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} className="flex-1">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1"
          >
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>{" "}
        {/* Backup indicator */}
        <BackupProgressIndicator
          isPending={createVersionMutation.isPending}
          justCompleted={backupJustCompleted}
          idleText="A backup will be created automatically before importing."
          pendingText="Creating backup..."
          completedText="Backup saved!"
          tooltip={
            <>
              <p className="font-medium mb-1">Backup contains:</p>
              <ul className="space-y-0.5 text-muted-foreground">
                <li>
                  • AI preferences (auto-reconcile, categorize, alerts, digest)
                </li>
                <li>• Onboarding status and current step</li>
                <li>• Notification preferences (email, push, AI)</li>
                <li>• Sync preferences (default merge strategy)</li>
                <li>• Usage statistics</li>
              </ul>
              {onViewBackup && (
                <button
                  onClick={onViewBackup}
                  className="mt-2 inline-flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  View backup →
                </button>
              )}
            </>
          }
        />
        {/* Import Error */}
        {importError && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {importError}
          </div>
        )}
        {/* Import Confirmation Dialog */}
        <AlertDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Import settings?</AlertDialogTitle>
              <AlertDialogDescription>
                This will overwrite your current settings with the imported
                values.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {importPreview && (
              <div className="space-y-3 py-2">
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Imported from:{" "}
                    {new Date(importPreview.exportedAt).toLocaleDateString()}
                  </p>
                  <div className="space-y-1">
                    {importPreview.aiPreferences && (
                      <div className="flex items-center gap-2 text-sm">
                        <Check className="h-3 w-3 text-balanced-green" />
                        <span>AI Preferences</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {
                            Object.values(importPreview.aiPreferences).filter(
                              Boolean,
                            ).length
                          }
                          /4 enabled
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="h-3 w-3 text-balanced-green" />
                      <span>Onboarding Status</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {importPreview.onboarding.completed
                          ? "Completed"
                          : "In progress"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleImportApply}>
                <Upload className="mr-1 h-3 w-3" />
                Import Settings
              </AlertDialogAction>
            </AlertDialogFooter>{" "}
            <BackupProgressIndicator
              isPending={createVersionMutation.isPending}
              justCompleted={backupJustCompleted}
              idleText="A backup will be created automatically before importing. You can restore from Version History."
              pendingText="Creating backup..."
              completedText="Backup saved!"
              tooltip={
                <>
                  <p className="font-medium mb-1">Backup contains:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>
                      • All current settings (AI, onboarding, notifications,
                      sync)
                    </li>
                    <li>• Usage statistics</li>
                  </ul>
                  {onViewBackup && (
                    <button
                      onClick={onViewBackup}
                      className="mt-2 inline-flex items-center gap-1 text-primary hover:underline font-medium"
                    >
                      View backup →
                    </button>
                  )}
                </>
              }
            />
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

// ─── Export Item ──────────────────────────────────────────────────────────────

function ExportItem({
  label,
  available,
  note,
}: {
  label: string;
  available: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {available ? (
        <Check className="h-3 w-3 text-balanced-green" />
      ) : (
        <AlertCircle className="h-3 w-3 text-muted-foreground" />
      )}
      <span className={available ? "text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      {note && <span className="text-muted-foreground ml-auto">({note})</span>}
    </div>
  );
}
