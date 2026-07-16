"use client"

import { useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Label } from "@/components/ui"
import { Separator } from "@/components/ui"
import { LogOut, User, Shield, Bell, Save, AlertCircle } from "lucide-react"
import { trpc } from "@/lib/trpc/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { data: session } = useSession()
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    changePasswordMutation.mutate(passwordForm)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <p className="text-sm text-muted-foreground">
                {session?.user?.name || "—"}
              </p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email || "—"}
              </p>
            </div>
            <Separator />
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
              {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Passwords do not match
                </div>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={changePasswordMutation.isPending || passwordForm.newPassword !== passwordForm.confirmPassword}
              >
                <Save className="mr-2 h-4 w-4" />
                {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
              </Button>
            </form>
            <Separator />
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Security Settings</h4>
              <p className="text-sm text-muted-foreground">
                Password change is available above. Two-factor authentication and session management
                will be available soon.
              </p>
            </div>
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
                Control which notifications you receive via email.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Push Notifications</h4>
              <p className="text-sm text-muted-foreground">
                Configure mobile push notifications when available.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}