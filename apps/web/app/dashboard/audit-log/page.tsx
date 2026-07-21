"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Button,
  Badge,
} from "@/components/ui";
import {
  Search,
  FileText,
  User,
  Calendar,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  create:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  update: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  post: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  approve:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  lock: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400",
  close: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  login: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
  upload:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  setup:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  disable:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  regenerate:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  revoke: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
};

function getActionColor(action: string): string {
  for (const [key, value] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return value;
  }
  return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
}

function formatAction(action: string): string {
  return action
    .replace(/\./g, " · ")
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = trpc.audit.list.useQuery({
    limit: pageSize,
    offset: page * pageSize,
    action: search || undefined,
    entityType: entityFilter || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Complete audit trail of all actions performed in this entity.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Activity Log
              {data && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({data.total} entries)
                </span>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search action..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  className="pl-8 w-48"
                />
              </div>
              <Input
                placeholder="Entity type..."
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(0);
                }}
                className="w-36"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : data && data.logs.length > 0 ? (
            <div className="space-y-1">
              {data.logs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 rounded-lg border p-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-medium ${getActionColor(log.action)}`}
                      >
                        {formatAction(log.action)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {log.entityType}
                      </span>
                      {log.entityIdRef && (
                        <span className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">
                          {log.entityIdRef.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {log.userId ? `${log.userId.slice(0, 8)}...` : "system"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {log.newValues && Object.keys(log.newValues).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-muted-foreground cursor-pointer hover:text-foreground">
                          View details
                        </summary>
                        <pre className="mt-1 text-[10px] bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.newValues, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No audit log entries found matching your filters.
            </p>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
