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
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
} from "@xenboox/ui";
import {
  Users,
  Shield,
  Trash2,
  Loader2,
  UserX,
  Crown,
  Mail,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
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

  const { data: user } = trpc.organization.getCurrentUser.useQuery();
  const { data: entities } = trpc.organization.listEntities.useQuery({});
  const { entityId: currentEntityId } = useEntity();
  const entityId = currentEntityId ?? entities?.[0]?.id;

  const {
    data: members,
    isLoading,
    refetch,
  } = trpc.organization.listMembers.useQuery(
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
          {members && members.length > 0 ? (
            members.map((member) => {
              const isCurrentUser = member.userId === user?.id;
              const isOwner = member.role === "owner";
              const initials =
                (member.name ?? "?")
                  .split(" ")
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "?";

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarImage
                        src={member.image ?? undefined}
                        alt={member.name}
                      />
                      <AvatarFallback className="bg-muted text-sm font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {member.name}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-[10px]">
                            You
                          </Badge>
                        )}
                        {isOwner && (
                          <Crown className="h-3.5 w-3.5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {member.email ?? "No email"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {updatingRoleFor === member.id ? (
                      <div className="flex items-center gap-1">
                        <Select
                          value={member.role}
                          onValueChange={(v) =>
                            updateRole.mutate({
                              entityId: entityId!,
                              userId: member.userId,
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
                        onClick={() => setUpdatingRoleFor(member.id)}
                        disabled={isOwner && !isCurrentUser}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        <span className="capitalize">
                          {member.role.replaceAll("_", " ")}
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
                              This will remove {member.name}&apos;s access to
                              this entity. They will no longer be able to view
                              or edit any data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setRevokingId(member.id);
                                revokeAccess.mutate({
                                  entityId: entityId!,
                                  userId: member.userId,
                                });
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {revokingId === member.id ? (
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
