"use client";

import { useEffect, useState } from "react";
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
  Textarea,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Separator,
} from "@xenboox/ui";
import {
  User,
  Mail,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Loader2,
  Briefcase,
  Phone,
  MapPin,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

export function ProfileSection() {
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const { data: profile, isLoading } = trpc.settings.getProfile.useQuery();
  const utils = trpc.useUtils();

  const updateProfile = trpc.settings.updateProfile.useMutation({
    onSuccess: async () => {
      toast.success("Profile updated successfully");
      setIsEditing(false);
      await utils.settings.getProfile.invalidate();
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

  // Sync form state when the query resolves or after a save
  useEffect(() => {
    if (!profile) return;
    setName(profile.name ?? "");
    setJobTitle(profile.profile?.jobTitle ?? "");
    setPhone(profile.profile?.phone ?? "");
    setBio(profile.profile?.bio ?? "");
    setLocation(profile.profile?.location ?? "");
  }, [profile]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }
    updateProfile.mutate({
      name: name.trim(),
      jobTitle: jobTitle.trim() || undefined,
      phone: phone.trim() || undefined,
      bio: bio.trim() || undefined,
      location: location.trim() || undefined,
    });
  };

  const handleEdit = () => setIsEditing(true);
  const handleCancel = () => {
    if (!profile) return;
    setName(profile.name ?? "");
    setJobTitle(profile.profile?.jobTitle ?? "");
    setPhone(profile.profile?.phone ?? "");
    setBio(profile.profile?.bio ?? "");
    setLocation(profile.profile?.location ?? "");
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  const initials =
    (profile?.name ?? "?")
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="space-y-6">
      {/* Identity Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Your name, role, and how teammates recognize you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar + primary identity */}
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarImage src={profile?.image ?? undefined} alt={name} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-medium">{profile?.name ?? "—"}</p>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>

          <Separator />

          {isEditing ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex-1"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="jobTitle"
                    className="flex items-center gap-1.5"
                  >
                    <Briefcase className="h-3 w-3" />
                    Job Title
                  </Label>
                  <Input
                    id="jobTitle"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g., Finance Director"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+220 ..."
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="location"
                    className="flex items-center gap-1.5"
                  >
                    <MapPin className="h-3 w-3" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short description about yourself"
                  rows={3}
                  maxLength={500}
                />
                <p className="text-right text-xs text-muted-foreground">
                  {bio.length}/500
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
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
                  Save Changes
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {jobTitle || "No job title set"}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{phone || "No phone set"}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border p-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {location || "No location set"}
                  </span>
                </div>
              </div>
              {bio ? (
                <div className="rounded-lg border p-3">
                  <p className="text-sm text-muted-foreground">{bio}</p>
                </div>
              ) : null}
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  Edit Profile
                </Button>
              </div>
            </div>
          )}
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
              <span className="text-sm font-medium">{profile?.email}</span>
              {profile?.emailVerified ? (
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
            {!profile?.emailVerified && (
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
