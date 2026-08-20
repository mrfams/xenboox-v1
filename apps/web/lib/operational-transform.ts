// ─── Operational Transform for Settings Sync ──────────────────────────────────
// Prevents conflicts by transforming operations in real-time.
// Instead of full OT (like Google Docs), we use a practical approach:
// 1. Each change is an "operation" with a base version
// 2. Server rejects operations with stale versions (optimistic locking)
// 3. SSE pushes changes immediately so other devices stay current
// 4. Field-level transforms merge non-conflicting changes automatically

// ─── Types ────────────────────────────────────────────────────────────────────

export type SettingsOperation = {
  id: string
  type: "set" | "delete" | "merge"
  path: string
  value?: unknown
  baseVersion: number
  baseUpdatedAt: string
  clientId: string
  timestamp: string
}

export type TransformResult = {
  transformed: SettingsOperation
  wasModified: boolean
  reason?: string
}

export type VersionCheck = {
  currentVersion: number
  currentUpdatedAt: string
  isStale: boolean
  staleBecause?: string
}

// ─── Operation ID Generation ──────────────────────────────────────────────────

export function generateOperationId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// ─── Version Check ────────────────────────────────────────────────────────────

export function checkVersion(
  baseVersion: number,
  baseUpdatedAt: string,
  serverVersion: number,
  serverUpdatedAt: string
): VersionCheck {
  const isStale = baseVersion < serverVersion ||
    new Date(baseUpdatedAt) < new Date(serverUpdatedAt)

  return {
    currentVersion: serverVersion,
    currentUpdatedAt: serverUpdatedAt,
    isStale,
    staleBecause: isStale
      ? `Server is at version ${serverVersion}, operation based on version ${baseVersion}`
      : undefined,
  }
}

// ─── Transform Operation Against Concurrent Change ────────────────────────────
// When a concurrent change arrives, transform the pending operation to account for it.

export function transformOperation(
  pending: SettingsOperation,
  concurrent: SettingsOperation
): TransformResult {
  // Same path — need to resolve
  if (pending.path === concurrent.path) {
    return transformSamePath(pending, concurrent)
  }

  // Parent path — concurrent change affects our scope
  if (concurrent.path.startsWith(pending.path + ".") ||
      pending.path.startsWith(concurrent.path + ".")) {
    return transformNestedPath(pending, concurrent)
  }

  // Different paths — no conflict, transform is identity
  return { transformed: pending, wasModified: false }
}

// ─── Transform Same Path Operations ───────────────────────────────────────────

function transformSamePath(
  pending: SettingsOperation,
  concurrent: SettingsOperation
): TransformResult {
  // Last-write-wins for same path: pending operation wins if it's newer
  const pendingTime = new Date(pending.timestamp).getTime()
  const concurrentTime = new Date(concurrent.timestamp).getTime()

  if (pendingTime > concurrentTime) {
    // Pending is newer — keep it, but bump version
    return {
      transformed: {
        ...pending,
        baseVersion: concurrent.baseVersion + 1,
        baseUpdatedAt: concurrent.baseUpdatedAt,
      },
      wasModified: true,
      reason: "Pending operation is newer, transformed to latest version",
    }
  }

  // Concurrent is newer — discard pending (it's based on stale data)
  return {
    transformed: pending,
    wasModified: false,
    reason: "Concurrent operation is newer, pending operation should be retried",
  }
}

// ─── Transform Nested Path Operations ─────────────────────────────────────────

function transformNestedPath(
  pending: SettingsOperation,
  concurrent: SettingsOperation
): TransformResult {
  // If concurrent is a parent path (e.g., "aiPreferences" vs "aiPreferences.autoReconcile"),
  // the pending operation might be based on stale data
  if (concurrent.path.length < pending.path.length) {
    return {
      transformed: {
        ...pending,
        baseVersion: concurrent.baseVersion + 1,
        baseUpdatedAt: concurrent.baseUpdatedAt,
      },
      wasModified: true,
      reason: "Parent path changed, transformed to latest version",
    }
  }

  // If pending is a parent path, keep it but note the child changed
  return {
    transformed: pending,
    wasModified: false,
    reason: "Child path changed, pending parent operation is still valid",
  }
}

