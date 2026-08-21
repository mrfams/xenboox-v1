// ─── In-memory store for attention SSE clients ──────────────────────────────
// Shared between the SSE route handler and event producers so mutations
// can push real-time attention updates to connected browsers.
//
// When Redis is available, events are also published there for cross-instance
// delivery. The SSE endpoint drains Redis on each heartbeat.

type AttentionClient = {
  id: string;
  userId: string;
  entityId: string;
  controller: ReadableStreamDefaultController;
  lastSeen: Date;
};

const clients = new Map<string, AttentionClient>();

// ─── Cleanup stale clients every 30 seconds ─────────────────────────────────

setInterval(() => {
  const now = new Date();
  for (const [id, client] of clients.entries()) {
    const age = now.getTime() - client.lastSeen.getTime();
    if (age > 60_000) {
      try {
        client.controller.close();
      } catch {
        // already closed
      }
      clients.delete(id);
    }
  }
}, 30_000);

// ─── Register / unregister / touch ──────────────────────────────────────────

export function registerAttentionClient(client: AttentionClient): void {
  clients.set(client.id, client);
}

export function unregisterAttentionClient(id: string): void {
  clients.delete(id);
}

export function touchAttentionClient(id: string): void {
  const client = clients.get(id);
  if (client) {
    client.lastSeen = new Date();
  }
}

// ─── Broadcast attention event to all clients for an entity ─────────────────

export type AttentionEventType =
  "attention_changed" | "signal_added" | "signal_removed" | "signal_updated";

export type AttentionEvent = {
  type: AttentionEventType;
  entityId: string;
  /** Which surface the signal is for */
  surface: string;
  /** "action" = needs human decision (red), "new" = fresh results (blue) */
  tone: "action" | "new";
  /** Change in count (+1, -1, or absolute) */
  delta: number;
  /** Current count after this change */
  count: number;
  /** Optional human-readable message */
  message?: string;
  /** Timestamp */
  timestamp: string;
};

/**
 * Broadcast an attention event to all connected clients for an entity.
 * Also publishes to Redis for cross-instance delivery.
 */
export function broadcastAttentionEvent(event: AttentionEvent): void {
  const encoder = new TextEncoder();
  const data = `data: ${JSON.stringify(event)}\n\n`;

  // Broadcast to local clients
  for (const [, client] of clients.entries()) {
    if (client.entityId !== event.entityId) continue;
    try {
      client.controller.enqueue(encoder.encode(data));
    } catch {
      clients.delete(client.id);
    }
  }

  // Publish to Redis for cross-instance delivery
  // Import dynamically to avoid circular dependencies
  import("./broadcast")
    .then(({ publishSseEvent }) => {
      void publishSseEvent(event.entityId, event);
    })
    .catch(() => {
      // Redis not available — local broadcast still worked
    });
}

/**
 * Get the number of connected clients for an entity (for monitoring).
 */
export function getAttentionClientCount(entityId: string): number {
  let count = 0;
  for (const [, client] of clients.entries()) {
    if (client.entityId === entityId) count++;
  }
  return count;
}
