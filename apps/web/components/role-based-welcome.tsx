"use client";

import { useEntity } from "@/lib/entity-context";
import { getRoleConfig } from "@/lib/role-config";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  FileText,
  Landmark,
  Users,
  BarChart3,
  CheckCircle,
  BookOpen,
  Download,
  DollarSign,
  Receipt,
  Wallet,
  PieChart,
  Shield,
  Folder,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Icon Map ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "file-text": FileText,
  landmark: Landmark,
  users: Users,
  "bar-chart-3": BarChart3,
  "check-circle": CheckCircle,
  "book-open": BookOpen,
  download: Download,
  "dollar-sign": DollarSign,
  receipt: Receipt,
  wallet: Wallet,
  "pie-chart": PieChart,
  shield: Shield,
  folder: Folder,
};

// ─── Component ──────────────────────────────────────────────────────────────

export function RoleBasedWelcome() {
  const { entityRole } = useEntity();
  const { data: session } = useSession();
  const config = getRoleConfig(entityRole);

  const userName =
    (session?.user as { name?: string })?.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-6">
      {/* ── Headline ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {config.welcomeHeadline.replace("[Name]", userName)}
        </h1>
        {config.welcomeSubtitle && (
          <p className="text-sm text-muted-foreground mt-1">
            {config.welcomeSubtitle}
          </p>
        )}
      </div>

      {/* ── Role Badge ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
            "bg-primary/10 text-primary",
          )}
        >
          {config.displayName}
        </span>
        <span className="text-xs text-muted-foreground">
          {config.description}
        </span>
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      {config.quickActions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {config.quickActions.map((action) => {
            const Icon = ICON_MAP[action.icon] ?? FileText;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={cn(
                  "group flex items-start gap-3 rounded-lg border border-border bg-card p-4",
                  "transition-all hover:border-primary/30 hover:shadow-sm",
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {action.description}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ── Read-only notice for auditors ─────────────────────────── */}
      {(entityRole === "external_auditor" || entityRole === "donor") && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <Shield className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            You have <strong>read-only access</strong>. You can view and
            export data but cannot make changes.
          </p>
        </div>
      )}
    </div>
  );
}
