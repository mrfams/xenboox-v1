"use client";

import { useState } from "react";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@xenboox/ui";
import { Users, Shield, Trash2, Loader2, UserX, Crown } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { InviteMemberSection } from "@/components/settings/invite-member-section";

const ROLES = [
  {
    value: "owner",
    label: "Owner",
    description: "Full access, can manage billing",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full access, cannot manage billing",
  },
  {
    value: "finance_director",
    label: "Finance Director",
    description: "View all, approve transactions",
  },
  {
    value: "accountant",
    label: "Accountant",
    description: "Create and edit entries",
  },
  {
    value: "payroll_officer",
    label: "Payroll Officer",
    description: "Manage payroll",
  },
  { value: "cashier", label: "Cashier", description: "Process payments" },
  {
    value: "department_manager",
    label: "Department Manager",
    description: "View department data",
  },
  { value: "employee", label: "Employee", description: "View only" },
  {
    value: "external_auditor",
    label: "External Auditor",
    description: "Read-only audit access",
  },
  {
    value: "donor",
    label: "Donor",
    description: "View grant/donation reports",
  },
] as const;

export function TeamSection() {
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null);
  const [_showInviteSection, _setShowInviteSection] = useState(false);

  const { data: user } = trpc.organization.getCurrentUser.useQuery();
  const { data: entities } = trpc.organization.listEntities.useQuery({});
  const entityId = entities?.[0]?.id;

  const {
    data: accessList,
    isLoading,
    refetch,
  } = trpc.organization.listAccess.useQuery(
    { entityId: entityId ?? "" },
    { enabled: !!entityId },
  );

  const updateRole = trpc.organization.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      setUpdatingRoleFor(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const revokeAccess = trpc.organization.revokeAccess.useMutation({
    onSuccess: () => {
      toast.success("Access revoked");
      setRevokingId(null);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Invite Section */}
      <InviteMemberSection />

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </CardTitle>
          <CardDescription>
            Manage who has access to this entity and their roles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {accessList && accessList.length > 0 ? (
            accessList.map((access) => {
              const isCurrentUser = access.userId === user?.id;
              const isOwner = access.role === "owner";

              return (
                <div
                  key={access.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {access.userId?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          User {access.userId.slice(0, 8)}...
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs text-muted-foreground">
                            (You)
                          </span>
                        )}
                        {isOwner && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ID: {access.userId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {updatingRoleFor === access.id ? (
                      <div className="flex items-center gap-1">
                        <Select
                          value={access.role}
                          onValueChange={(v) =>
                            updateRole.mutate({
                              entityId: entityId!,
                              userId: access.userId,
                              role: v as (typeof ROLES)[number]["value"],
                            })
                          }
                        >
                          <SelectTrigger className="h-8 w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setUpdatingRoleFor(null)}
                        >
                          Done
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUpdatingRoleFor(access.id)}
                        disabled={isOwner && !isCurrentUser}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        <span className="capitalize">
                          {access.role.replace("_", " ")}
                        </span>
                      </Button>
                    )}

                    {!isOwner && !isCurrentUser && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke Access</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove this user&apos;s access to this
                              entity. They will no longer be able to view or
                              edit any data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setRevokingId(access.id);
                                revokeAccess.mutate({
                                  entityId: entityId!,
                                  userId: access.userId,
                                });
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {revokingId === access.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                              ) : (
                                <UserX className="h-4 w-4 mr-1" />
                              )}
                              Revoke Access
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No team members found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
