"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Button,
  Switch,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@xenboox/ui";
import {
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Shield,
  Clock,
  Bell,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { MfaSection } from "@/components/settings/mfa-section";
import { SessionsSection } from "@/components/settings/sessions-section";

export function SecuritySection() {
  const [passwords, setPasswords] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [securityPrefs, setSecurityPrefs] = useState({
    requirePasswordChange: false,
    sessionTimeout: 60,
    loginNotifications: true,
  });

  const { data: currentPrefs, isLoading: prefsLoading } =
    trpc.settings.getSecurityPrefs.useQuery();

  const utils = trpc.useUtils();

  const changePassword = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully");
      setPasswords({ current: "", new: "", confirm: "" });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to change password");
    },
  });

  const updatePrefs = trpc.settings.updateSecurityPrefs.useMutation({
    onSuccess: () => {
      toast.success("Security preferences saved");
      utils.settings.getSecurityPrefs.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save preferences");
    },
  });

  useEffect(() => {
    if (currentPrefs) {
      setSecurityPrefs(currentPrefs);
    }
  }, [currentPrefs]);

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (passwords.new.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    changePassword.mutate({
      currentPassword: passwords.current,
      newPassword: passwords.new,
      confirmPassword: passwords.confirm,
    });
  };

  const handleSavePrefs = () => {
    updatePrefs.mutate(securityPrefs);
  };

  return (
    <div className="space-y-6">
      {/* Password Change */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showPasswords.current ? "text" : "password"}
                value={passwords.current}
                onChange={(e) =>
                  setPasswords({ ...passwords, current: e.target.value })
                }
                placeholder="Enter current password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    current: !showPasswords.current,
                  })
                }
              >
                {showPasswords.current ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPasswords.new ? "text" : "password"}
                value={passwords.new}
                onChange={(e) =>
                  setPasswords({ ...passwords, new: e.target.value })
                }
                placeholder="Enter new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    new: !showPasswords.new,
                  })
                }
              >
                {showPasswords.new ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Must be at least 8 characters with uppercase, lowercase, number,
              and special character.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showPasswords.confirm ? "text" : "password"}
                value={passwords.confirm}
                onChange={(e) =>
                  setPasswords({ ...passwords, confirm: e.target.value })
                }
                placeholder="Confirm new password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    confirm: !showPasswords.confirm,
                  })
                }
              >
                {showPasswords.confirm ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={
              changePassword.isPending ||
              !passwords.current ||
              !passwords.new ||
              !passwords.confirm
            }
          >
            {changePassword.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Security Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security Preferences
          </CardTitle>
          <CardDescription>
            Configure additional security settings for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Lock className="h-4 w-4 text-muted-foreground" />
              </div>
              <Label className="flex flex-col gap-0.5 cursor-pointer">
                <span className="text-sm font-medium">
                  Require password change
                </span>
                <span className="text-xs text-muted-foreground">
                  Force password change on next login
                </span>
              </Label>
            </div>
            <Switch
              checked={securityPrefs.requirePasswordChange}
              onCheckedChange={(v) =>
                setSecurityPrefs({ ...securityPrefs, requirePasswordChange: v })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Bell className="h-4 w-4 text-muted-foreground" />
              </div>
              <Label className="flex flex-col gap-0.5 cursor-pointer">
                <span className="text-sm font-medium">Login notifications</span>
                <span className="text-xs text-muted-foreground">
                  Get notified of new logins to your account
                </span>
              </Label>
            </div>
            <Switch
              checked={securityPrefs.loginNotifications}
              onCheckedChange={(v) =>
                setSecurityPrefs({ ...securityPrefs, loginNotifications: v })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
              <Label className="flex flex-col gap-0.5 cursor-pointer">
                <span className="text-sm font-medium">Session timeout</span>
                <span className="text-xs text-muted-foreground">
                  Automatically log out after inactivity
                </span>
              </Label>
            </div>
            <Select
              value={String(securityPrefs.sessionTimeout)}
              onValueChange={(v) =>
                setSecurityPrefs({
                  ...securityPrefs,
                  sessionTimeout: parseInt(v),
                })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
                <SelectItem value="1440">24 hours</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSavePrefs} disabled={updatePrefs.isPending}>
              {updatePrefs.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Security Preferences
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MFA Section */}
      <MfaSection />

      {/* Sessions Section */}
      <SessionsSection />
    </div>
  );
}