// ─── Transform Operation List ─────────────────────────────────────────────────
// Transform a list of pending operations against a list of concurrent operations.

export function transformOperationList(
  pendingOps: SettingsOperation[],
  concurrentOps: SettingsOperation[]
): TransformResult[] {
  let currentOps = [...pendingOps]

  const results: TransformResult[] = []

  for (const concurrent of concurrentOps) {
    const transformed: SettingsOperation[] = []

    for (const op of currentOps) {
      const result = transformOperation(op, concurrent)
      transformed.push(result.transformed)
      results.push(result)
    }

    currentOps = transformed
  }

  return results
}

// ─── Merge Operations into Settings ───────────────────────────────────────────
// Apply a list of operations to a settings object.

export function applyOperations(
  settings: Record<string, unknown>,
  operations: SettingsOperation[]
): Record<string, unknown> {
  const result = { ...settings }

  for (const op of operations) {
    switch (op.type) {
      case "set":
        setNestedValue(result, op.path, op.value)
        break
      case "delete":
        deleteNestedValue(result, op.path)
        break
      case "merge":
        if (op.value && typeof op.value === "object") {
          const existing = getNestedValue(result, op.path)
          if (existing && typeof existing === "object") {
            setNestedValue(result, op.path, { ...existing, ...op.value })
          } else {
            setNestedValue(result, op.path, op.value)
          }
        }
        break
    }
  }

  return result
}

// ─── Extract Operations from Settings Diff ────────────────────────────────────
// Compare two settings objects and extract the operations that changed.

export function extractOperations(
  oldSettings: Record<string, unknown>,
  newSettings: Record<string, unknown>,
  baseVersion: number,
  baseUpdatedAt: string,
  clientId: string
): SettingsOperation[] {
  const ops: SettingsOperation[] = []
  const timestamp = new Date().toISOString()

  // Find added/changed fields
  for (const key of Object.keys(newSettings)) {
    const oldVal = oldSettings[key]
    const newVal = newSettings[key]

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      ops.push({
        id: generateOperationId(),
        type: "set",
        path: key,
        value: newVal,
        baseVersion,
        baseUpdatedAt,
        clientId,
        timestamp,
      })
    }
  }

  // Find deleted fields
  for (const key of Object.keys(oldSettings)) {
    if (!(key in newSettings)) {
      ops.push({
        id: generateOperationId(),
        type: "delete",
        path: key,
        baseVersion,
        baseUpdatedAt,
        clientId,
        timestamp,
      })
    }
  }

  return ops
}

// ─── Nested Path Utilities ────────────────────────────────────────────────────

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

function deleteNestedValue(obj: Record<string, unknown>, path: string) {
  const keys = path.split(".")
  let current: Record<string, unknown> = obj

  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== "object") {
      return // Path doesn't exist
    }
    current = current[keys[i]] as Record<string, unknown>
  }

  delete current[keys[keys.length - 1]]
}

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split(".")
  let current: Record<string, unknown> = obj

  for (const key of keys) {
    if (!current || typeof current !== "object") {
      return undefined
    }
    current = current[key] as Record<string, unknown>
  }

  return current
}

// ─── Conflict Detection (Pre-check) ──────────────────────────────────────────
// Check if an operation would conflict with pending concurrent changes.

export function wouldConflict(
  operation: SettingsOperation,
  pendingOps: SettingsOperation[]
): { wouldConflict: boolean; conflictingOp?: SettingsOperation; reason?: string } {
  for (const pending of pendingOps) {
    if (operation.path === pending.path) {
      return {
        wouldConflict: true,
        conflictingOp: pending,
        reason: `Both operations target the same path: ${operation.path}`,
      }
    }

    if (operation.path.startsWith(pending.path + ".") ||
        pending.path.startsWith(operation.path + ".")) {
      return {
        wouldConflict: true,
        conflictingOp: pending,
        reason: `Operations target overlapping paths: ${operation.path} vs ${pending.path}`,
      }
    }
  }

  return { wouldConflict: false }
}
