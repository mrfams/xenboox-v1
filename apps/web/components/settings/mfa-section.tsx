"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Shield,
  ShieldOff,
  Copy,
  Check,
  AlertCircle,
  Download,
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

type BackupCodesDisplayProps = {
  codes: string[];
  onCopied: () => void;
};

function BackupCodesDisplay({ codes, onCopied }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join("\n"));
    setCopied(true);
    onCopied();
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const blob = new Blob(
      [
        `Xenboox Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${codes.join("\n")}\n\nKeep these safe! Each code can only be used once.`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `xenboox-backup-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onCopied();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/50 p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">
          Save these backup codes in a secure place. Each code can only be used
          once.
        </div>
        <div className="grid grid-cols-2 gap-1">
          {codes.map((code, i) => (
            <code
              key={i}
              className="rounded bg-background px-2 py-1 text-sm font-mono"
            >
              {code}
            </code>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="flex-1"
        >
          {copied ? (
            <Check className="mr-1 h-3 w-3" />
          ) : (
            <Copy className="mr-1 h-3 w-3" />
          )}
          {copied ? "Copied!" : "Copy All"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1"
        >
          <Download className="mr-1 h-3 w-3" />
          Download
        </Button>
      </div>
    </div>
  );
}

export function MfaSection() {
  const [view, setView] = useState<"idle" | "setup" | "disable">("idle");
  const [totpCode, setTotpCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);

  const { data: mfaStatus, refetch: refetchStatus } =
    trpc.auth.mfaStatus.useQuery();

  const setupMfaMutation = trpc.auth.setupMfa.useMutation();
  const verifyMfaMutation = trpc.auth.verifyMfaSetup.useMutation();
  const disableMfaMutation = trpc.auth.disableMfa.useMutation();
  const regenerateCodesMutation = trpc.auth.regenerateBackupCodes.useMutation();

  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeDataUrl: string;
    qrCodeUri: string;
    backupCodes: string[];
  } | null>(null);

  const handleStartSetup = async () => {
    try {
      const data = await setupMfaMutation.mutateAsync();
      setSetupData(data);
      setBackupCodes(data.backupCodes);
      setView("setup");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start MFA setup",
      );
    }
  };

  const handleVerifySetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await verifyMfaMutation.mutateAsync({ totpCode: totpCode.trim() });
      toast.success("MFA enabled successfully", {
        description:
          "Your account is now protected with two-factor authentication.",
      });
      setView("idle");
      setTotpCode("");
      setSetupData(null);
      refetchStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid code, please try again",
      );
    }
  };

  const handleDisable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await disableMfaMutation.mutateAsync({ totpCode: totpCode.trim() });
      toast.success("MFA disabled");
      setView("idle");
      setTotpCode("");
      refetchStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid code, please try again",
      );
    }
  };

  const handleRegenerateCodes = async () => {
    try {
      const data = await regenerateCodesMutation.mutateAsync();
      setBackupCodes(data.backupCodes);
      toast.success("New backup codes generated");
      refetchStatus();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to regenerate codes",
      );
    }
  };

  // Setup in progress
  if (view === "setup" && setupData) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Scan QR Code</h4>
          <p className="text-sm text-muted-foreground">
            Scan this QR code with your authenticator app (Google Authenticator,
            Authy, etc.)
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
          <code className="block rounded bg-muted px-2 py-1 text-xs break-all select-all">
            {setupData.secret}
          </code>
        </div>

        <BackupCodesDisplay
          codes={backupCodes ?? setupData.backupCodes}
          onCopied={() => {}}
        />

        <form onSubmit={handleVerifySetup} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="setupTotp">Verify with a 6-digit code</Label>
            <Input
              id="setupTotp"
              type="text"
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
            disabled={verifyMfaMutation.isPending || totpCode.length !== 6}
          >
            {verifyMfaMutation.isPending
              ? "Verifying..."
              : "Enable Two-Factor Authentication"}
          </Button>
        </form>
      </div>
    );
  }

  // Disable confirmation
  if (view === "disable") {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div className="text-sm text-destructive">
            <p className="font-medium">Are you sure?</p>
            <p className="mt-1 text-muted-foreground">
              Disabling two-factor authentication reduces the security of your
              account. Enter a verification code to confirm.
            </p>
          </div>
        </div>

        <form onSubmit={handleDisable} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="disableTotp">Authentication Code</Label>
            <Input
              id="disableTotp"
              type="text"
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
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setView("idle");
                setTotpCode("");
              }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              className="flex-1"
              disabled={disableMfaMutation.isPending || totpCode.length !== 6}
            >
              {disableMfaMutation.isPending ? "Disabling..." : "Disable MFA"}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Default state
  const isEnabled = mfaStatus?.enabled ?? false;
  const needsAttention = mfaStatus?.needsAttention ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Two-Factor Authentication (2FA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mfaStatus === undefined ? (
          <p className="text-sm text-muted-foreground">Loading status...</p>
        ) : isEnabled ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-emerald-500" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                MFA is enabled
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Your account is protected with two-factor authentication.
              {mfaStatus.backupCodesCount > 0 && (
                <>
                  {" "}
                  You have {mfaStatus.backupCodesCount} unused backup code
                  {mfaStatus.backupCodesCount !== 1 ? "s" : ""}.
                </>
              )}
            </p>

            {needsAttention && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 dark:bg-amber-950/20">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-xs text-amber-700 dark:text-amber-300">
                  You have {mfaStatus.backupCodesCount} backup code
                  {mfaStatus.backupCodesCount !== 1 ? "s" : ""} remaining.
                  Generate new ones to avoid being locked out.
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {needsAttention && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerateCodes}
                  disabled={regenerateCodesMutation.isPending}
                >
                  <KeyRound className="mr-1 h-3 w-3" />
                  {regenerateCodesMutation.isPending
                    ? "Generating..."
                    : "Generate New Codes"}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setView("disable");
                  setTotpCode("");
                }}
              >
                <ShieldOff className="mr-1 h-3 w-3" />
                Disable MFA
              </Button>
            </div>

            {regenerateCodesMutation.data?.backupCodes && (
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium">New Backup Codes</p>
                <BackupCodesDisplay
                  codes={regenerateCodesMutation.data.backupCodes}
                  onCopied={() => refetchStatus()}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <ShieldOff className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                MFA is not configured
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              Add an extra layer of security to your account by enabling
              two-factor authentication. You will be required to enter a
              verification code from your authenticator app when signing in.
            </p>

            <Button
              onClick={handleStartSetup}
              disabled={setupMfaMutation.isPending}
            >
              {setupMfaMutation.isPending
                ? "Preparing..."
                : "Set Up Two-Factor Authentication"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
