"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";

import {
  type FieldConflict,
  type MergeStrategy,
  type SettingsSnapshot,
  detectConflicts,
  applyMergeStrategy,
  applyManualResolutions,
} from "@/lib/merge-strategies";
import {
  type SettingsOperation,
  generateOperationId,
} from "@/lib/operational-transform";

// ─── Types ────────────────────────────────────────────────────────────────────

type Settings = {
  aiPreferences?: {
    autoReconcile?: boolean;
    autoCategorize?: boolean;
    aiAlerts?: boolean;
    dailyDigest?: boolean;
  };
  onboarding?: {
    completed?: boolean;
    currentStep?: string | null;
  };
  notifications?: {
    emailInvoices?: boolean;
    emailReports?: boolean;
    emailAlerts?: boolean;
    pushPayments?: boolean;
    pushApprovals?: boolean;
  };
  usage?: {
    autoReconcile?: number;
    autoCategorize?: number;
    aiAlerts?: number;
    dailyDigest?: number;
    totalActions?: number;
    lastUsed?: string | null;
  };
  syncPreferences?: {
    defaultMergeStrategy?: MergeStrategy;
    autoResolve?: boolean;
  };
};

type ConflictState = {
  hasConflict: boolean;
  conflicts: FieldConflict[];
  localUpdatedAt: string | null;
  remoteUpdatedAt: string | null;
  remoteSettings: Settings | null;
  mergeStrategy: MergeStrategy;
  isResolving: boolean;
};

type SettingsSyncState = {
  settings: Settings;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error: string | null;
  conflict: ConflictState;
};

/**
 * Server-first settings sync.
 *
 * The database (`user_settings.settings` via tRPC `settings.get`/`set`/
 * `replace`) is the single source of truth. Nothing is persisted in the
 * browser: the working copy lives in React state (per tab), optimistic edits
 * are synced to the server with a debounce, and cross-device changes arrive
 * via the SSE stream (or a query refetch). Because there is no persisted
 * local copy, "local" in conflict resolution means this tab's un-persisted
 * edits.
 */
