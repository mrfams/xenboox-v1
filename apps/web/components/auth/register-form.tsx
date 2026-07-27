"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import { trpc } from "@/lib/trpc/client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{
    token: string;
    role: string;
  } | null>(null);
  const [checkingInvites, setCheckingInvites] = useState(false);

  const registerMutation = trpc.auth.register.useMutation();
  const utils = trpc.useUtils();
  const acceptInvite = trpc.invitations.accept.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      const result = await registerMutation.mutateAsync({
        name,
        email,
        password,
      });

      const { signIn } = await import("next-auth/react");
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Account created but sign-in failed. Please try logging in.");
        return;
      }

      // Post-signup invite check (Milestone 2)
      setCheckingInvites(true);
      try {
        const invites = await utils.invitations.checkByEmail.fetch({ email });
        if (invites && invites.length > 0) {
          // Auto-accept the first invite (Milestone 3b)
          const firstInvite = invites[0];
          const acceptResult = await acceptInvite.mutateAsync({
            token: firstInvite.token,
          });
          const acceptData = acceptResult as Record<string, unknown>;
          if (acceptData.entityId) {
            localStorage.setItem(
              "currentEntityId",
              acceptData.entityId as string,
            );
          }
          setInviteInfo({ token: firstInvite.token, role: firstInvite.role });
          setCheckingInvites(false);
          router.push("/dashboard");
          router.refresh();
          return;
        }
      } catch {
        // Invite check failed silently — route to org creation
      }
      setCheckingInvites(false);

      // No invite found — route to org creation (Milestone 3a)
      router.push("/register/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm border-white/10 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start your free trial — no credit card required
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>
          {checkingInvites && (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              Checking for pending invitations...
            </div>
          )}

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
