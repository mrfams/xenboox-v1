"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from "@xenboox/ui";
import { ShieldCheck, Lock, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [challengeToken, setChallengeToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const challengeMutation = trpc.adminAccess.auth.mfaChallenge.useMutation();

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const result = await challengeMutation.mutateAsync({ email, password });
      setChallengeToken(result.challengeToken);
      setStep("totp");
      setSubmitting(false);
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Invalid email or password";
      toast.error(message);
      setSubmitting(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const csrfRes = await fetch("/api/admin-auth/csrf");
      const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
      const res = await fetch("/api/admin-auth/callback/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          csrfToken,
          challengeToken,
          totpCode,
          callbackUrl: "/admin",
        }),
      });

      // Auth.js redirects to /admin on success and back to /admin-login
      // (with ?error=) on failure. res.url is the final page after redirects.
      if (!res.ok || !res.url.includes("/admin")) {
        toast.error("Invalid two-factor code. Please try again.");
        setSubmitting(false);
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      toast.error("Sign-in failed. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Xenboox Admin Console
          </h1>
          <p className="text-sm text-muted-foreground">
            Control plane sign-in — two-factor authentication is mandatory.
          </p>
        </div>

        {step === "credentials" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-4 w-4" /> Admin sign-in
              </CardTitle>
              <CardDescription>
                Enter your admin credentials to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCredentials} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@xenboox.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" /> Enter verification code
              </CardTitle>
              <CardDescription>
                Open your authenticator app and enter the current 6-digit code.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleTotp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="totp">6-digit code</Label>
                  <Input
                    id="totp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    maxLength={8}
                    pattern="[0-9]*"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    className="text-center text-2xl tracking-[0.5em]"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || totpCode.length < 6}
                >
                  Verify &amp; sign in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep("credentials");
                    setChallengeToken("");
                    setTotpCode("");
                  }}
                >
                  Back
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          This is the internal control plane, separate from customer accounts.{" "}
          <Link href="/login" className="underline">
            Customer login
          </Link>
        </p>
      </div>
    </div>
  );
}
