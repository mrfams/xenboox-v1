"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label, Switch } from "@/components/ui"
import { Separator } from "@/components/ui"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui"
import { LogOut, User, Shield, Bell, Save, AlertCircle, Check, Mail, RotateCcw, Sparkles, Trash2 } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { AIPreferencesSummary } from "@/components/settings/ai-preferences-summary"
import { ExportImportSettings } from "@/components/settings/export-import-settings"
import { AIUsageStats } from "@/components/settings/ai-usage-stats"
import { SyncStatus } from "@/components/settings/sync-status"
import { RealTimeSyncIndicator } from "@/components/settings/real-time-sync-indicator"
import { SettingsAuditLog } from "@/components/settings/settings-audit-log"

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession()
  const [profileForm, setProfileForm] = useState({
    name: session?.user?.name || "",
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated successfully")
      await updateSession()
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const requestVerificationMutation = trpc.auth.requestVerification.useMutation({
    onSuccess: (data) => {
      toast.success(data.message)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const changePasswordMutation = trpc.auth.changePassword.useMutation({
    onSuccess: () => {
      toast.success("Password changed successfully")
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  // Notification preferences
  const [notifEmailInvoices, setNotifEmailInvoices] = useState(true)
  const [notifEmailReports, setNotifEmailReports] = useState(true)
  const [notifEmailAlerts, setNotifEmailAlerts] = useState(true)
  const [notifPushPayments, setNotifPushPayments] = useState(true)
  const [notifPushApprovals, setNotifPushApprovals] = useState(false)

  const updateNotificationsMutation = trpc.auth.updateNotificationPreferences.useMutation({
    onSuccess: () => toast.success("Notification preferences saved"),
    onError: (error) => toast.error(error.message),
  })

  const handleSaveNotifications = () => {
    updateNotificationsMutation.mutate({
      emailInvoices: notifEmailInvoices,
      emailReports: notifEmailReports,
      emailAlerts: notifEmailAlerts,
      pushPayments: notifPushPayments,
      pushApprovals: notifPushApprovals,
    })
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.name.trim()) {
      toast.error("Name is required")
      return
    }
    updateProfileMutation.mutate({ name: profileForm.name.trim() })
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    changePasswordMutation.mutate(passwordForm)
  }

  const passwordsMatch = passwordForm.newPassword === passwordForm.confirmPassword
  const showPasswordError = passwordForm.confirmPassword.length > 0 && !passwordsMatch

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Cloud Sync Status */}
      <RealTimeSyncIndicator
        isCloudEnabled={true}
        isSyncing={false}
        lastSyncedAt={null}
        error={null}
        hasRemoteChanges={false}
        remoteUpdatedAt={null}
        onForceSync={() => {}}
        onAcceptRemote={() => {}}
        onDismissRemote={() => {}}
      />

      <AIPreferencesSummary />
      <AIUsageStats />
      <SettingsAuditLog />
      <ExportImportSettings />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ name: e.target.value })}
                  placeholder="Your name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="email"
                    value={session?.user?.email || ""}
                    disabled
                    className="opacity-60"
                  />
                  {session?.user?.email && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => requestVerificationMutation.mutate()}
                      disabled={requestVerificationMutation.isPending}
                    >
                      <Mail className="mr-1 h-3 w-3" />
                      Verify
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Click Verify to send a confirmation email to this address.
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={updateProfileMutation.isPending || !profileForm.name.trim()}
              >
                {updateProfileMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Save Profile
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>
              {showPasswordError && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Passwords do not match
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending || !passwordsMatch || !passwordForm.currentPassword}
              >
                <Save className="mr-2 h-4 w-4" />
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Email Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Choose which notifications you receive via email.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Invoice & Payment Updates</span>
                  <span className="text-xs text-muted-foreground">When invoices are created, paid, or overdue</span>
                </Label>
                <Switch checked={notifEmailInvoices} onCheckedChange={setNotifEmailInvoices} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Financial Reports</span>
                  <span className="text-xs text-muted-foreground">Monthly P&L, balance sheet, and custom reports</span>
                </Label>
                <Switch checked={notifEmailReports} onCheckedChange={setNotifEmailReports} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>System Alerts</span>
                  <span className="text-xs text-muted-foreground">Budget thresholds, security events, and errors</span>
                </Label>
                <Switch checked={notifEmailAlerts} onCheckedChange={setNotifEmailAlerts} />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Push Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Receive push notifications on your mobile device.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Payment Received</span>
                  <span className="text-xs text-muted-foreground">When a customer payment is processed</span>
                </Label>
                <Switch checked={notifPushPayments} onCheckedChange={setNotifPushPayments} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="flex flex-col gap-1">
                  <span>Approval Requests</span>
                  <span className="text-xs text-muted-foreground">When your approval is needed on an item</span>
                </Label>
                <Switch checked={notifPushApprovals} onCheckedChange={setNotifPushApprovals} />
              </div>
            </div>

            <Button
              onClick={handleSaveNotifications}
              disabled={updateNotificationsMutation.isPending}
              className="w-full"
            >
              <Save className="mr-2 h-4 w-4" />
              {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Onboarding
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Re-run the setup wizard to configure your organization, chart of accounts, bank connections, team, and AI preferences.
            </p>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Reset Onboarding</p>
                <p className="text-xs text-muted-foreground">
                  This will restart the setup wizard. Your existing data will not be affected.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset onboarding?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will restart the setup wizard on your next page load. Your existing data (accounts, invoices, journal entries, etc.) will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        localStorage.removeItem("xenboox_onboarding_completed")
                        localStorage.removeItem("xenboox_onboarding_step")
                        localStorage.removeItem("xenboox_ai_preferences")
                        toast.success("Onboarding reset. Refresh the page to start the wizard.")
                      }}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Reset Onboarding
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Reset All Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Reset all preferences to factory defaults. This includes AI preferences, onboarding status, and notification settings.
            </p>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs text-destructive font-medium">This will reset:</p>
              <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <li>• AI preferences (auto-reconcile, categorize, alerts, digest)</li>
                <li>• Onboarding status (will show setup wizard on next load)</li>
                <li>• Notification preferences (email, push, AI notifications)</li>
              </ul>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-1 h-3 w-3" />
                  Reset Everything
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all settings?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will reset all your preferences to factory defaults. Your financial data, accounts, and documents will not be affected. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => {
                      // Reset AI preferences
                      localStorage.removeItem("xenboox_ai_preferences")
                      // Reset onboarding
                      localStorage.removeItem("xenboox_onboarding_completed")
                      localStorage.removeItem("xenboox_onboarding_step")
                      // Reset notifications to defaults
                      setNotifEmailInvoices(true)
                      setNotifEmailReports(true)
                      setNotifEmailAlerts(true)
                      setNotifPushPayments(true)
                      setNotifPushApprovals(false)
                      toast.success("All settings reset to defaults. Refresh to apply.")
                    }}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Reset Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sign out of your account on this device.
            </p>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
