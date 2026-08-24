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
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Separator,
  Badge,
} from "@xenboox/ui";
import {
  UserPlus,
  Mail,
  Loader2,
  Clock,
  Undo2,
  Copy,
  ShieldOff,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";

const ROLES = [
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
];

const STATUS_BADGES: Record<string, string> = {
  pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400",
  accepted:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
  revoked: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
  expired: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

export function InviteMemberSection() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "employee",
  });
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: entities } = trpc.organization.listEntities.useQuery({});
  const { entityId: currentEntityId } = useEntity();
  const entityId = currentEntityId ?? entities?.[0]?.id;

  const { data: invites, refetch: refetchInvites } =
    trpc.invitations.listByEntity.useQuery(
      { entityId: entityId ?? "" },
      { enabled: !!entityId },
    );

  const issueInvite = trpc.invitations.issue.useMutation({
    onSuccess: (data) => {
      setInviteLink(`${window.location.origin}/invite/${data.token}`);
      setShowInviteDialog(false);
      setInviteForm({ email: "", role: "employee" });
      refetchInvites();
      toast.success("Invitation sent!");
    },
    onError: (error) => toast.error(error.message || "Failed to send invite"),
  });

  const revokeInvite = trpc.invitations.revoke.useMutation({
    onSuccess: () => {
      toast.success("Invitation revoked");
      refetchInvites();
    },
    onError: (error) => toast.error(error.message),
  });

  const resendInvite = trpc.invitations.resend.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent");
      refetchInvites();
    },
    onError: (error) => toast.error(error.message),
  });

  const copyInviteLink = async () => {
    if (inviteLink) {
      try {
        await navigator.clipboard.writeText(inviteLink);
        toast.success("Invite link copied to clipboard");
      } catch {
        toast.error("Failed to copy — try selecting manually");
      }
    }
  };

  const handleInvite = () => {
    if (!inviteForm.email) {
      toast.error("Please enter an email address");
      return;
    }
    if (!entityId) {
      toast.error("Select a workspace first to invite members");
      return;
    }
    issueInvite.mutate({
      email: inviteForm.email,
      entityId,
      role: inviteForm.role,
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Team Members
          </CardTitle>
          <CardDescription>
            Invite colleagues to join your organization and collaborate on
            financial management.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">How invitations work:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Enter the recipient's email address</li>
                  <li>• Choose their role and permissions</li>
                  <li>• They'll receive an email with an invite link</li>
                  <li>• Link expires after 7 days</li>
                </ul>
              </div>
            </div>
          </div>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {invites && invites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations you've sent that haven't been accepted yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((invite) => {
              const isPending = invite.status === "pending";
              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {invite.email}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invite.role.replace("_", " ")} · Expires{" "}
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      className={`${STATUS_BADGES[invite.status] ?? ""} text-xs`}
                    >
                      {invite.status}
                    </Badge>
                  </div>
                  {isPending && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          resendInvite.mutate({ inviteId: invite.id })
                        }
                        disabled={resendInvite.isPending}
                      >
                        {resendInvite.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Undo2 className="h-4 w-4 mr-1" />
                        )}
                        Resend
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          revokeInvite.mutate({ inviteId: invite.id })
                        }
                        disabled={revokeInvite.isPending}
                      >
                        <ShieldOff className="h-4 w-4 mr-1" />
                        Revoke
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, email: e.target.value })
                }
                placeholder="colleague@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(v) => setInviteForm({ ...inviteForm, role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div>
                        <span className="font-medium">{role.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">
                          {role.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInviteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={!inviteForm.email || issueInvite.isPending}
            >
              {issueInvite.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite link confirmation */}
      {inviteLink && (
        <Card>
          <CardContent className="flex items-center justify-between border-0 p-4">
            <p className="text-sm text-muted-foreground">
              Invite link generated. Share it with your teammate.
            </p>
            <Button variant="outline" size="sm" onClick={copyInviteLink}>
              <Copy className="h-4 w-4 mr-1" />
              Copy Link
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
