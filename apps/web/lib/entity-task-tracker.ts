// ─── Entity Task Tracker ────────────────────────────────────────────────────
//
// Tracks background tasks (agent pipelines, ingestion, report generation)
// across entities. Uses localStorage as a cross-tab bridge so task status
// is visible even when the user switches entities.
//
// The actual task state lives on the server (ops_live_runs, ingestion tables).
// This module provides a lightweight client-side cache for UI indicators.

// ─── Types ──────────────────────────────────────────────────────────────────

export type EntityTask = {
  id: string;
  entityId: string;
  label: string;
  status: "running" | "completed" | "failed";
  startedAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  agentName?: string;
};

type TaskStore = {
  tasks: EntityTask[];
  lastUpdated: string;
};

// ─── Storage Key ────────────────────────────────────────────────────────────

const STORAGE_KEY = "xenboox_entity_tasks";
const MAX_TASKS_PER_ENTITY = 50;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─── Storage Helpers ────────────────────────────────────────────────────────

function readStore(): TaskStore {
  if (typeof window === "undefined") {
    return { tasks: [], lastUpdated: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tasks: [], lastUpdated: new Date().toISOString() };
    return JSON.parse(raw) as TaskStore;
  } catch {
    return { tasks: [], lastUpdated: new Date().toISOString() };
  }
}

function writeStore(store: TaskStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // localStorage full or blocked — non-critical
  }
}

function pruneOldTasks(tasks: EntityTask[]): EntityTask[] {
  const cutoff = new Date(Date.now() - MAX_AGE_MS).toISOString();
  return tasks.filter(
    (t) => t.startedAt > cutoff || t.status === "running",
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Register a new background task for an entity.
 */
export function registerTask(
  entityId: string,
  label: string,
  agentName?: string,
): string {
  const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const store = readStore();

  const task: EntityTask = {
    id,
    entityId,
    label,
    status: "running",
    startedAt: new Date().toISOString(),
    agentName,
  };

  store.tasks = pruneOldTasks([...store.tasks, task]);

  // Limit per entity
  const entityTasks = store.tasks.filter((t) => t.entityId === entityId);
  if (entityTasks.length > MAX_TASKS_PER_ENTITY) {
    const toRemove = entityTasks
      .filter((t) => t.status !== "running")
      .slice(0, entityTasks.length - MAX_TASKS_PER_ENTITY);
    const removeIds = new Set(toRemove.map((t) => t.id));
    store.tasks = store.tasks.filter((t) => !removeIds.has(t.id));
  }

  store.lastUpdated = new Date().toISOString();
  writeStore(store);

  // Notify other tabs
  broadcastTaskChange("registered", task);

  return id;
}

/**
 * Mark a task as completed.
 */
export function completeTask(taskId: string, success = true): void {
  const store = readStore();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return;

  task.status = success ? "completed" : "failed";
  task.completedAt = new Date().toISOString();
  store.lastUpdated = new Date().toISOString();
  writeStore(store);

  broadcastTaskChange("completed", task);
}

/**
 * Get all running tasks for a specific entity.
 */
export function getEntityRunningTasks(entityId: string): EntityTask[] {
  const store = readStore();
  return pruneOldTasks(store.tasks).filter(
    (t) => t.entityId === entityId && t.status === "running",
  );
}

/**
 * Get task counts for all entities the user has access to.
 * Returns a map of entityId → { running, completed, failed }.
 */
export function getAllEntityTaskCounts(): Record<
  string,
  { running: number; completed: number; failed: number }
> {
  const store = readStore();
  const tasks = pruneOldTasks(store.tasks);
  const counts: Record<
    string,
    { running: number; completed: number; failed: number }
  > = {};

  for (const task of tasks) {
    if (!counts[task.entityId]) {
      counts[task.entityId] = { running: 0, completed: 0, failed: 0 };
    }
    counts[task.entityId][task.status]++;
  }

  return counts;
}

/**
 * Get task counts for entities OTHER than the current one.
 * Used to show badges on the entity switcher.
 */
export function getOtherEntityTaskCounts(
  currentEntityId: string,
): Record<string, { running: number; completed: number }> {
  const allCounts = getAllEntityTaskCounts();
  const other: Record<string, { running: number; completed: number }> = {};

  for (const [entityId, counts] of Object.entries(allCounts)) {
    if (entityId === currentEntityId) continue;
    if (counts.running > 0 || counts.completed > 0) {
      other[entityId] = {
        running: counts.running,
        completed: counts.completed,
      };
    }
  }

  return other;
}

/**
 * Clear all completed/failed tasks for an entity.
 * Called when the user views the entity and acknowledges the results.
 */
export function clearEntityTasks(entityId: string): void {
  const store = readStore();
  store.tasks = store.tasks.filter(
    (t) => t.entityId !== entityId || t.status === "running",
  );
  store.lastUpdated = new Date().toISOString();
  writeStore(store);
}

/**
 * Get recent completed tasks for an entity (for showing "what you missed").
 */
export function getRecentCompletedTasks(
  entityId: string,
  limit = 10,
): EntityTask[] {
  const store = readStore();
  return pruneOldTasks(store.tasks)
    .filter(
      (t) =>
        t.entityId === entityId &&
        (t.status === "completed" || t.status === "failed"),
    )
    .sort((a, b) => (b.completedAt ?? b.startedAt).localeCompare(a.completedAt ?? a.startedAt))
    .slice(0, limit);
}

// ─── Cross-Tab Broadcast ────────────────────────────────────────────────────

const CHANNEL_NAME = "xenboox-entity-tasks";

type TaskBroadcast = {
  kind: "registered" | "completed" | "failed";
  task: EntityTask;
};

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      // BroadcastChannel not supported — non-critical
    }
  }
  return channel;
}

function broadcastTaskChange(kind: TaskBroadcast["kind"], task: EntityTask): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    ch.postMessage({ kind, task } satisfies TaskBroadcast);
  } catch {
    // Non-critical
  }
}

type TaskChangeListener = (broadcast: TaskBroadcast) => void;
const listeners: Set<TaskChangeListener> = new Set();

/**
 * Subscribe to task changes from other tabs.
 * Returns an unsubscribe function.
 */
export function subscribeTaskChanges(listener: TaskChangeListener): () => void {
  listeners.add(listener);

  const ch = getChannel();
  if (ch) {
    ch.onmessage = (event) => {
      const data = event.data as TaskBroadcast;
      for (const l of listeners) {
        try {
          l(data);
        } catch {
          // Listener error — don't break other listeners
        }
      }
    };
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && channel) {
      channel.onmessage = null;
    }
  };
}
