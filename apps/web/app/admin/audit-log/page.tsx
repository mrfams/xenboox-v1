"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xenboox/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const PAGE_SIZE = 25;

const ACTION_LABELS: Record<string, string> = {
  "admin_users.create": "Created admin user",
  "admin_users.update_role": "Changed admin role",
  "admin_users.enable": "Enabled admin account",
  "admin_users.disable": "Disabled admin account",
  "admin_users.set_ip_allowlist": "Updated IP allowlist",
  "admin_sessions.revoke": "Revoked session",
  "admin_sessions.revoke_all_others": "Revoked all other sessions",
};

function prettyAction(actionType: string): string {
  return ACTION_LABELS[actionType] ?? actionType;
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "—";
  return JSON.stringify(value);
}

export default function AdminAuditLogPage() {
  const [actionType, setActionType] = useState("");
  const [offset, setOffset] = useState(0);
  const [appliedFilter, setAppliedFilter] = useState("");

  const { data, isLoading } = trpc.adminAccess.audit.list.useQuery({
    limit: PAGE_SIZE,
    offset,
    actionType: appliedFilter || undefined,
  });
  const { data: stats } = trpc.adminAccess.audit.stats.useQuery();

  const total = (data?.total as number) ?? 0;
  const rows = data?.rows ?? [];
  const pageStart = offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);

  function applyFilter() {
    setOffset(0);
    setAppliedFilter(actionType.trim());
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Append-only record of every control-plane action — who, what, when,
          and why.
        </p>
      </div>

      {stats && stats.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Actions by type</CardTitle>
            <CardDescription>Most frequent first</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.map((s) => (
                <button
                  key={s.actionType}
                  type="button"
                  onClick={() => {
                    setActionType(s.actionType);
                    setAppliedFilter(s.actionType);
                    setOffset(0);
                  }}
                  className="flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs transition-colors hover:bg-accent"
                >
                  <span>{prettyAction(s.actionType)}</span>
                  <Badge variant="secondary">{s.count}</Badge>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Filter</CardTitle>
          <CardDescription>
            Filter by action type (e.g. admin_users.create)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={actionType}
            onChange={(e) => setActionType(e.target.value)}
            placeholder="admin_users.create"
            className="max-w-sm"
          />
          <Button onClick={applyFilter}>Apply</Button>
          {(appliedFilter || offset > 0) && (
            <Button
              variant="ghost"
              onClick={() => {
                setActionType("");
                setAppliedFilter("");
                setOffset(0);
              }}
            >
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No audit entries yet.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Before → After</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {prettyAction(row.actionType)}
                      </TableCell>
                      <TableCell>
                        {row.actorAdminUserId ? (
                          <span className="font-mono text-xs">
                            {row.actorAdminUserId.slice(0, 8)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        {row.actorRoleAtTimeOfAction ? (
                          <Badge variant="outline">
                            {row.actorRoleAtTimeOfAction.replace(/_/g, " ")}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="text-muted-foreground">
                          {row.targetEntityType}:
                        </span>{" "}
                        <span className="font-mono">
                          {row.targetEntityId?.slice(0, 8) ?? "—"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[220px] font-mono text-[10px] leading-relaxed">
                        <div className="text-muted-foreground">
                          {formatJson(row.beforeValue)}
                        </div>
                        <div className="text-emerald-700 dark:text-emerald-400">
                          {formatJson(row.afterValue)}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                        {row.reason ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t px-4 py-3">
                <span className="text-sm text-muted-foreground">
                  Showing {total === 0 ? 0 : pageStart}–{pageEnd} of {total}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={offset === 0}
                    onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" /> Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pageEnd >= total}
                    onClick={() => setOffset(offset + PAGE_SIZE)}
                  >
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
