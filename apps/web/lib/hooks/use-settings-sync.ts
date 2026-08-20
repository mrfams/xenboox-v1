"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"
import {
  type FieldConflict,
  type MergeStrategy,
  type SettingsSnapshot,
  detectConflicts,
  applyMergeStrategy,
} from "@/lib/merge-strategies"

// ─── Types ────────────────────────────────────────────────────────────────────

type Settings = {
  aiPreferences?: {
    autoReconcile?: boolean
    autoCategorize?: boolean
    aiAlerts?: boolean
    dailyDigest?: boolean
  }
  onboarding?: {
    completed?: boolean
    currentStep?: string | null
  }
  notifications?: {
    emailInvoices?: boolean
    emailReports?: boolean
    emailAlerts?: boolean
    pushPayments?: boolean
    pushApprovals?: boolean
  }
  usage?: {
    autoReconcile?: number
    autoCategorize?: number
    aiAlerts?: number
    dailyDigest?: number
    totalActions?: number
    lastUsed?: string | null
  }
}

type ConflictState = {
  hasConflict: boolean
  conflicts: FieldConflict[]
  localUpdatedAt: string | null
  remoteUpdatedAt: string | null
  remoteSettings: Settings | null
  mergeStrategy: MergeStrategy
  isResolving: boolean
}

type SettingsSyncState = {
  settings: Settings
  isLoaded: boolean
  isSyncing: boolean
  lastSyncedAt: string | null
  error: string | null
  conflict: ConflictState
}

// ─── localStorage Keys ────────────────────────────────────────────────────────

const LOCAL_KEYS = {
  aiPreferences: "xenboox_ai_preferences",
  onboardingCompleted: "xenboox_onboarding_completed",
  onboardingStep: "xenboox_onboarding_step",
  usageStats: "xenboox_ai_usage_stats",
  notificationPrefs: "xenboox_notification_preferences",
  lastSyncedAt: "xenboox_last_synced_at",
  lastLocalEditAt: "xenboox_last_local_edit_at",
} as const

// ─── Read from localStorage ───────────────────────────────────────────────────

function readLocal<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function writeLocal(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value))
}

function removeLocal(key: string) {
  localStorage.removeItem(key)
}

// ─── Build settings from localStorage ─────────────────────────────────────────

function buildLocalSettings(): Settings {
  return {
    aiPreferences: readLocal(LOCAL_KEYS.aiPreferences) || undefined,
    onboarding: {
      completed: localStorage.getItem(LOCAL_KEYS.onboardingCompleted) === "true",
      currentStep: localStorage.getItem(LOCAL_KEYS.onboardingStep),
    },
    notifications: readLocal(LOCAL_KEYS.notificationPrefs) || undefined,
    usage: readLocal(LOCAL_KEYS.usageStats) || undefined,
  }
}

// ─── Apply settings to localStorage ───────────────────────────────────────────

