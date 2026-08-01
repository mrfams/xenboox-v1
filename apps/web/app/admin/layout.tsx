"use client";

export const dynamic = "force-dynamic";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building,
  Bot,
  CreditCard,
  BarChart3,
  Settings,
  Shield,
  AlertCircle,
  Cpu,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

async function adminSignOut() {
  try {
    const csrfRes = await fetch("/api/admin-auth/csrf");
    const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
    await fetch("/api/admin-auth/signout", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken, callbackUrl: "/admin-login" }),
    });
  } finally {
    window.location.href = "/admin-login";
  }
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const navigation: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Admin Users", href: "/admin/admin-users", icon: Shield },
  { label: "Audit Log", href: "/admin/audit-log", icon: AlertCircle },
  { label: "Customers", href: "/admin/users", icon: Users },
  { label: "Organizations", href: "/admin/organizations", icon: Building },
  { label: "AI Comparison", href: "/admin/ai-comparison", icon: Bot },
  { label: "Spending", href: "/admin/spending", icon: CreditCard },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Financial Health", href: "/admin/financial", icon: Shield },
  { label: "Alerts", href: "/admin/alerts", icon: AlertCircle },
  { label: "Model Ops", href: "/admin/model-ops", icon: Cpu },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const { data: adminSession, isLoading: checkingAccess } =
    trpc.adminAccess.session.me.useQuery();

  useEffect(() => {
    if (checkingAccess) return;
    if (!adminSession) {
      router.replace("/admin-login");
    }
  }, [adminSession, checkingAccess, router]);

  if (checkingAccess || !adminSession) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r border-white/[0.06] bg-[hsl(var(--sidebar-bg))] p-4 lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-4 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
            X
          </div>
          <span className="text-lg font-bold tracking-tight text-[hsl(var(--sidebar-text))]">
            Xenboox Admin
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-[hsl(var(--sidebar-text-dim))] hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Current admin + sign out */}
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {adminSession.name}
              </p>
              <p className="truncate text-xs text-[hsl(var(--sidebar-text-dim))]">
                {adminSession.role.replace(/_/g, " ")}
              </p>
            </div>
            <button
              type="button"
              onClick={adminSignOut}
              title="Sign out"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[hsl(var(--sidebar-text-dim))] transition-colors hover:bg-white/[0.06] hover:text-[hsl(var(--sidebar-text))]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <div className="flex h-16 items-center justify-between border-b border-border/50 bg-background px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
              X
            </div>
            <span className="font-bold">Xenboox Admin</span>
          </Link>
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1">
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
