"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect, useRef } from "react";
import {
  Menu,
  LogOut,
  User,
  Bell,
  Search,
  MessageSquare,
  ChevronRight,
  FileText,
  Landmark,
  Receipt,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Button,
  Avatar,
  AvatarFallback,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui";
import { ThemeToggle } from "@/components/layout/theme-toggle";
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

export function TopNav({ onMenuClick, onChatToggle, chatOpen }: TopNavProps) {
  const { data: session } = useSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [commands, setCommands] = useState<SearchItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const { data: notifications } = trpc.notifications.list.useQuery(
    { limit: 20, onlyUnread: true },
    { refetchInterval: 60000 },
  );

  const { data: unreadCount } = trpc.notifications.unreadCount.useQuery(
    undefined,
    {
      refetchInterval: 60000,
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
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  useEffect(() => {
    async function loadCommands() {
      try {
        const invoices = await trpc.ar.listInvoices.fetch();
        const customers = await trpc.ar.listCustomers.fetch();
        const bankAccounts = await trpc.treasury.listBankAccounts.fetch();
        const docs = await trpc.document.listDocuments.fetch();
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
  }, []);

  const user = session?.user;
  const initials = user?.name ? getInitials(user.name) : "??";

  return (
    <header className="flex h-16 items-center gap-3 border-b bg-card px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle navigation"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search trigger */}
      <div className="hidden sm:flex relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full rounded-lg border bg-muted/50 pl-9 pr-4 py-2 text-left text-sm text-muted-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Search anything...
        </button>
      </div>

      <div className="flex-1 sm:hidden" />

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

      {/* CFO Agent Chat toggle */}
      {onChatToggle && (
        <Button
          variant={chatOpen ? "default" : "ghost"}
          size="sm"
          onClick={onChatToggle}
          aria-label="Toggle CFO Agent chat"
          className="hidden sm:inline-flex gap-2"
        >
          <MessageSquare className="h-4 w-4" />
          <span className="hidden md:inline">CFO Agent</span>
        </Button>
      )}

      {/* Theme Toggle */}
      <ThemeToggle />

      {/* User menu */}
      <div className="flex items-center gap-3 pl-2 border-l">
        <Avatar className="h-8 w-8">
          {user?.image && (
            <img
              src={user.image}
              alt={user.name ?? ""}
              className="h-full w-full object-cover"
            />
          )}
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="hidden md:block">
          <p className="text-sm font-medium leading-none">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/login" })}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
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
