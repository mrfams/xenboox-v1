"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  ChevronRight,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button, Avatar, AvatarFallback, AvatarImage } from "@/components/ui";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import { EntitySwitcher } from "@/components/layout/entity-switcher";
import { CommandPalette } from "@/components/shared/command-palette";
import { useEntity } from "@/lib/entity-context";
import { getInitials } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { NotificationBadge } from "@/components/layout/notification-badge";
import { useUnreadNotifications } from "@/lib/hooks/use-unread-notifications";
import { useNotificationMutations } from "@/lib/hooks/use-notification-mutations";

interface TopNavProps {
  onMenuClick: () => void;
  onChatToggle?: () => void;
  chatOpen?: boolean;
}

export function TopNav({
  onMenuClick,
  onChatToggle: _onChatToggle,
  chatOpen: _chatOpen,
}: TopNavProps) {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const closeMenuTimer = useRef<number | null>(null);
  const closeNotifTimer = useRef<number | null>(null);
  const router = useRouter();
  const { entityId, isLoaded } = useEntity();
  const notifEnabled = isLoaded && !!entityId;

  // Unread notifications — kept fresh three ways:
  //   1. refetchInterval: 30s background poll (react-query pauses it while the
  //      tab is hidden, so it costs ~nothing when the app isn't visible) — this
  //      is what makes the badge auto-increment when a new notification lands.
  //   2. refetchOnWindowFocus: returning to the tab re-syncs instantly.
  //   3. Optimistic mutations below: reading/dismissing updates the badge the
  //      moment you click, before the server round-trip settles.
  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: true },
    {
      staleTime: 15 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: 30 * 1000,
      enabled: notifEnabled,
    },
  );

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(
    undefined,
    {
      staleTime: 15 * 1000,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      refetchInterval: 30 * 1000,
      enabled: notifEnabled,
    },
  );

  const utils = trpc.useUtils();
  const unread = notifications ?? [];
  const unreadTotal = unreadCount?.count ?? unread.length;

  // Real-time badge: SSE bumps the count within ~3s of a server-side insert
  // (ingestion, jobs, webhooks), BroadcastChannel applies read/delete made in
  // other tabs instantly, and switching entity invalidates stale caches.
  useUnreadNotifications(entityId, notifEnabled);

  // Shared optimistic mutations — instant badge/dropdown updates, rollback on
  // error, cross-tab broadcast, and settle reconciliation with the server.
  const { markRead, markAllRead, deleteNotif } = useNotificationMutations();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Standard command-palette binding: Cmd+K / Ctrl+K (matches the ⌘K hint).
      if (
        (e.metaKey || e.ctrlKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === "k"
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Close the user menu when clicking anywhere outside it
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuOpen &&
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [userMenuOpen]);

  // Hover-open the user menu + notifications: opening is immediate, closing is
  // delayed so the menu stays up while the cursor crosses the gap between the
  // trigger and the dropdown (and re-entering cancels the pending close).
  // Clicks still toggle as a fallback for touch/keyboard.
  useEffect(() => {
    return () => {
      if (closeMenuTimer.current !== null) {
        window.clearTimeout(closeMenuTimer.current);
      }
      if (closeNotifTimer.current !== null) {
        window.clearTimeout(closeNotifTimer.current);
      }
    };
  }, []);

  // Close both menus immediately and cancel any pending close timers.
  const closeAllMenus = () => {
    if (closeMenuTimer.current !== null) {
      window.clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
    if (closeNotifTimer.current !== null) {
      window.clearTimeout(closeNotifTimer.current);
      closeNotifTimer.current = null;
    }
    setUserMenuOpen(false);
    setNotifOpen(false);
  };

  const openNotif = () => {
    if (closeNotifTimer.current !== null) {
      window.clearTimeout(closeNotifTimer.current);
      closeNotifTimer.current = null;
    }
    // Hovering one menu dismisses the other immediately — moving from the
    // notifications to the avatar (or vice versa) must not leave the first
    // one hanging open.
    if (closeMenuTimer.current !== null) {
      window.clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
    setUserMenuOpen(false);
    setNotifOpen(true);
    // Opening the panel is the moment accuracy matters most — re-sync the
    // unread list + count so the dropdown never shows stale rows.
    utils.notifications.unreadCount.refetch();
    utils.notifications.list.refetch();
  };

  const scheduleCloseNotif = () => {
    if (!notifOpen) return;
    if (closeNotifTimer.current !== null) {
      window.clearTimeout(closeNotifTimer.current);
    }
    closeNotifTimer.current = window.setTimeout(() => {
      setNotifOpen(false);
      closeNotifTimer.current = null;
    }, 150);
  };

  const openUserMenu = () => {
    if (closeMenuTimer.current !== null) {
      window.clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
    // Mutually exclusive with notifications — see openNotif.
    if (closeNotifTimer.current !== null) {
      window.clearTimeout(closeNotifTimer.current);
      closeNotifTimer.current = null;
    }
    setNotifOpen(false);
    setUserMenuOpen(true);
  };

  const scheduleCloseUserMenu = () => {
    if (!userMenuOpen) return;
    if (closeMenuTimer.current !== null) {
      window.clearTimeout(closeMenuTimer.current);
    }
    closeMenuTimer.current = window.setTimeout(() => {
      setUserMenuOpen(false);
      closeMenuTimer.current = null;
    }, 150);
  };

  // Click-toggles are mutually exclusive too: toggling one always closes the
  // other, so no combination of clicks/hovers leaves two menus stacked open.
  const toggleNotif = () => {
    if (closeMenuTimer.current !== null) {
      window.clearTimeout(closeMenuTimer.current);
      closeMenuTimer.current = null;
    }
    setUserMenuOpen(false);
    setNotifOpen((o) => !o);
  };

  const toggleUserMenu = () => {
    if (closeNotifTimer.current !== null) {
      window.clearTimeout(closeNotifTimer.current);
      closeNotifTimer.current = null;
    }
    setNotifOpen(false);
    setUserMenuOpen((o) => !o);
  };

  // Escape dismisses the hover-revealed menus without moving the pointer
  // (WCAG 1.4.13 — hover content should be dismissible).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeAllMenus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close the notifications panel when clicking anywhere outside it. The
  // dropdown's own fixed backdrop can be trapped by the header's backdrop-blur
  // stacking context, so a document-level listener keeps it reliable.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        notifOpen &&
        notifRef.current &&
        !notifRef.current.contains(e.target as Node)
      ) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  // CommandPalette handles its own data loading internally

  const user = session?.user;
  const initials = getInitials(user?.name || user?.email || "User");

  return (
    <header className="relative z-[45] grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border/50 bg-background px-4 lg:px-6 backdrop-blur-sm bg-background/80">
      {/* Left: Entity switcher + mobile menu */}
      <div className="flex items-center gap-2 min-w-0">
        <EntitySwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMenuClick}
          aria-label="Toggle navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Center: Global AI Command Bar (wider, prominent) */}
      <div className="hidden sm:block w-[min(100vw-16rem,520px)]">
        <AICommandBar compact placeholder="Search or jump to…" />
      </div>
      <div className="sm:hidden" />

      {/* Right-aligned cluster */}
      <div className="flex items-center justify-end gap-3 min-w-0">
        {/* System Status — commented out for now */}
        {/* <div className="hidden md:flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 shadow-sm text-sm text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-xs">All Systems Operational</span>
        </div> */}

        {/* Notifications */}
        <div
          className="relative"
          ref={notifRef}
          onMouseEnter={openNotif}
          onMouseLeave={scheduleCloseNotif}
        >
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unreadTotal > 0
                ? `Notifications — ${unreadTotal} unread`
                : "Notifications"
            }
            aria-expanded={notifOpen}
            onClick={toggleNotif}
          >
            <Bell className="h-5 w-5" />
            <NotificationBadge count={unreadTotal} />
          </Button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-1 w-80 rounded-md border bg-popover shadow-lg">
                <div className="flex items-center justify-between border-b px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Notifications
                  </p>
                  {unread.length > 0 && (
                    <button
                      onClick={() => {
                        markAllRead.mutate();
                      }}
                      className="text-xs text-primary"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {unread.length === 0 ? (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No unread notifications
                    </div>
                  ) : (
                    unread.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 border-b px-3 py-2 last:border-b-0"
                      >
                        <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{n.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {n.body}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col gap-1">
                          <button
                            onClick={() => {
                              markRead.mutate({ id: n.id });
                            }}
                            className="text-xs text-primary"
                          >
                            Read
                          </button>
                          <button
                            onClick={() => deleteNotif.mutate({ id: n.id })}
                            className="text-xs text-destructive"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t px-3 py-2">
                  <Link
                    href="/dashboard/activity-hub"
                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                    onClick={() => setNotifOpen(false)}
                  >
                    View all notifications <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* CFO Agent Chat toggle — commented out for now */}
        {/* {onChatToggle && (
          <Button
            variant={chatOpen ? "default" : "ghost"}
            size="sm"
            onClick={onChatToggle}
            data-tour="chat-panel-toggle"
            aria-label="Toggle CFO Agent chat"
            className="hidden sm:inline-flex gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline">CFO Agent</span>
          </Button>
        )} */}

        {/* User menu */}
        <div
          className="relative pl-2 border-l"
          ref={userMenuRef}
          onMouseEnter={openUserMenu}
          onMouseLeave={scheduleCloseUserMenu}
        >
          <button
            type="button"
            onClick={toggleUserMenu}
            aria-label="Open user menu"
            aria-expanded={userMenuOpen}
            className="flex items-center gap-1.5 rounded-full p-1 pr-2 hover:bg-accent transition-colors"
          >
            <Avatar className="h-8 w-8">
              {user?.image && (
                <AvatarImage
                  src={user.image}
                  alt={user.name ?? ""}
                  className="h-full w-full object-cover"
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${userMenuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {userMenuOpen && (
            <>
              <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover shadow-lg overflow-hidden">
                <div className="border-b px-3 py-2.5">
                  <p className="truncate text-sm font-medium leading-tight">
                    {user?.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Command Palette — full-featured search with dynamic data */}
      <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
