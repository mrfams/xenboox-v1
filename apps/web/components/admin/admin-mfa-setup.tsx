"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  ShieldCheck,
  Copy,
  Check,
  KeyRound,
  Smartphone,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import {
  Button,
  Input,
  Label,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

export function AdminMfaSetup() {
  const [view, setView] = useState<"idle" | "setup" | "done">("idle");
  const [totpCode, setTotpCode] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: session } = trpc.adminAccess.session.me.useQuery();
  const setupMutation = trpc.adminAccess.auth.setupMfa.useMutation();
  const verifyMutation = trpc.adminAccess.auth.verifyMfaSetup.useMutation();

  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    qrCodeUri: string;
    backupCodes: string[];
  } | null>(null);

  const handleStartSetup = async () => {
    try {
      const data = await setupMutation.mutateAsync();
      setSetupData(data);
      setView("setup");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start MFA setup",
      );
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyMutation.mutateAsync({ totpCode: totpCode.trim() });
      toast.success("Two-factor authentication enabled");
      setView("done");
      setTotpCode("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid code, try again",
      );
    }
  };

  const handleCopySecret = async () => {
    if (!setupData) return;
    await navigator.clipboard.writeText(setupData.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isEnrolled = session?.totpEnrolled ?? false;

  // Done state
  if (view === "done") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Two-Factor Authentication Enabled
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your account is now protected with TOTP 2FA. You will need your
            authenticator app to sign in.
          </p>
          <Button variant="outline" onClick={() => setView("idle")}>
            Back to security settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Setup in progress
  if (view === "setup" && setupData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Set Up Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Scan this QR code with your authenticator app (Google
              Authenticator, Authy, etc.)
            </p>
          </div>

          <div className="flex justify-center">
            <img
              src={setupData.qrCodeDataUrl}
              alt="MFA QR Code"
              className="rounded-lg border"
              width={200}
              height={200}
            />
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Or enter this key manually:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted px-2 py-1 text-xs break-all select-all font-mono">
                {setupData.secret}
              </code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopySecret}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-md border bg-muted/50 p-3">
            <div className="mb-2 text-xs font-medium text-muted-foreground">
              Backup codes — save these in a secure place. Each code can only be
              used once.
            </div>
            <div className="grid grid-cols-2 gap-1">
              {setupData.backupCodes.map((code, i) => (
                <code
                  key={i}
                  className="rounded bg-background px-2 py-1 text-sm font-mono"
                >
                  {code}
                </code>
              ))}
            </div>
          </div>

          <form onSubmit={handleVerify} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="adminSetupTotp">
                Enter the 6-digit code from your app
              </Label>
              <Input
                id="adminSetupTotp"
                inputMode="numeric"
                placeholder="000000"
                value={totpCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  if (val.length <= 6) setTotpCode(val);
                }}
                maxLength={6}
                required
                className="text-center text-lg tracking-[0.5em]"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={verifyMutation.isPending || totpCode.length !== 6}
            >
              {verifyMutation.isPending
                ? "Verifying..."
                : "Enable Two-Factor Authentication"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setView("idle");
                setTotpCode("");
                setSetupData(null);
              }}
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Default state
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Two-Factor Authentication (2FA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnrolled ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                2FA is enabled
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Your account is protected with two-factor authentication.
            </p>
            <Button variant="outline" onClick={handleStartSetup}>
              <KeyRound className="mr-2 h-4 w-4" />
              Re-enroll authenticator
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                2FA is not configured
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security by enabling two-factor
              authentication. You will need your authenticator app when signing
              in.
            </p>
            <Button
              onClick={handleStartSetup}
              disabled={setupMutation.isPending}
            >
              {setupMutation.isPending
                ? "Preparing..."
                : "Set Up Two-Factor Authentication"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
