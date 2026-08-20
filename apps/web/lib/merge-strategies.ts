// ─── Merge Strategy Types ─────────────────────────────────────────────────────

export type MergeStrategy = "last-write-wins" | "local-wins" | "remote-wins" | "deep-merge" | "manual"

export type MergeResult = {
  merged: Record<string, unknown>
  conflicts: FieldConflict[]
  strategy: MergeStrategy
}

export type FieldConflict = {
  path: string
  localValue: unknown
  remoteValue: unknown
  resolvedValue: unknown
  resolvedBy: MergeStrategy
}

export type SettingsSnapshot = {
  settings: Record<string, unknown>
  updatedAt: string | null
  version?: number
}

// ─── Detect Conflicts ─────────────────────────────────────────────────────────

export function detectConflicts(
  local: SettingsSnapshot,
  remote: SettingsSnapshot,
  lastSyncedAt: string | null
): FieldConflict[] {
  if (!lastSyncedAt || !remote.updatedAt) return []

  // No conflict if remote hasn't changed since last sync
  if (new Date(remote.updatedAt) <= new Date(lastSyncedAt)) return []

  // No conflict if local hasn't changed
  const localChanged = JSON.stringify(local.settings) !== JSON.stringify(getLastSyncedSettings(lastSyncedAt))
  if (!localChanged) return []

  // Both changed — find field-level conflicts
  return findFieldConflicts(local.settings, remote.settings, "")
}

function getLastSyncedSettings(_lastSyncedAt: string): Record<string, unknown> {
  // In a real implementation, this would fetch the last synced snapshot
  // For now, return empty to trigger conflict detection
  return {}
}

function findFieldConflicts(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  basePath: string
): FieldConflict[] {
  const conflicts: FieldConflict[] = []
  const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)])

  for (const key of allKeys) {
    const path = basePath ? `${basePath}.${key}` : key
    const localVal = local[key]
    const remoteVal = remote[key]

    // Both exist and are objects — recurse
    if (
      localVal && typeof localVal === "object" && !Array.isArray(localVal) &&
      remoteVal && typeof remoteVal === "object" && !Array.isArray(remoteVal)
    ) {
      conflicts.push(
        ...findFieldConflicts(
          localVal as Record<string, unknown>,
          remoteVal as Record<string, unknown>,
          path
        )
      )
    }
    // Both exist but different values — conflict
    else if (localVal !== undefined && remoteVal !== undefined && localVal !== remoteVal) {
      conflicts.push({
        path,
        localValue: localVal,
        remoteValue: remoteVal,
        resolvedValue: localVal, // Default to local
        resolvedBy: "local-wins",
      })
    }
    // Only one exists — no conflict, just a missing key
  }

  return conflicts
}

// ─── Merge Strategies ─────────────────────────────────────────────────────────

export function applyMergeStrategy(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  strategy: MergeStrategy,
  conflicts?: FieldConflict[]
): MergeResult {
  switch (strategy) {
    case "last-write-wins":
      return mergeLastWriteWins(local, remote)
    case "local-wins":
      return mergeLocalWins(local, remote)
    case "remote-wins":
      return mergeRemoteWins(local, remote)
    case "deep-merge":
      return mergeDeep(local, remote)
    case "manual":
      return mergeManual(local, remote, conflicts || [])
    default:
      return mergeLastWriteWins(local, remote)
  }
}

// ─── Strategy: Last Write Wins ────────────────────────────────────────────────
// Remote wins because it was saved to the server last

function mergeLastWriteWins(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): MergeResult {
  return {
    merged: deepMerge(remote, local), // Remote as base, local overrides
    conflicts: [],
    strategy: "last-write-wins",
  }
}

// ─── Strategy: Local Wins ─────────────────────────────────────────────────────
// Keep local changes, discard remote

function mergeLocalWins(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): MergeResult {
  return {
    merged: deepMerge(local, remote), // Local as base, remote fills gaps
    conflicts: [],
    strategy: "local-wins",
  }
}

// ─── Strategy: Remote Wins ────────────────────────────────────────────────────
// Accept remote changes, discard local

function mergeRemoteWins(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): MergeResult {
  return {
    merged: deepMerge(remote, local), // Remote as base, local fills gaps
    conflicts: [],
    strategy: "remote-wins",
  }
}

// ─── Strategy: Deep Merge ─────────────────────────────────────────────────────
// Merge field by field, preferring remote for conflicts

function mergeDeep(
  local: Record<string, unknown>,
  remote: Record<string, unknown>
): MergeResult {
  const conflicts = findFieldConflicts(local, remote, "")
  return {
    merged: deepMerge(remote, local), // Remote wins on conflicts
    conflicts,
    strategy: "deep-merge",
  }
}

// ─── Strategy: Manual ─────────────────────────────────────────────────────────
// Return conflicts for user to resolve

function mergeManual(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  existingConflicts: FieldConflict[]
): MergeResult {
  const conflicts = existingConflicts.length > 0
    ? existingConflicts
    : findFieldConflicts(local, remote, "")

  // Default merge: remote wins, but conflicts are flagged
  return {
    merged: deepMerge(remote, local),
    conflicts,
    strategy: "manual",
  }
}

// ─── Deep Merge Utility ───────────────────────────────────────────────────────

export function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
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

// ─── Resolve Individual Conflict ──────────────────────────────────────────────

export function resolveConflict(
  conflict: FieldConflict,
  resolvedValue: unknown
): FieldConflict {
  return {
    ...conflict,
    resolvedValue,
    resolvedBy: "manual",
  }
}

// ─── Apply Manual Resolutions ─────────────────────────────────────────────────

export function applyManualResolutions(
  local: Record<string, unknown>,
  remote: Record<string, unknown>,
  resolutions: FieldConflict[]
): MergeResult {
  const result = deepMerge(remote, local)

  // Apply each manual resolution
  for (const resolution of resolutions) {
    setNestedValue(result, resolution.path, resolution.resolvedValue)
  }

  return {
    merged: result,
    conflicts: resolutions,
    strategy: "manual",
  }
}

// ─── Set Nested Value ─────────────────────────────────────────────────────────

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".")
  let current: Record<string, unknown> = obj

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {}
    }
    current = current[keys[i]] as Record<string, unknown>
  }

  current[keys[keys.length - 1]] = value
}

// ─── Get Strategy Label ───────────────────────────────────────────────────────

export function getStrategyLabel(strategy: MergeStrategy): string {
  const labels: Record<MergeStrategy, string> = {
    "last-write-wins": "Last Write Wins (Remote)",
    "local-wins": "Keep My Changes",
    "remote-wins": "Accept Remote Changes",
    "deep-merge": "Merge Field by Field",
    "manual": "Manual Resolution",
  }
  return labels[strategy]
}

// ─── Get Strategy Description ─────────────────────────────────────────────────

export function getStrategyDescription(strategy: MergeStrategy): string {
  const descriptions: Record<MergeStrategy, string> = {
    "last-write-wins": "The most recently saved change wins. Remote changes override local.",
    "local-wins": "Keep your local changes. Remote changes are discarded for conflicts.",
    "remote-wins": "Accept all remote changes. Your local changes are discarded for conflicts.",
    "deep-merge": "Merge settings field by field. Non-conflicting fields are combined.",
    "manual": "Review each conflict and choose which value to keep.",
  }
  return descriptions[strategy]
}
