"use client";

// ─── Offline Support ───────────────────────────────────────────────────────
//
// Service worker registration and offline state management.
// Provides limited offline access to cached data and
// queues mutations for sync when back online.

export type OfflineState = {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineAt: Date | null;
  pendingSync: number;
};

/**
 * Get current online/offline state.
 */
export function getOfflineState(): OfflineState {
  if (typeof window === "undefined") {
    return {
      isOnline: true,
      isOffline: false,
      lastOnlineAt: null,
      pendingSync: 0,
    };
  }

  return {
    isOnline: navigator.onLine,
    isOffline: !navigator.onLine,
    lastOnlineAt: getLastOnlineAt(),
    pendingSync: getPendingSyncCount(),
  };
}

/**
 * Register service worker for offline support.
 */
export async function registerServiceWorker(): Promise<boolean> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });

    console.log("[Offline] Service worker registered:", registration.scope);
    return true;
  } catch (error) {
    console.log("[Offline] Service worker registration failed:", error);
    return false;
  }
}

/**
 * Listen for online/offline events.
 */
export function onOnlineStatusChange(
  callback: (isOnline: boolean) => void,
): () => void {
  const handleOnline = () => {
    setLastOnlineAt(new Date());
    callback(true);
  };

  const handleOffline = () => {
    callback(false);
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}

/**
 * Queue a mutation for sync when back online.
 */
export function queueForSync(mutation: {
  type: string;
  endpoint: string;
  data: unknown;
}): string {
  const id = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pending = getPendingSync();
  pending.push({ id, ...mutation, createdAt: new Date().toISOString() });
  setPendingSync(pending);
  return id;
}

/**
 * Process pending sync queue when back online.
 */
export async function processPendingSync(): Promise<{
  processed: number;
  failed: number;
}> {
  const pending = getPendingSync();
  if (pending.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await fetch(item.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.data),
      });
      processed++;
    } catch {
      failed++;
    }
  }

  // Remove processed items
  if (processed > 0) {
    const remaining = pending.slice(processed);
    setPendingSync(remaining);
  }

  return { processed, failed };
}

// ─── Local Storage Helpers ─────────────────────────────────────────────────

function getLastOnlineAt(): Date | null {
  try {
    const stored = localStorage.getItem("xenboox-last-online");
    return stored ? new Date(stored) : null;
  } catch {
    return null;
  }
}

function setLastOnlineAt(date: Date): void {
  try {
    localStorage.setItem("xenboox-last-online", date.toISOString());
  } catch {
    // Storage full
  }
}

function getPendingSync(): Array<{
  id: string;
  type: string;
  endpoint: string;
  data: unknown;
  createdAt: string;
}> {
  try {
    const stored = localStorage.getItem("xenboox-pending-sync");
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function setPendingSync(
  pending: Array<{
    id: string;
    type: string;
    endpoint: string;
    data: unknown;
    createdAt: string;
  }>,
): void {
  try {
    localStorage.setItem("xenboox-pending-sync", JSON.stringify(pending));
  } catch {
    // Storage full
  }
}

function getPendingSyncCount(): number {
  return getPendingSync().length;
}
