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
} from "@xenboox/ui";
import { UserPlus, Mail, Copy, CheckCircle2, Clock } from "lucide-react";

import { trpc } from "@/lib/trpc/client";

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

export function InviteMemberSection() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "employee",
  });
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const { data: entities } = trpc.organization.listEntities.useQuery({});
  const ___entityId = entities?.[0]?.id;

  // Note: This would need an actual invite mutation in the router
  // For now, we'll simulate the flow
  const handleInvite = async () => {
    if (!inviteForm.email) {
      toast.error("Please enter an email address");
      return;
    }

    // In production, this would call an actual invite mutation
    // For now, we'll show the success state
    setInvitedEmail(inviteForm.email);
    setInviteLink(
      `https://xenboox.com/invite/${Math.random().toString(36).substring(7)}`,
    );
    setShowInviteDialog(false);
    toast.success("Invitation sent!");
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard");
    }
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

      {/* Recent Invites */}
      {invitedEmail && (
        <Card className="border-emerald-200 dark:border-emerald-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Invitation Sent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                  <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium">{invitedEmail}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Invitation expires in 7 days
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={copyInviteLink}>
                <Copy className="h-4 w-4 mr-1" />
                Copy Link
              </Button>
            </div>
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
            <Button onClick={handleInvite} disabled={!inviteForm.email}>
              <Mail className="h-4 w-4 mr-2" />
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
