"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";
import { Input, Label } from "@/components/ui";
import { Logo } from "@/components/ui/logo";

interface LoginFormProps {
  ssoEnabled?: boolean;
  ssoDisplayName?: string | null;
  callbackUrl?: string;
  expired?: boolean;
}

export function LoginForm({
  ssoEnabled = false,
  ssoDisplayName,
  callbackUrl: propCallbackUrl,
  expired: propExpired,
}: LoginFormProps) {
  const router = useRouter();
  let searchCallbackUrl: string | null = null;
  let searchExpired = false;
  try {
    const sp = useSearchParams();
    searchCallbackUrl = sp.get("callbackUrl");
    searchExpired = sp.get("expired") === "1";
  } catch {
    // useSearchParams requires Suspense in some render paths — fallback to props
  }
  const callbackUrl = propCallbackUrl || searchCallbackUrl || "/dashboard";
  const expired = propExpired ?? searchExpired;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (expired && !error) {
      setError("Session expired due to inactivity — please sign in again.");
    }
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loginMutation = trpc.auth.login.useMutation();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    setError(null);
    setIsLoading(true);

    try {
      const result = await loginMutation.mutateAsync({ email, password });

      if ("mfaRequired" in result && result.mfaRequired) {
        router.push(
          `/mfa-challenge?token=${encodeURIComponent(result.mfaToken)}`,
        );
        return;
      }

      if ("token" in result && result.token) {
        try {
          const signInResult = await signIn("credentials", {
            directAuthToken: result.token,
            redirect: false,
          });

          if (signInResult?.error) {
            if (
              signInResult.error === "AccessDenied" ||
              /too many requests/i.test(signInResult.error)
            ) {
              setError(
                "Too many attempts. Please wait a minute and try again.",
              );
            } else {
              setError("Failed to establish session. Please try again.");
            }
            return;
          }

          if (!signInResult || (!signInResult.ok && !signInResult.url)) {
            setError("Too many requests. Please wait a minute and try again.");
            return;
          }

          router.push(callbackUrl);
          router.refresh();
        } catch (signInErr) {
          const msg =
            signInErr instanceof Error ? signInErr.message : String(signInErr);
          if (
            /Failed to construct 'URL'/i.test(msg) ||
            /Invalid URL/i.test(msg)
          ) {
            setError("Too many requests. Please wait a minute and try again.");
          } else {
            setError(msg);
          }
          return;
        }
      } else {
        setError("Unexpected response from server.");
      }
    } catch (err) {
      if (err instanceof Error) {
        if (
          /Failed to construct 'URL'/i.test(err.message) ||
          /Invalid URL/i.test(err.message)
        ) {
          setError("Too many requests. Please wait a minute and try again.");
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsLoading(true);
    await signIn("google", { callbackUrl });
  }

  async function handleSsoSignIn() {
    setIsLoading(true);
    await signIn("sso", { callbackUrl });
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
          Welcome back
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your account
        </p>
      </div>

      {/* Form — no card wrapper, clean like Linear/Vercel */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-medium">
              Password
            </Label>
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={isLoading}
            className="h-10"
          />
        </div>

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
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-4 w-full">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">or</span>
        </div>
      </div>

      {/* Social logins */}
      <div className="w-full space-y-2.5">
        {ssoEnabled && (
          <Button
            variant="outline"
            className="w-full h-10"
            onClick={handleSsoSignIn}
            disabled={isLoading}
          >
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            {ssoDisplayName ?? "Sign in with SSO"}
          </Button>
        )}

        <Button
          variant="outline"
          className="w-full h-10"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
        >
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </Button>
      </div>

      {/* Toggle — single link, no duplication */}
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-foreground hover:text-primary transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
