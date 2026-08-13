"use client";

import { trpc } from "@/lib/trpc";
import { publishNotificationSync } from "@/lib/notifications/notifications-sync";

/**
 * The unread dropdown list cache key shared by every consumer (top-nav
 * dropdown, notification pages). Optimistic cache edits must land on this
 * exact key so the badge and dropdown stay in sync app-wide.
 */
export const UNREAD_LIST_INPUT = { limit: 20, onlyUnread: true };

/**
 * Shared notification mutations with production-grade optimistic updates.
 *
 * Every mutation:
 *  - updates the badge + unread dropdown INSTANTLY (before the server round
 *    trip), via the shared unreadCount / unread-list caches,
 *  - rolls back on error,
 *  - broadcasts to other tabs (BroadcastChannel) so their badges decrement
 *    immediately too,
 *  - invalidates on settle so the caches reconcile with server truth.
 *
 * Because all consumers share the same tRPC caches, one page marking a
 * notification read updates the top-nav badge in the same tab for free.
 */
export function useNotificationMutations() {
  const utils = trpc.useUtils();

  const markRead = trpc.notifications.markAsRead.useMutation({
    onMutate: async ({ id }) => {
      await utils.notifications.unreadCount.cancel(undefined);
      await utils.notifications.list.cancel(UNREAD_LIST_INPUT);
      const prevCount = utils.notifications.unreadCount.getData(undefined);
      const prevList = utils.notifications.list.getData(UNREAD_LIST_INPUT);
      const cur = utils.notifications.unreadCount.getData(undefined);
      if (cur) {
        utils.notifications.unreadCount.setData(undefined, {
          count: Math.max(0, cur.count - 1),
        });
      }
      const list = utils.notifications.list.getData(UNREAD_LIST_INPUT);
      if (list) {
        utils.notifications.list.setData(
          UNREAD_LIST_INPUT,
          list.filter((n) => n.id !== id),
        );
      }
      publishNotificationSync({ kind: "read", id });
      return { prevCount, prevList };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevCount)
        utils.notifications.unreadCount.setData(undefined, ctx.prevCount);
      if (ctx?.prevList)
        utils.notifications.list.setData(UNREAD_LIST_INPUT, ctx.prevList);
    },
    onSettled: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const markAllRead = trpc.notifications.markAllAsRead.useMutation({
    onMutate: async () => {
      await utils.notifications.unreadCount.cancel(undefined);
      await utils.notifications.list.cancel(UNREAD_LIST_INPUT);
      const prevCount = utils.notifications.unreadCount.getData(undefined);
      const prevList = utils.notifications.list.getData(UNREAD_LIST_INPUT);
      utils.notifications.unreadCount.setData(undefined, { count: 0 });
      utils.notifications.list.setData(UNREAD_LIST_INPUT, []);
      publishNotificationSync({ kind: "read-all" });
      return { prevCount, prevList };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevCount)
        utils.notifications.unreadCount.setData(undefined, ctx.prevCount);
      if (ctx?.prevList)
        utils.notifications.list.setData(UNREAD_LIST_INPUT, ctx.prevList);
    },
    onSettled: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  const deleteNotif = trpc.notifications.delete.useMutation({
    onMutate: async ({ id }) => {
      await utils.notifications.unreadCount.cancel(undefined);
      await utils.notifications.list.cancel(UNREAD_LIST_INPUT);
      const prevCount = utils.notifications.unreadCount.getData(undefined);
      const prevList = utils.notifications.list.getData(UNREAD_LIST_INPUT);
      const list = utils.notifications.list.getData(UNREAD_LIST_INPUT);
      const deleted = list?.find((n) => n.id === id);
      // The dropdown only ever lists unread rows, so a row found there is
      // unread. When deleting from a "all notifications" view the row may be
      // read — the settle invalidate reconciles the badge within one round
      // trip either way.
      const wasUnread = deleted ? !deleted.read : true;
      const cur = utils.notifications.unreadCount.getData(undefined);
      if (wasUnread && cur) {
        utils.notifications.unreadCount.setData(undefined, {
          count: Math.max(0, cur.count - 1),
        });
      }
      if (list) {
        utils.notifications.list.setData(
          UNREAD_LIST_INPUT,
          list.filter((n) => n.id !== id),
        );
      }
      publishNotificationSync({ kind: "delete", id, wasUnread });
      return { prevCount, prevList };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevCount)
        utils.notifications.unreadCount.setData(undefined, ctx.prevCount);
      if (ctx?.prevList)
        utils.notifications.list.setData(UNREAD_LIST_INPUT, ctx.prevList);
    },
    onSettled: () => {
      utils.notifications.unreadCount.invalidate();
      utils.notifications.list.invalidate();
    },
  });

  return { markRead, markAllRead, deleteNotif };
}
