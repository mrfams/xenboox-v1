"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui";
import { Input, Label } from "@/components/ui";
import { Logo } from "@/components/ui/logo";
import { trpc } from "@/lib/trpc/client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_inviteInfo, setInviteInfo] = useState<{
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
      const ____result = await registerMutation.mutateAsync({
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
    <div className="flex w-full flex-col items-center">
      {/* Logo */}
      <Link href="/" className="mb-6 inline-flex items-center gap-2 group">
        <Logo
          size={28}
          className="transition-transform duration-200 group-hover:scale-105"
        />
        <span className="text-xl font-bold tracking-tight">Xenboox</span>
      </Link>

      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Start your free trial — no credit card required
        </p>
      </div>

      {/* Form — no card wrapper, clean like Linear/Vercel */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-sm font-medium">
            Full Name
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="John Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            disabled={isLoading}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={isLoading}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={isLoading}
            className="h-10"
          />
        </div>

        {checkingInvites && (
          <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            Checking for pending invitations...
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2">
            <svg
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-10 text-sm font-semibold"
          disabled={isLoading}
        >
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {/* Toggle — single link, no duplication */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