export function useSettingsSync() {
  const { data: session } = useSession();
  const utils = trpc.useUtils();
  const [state, setState] = useState<SettingsSyncState>({
    settings: {},
    isSyncing: false,
    lastSyncedAt: null,
    error: null,
    conflict: {
      hasConflict: false,
      conflicts: [],
      localUpdatedAt: null,
      remoteUpdatedAt: null,
      remoteSettings: null,
      mergeStrategy: "deep-merge",
      isResolving: false,
    },
  });

  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedAtRef = useRef<string | null>(null);
  const lastLocalEditRef = useRef<string | null>(null);
  // Working copy of settings for this tab (un-persisted edits included).
  const workingSettingsRef = useRef<Settings>({});
  const pendingOpsRef = useRef<SettingsOperation[]>([]); // Pending operations queue
  const clientIdRef = useRef<string>(generateOperationId()); // Unique ID for this tab
  const sseRef = useRef<EventSource | null>(null); // SSE connection

  // tRPC queries and mutations
  const getSettings = trpc.settings.get.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const setSettings = trpc.settings.set.useMutation();
  const replaceSettings = trpc.settings.replace.useMutation();
  const logConflictResolution =
    trpc.settings.logConflictResolution.useMutation();

  const isCloudEnabled = !!session?.user?.id;
  // Server data has settled (arrived or failed) — the UI can render real state.
  const isLoaded = isCloudEnabled && !getSettings.isLoading;

  // ── Mirror server truth into state (covers loads, refetches, invalidations) ──

  useEffect(() => {
    if (!isCloudEnabled) return;
    if (getSettings.isLoading) return;

    if (getSettings.data) {
      const serverSettings = (getSettings.data.settings ?? {}) as Settings;
      const serverTime = getSettings.data.updatedAt;
      lastSyncedAtRef.current = serverTime;
      workingSettingsRef.current = serverSettings;
      setState((prev) => ({
        ...prev,
        settings: serverSettings,
        lastSyncedAt: serverTime,
        error: null,
      }));
      return;
    }

    // Query settled with an error — surface it honestly.
    setState((prev) => ({
      ...prev,
      error: getSettings.error?.message ?? "Failed to load settings",
    }));
  }, [
    getSettings.data,
    getSettings.error,
    getSettings.isLoading,
    isCloudEnabled,
  ]);

  // ── Server save (shared by debounced updates and forceSync) ──

  const saveToServer = useCallback(
    async (settings: Settings) => {
      if (!session?.user?.id || isSyncingRef.current) return;
      isSyncingRef.current = true;
      setState((prev) => ({ ...prev, isSyncing: true }));

      try {
        const data = await setSettings.mutateAsync({
          settings: settings as Record<string, unknown>,
          baseVersion: 0,
          baseUpdatedAt: lastSyncedAtRef.current || undefined,
        });
        lastSyncedAtRef.current = data.updatedAt;
        utils.settings.get.setData(undefined, data);
        pendingOpsRef.current = []; // Clear pending ops on success
        setState((prev) => ({
          ...prev,
          isSyncing: false,
          lastSyncedAt: data.updatedAt,
          error: null,
        }));
      } catch (err) {
        const code = (err as { data?: { code?: string } })?.data?.code;
        if (code === "CONFLICT") {
          // Another device won the race — pull remote truth and surface the
          // conflict between it and this tab's un-persisted edits.
          const fresh = await utils.settings.get.fetch();
          const remoteSettings = (fresh?.settings ?? {}) as Settings;
          const remoteUpdatedAt = fresh?.updatedAt ?? null;

          const localSnapshot: SettingsSnapshot = {
            settings: settings as Record<string, unknown>,
            updatedAt: lastLocalEditRef.current,
          };
          const remoteSnapshot: SettingsSnapshot = {
            settings: remoteSettings as Record<string, unknown>,
            updatedAt: remoteUpdatedAt,
          };
          const conflicts = detectConflicts(
            localSnapshot,
            remoteSnapshot,
            lastSyncedAtRef.current,
          );

          setState((prev) => ({
            ...prev,
            isSyncing: false,
            conflict: {
              hasConflict: conflicts.length > 0,
              conflicts,
              localUpdatedAt: lastLocalEditRef.current,
              remoteUpdatedAt,
              remoteSettings,
              mergeStrategy: prev.conflict.mergeStrategy,
              isResolving: false,
            },
          }));
        } else {
          // Keep pending ops — they retry on the next update/forceSync.
          setState((prev) => ({
            ...prev,
            isSyncing: false,
            error:
              err instanceof Error
                ? err.message
                : "Failed to sync settings. Will retry.",
          }));
        }
      } finally {
        isSyncingRef.current = false;
      }
    },
    [session?.user?.id, setSettings, utils],
  );

  // ── Real-time SSE connection (server → this tab) ──

  useEffect(() => {
    if (!session?.user?.id) return;

    const acceptRemote = (serverSettings: Settings, serverTime: string) => {
      lastSyncedAtRef.current = serverTime;
      workingSettingsRef.current = serverSettings;
      utils.settings.get.setData(undefined, {
        settings: serverSettings as Record<string, unknown>,
        updatedAt: serverTime,
      });
      setState((prev) => ({
        ...prev,
        settings: serverSettings,
        lastSyncedAt: serverTime,
      }));
    };

    const connectSSE = () => {
      try {
        const eventSource = new EventSource("/api/settings/stream");
        sseRef.current = eventSource;

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === "settings_changed" && data.settings) {
              const serverSettings = data.settings as Settings;
              const serverTime = data.timestamp as string;

              // Pending un-persisted edits? Check for conflicts against the
              // incoming remote state before accepting it.
              if (pendingOpsRef.current.length > 0) {
                const localSnapshot: SettingsSnapshot = {
                  settings: workingSettingsRef.current as Record<
                    string,
                    unknown
                  >,
                  updatedAt: lastLocalEditRef.current,
                };
                const remoteSnapshot: SettingsSnapshot = {
                  settings: serverSettings as Record<string, unknown>,
                  updatedAt: serverTime,
                };

                const conflicts = detectConflicts(
                  localSnapshot,
                  remoteSnapshot,
                  lastSyncedAtRef.current,
                );

                if (conflicts.length > 0) {
                  setState((prev) => ({
                    ...prev,
                    conflict: {
                      hasConflict: true,
                      conflicts,
                      localUpdatedAt: lastLocalEditRef.current,
                      remoteUpdatedAt: serverTime,
                      remoteSettings: serverSettings,
                      mergeStrategy: prev.conflict.mergeStrategy,
                      isResolving: false,
                    },
                  }));
                  return;
                }
              }

              // No pending changes (or no conflicts) — accept remote.
              acceptRemote(serverSettings, serverTime);
            }
          } catch {
            // Parse errors are silent
          }
        };

        eventSource.onerror = () => {
          // Reconnect after 5 seconds
          eventSource.close();
          setTimeout(connectSSE, 5_000);
        };
      } catch {
        // SSE not available, fall back to polling via query invalidation —
        // the server-mirror effect picks up each refetch.
        pollIntervalRef.current = setInterval(() => {
          void utils.settings.get.invalidate();
        }, 10_000);
      }
    };

    connectSSE();

    return () => {
      if (sseRef.current) {
        sseRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [session?.user?.id, utils]);

  // ── Update settings (optimistic in-memory + debounced server sync) ──

  const updateSettings = useCallback(
    (path: string, value: unknown) => {
      const now = new Date().toISOString();
      lastLocalEditRef.current = now;

      const nextSettings = (() => {
        const newSettings = {
          ...workingSettingsRef.current,
        } as Record<string, unknown>;
        const keys = path.split(".");
        let current = newSettings;

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
            current[keys[i]] = {};
          }
          current = current[keys[i]] as Record<string, unknown>;
        }

        current[keys[keys.length - 1]] = value;
        return newSettings as Settings;
      })();

      workingSettingsRef.current = nextSettings;
      setState((prev) => ({ ...prev, settings: nextSettings }));

      // Create operation for this change
      const operation: SettingsOperation = {
        id: generateOperationId(),
        type: "set",
        path,
        value,
        baseVersion: 0,
        baseUpdatedAt: lastSyncedAtRef.current || new Date().toISOString(),
        clientId: clientIdRef.current,
        timestamp: now,
      };

      // Add to pending operations queue
      pendingOpsRef.current.push(operation);

      // Debounced cloud sync (500ms)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(() => {
        void saveToServer(nextSettings);
      }, 500);
    },
    [saveToServer],
  );

  // ── Force sync (for immediate save) ──

  const forceSync = useCallback(() => {
    void saveToServer(workingSettingsRef.current);
  }, [saveToServer]);

  // ── Resolve conflict ──

  const resolveConflict = useCallback(
    (strategy: MergeStrategy, resolutions?: FieldConflict[]) => {
      setState((prev) => {
        if (!prev.conflict.remoteSettings) return prev;

        const localSettings = workingSettingsRef.current;

        let result;
        if (strategy === "manual" && resolutions) {
          // Apply manual resolutions
          result = applyManualResolutions(
            localSettings as Record<string, unknown>,
            prev.conflict.remoteSettings as Record<string, unknown>,
            resolutions,
          );
        } else {
          result = applyMergeStrategy(
            localSettings as Record<string, unknown>,
            prev.conflict.remoteSettings as Record<string, unknown>,
            strategy,
          );
        }

        const merged = result.merged as Settings;

        // Log the conflict resolution
        logConflictResolution.mutate({
          strategy,
          conflictCount: prev.conflict.conflicts.length,
          conflicts: prev.conflict.conflicts.map((c) => ({
            path: c.path,
            localValue: c.localValue,
            remoteValue: c.remoteValue,
          })),
          resolvedValues: result.conflicts.map((c) => ({
            path: c.path,
            resolvedValue: c.resolvedValue,
            resolvedBy: c.resolvedBy,
          })),
          localUpdatedAt: prev.conflict.localUpdatedAt,
          remoteUpdatedAt: prev.conflict.remoteUpdatedAt,
        });

        // Persist the resolution (server is the single source of truth)
        if (session?.user?.id) {
          void setSettings
            .mutateAsync({
              settings: merged as Record<string, unknown>,
              baseVersion: 0,
              baseUpdatedAt: prev.conflict.remoteUpdatedAt || undefined,
            })
            .then((data) => {
              lastSyncedAtRef.current = data.updatedAt;
              utils.settings.get.setData(undefined, data);
              pendingOpsRef.current = [];
              workingSettingsRef.current = merged;
              setState((latest) => ({
                ...latest,
                lastSyncedAt: data.updatedAt,
              }));
            })
            .catch(() => {
              setState((latest) => ({
                ...latest,
                error: "Failed to save resolved settings. Will retry.",
              }));
            });
        }

        return {
          ...prev,
          settings: merged,
          conflict: {
            hasConflict: false,
            conflicts: [],
            localUpdatedAt: null,
            remoteUpdatedAt: null,
            remoteSettings: null,
            mergeStrategy: strategy,
            isResolving: false,
          },
        };
      });
    },
    [session?.user?.id, setSettings, logConflictResolution, utils],
  );

  // ── Set merge strategy ──

  const setMergeStrategy = useCallback((strategy: MergeStrategy) => {
    setState((prev) => ({
      ...prev,
      conflict: {
        ...prev.conflict,
        mergeStrategy: strategy,
      },
    }));
  }, []);

  // ── Dismiss conflict ──

  const dismissConflict = useCallback(() => {
    setState((prev) => ({
      ...prev,
      conflict: {
        hasConflict: false,
        conflicts: [],
        localUpdatedAt: null,
        remoteUpdatedAt: null,
        remoteSettings: null,
        mergeStrategy: prev.conflict.mergeStrategy,
        isResolving: false,
      },
    }));
  }, []);

  // ── Update sync preferences (default strategy, auto-resolve) ──

  const updateSyncPreferences = useCallback(
    (prefs: {
      defaultMergeStrategy?: MergeStrategy;
      autoResolve?: boolean;
    }) => {
      const nextSettings = {
        ...workingSettingsRef.current,
        syncPreferences: {
          ...workingSettingsRef.current.syncPreferences,
          ...prefs,
        },
      };
      workingSettingsRef.current = nextSettings;
      setState((prev) => ({
        ...prev,
        settings: nextSettings,
        conflict: {
          ...prev.conflict,
          mergeStrategy:
            prefs.defaultMergeStrategy || prev.conflict.mergeStrategy,
        },
      }));

      // Persist to the server (cross-device)
      if (session?.user?.id) {
        void saveToServer(nextSettings);
      }
    },
    [session?.user?.id, saveToServer],
  );

  // ── Reset settings (server-side replace — cross-device) ──

  const resetSettings = useCallback(() => {
    if (!session?.user?.id) {
      setState((prev) => ({
        ...prev,
        settings: {},
        lastSyncedAt: null,
        conflict: {
          hasConflict: false,
          conflicts: [],
          localUpdatedAt: null,
          remoteUpdatedAt: null,
          remoteSettings: null,
          mergeStrategy: prev.conflict.mergeStrategy,
          isResolving: false,
        },
      }));
      workingSettingsRef.current = {};
      pendingOpsRef.current = [];
      return;
    }

    void replaceSettings
      .mutateAsync({ settings: {} })
      .then((data) => {
        lastSyncedAtRef.current = data.updatedAt;
        utils.settings.get.setData(undefined, data);
        workingSettingsRef.current = {};
        pendingOpsRef.current = [];
        setState((prev) => ({
          ...prev,
          settings: {},
          lastSyncedAt: data.updatedAt,
          error: null,
          conflict: {
            hasConflict: false,
            conflicts: [],
            localUpdatedAt: null,
            remoteUpdatedAt: null,
            remoteSettings: null,
            mergeStrategy: prev.conflict.mergeStrategy,
            isResolving: false,
          },
        }));
      })
      .catch((err: unknown) => {
        setState((prev) => ({
          ...prev,
          error:
            err instanceof Error ? err.message : "Failed to reset settings",
        }));
      });
  }, [session?.user?.id, replaceSettings, utils]);

  return {
    ...state,
    isLoaded,
    updateSettings,
    forceSync,
    resetSettings,
    resolveConflict,
    setMergeStrategy,
    dismissConflict,
    updateSyncPreferences,
    isCloudEnabled,
    pendingOpsCount: pendingOpsRef.current.length, // Expose pending ops count
    clientId: clientIdRef.current, // Expose client ID
  };
}
