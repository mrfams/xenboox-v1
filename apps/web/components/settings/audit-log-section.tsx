"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@xenboox/ui";
import {
  History,
  Filter,
  Download,
  Clock,
  User,
  Shield,
  Settings,
  CreditCard,
  FileText,
  Bot,
  Loader2,
} from "lucide-react";

const ACTION_CATEGORIES: Record<
  string,
  { label: string; icon: typeof Shield; color: string }
> = {
  "settings.*": {
    label: "Settings",
    icon: Settings,
    color: "text-blue-600 bg-blue-100",
  },
  "auth.*": {
    label: "Authentication",
    icon: Shield,
    color: "text-amber-600 bg-amber-100",
  },
  "billing.*": {
    label: "Billing",
    icon: CreditCard,
    color: "text-emerald-600 bg-emerald-100",
  },
  "document.*": {
    label: "Documents",
    icon: FileText,
    color: "text-purple-600 bg-purple-100",
  },
  "agent.*": {
    label: "AI Agents",
    icon: Bot,
    color: "text-cyan-600 bg-cyan-100",
  },
  "user.*": { label: "User", icon: User, color: "text-slate-600 bg-slate-100" },
};

function getCategoryForAction(action: string) {
  for (const [pattern, category] of Object.entries(ACTION_CATEGORIES)) {
    const prefix = pattern.replace(".*", "");
    if (action.startsWith(prefix)) {
      return category;
    }
  }
  return {
    label: "Other",
    icon: History,
    color: "text-slate-600 bg-slate-100",
  };
}

export function AuditLogSection() {
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const { data, isLoading, refetch } = trpc.settings.getAuditLogs.useQuery({
    limit,
    offset,
  });

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Audit Log
              </CardTitle>
              <CardDescription>
                Track all changes and actions performed in your account. This
                log cannot be modified or deleted.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setLimit(parseInt(v));
                  setOffset(0);
                }}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 entries</SelectItem>
                  <SelectItem value="25">25 entries</SelectItem>
                  <SelectItem value="50">50 entries</SelectItem>
                  <SelectItem value="100">100 entries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {logs.length > 0 ? (
            logs.map((log) => {
              const category = getCategoryForAction(log.action);
              const Icon = category.icon;

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${category.color}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{log.action}</span>
                      <span className="text-xs text-muted-foreground">
                        {log.entityType && `${log.entityType}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.userId?.substring(0, 8)}...
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.newValues && (
                      <div className="mt-2 rounded bg-muted p-2 text-xs font-mono">
                        {JSON.stringify(log.newValues, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">
                No audit logs found
              </p>
            </div>
          )}

          {total > limit && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + limit, total)} of{" "}
                {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - limit))}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + limit)}
                  disabled={offset + limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
