"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import {
  Shield,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

function MfaChallengeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [totpCode, setTotpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackupMode, setIsBackupMode] = useState(false);

  const mfaToken = searchParams.get("token");

  const completeMfaMutation = trpc.auth.completeMfaChallenge.useMutation();

  useEffect(() => {
    if (!mfaToken) {
      router.push("/login");
    }
  }, [mfaToken, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (!mfaToken) {
        setError("Session expired. Please log in again.");
        return;
      }

      const result = await completeMfaMutation.mutateAsync({
        mfaToken,
        totpCode: totpCode.trim(),
      });

      // Call signIn with the mobile token as direct auth
      const signInResult = await signIn("credentials", {
        directAuthToken: result.token,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Failed to establish session. Please try again.");
        return;
      }

      if ("backupCodeUsed" in result && result.backupCodeUsed) {
        toast.success("Signed in with backup code", {
          description: result.warnLowCodes
            ? `You have ${result.backupCodesRemaining} backup code(s) remaining. Generate new ones in settings.`
            : undefined,
        });
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid verification code. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  function handleUseBackup() {
    setIsBackupMode(!isBackupMode);
    setTotpCode("");
    setError(null);
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          {isBackupMode
            ? "Enter one of your backup codes to sign in."
            : "Enter the 6-digit code from your authenticator app."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="totpCode">
              {isBackupMode ? "Backup Code" : "Authentication Code"}
            </Label>
            <Input
              id="totpCode"
              type="text"
              inputMode={isBackupMode ? "text" : "numeric"}
              autoComplete="one-time-code"
              placeholder={isBackupMode ? "XXXXXX" : "000000"}
              value={totpCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\s/g, "");
                if (isBackupMode || /^\d*$/.test(val)) {
                  setTotpCode(val);
                }
              }}
              maxLength={isBackupMode ? 10 : 6}
              required
              disabled={isLoading}
              autoFocus
              className="text-center text-lg tracking-[0.5em]"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || totpCode.length < (isBackupMode ? 6 : 6)}
          >
            {isLoading ? (
              "Verifying..."
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Verify
              </>
            )}
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              {isBackupMode ? "Have your phone?" : "Lost access?"}
            </span>
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={handleUseBackup}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {isBackupMode ? (
              <>
                <ArrowLeft className="h-4 w-4" />
                Use authenticator app instead
              </>
            ) : (
              <>
                <KeyRound className="h-4 w-4" />
                Use a backup code instead
              </>
            )}
          </button>
        </div>

        <div className="text-center">
          <a
            href="/login"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Back to sign in
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MfaChallengePage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Loading...
          </CardContent>
        </Card>
      }
    >
      <MfaChallengeInner />
    </Suspense>
  );
}
