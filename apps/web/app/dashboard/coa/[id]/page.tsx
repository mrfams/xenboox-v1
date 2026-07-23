"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { DetailShell } from "@/components/dashboard/detail-shell";
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog";
import { EditAccountDialog, type Account } from "./edit-dialog";
import { Badge, Button } from "@/components/ui";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui";
import { Pencil, Power } from "lucide-react";
import { TableSkeleton } from "@/components/shared/loading";
import { formatDate, formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const typeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  liability: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  equity:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  revenue:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  expense:
    "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
};

export default function AccountDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: account, isLoading } = trpc.coa.getById.useQuery({ id });
  const utils = trpc.useUtils();

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const toggleActive = trpc.coa.update.useMutation({
    onSuccess: () => {
      toast.success(
        account?.isActive ? "Account deactivated" : "Account activated",
      );
      utils.coa.getById.invalidate({ id });
      utils.coa.listHierarchy.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <DetailShell title="Account Details" backHref="/dashboard/coa">
        <TableSkeleton rows={4} columns={2} />
      </DetailShell>
    );
  }

  if (!account) {
    return (
      <DetailShell title="Account not found" backHref="/dashboard/coa">
        <p className="text-muted-foreground">
          The requested account does not exist.
        </p>
      </DetailShell>
    );
  }

  return (
    <DetailShell
      title={`${account.code} — ${account.name}`}
      description={account.description ?? undefined}
      backHref="/dashboard/coa"
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant={account.isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Power className="mr-2 h-4 w-4" />
            {account.isActive ? "Deactivate" : "Activate"}
          </Button>
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Details</h3>
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono">{account.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{account.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <Badge variant="secondary" className={typeColors[account.type]}>
                {account.type}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtype</span>
              <span>{account.subtype.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={account.isActive ? "success" : "secondary"}>
                {account.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            {account.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description</span>
                <span>{account.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <EditAccountDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        account={account as Account}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={account.isActive ? "Deactivate Account" : "Activate Account"}
        description={
          account.isActive
            ? "Deactivating this account will prevent it from being used in new journal entries."
            : "Activating this account will allow it to be used in journal entries again."
        }
        confirmText={account.isActive ? "Deactivate" : "Activate"}
        variant={account.isActive ? "destructive" : "default"}
        isLoading={toggleActive.isPending}
        onConfirm={() => {
          toggleActive.mutate({
            id: account.id,
            isActive: !account.isActive,
          });
          setConfirmOpen(false);
        }}
      />
    </DetailShell>
  );
}
