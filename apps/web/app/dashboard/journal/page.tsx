"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { PageHeader } from "@/components/shared/page-header";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading";
import { LedgerLiveness } from "@/components/agents/ledger-liveness";
import { Badge } from "@/components/ui";
import { FileText, Plus } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { statusBadgeClass } from "@/lib/badge-variants";

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "posted", label: "Posted" },
  { value: "reversed", label: "Reversed" },
];

export default function JournalPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("");

  const { data: entries, isLoading } = trpc.journal.list.useQuery({
    ...(statusFilter
      ? { status: statusFilter as "draft" | "posted" | "reversed" }
      : {}),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal Entries"
        description="Record and manage accounting transactions"
        action={{
          label: "New Entry",
          href: "/dashboard/journal/new",
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <LedgerLiveness />

      <FilterBar
        onFilterChange={(filters) => setStatusFilter(filters.status)}
        statusOptions={statusOptions}
      />

      {isLoading ? (
        <TableSkeleton rows={8} columns={5} />
      ) : !entries || entries.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No journal entries"
          description="Create your first journal entry to start recording transactions."
          action={
            <a
              href="/dashboard/journal/new"
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" /> New Entry
            </a>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Date
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Reference
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">
                  Description
                </th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/journal/${entry.id}`)}
                >
                  <td className="py-3 px-4 text-sm">
                    {formatDate(entry.date)}
                  </td>
                  <td className="py-3 px-4 text-sm font-mono">
                    {entry.reference || `#${entry.entryNumber}`}
                  </td>
                  <td className="py-3 px-4 text-sm">{entry.description}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge
                      variant="secondary"
                      className={statusBadgeClass(entry.status)}
                    >
                      {entry.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