function applyToLocal(settings: Settings) {
  if (settings.aiPreferences) {
    writeLocal(LOCAL_KEYS.aiPreferences, settings.aiPreferences)
  }
  if (settings.onboarding) {
    if (settings.onboarding.completed) {
      writeLocal(LOCAL_KEYS.onboardingCompleted, "true")
    } else {
      removeLocal(LOCAL_KEYS.onboardingCompleted)
    }
    if (settings.onboarding.currentStep) {
      writeLocal(LOCAL_KEYS.onboardingStep, settings.onboarding.currentStep)
    } else {
      removeLocal(LOCAL_KEYS.onboardingStep)
    }
  }
  if (settings.notifications) {
    writeLocal(LOCAL_KEYS.notificationPrefs, settings.notifications)
  }
  if (settings.usage) {
    writeLocal(LOCAL_KEYS.usageStats, settings.usage)
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSettingsSync() {
  const { data: session } = useSession()
  const [state, setState] = useState<SettingsSyncState>({
    settings: {},
    isLoaded: false,
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
  })

  const isSyncingRef = useRef(false)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncedAtRef = useRef<string | null>(null)
  const lastLocalEditRef = useRef<string | null>(null)

  // tRPC queries and mutations
  const getSettings = trpc.settings.get.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  })

  const setSettings = trpc.settings.set.useMutation()

  // ── Polling for remote changes ──
  useEffect(() => {
    if (!session?.user?.id) return

    const poll = async () => {
      try {
        const response = await fetch("/api/trpc/settings.get", {
          headers: { "Content-Type": "application/json" },
        })
        const data = await response.json()
        const serverTime = data?.result?.data?.updatedAt

        if (serverTime && lastSyncedAtRef.current && serverTime !== lastSyncedAtRef.current) {
          // Remote changes detected!
          const serverSettings = data?.result?.data?.settings as Settings

          if (serverSettings) {
            // Check for conflicts
            const localSettings = buildLocalSettings()
            const localSnapshot: SettingsSnapshot = {
              settings: localSettings as Record<string, unknown>,
              updatedAt: lastLocalEditRef.current,
            }
            const remoteSnapshot: SettingsSnapshot = {
              settings: serverSettings as Record<string, unknown>,
              updatedAt: serverTime,
            }

            const conflicts = detectConflicts(localSnapshot, remoteSnapshot, lastSyncedAtRef.current)

            if (conflicts.length > 0) {
              // Conflict detected!
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
              }))
            } else {
              // No conflict — just accept remote changes
              const merged = applyMergeStrategy(
                localSettings as Record<string, unknown>,
                serverSettings as Record<string, unknown>,
                "remote-wins"
              )

              applyToLocal(merged.merged as Settings)
              lastSyncedAtRef.current = serverTime

              setState((prev) => ({
                ...prev,
                settings: merged.merged as Settings,
                lastSyncedAt: serverTime,
              }))
            }
          }
        }
      } catch {
        // Polling failures are silent
      }
    }

    pollIntervalRef.current = setInterval(poll, 30_000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [session?.user?.id])

  // ── Load settings on mount ──

  useEffect(() => {
    const localSettings = buildLocalSettings()
    const storedLastSynced = localStorage.getItem(LOCAL_KEYS.lastSyncedAt)

    setState((prev) => ({
      ...prev,
      settings: localSettings,
      isLoaded: true,
      lastSyncedAt: storedLastSynced,
    }))

    lastSyncedAtRef.current = storedLastSynced

    if (getSettings.data) {
      const serverSettings = getSettings.data.settings as Settings
      const serverTime = getSettings.data.updatedAt

      // Check for conflicts on initial load
      const localSnapshot: SettingsSnapshot = {
        settings: localSettings as Record<string, unknown>,
        updatedAt: lastLocalEditRef.current,
      }
      const remoteSnapshot: SettingsSnapshot = {
        settings: serverSettings as Record<string, unknown>,
        updatedAt: serverTime,
      }

      const conflicts = detectConflicts(localSnapshot, remoteSnapshot, storedLastSynced)

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
        }))
      } else {
        // No conflict — merge normally (remote wins)
        const merged = applyMergeStrategy(
          localSettings as Record<string, unknown>,
          serverSettings as Record<string, unknown>,
          "remote-wins"
        )

        applyToLocal(merged.merged as Settings)
        lastSyncedAtRef.current = serverTime
        writeLocal(LOCAL_KEYS.lastSyncedAt, serverTime)

        setState((prev) => ({
          ...prev,
          settings: merged.merged as Settings,
          lastSyncedAt: serverTime,
        }))
      }
    }
  }, [getSettings.data, session?.user?.id])

  // ── Update settings (local + debounced cloud sync) ──

  const updateSettings = useCallback(
    (path: string, value: unknown) => {
      const now = new Date().toISOString()
      lastLocalEditRef.current = now

      setState((prev) => {
        const newSettings = { ...prev.settings }
        const keys = path.split(".")
        let current: Record<string, unknown> = newSettings as Record<string, unknown>

        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
            current[keys[i]] = {}
          }
          current = current[keys[i]] as Record<string, unknown>
        }

        current[keys[keys.length - 1]] = value

        applyToLocal(newSettings)

        return { ...prev, settings: newSettings }
      })

      // Debounced cloud sync (2 seconds)
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current)
      }
      syncTimeoutRef.current = setTimeout(() => {
        if (session?.user?.id && !isSyncingRef.current) {
          isSyncingRef.current = true
          setState((prev) => ({ ...prev, isSyncing: true }))

          const localSettings = buildLocalSettings()
          setSettings.mutate(
            { settings: localSettings as Record<string, unknown> },
            {
              onSuccess: (data) => {
                lastSyncedAtRef.current = data.updatedAt
                writeLocal(LOCAL_KEYS.lastSyncedAt, data.updatedAt)
                setState((prev) => ({
                  ...prev,
                  isSyncing: false,
                  lastSyncedAt: data.updatedAt,
                  error: null,
                }))
                isSyncingRef.current = false
              },
              onError: (err) => {
                setState((prev) => ({
                  ...prev,
                  isSyncing: false,
                  error: err.message,
                }))
                isSyncingRef.current = false
              },
            }
          )
        }
      }, 2000)
    },
    [session?.user?.id, setSettings]
  )

  // ── Force sync (for immediate save) ──

  const forceSync = useCallback(() => {
    if (session?.user?.id && !isSyncingRef.current) {
      isSyncingRef.current = true
      setState((prev) => ({ ...prev, isSyncing: true }))

      const localSettings = buildLocalSettings()
      setSettings.mutate(
        { settings: localSettings as Record<string, unknown> },
        {
          onSuccess: (data) => {
            lastSyncedAtRef.current = data.updatedAt
            writeLocal(LOCAL_KEYS.lastSyncedAt, data.updatedAt)
            setState((prev) => ({
              ...prev,
              isSyncing: false,
              lastSyncedAt: data.updatedAt,
              error: null,
            }))
            isSyncingRef.current = false
          },
          onError: (err) => {
            setState((prev) => ({
              ...prev,
              isSyncing: false,
              error: err.message,
            }))
            isSyncingRef.current = false
          },
        }
      )
    }
  }, [session?.user?.id, setSettings])

  // ── Resolve conflict ──

  const resolveConflict = useCallback(
    (strategy: MergeStrategy, resolutions?: FieldConflict[]) => {
      setState((prev) => {
        if (!prev.conflict.remoteSettings) return prev

        const localSettings = buildLocalSettings()

        let result
        if (strategy === "manual" && resolutions) {
          // Apply manual resolutions
          const { applyManualResolutions } = require("@/lib/merge-strategies")
          result = applyManualResolutions(
            localSettings as Record<string, unknown>,
            prev.conflict.remoteSettings as Record<string, unknown>,
            resolutions
          )
        } else {
          result = applyMergeStrategy(
            localSettings as Record<string, unknown>,
            prev.conflict.remoteSettings as Record<string, unknown>,
            strategy
          )
        }

        applyToLocal(result.merged as Settings)

        // Sync resolved settings to server
        if (session?.user?.id) {
          setSettings.mutate(
            { settings: result.merged as Record<string, unknown> },
            {
              onSuccess: (data) => {
                lastSyncedAtRef.current = data.updatedAt
                writeLocal(LOCAL_KEYS.lastSyncedAt, data.updatedAt)
                setState((prev) => ({
                  ...prev,
                  lastSyncedAt: data.updatedAt,
                }))
              },
            }
          )
        }

        return {
          ...prev,
          settings: result.merged as Settings,
          conflict: {
            hasConflict: false,
            conflicts: [],
            localUpdatedAt: null,
            remoteUpdatedAt: null,
            remoteSettings: null,
            mergeStrategy: strategy,
            isResolving: false,
          },
        }
      })
    },
    [session?.user?.id, setSettings]
  )

  // ── Set merge strategy ──

  const setMergeStrategy = useCallback((strategy: MergeStrategy) => {
    setState((prev) => ({
      ...prev,
      conflict: {
        ...prev.conflict,
        mergeStrategy: strategy,
      },
    }))
  }, [])

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
    }))
  }, [])

  // ── Reset settings ──

  const resetSettings = useCallback(() => {
    removeLocal(LOCAL_KEYS.aiPreferences)
    removeLocal(LOCAL_KEYS.onboardingCompleted)
    removeLocal(LOCAL_KEYS.onboardingStep)
    removeLocal(LOCAL_KEYS.notificationPrefs)
    removeLocal(LOCAL_KEYS.usageStats)
    removeLocal(LOCAL_KEYS.lastSyncedAt)
    removeLocal(LOCAL_KEYS.lastLocalEditAt)

    if (session?.user?.id) {
      setSettings.mutate({ settings: {} })
    }

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
    }))
  }, [session?.user?.id, setSettings])

  return {
    ...state,
    updateSettings,
    forceSync,
    resetSettings,
    resolveConflict,
    setMergeStrategy,
    dismissConflict,
    isCloudEnabled: !!session?.user?.id,
  }
}
