"use client";

import { useCallback, useEffect, useRef } from "react";

import { trpc, type RouterOutputs } from "@/lib/trpc";
import { subscribeNotificationSync } from "@/lib/notifications/notifications-sync";

type NotificationRow = RouterOutputs["notifications"]["list"][number];

/** Same key the top-nav dropdown list is cached under — cache edits must land here. */
const UNREAD_LIST_INPUT = { limit: 20, onlyUnread: true };

/**
 * Keeps the unread-notification badge live in three complementary ways:
 *
 *   1. SSE — /api/agent-events emits `notification_created` within ~3s of any
 *      server-side insert (ingestion pipeline, jobs, webhooks, admin). The
 *      badge bumps immediately instead of waiting for the 30s poll.
 *   2. BroadcastChannel — read / read-all / delete performed in ANOTHER tab
 *      are applied to this tab's caches instantly.
 *   3. Entity-switch safety — switching entity invalidates the notification
 *      caches so a stale count from the previous entity can never linger on
 *      the bell.
 *
 * The 30s poll + window-focus refetch in top-nav remain the reconciliation
 * backstop that re-syncs the optimistic state with server truth.
 */
export function useUnreadNotifications(
  entityId: string | null,
  enabled = true,
) {
  const utils = trpc.useUtils();

  // ── Cache helpers ──────────────────────────────────────────────────────

  const bumpCount = useCallback(
    (delta: number) => {
      const cur = utils.notifications.unreadCount.getData(undefined);
      if (cur) {
        // Cache already hydrated — adjust it in place for zero-flash updates.
        utils.notifications.unreadCount.setData(undefined, {
          count: Math.max(0, cur.count + delta),
        });
      } else {
        // Cache never fetched (fresh mount) — fetch the truth instead of
        // inventing a count from an event we can't anchor to anything.
        utils.notifications.unreadCount.refetch();
      }
    },
    [utils],
  );

  const dropFromUnreadList = useCallback(
    (id: string) => {
      const list = utils.notifications.list.getData(UNREAD_LIST_INPUT);
      if (list) {
        utils.notifications.list.setData(
          UNREAD_LIST_INPUT,
          list.filter((n) => n.id !== id),
        );
      }
    },
    [utils],
  );

  const prependToUnreadList = useCallback(
    (partial: {
      id: string;
      type: string;
      priority: string;
      title: string;
      body: string;
      data: string | null;
      createdAt: Date | string;
    }) => {
      const list = utils.notifications.list.getData(UNREAD_LIST_INPUT);
      if (!list || list.some((n) => n.id === partial.id)) return;
      // The list rows expose createdAt as an ISO string — normalize the SSE
      // payload (Date | string) to the same shape so the cache entry matches
      // the NotificationRow type exactly.
      const createdAt =
        partial.createdAt instanceof Date
          ? partial.createdAt.toISOString()
          : partial.createdAt;
      // The dropdown only renders id/title/body, so the partial payload from
      // the SSE event is sufficient for a cache entry; the 30s poll replaces
      // it with the full server row.
      const row = {
        ...partial,
        userId: "",
        entityId: "",
        read: false,
        status: "sent",
        sentAt: null,
        createdAt,
        updatedAt: createdAt,
      } as NotificationRow;
      utils.notifications.list.setData(UNREAD_LIST_INPUT, [row, ...list]);
    },
    [utils],
  );

  // ── SSE: real-time increments ──────────────────────────────────────────

  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptsRef = useRef(0);

  // Handlers live in a ref so the connection effect never churns on render.
  const handlersRef = useRef({
    onNotificationCreated: (
      _n: Parameters<typeof prependToUnreadList>[0],
    ) => {},
  });
  handlersRef.current = {
    onNotificationCreated: (n) => {
      bumpCount(1);
      prependToUnreadList(n);
    },
  };

  const connect = useCallback(() => {
    if (!enabled || !entityId) return;
    if (sourceRef.current) sourceRef.current.close();

    const url = new URL("/api/agent-events", window.location.origin);
    url.searchParams.set("entityId", entityId);

    const source = new EventSource(url.toString());
    sourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: string;
          notification?: Parameters<typeof prependToUnreadList>[0];
        };
        if (data.type !== "notification_created" || !data.notification) return;
        handlersRef.current.onNotificationCreated(data.notification);
      } catch {
        // Ignore malformed frames — the poll backstop reconciles anyway.
      }
    };

    source.onerror = () => {
      source.close();
      // Exponential backoff, capped at 30s (same as the agent-events hook).
      const attempt = attemptsRef.current;
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      reconnectTimerRef.current = setTimeout(() => {
        attemptsRef.current += 1;
        connect();
      }, delay);
    };
  }, [entityId, enabled, prependToUnreadList]);

  useEffect(() => {
    if (enabled && entityId) connect();
    return () => {
      sourceRef.current?.close();
      sourceRef.current = null;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      attemptsRef.current = 0;
    };
  }, [connect, enabled, entityId]);

  // ── BroadcastChannel: cross-tab decrements ─────────────────────────────

  useEffect(() => {
    return subscribeNotificationSync((msg) => {
      if (msg.kind === "read") {
        bumpCount(-1);
        dropFromUnreadList(msg.id);
      } else if (msg.kind === "read-all") {
        utils.notifications.unreadCount.setData(undefined, { count: 0 });
        utils.notifications.list.setData(UNREAD_LIST_INPUT, []);
      } else if (msg.kind === "delete") {
        if (msg.wasUnread) bumpCount(-1);
        dropFromUnreadList(msg.id);
      }
    });
  }, [bumpCount, dropFromUnreadList, utils]);

  // ── Entity-switch safety ───────────────────────────────────────────────

  const prevEntityRef = useRef(entityId);
  useEffect(() => {
    const prev = prevEntityRef.current;
    prevEntityRef.current = entityId;
    if (entityId && entityId !== prev) {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    }
  }, [entityId, utils]);
}
