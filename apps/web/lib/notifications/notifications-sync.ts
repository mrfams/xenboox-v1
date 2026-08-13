/**
 * Cross-tab notification sync.
 *
 * The notification badge lives in the dashboard layout (top-nav). When the
 * user marks a notification read in tab A, tab B would otherwise keep showing
 * a stale count until its 30s poll or a window-focus refetch. This module
 * bridges the gap with a BroadcastChannel: each tab publishes the mutations it
 * performed, and every other tab applies them to its own tRPC caches
 * immediately.
 *
 * Notes:
 *  - Messages are NOT delivered back to the publishing BroadcastChannel
 *    object, so a tab never re-applies its own mutation. The `source` field is
 *    a belt-and-suspenders guard in case two copies of this module (e.g. from
 *    different bundles) end up as separate channel objects in one tab.
 *  - BroadcastChannel is a progressive enhancement. Where it's unavailable
 *    (very old browsers, some test environments) publish/subscribe degrade to
 *    no-ops and the 30s poll + focus refetch remain the source of truth.
 */

// The cross-tab payload WITHOUT the `source` field — what publishers accept and
// what subscribers receive. Deliberately a plain discriminated union: the old
// `Omit<NotificationSyncMessage, "source">` did NOT distribute over the union,
// collapsing it into one object type that required every field at once.
export type NotificationSyncInput =
  | { kind: "read"; id: string }
  | { kind: "read-all" }
  | { kind: "delete"; id: string; wasUnread: boolean };

export type NotificationSyncMessage = NotificationSyncInput & {
  source: string;
};

export type NotificationSyncHandler = (message: NotificationSyncInput) => void;

const CHANNEL_NAME = "xenboox-notifications";

/** Unique per browser tab — lets a tab ignore its own broadcasts. */
const TAB_ID = Math.random().toString(36).slice(2);

// Single shared channel object per tab: subscribers see cross-tab messages and
// (per the BroadcastChannel spec) never their own postMessage calls.
let channel: BroadcastChannel | null | undefined;

function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel;
  if (typeof BroadcastChannel === "undefined") {
    channel = null;
    return channel;
  }
  channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/** Broadcast a local notification mutation so other tabs can apply it. */
export function publishNotificationSync(message: NotificationSyncInput): void {
  const ch = getChannel();
  if (!ch) return;
  try {
    // Built explicitly per kind: object-spreading a union collapses the
    // discriminant, which would no longer satisfy NotificationSyncMessage.
    const withSource: NotificationSyncMessage =
      message.kind === "read-all"
        ? { kind: "read-all", source: TAB_ID }
        : message.kind === "read"
          ? { kind: "read", id: message.id, source: TAB_ID }
          : {
              kind: "delete",
              id: message.id,
              wasUnread: message.wasUnread,
              source: TAB_ID,
            };
    ch.postMessage(withSource);
  } catch {
    // Channel closed/unavailable — the poll will reconcile.
  }
}

/**
 * Subscribe to notification mutations performed in OTHER tabs.
 *
 * Returns an unsubscribe function. Self-broadcasts are filtered out via
 * `source`. No-op subscription when BroadcastChannel is unavailable.
 */
export function subscribeNotificationSync(
  handler: NotificationSyncHandler,
): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const listener = (event: MessageEvent) => {
    const msg = event.data as NotificationSyncMessage | undefined;
    if (!msg || typeof msg !== "object") return;
    if (msg.source === TAB_ID) return;
    const { source: _source, ...rest } = msg;
    handler(rest);
  };

  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}
