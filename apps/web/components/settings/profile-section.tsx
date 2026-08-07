"use client";

import { useState } from "react";
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
} from "@xenboox/ui";
import {
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Loader2,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

export function ProfileSection() {
  const [name, setName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: user, isLoading } = trpc.organization.getCurrentUser.useQuery();
  const updateProfile = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update profile");
    },
  });

  const requestVerification = trpc.auth.requestVerification.useMutation({
    onSuccess: () => {
      toast.success("Verification email sent", {
        description: "Check your inbox for the verification link.",
      });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send verification email");
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfile.mutate({ name: name.trim() });
  };

  const handleEdit = () => {
    setName(user?.name ?? "");
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your name and personal details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            {isEditing ? (
              <div className="flex gap-2">
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="flex-1"
                  autoFocus
                />
                <Button
                  onClick={handleSave}
                  disabled={updateProfile.isPending || !name.trim()}
                  size="sm"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditing(false)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{user?.name}</span>
                <Button variant="ghost" size="sm" onClick={handleEdit}>
                  Edit
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Address
          </CardTitle>
          <CardDescription>
            Your email is used for login and notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{user?.email}</span>
              {user?.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/30 dark:text-amber-400">
                  <AlertCircle className="h-3 w-3" />
                  Unverified
                </span>
              )}
            </div>
            {!user?.emailVerified && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => requestVerification.mutate()}
                disabled={requestVerification.isPending}
              >
                {requestVerification.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                Verify Email
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
