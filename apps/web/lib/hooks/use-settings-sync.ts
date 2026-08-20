"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "next-auth/react"
import { trpc } from "@/lib/trpc/client"

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

type SettingsSyncState = {
  settings: Settings
  isLoaded: boolean
  isSyncing: boolean
  lastSyncedAt: string | null
  error: string | null
  hasRemoteChanges: boolean
  remoteSettings: Settings | null
  remoteUpdatedAt: string | null
}

// ─── localStorage Keys ────────────────────────────────────────────────────────

const LOCAL_KEYS = {
  aiPreferences: "xenboox_ai_preferences",
  onboardingCompleted: "xenboox_onboarding_completed",
  onboardingStep: "xenboox_onboarding_step",
  usageStats: "xenboox_ai_usage_stats",
  notificationPrefs: "xenboox_notification_preferences",
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

// ─── Merge settings (deep merge) ─────────────────────────────────────────────

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key]) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      )
    } else if (source[key] !== undefined) {
      result[key] = source[key]
    }
  }
  return result
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
    hasRemoteChanges: false,
    remoteSettings: null,
    remoteUpdatedAt: null,
  })

  const isSyncingRef = useRef(false)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastSyncedAtRef = useRef<string | null>(null)

  // tRPC queries and mutations
  const getSettings = trpc.settings.get.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const setSettings = trpc.settings.set.useMutation()

  // ── Polling for remote changes ──
  useEffect(() => {
    if (!session?.user?.id) return

    const poll = async () => {
      try {
        // Fetch just the updatedAt timestamp to check for changes
        const response = await fetch("/api/trpc/settings.get", {
          headers: {
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        const serverTime = data?.result?.data?.updatedAt

        if (
          serverTime &&
          lastSyncedAtRef.current &&
          serverTime !== lastSyncedAtRef.current
        ) {
          // Remote changes detected!
          const serverSettings = data?.result?.data?.settings as Settings
          if (serverSettings) {
            setState((prev) => ({
              ...prev,
              hasRemoteChanges: true,
              remoteSettings: serverSettings,
              remoteUpdatedAt: serverTime,
            }))
          }
        }
      } catch {
        // Polling failures are silent
      }
    }

    // Poll every 30 seconds
    pollIntervalRef.current = setInterval(poll, 30_000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [session?.user?.id])

  // ── Load settings on mount ──

  useEffect(() => {
    // First, load from localStorage (fast)
    const localSettings = buildLocalSettings()
    setState((prev) => ({
      ...prev,
      settings: localSettings,
      isLoaded: true,
    }))

    // Then, sync with server if logged in
    if (getSettings.data) {
      const serverSettings = getSettings.data.settings as Settings
      const serverTime = getSettings.data.updatedAt

      // Merge server settings with local (server wins on conflict)
      const merged = deepMerge(
        localSettings as Record<string, unknown>,
        serverSettings as Record<string, unknown>
      ) as Settings

      // Apply merged settings to localStorage
      applyToLocal(merged)

      lastSyncedAtRef.current = serverTime

      setState((prev) => ({
        ...prev,
        settings: merged,
        lastSyncedAt: serverTime,
      }))
    }
  }, [getSettings.data, session?.user?.id])

  // ── Update settings (local + debounced cloud sync) ──

  const updateSettings = useCallback(
    (path: string, value: unknown) => {
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

        // Apply to localStorage immediately
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

  // ── Accept remote changes ──

  const acceptRemoteChanges = useCallback(() => {
    setState((prev) => {
      if (!prev.remoteSettings) return prev

      // Merge remote settings with current
      const merged = deepMerge(
        prev.settings as Record<string, unknown>,
        prev.remoteSettings as Record<string, unknown>
      ) as Settings

      applyToLocal(merged)
      lastSyncedAtRef.current = prev.remoteUpdatedAt

      return {
        ...prev,
        settings: merged,
        lastSyncedAt: prev.remoteUpdatedAt,
        hasRemoteChanges: false,
        remoteSettings: null,
        remoteUpdatedAt: null,
      }
    })
  }, [])

  // ── Dismiss remote changes ──

  const dismissRemoteChanges = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasRemoteChanges: false,
      remoteSettings: null,
      remoteUpdatedAt: null,
    }))
  }, [])

  // ── Reset settings ──

  const resetSettings = useCallback(() => {
    // Clear localStorage
    removeLocal(LOCAL_KEYS.aiPreferences)
    removeLocal(LOCAL_KEYS.onboardingCompleted)
    removeLocal(LOCAL_KEYS.onboardingStep)
    removeLocal(LOCAL_KEYS.notificationPrefs)
    removeLocal(LOCAL_KEYS.usageStats)

    // Clear cloud
    if (session?.user?.id) {
      setSettings.mutate({ settings: {} })
    }

    setState((prev) => ({
      ...prev,
      settings: {},
      lastSyncedAt: null,
    }))
  }, [session?.user?.id, setSettings])

  return {
    ...state,
    updateSettings,
    forceSync,
    resetSettings,
    acceptRemoteChanges,
    dismissRemoteChanges,
    isCloudEnabled: !!session?.user?.id,
  }
}
