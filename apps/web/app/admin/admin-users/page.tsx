"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@xenboox/ui";
import { Plus, QrCode, Copy } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  ops_admin: "Ops Admin",
  finance_admin: "Finance Admin",
  support_agent: "Support Agent",
  read_only_auditor: "Read-Only Auditor",
};

type Provisioning = {
  secret: string;
  qrCodeUri: string;
  qrCodeDataUrl: string;
};

export default function AdminUsersPage() {
  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.adminAccess.users.list.useQuery();
  const createMutation = trpc.adminAccess.users.create.useMutation();
  const updateRoleMutation = trpc.adminAccess.users.updateRole.useMutation();
  const setActiveMutation = trpc.adminAccess.users.setActive.useMutation();
  const setIpAllowlistMutation =
    trpc.adminAccess.users.setIpAllowlist.useMutation();

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    email: "",
    name: "",
    password: "",
    role: "ops_admin",
  });
  const [provisioning, setProvisioning] = useState<Provisioning | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy secret");
  const [allowlistFor, setAllowlistFor] = useState<string | null>(null);
  const [allowlistIps, setAllowlistIps] = useState("");
  const [allowlistTotp, setAllowlistTotp] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    try {
      const result = await createMutation.mutateAsync({
        email: form.email,
        name: form.name,
        password: form.password,
        role: form.role as
          | "super_admin"
          | "ops_admin"
          | "finance_admin"
          | "support_agent"
          | "read_only_auditor",
      });
      setProvisioning(result.totpProvisioning);
      await utils.adminAccess.users.list.invalidate();
      toast.success("Admin account created — hand over the TOTP secret now");
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message ?? "Failed to create admin user",
      );
    }
  }

  async function handleRoleChange(
    userId: string,
    role:
      | "super_admin"
      | "ops_admin"
      | "finance_admin"
      | "support_agent"
      | "read_only_auditor",
  ) {
    try {
      await updateRoleMutation.mutateAsync({ userId, role });
      toast.success("Role updated");
      await utils.adminAccess.users.list.invalidate();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message ?? "Failed to update role",
      );
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    try {
      await setActiveMutation.mutateAsync({
        userId,
        isActive: !isActive,
        reason: "Toggled from admin console",
      });
      toast.success(isActive ? "Account disabled" : "Account enabled");
      await utils.adminAccess.users.list.invalidate();
    } catch (err: unknown) {
      toast.error((err as { message?: string })?.message ?? "Action failed");
    }
  }

  function openAllowlist(userId: string, current: string[] | null) {
    setAllowlistFor(userId);
    setAllowlistIps((current ?? []).join(", "));
    setAllowlistTotp("");
  }

  async function handleSetAllowlist(e: React.FormEvent) {
    e.preventDefault();
    if (!allowlistFor) return;
    const ips = allowlistIps
      .split(",")
      .map((ip) => ip.trim())
      .filter(Boolean);
    try {
      await setIpAllowlistMutation.mutateAsync({
        userId: allowlistFor,
        ipAllowlist: ips,
        totpCode: allowlistTotp,
      });
      toast.success("IP allowlist updated");
      setAllowlistFor(null);
      await utils.adminAccess.users.list.invalidate();
    } catch (err: unknown) {
      toast.error(
        (err as { message?: string })?.message ?? "Failed to update allowlist",
      );
    }
  }

  function copySecret() {
    if (!provisioning) return;
    void navigator.clipboard.writeText(provisioning.secret);
    setCopyLabel("Copied!");
    setTimeout(() => setCopyLabel("Copy secret"), 2000);
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Users</h1>
          <p className="text-sm text-muted-foreground">
            Control-plane accounts. 2FA is mandatory for every account.
          </p>
        </div>
        <Dialog
          open={createOpen && !provisioning}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setProvisioning(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> New Admin
            </Button>
          </DialogTrigger>
          <DialogContent>
            {provisioning ? null : (
              <>
                <DialogHeader>
                  <DialogTitle>Create admin account</DialogTitle>
                  <DialogDescription>
                    The account is created with TOTP 2FA already enrolled.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Temporary password</Label>
                    <Input
                      id="password"
                      type="text"
                      required
                      minLength={12}
                      value={form.password}
                      onChange={(e) =>
                        setForm({ ...form, password: e.target.value })
                      }
                      placeholder="At least 12 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={form.role}
                      onValueChange={(v) => setForm({ ...form, role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending}>
                      Create account
                    </Button>
                  </DialogFooter>
                </form>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* TOTP provisioning handoff (shown once after create) */}
      {provisioning && (
        <Card className="border-amber-300 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> TOTP provisioning — one-time
            </CardTitle>
            <CardDescription>
              This is the only time this secret is shown. Share it with the new
              admin and have them enroll it now.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            <img
              src={provisioning.qrCodeDataUrl}
              alt="TOTP QR code"
              width={200}
              height={200}
              className="rounded-lg border bg-white p-2"
            />{" "}
            <div className="flex-1 space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">
                  Manual secret entry
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  <code className="rounded bg-white px-3 py-1 font-mono text-sm border">
                    {provisioning.secret}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                  >
                    <Copy className="mr-1 h-3 w-3" /> {copyLabel}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                URI: <span className="break-all">{provisioning.qrCodeUri}</span>
              </p>
              <Button
                type="button"
                onClick={() => {
                  setProvisioning(null);
                  setCreateOpen(false);
                }}
              >
                Done — provisioning shared
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>2FA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(users ?? []).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      defaultValue={user.role}
                      onValueChange={(v) =>
                        handleRoleChange(
                          user.id,
                          v as
                            | "super_admin"
                            | "ops_admin"
                            | "finance_admin"
                            | "support_agent"
                            | "read_only_auditor",
                        )
                      }
                    >
                      <SelectTrigger className="h-7 w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.totpEnrolled
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {user.totpEnrolled ? "Enrolled" : "Missing"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        user.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }
                    >
                      {user.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleString()
                      : "Never"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAllowlist(user.id, user.ipAllowlist)}
                    >
                      IPs
                    </Button>
                    <Button
                      variant={user.isActive ? "outline" : "default"}
                      size="sm"
                      className="ml-1"
                      onClick={() => handleToggleActive(user.id, user.isActive)}
                    >
                      {user.isActive ? "Disable" : "Enable"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* IP allowlist editor (requires fresh TOTP confirmation) */}
      <Dialog
        open={allowlistFor !== null}
        onOpenChange={(open) => {
          if (!open) setAllowlistFor(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>IP allowlist</DialogTitle>
            <DialogDescription>
              Restrict this admin to specific IP addresses. Leave empty to allow
              any IP. Requires your current two-factor code.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSetAllowlist} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="allowlist-ips">
                Allowed IPs (comma-separated)
              </Label>
              <Input
                id="allowlist-ips"
                value={allowlistIps}
                onChange={(e) => setAllowlistIps(e.target.value)}
                placeholder="203.0.113.10, 198.51.100.20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="allowlist-totp">Your 6-digit code</Label>
              <Input
                id="allowlist-totp"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                pattern="[0-9]*"
                maxLength={8}
                value={allowlistTotp}
                onChange={(e) =>
                  setAllowlistTotp(e.target.value.replace(/\D/g, ""))
                }
                placeholder="000000"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAllowlistFor(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  setIpAllowlistMutation.isPending || allowlistTotp.length < 6
                }
              >
                Save allowlist
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
