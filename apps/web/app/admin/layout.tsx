"use client";

export const dynamic = "force-dynamic";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const navigation: NavItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
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
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 flex-col border-r bg-card p-4 lg:flex">
        {/* Logo */}
        <div className="flex items-center gap-2 border-b pb-4 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            X
          </div>
          <span className="text-lg font-bold tracking-tight">
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
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
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
      </aside>

      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <div className="flex h-16 items-center justify-between border-b bg-card px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
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
