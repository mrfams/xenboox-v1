"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  ChevronRight,
  FileText,
  Landmark,
  Receipt,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import { EntitySwitcher } from "@/components/layout/entity-switcher";
import { getInitials } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

interface TopNavProps {
  onMenuClick: () => void;
  onChatToggle?: () => void;
  chatOpen?: boolean;
}

type SearchItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  group: string;
};

export function TopNav({
  onMenuClick,
  onChatToggle: _onChatToggle,
  chatOpen: _chatOpen,
}: TopNavProps) {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [commands, setCommands] = useState<SearchItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: true },
    {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(
    undefined,
    {
      staleTime: 60 * 1000, // 1 minute
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  );
  const markRead = trpc.notifications.markAsRead.useMutation();
  const markAllRead = trpc.notifications.markAllAsRead.useMutation();
  const deleteNotif = trpc.notifications.delete.useMutation();

  const unread = notifications ?? [];
  const unreadTotal = unreadCount?.count ?? unread.length;
  const showBadge = unreadTotal > 0;

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
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

  const utils = trpc.useUtils();

  useEffect(() => {
    async function loadCommands() {
      try {
        const invoices = await utils.ar.listInvoices.fetch({});
        const customers = await utils.ar.listCustomers.fetch({});
        const bankAccounts = await utils.treasury.listBankAccounts.fetch();
        const docs = await utils.document.listDocuments.fetch({});
        const results: SearchItem[] = [
          ...(invoices ?? []).map((inv: Record<string, unknown>) => ({
            label: `Invoice ${inv.invoiceNumber as string}`,
            href: `/dashboard/ar/invoices/${inv.id as string}`,
            icon: <Receipt className="h-4 w-4" />,
            group: "AR",
          })),
          ...(customers ?? []).map((c: Record<string, unknown>) => ({
            label: `Customer ${c.name as string}`,
            href: `/dashboard/ar/customers/${c.id as string}`,
            icon: <Users className="h-4 w-4" />,
            group: "AR",
          })),
          ...(bankAccounts ?? []).map((b: Record<string, unknown>) => ({
            label: `Account ${b.name as string}`,
            href: `/dashboard/treasury/account/${b.id as string}`,
            icon: <Landmark className="h-4 w-4" />,
            group: "Treasury",
          })),
          ...(docs ?? []).map((d: Record<string, unknown>) => ({
            label: `Document ${d.name as string}`,
            href: `/dashboard/documents/${d.id as string}`,
            icon: <FileText className="h-4 w-4" />,
            group: "Documents",
          })),
        ];
        setCommands(results.slice(0, 50));
      } catch {
        // Silent
      }
    }
    loadCommands();
  }, [utils]);

  const user = session?.user;
  const initials = getInitials(user?.name || user?.email || "User");

  return (
    <header className="grid h-16 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 border-b border-border/50 bg-background px-4 lg:px-6 backdrop-blur-sm bg-background/80">
      {/* Left: Entity switcher + mobile menu */}
      <div className="flex items-center gap-2 min-w-0">
        <EntitySwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
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
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Notifications"
            onClick={() => setNotifOpen(!notifOpen)}
          >
            <Bell className="h-5 w-5" />
            {showBadge ? (
              <span className="absolute -top-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                {unreadTotal}
              </span>
            ) : null}
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
                    href="/dashboard/notifications"
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
        <div className="relative pl-2 border-l" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
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

      {/* Command Palette */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search invoices, accounts, documents..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Go to">
            {commands.map((c) => (
              <CommandItem
                key={c.href}
                onSelect={() => {
                  router.push(c.href);
                  setSearchOpen(false);
                }}
              >
                <span className="mr-2 text-muted-foreground">{c.icon}</span>
                <span className="flex-1">{c.label}</span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
