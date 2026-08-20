// ─── In-memory store for connected SSE clients ────────────────────────────────
// Shared between the SSE route handler and the settings router so mutations
// can push real-time updates to connected browsers.

type Client = {
  id: string;
  userId: string;
  controller: ReadableStreamDefaultController;
  lastSeen: Date;
};

const clients = new Map<string, Client>();

// ─── Cleanup stale clients every 30 seconds ──────────────────────────────────

setInterval(() => {
  const now = new Date();
  for (const [id, client] of clients.entries()) {
    const age = now.getTime() - client.lastSeen.getTime();
    if (age > 60_000) {
      // 60 seconds stale
      try {
        client.controller.close();
      } catch {
        // Already closed
      }
      clients.delete(id);
    }
  }
}, 30_000);

// ─── Register / unregister clients ───────────────────────────────────────────

export function registerClient(client: Client): void {
  clients.set(client.id, client);
}

export function unregisterClient(id: string): void {
  clients.delete(id);
}

export function touchClient(id: string): void {
  const client = clients.get(id);
  if (client) {
    client.lastSeen = new Date();
  }
}

// ─── Helper: Notify clients of a settings change ─────────────────────────────

export function notifySettingsChange(
  userId: string,
  settings: Record<string, unknown>,
  version?: number,
  excludeClientId?: string,
): void {
  const message = JSON.stringify({
    type: "settings_changed",
    settings,
    version: version || 1,
    timestamp: new Date().toISOString(),
  });

  for (const [id, client] of clients.entries()) {
    if (client.userId === userId && id !== excludeClientId) {
      try {
        client.controller.enqueue(`data: ${message}\n\n`);
        client.lastSeen = new Date();
      } catch {
        clients.delete(id);
      }
    }
  }
}

// ─── Helper: Get client ID for a connection ──────────────────────────────────

export function getClientId(userId: string): string | null {
  for (const [id, client] of clients.entries()) {
    if (client.userId === userId) {
      return id;
    }
  }
  return null;
}

// ─── Helper: Get connected client count ───────────────────────────────────────

export function getConnectedClients(userId: string): number {
  let count = 0;
  for (const client of clients.values()) {
    if (client.userId === userId) count++;
  }
  return count;
}
