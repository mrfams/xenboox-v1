import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── BroadcastChannel mock ────────────────────────────────────────────────
// Mirrors the real API: messages delivered to every OTHER instance with the
// same name, never back to the posting instance. Two separate module copies
// (loaded across vi.resetModules) then behave like two browser tabs.
class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = [];
  name: string;
  private listeners = new Set<(e: MessageEvent) => void>();

  constructor(name: string) {
    this.name = name;
    MockBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: string, cb: (e: MessageEvent) => void) {
    this.listeners.add(cb);
  }

  removeEventListener(_type: string, cb: (e: MessageEvent) => void) {
    this.listeners.delete(cb);
  }

  postMessage(data: unknown) {
    for (const instance of MockBroadcastChannel.instances) {
      if (instance === this) continue; // sender never receives its own message
      if (instance.name !== this.name) continue;
      instance.listeners.forEach((cb) =>
        cb({ data } as unknown as MessageEvent),
      );
    }
  }

  close() {
    MockBroadcastChannel.instances = MockBroadcastChannel.instances.filter(
      (i) => i !== this,
    );
  }
}

/** Fresh module copy = a fresh "tab" with its own channel object. */
async function loadTab() {
  vi.resetModules();
  vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  return import("@/lib/notifications/notifications-sync");
}

describe("notifications-sync (cross-tab BroadcastChannel)", () => {
  beforeEach(() => {
    MockBroadcastChannel.instances = [];
  });

  it("delivers a publish to another tab's subscriber", async () => {
    const tabA = await loadTab();
    const tabB = await loadTab();

    const received: unknown[] = [];
    tabB.subscribeNotificationSync((msg) => received.push(msg));

    tabA.publishNotificationSync({ kind: "read", id: "n-1" });
    tabA.publishNotificationSync({ kind: "read-all" });
    tabA.publishNotificationSync({
      kind: "delete",
      id: "n-2",
      wasUnread: true,
    });

    expect(received).toEqual([
      { kind: "read", id: "n-1" },
      { kind: "read-all" },
      { kind: "delete", id: "n-2", wasUnread: true },
    ]);
  });

  it("never delivers a publish back to the publishing tab", async () => {
    const tab = await loadTab();

    const received: unknown[] = [];
    tab.subscribeNotificationSync((msg) => received.push(msg));

    tab.publishNotificationSync({ kind: "read", id: "n-1" });
    tab.publishNotificationSync({ kind: "read-all" });

    expect(received).toEqual([]);
  });

  it("unsubscribe stops delivery", async () => {
    const tabA = await loadTab();
    const tabB = await loadTab();

    const received: unknown[] = [];
    const unsubscribe = tabB.subscribeNotificationSync((msg) =>
      received.push(msg),
    );
    unsubscribe();

    tabA.publishNotificationSync({ kind: "read", id: "n-1" });
    expect(received).toEqual([]);
  });

  it("degrades to no-op when BroadcastChannel is unavailable", async () => {
    vi.resetModules();
    vi.stubGlobal("BroadcastChannel", undefined);
    const tab = await import("@/lib/notifications/notifications-sync");

    // Must not throw, and must return a callable unsubscribe.
    const received: unknown[] = [];
    const unsubscribe = tab.subscribeNotificationSync((msg) =>
      received.push(msg),
    );
    expect(() =>
      tab.publishNotificationSync({ kind: "read-all" }),
    ).not.toThrow();
    expect(() => unsubscribe()).not.toThrow();
    expect(received).toEqual([]);
  });
});
