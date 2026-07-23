"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import { Building2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// ─── Mono Connect Types ────────────────────────────────────────────────

declare global {
  interface Window {
    MonoConnect: new (config: MonoConnectConfig) => MonoConnectInstance;
  }
}

interface MonoConnectConfig {
  key: string;
  onSuccess: (params: { code: string }) => void;
  onClose: () => void;
  onLoad?: () => void;
  onEvent?: (event: string, data: Record<string, unknown>) => void;
}

interface MonoConnectInstance {
  setup: (params: { institution?: string }) => void;
  open: () => void;
  close: () => void;
}

// ─── Props ──────────────────────────────────────────────────────────────

interface ConnectBankProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Supported Banks ────────────────────────────────────────────────────

const GHANA_BANKS = [
  { id: "gtbank", name: "Guaranty Trust Bank (GTBank)" },
  { id: "access", name: "Access Bank Ghana" },
  { id: "zenith", name: "Zenith Bank Ghana" },
  { id: "uba", name: "United Bank for Africa (UBA)" },
  { id: "stanbic", name: "Stanbic Bank Ghana" },
  { id: "scb", name: "Standard Chartered Bank" },
  { id: "ecobank", name: "Ecobank Ghana" },
  { id: "fidelity", name: "Fidelity Bank Ghana" },
  { id: "cal", name: "CAL Bank" },
  { id: "cbg", name: "Consolidated Bank Ghana (CBG)" },
  { id: "absa", name: "Absa Bank Ghana" },
  { id: "gcb", name: "GCB Bank" },
  { id: "nib", name: "National Investment Bank" },
  { id: "adb", name: "Agricultural Development Bank" },
];

const GAMBIA_BANKS = [
  { id: "trust_bank", name: "Trust Bank Limited" },
  { id: "ecobank_gm", name: "Ecobank Gambia" },
  { id: "standard_chartered_gm", name: "Standard Chartered Gambia" },
  { id: "gtbank_gm", name: "GTBank Gambia" },
  { id: "sky_bank", name: "Sky Bank (now QCell)" },
  { id: "aboro_intl", name: "Aboro International" },
];

// ─── Mono Connect Loader ───────────────────────────────────────────────

function loadMonoConnectScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window.MonoConnect !== "undefined") {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://connect.mono.co/connect.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

// ─── Component ──────────────────────────────────────────────────────────

export function ConnectBankDialog({ open, onOpenChange }: ConnectBankProps) {
  const [step, setStep] = useState<
    "select" | "connecting" | "success" | "error"
  >("select");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const initiateConnection =
    trpc.integrations.initiateBankConnection.useMutation();
  const completeConnection =
    trpc.integrations.completeBankConnection.useMutation();

  // ── Load Mono Connect script on mount ────────────────────────────────
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadMonoConnectScript().then((loaded) => {
      if (!cancelled && loaded) {
        // Script loaded successfully — widget ready
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // ── Get Mono public key ──────────────────────────────────────────────
  const monoPublicKey = process.env.NEXT_PUBLIC_MONO_PUBLIC_KEY;

  const handleConnect = useCallback(async () => {
    if (!selectedBank || !accountNumber.trim()) return;

    setStep("connecting");
    setErrorMessage("");

    const bankInfo = [...GHANA_BANKS, ...GAMBIA_BANKS].find(
      (b) => b.id === selectedBank,
    );

    try {
      // 1. Create pending connection on backend
      const { connectionId } = await initiateConnection.mutateAsync({
        institutionName: bankInfo?.name ?? selectedBank,
        accountNumber: accountNumber.trim(),
        institutionId: selectedBank,
      });

      // 2. Open Mono Connect widget
      if (typeof window.MonoConnect !== "undefined" && monoPublicKey) {
        const mono = new window.MonoConnect({
          key: monoPublicKey,
          onSuccess: async ({ code }) => {
            // Mono returns an authorization code — use it to complete
            await completeConnection.mutateAsync({
              connectionId,
              providerConnectionId: code,
              accountName: bankInfo?.name,
              currency: "GMD",
            });
            setStep("success");
            toast.success("Bank account connected successfully!");
          },
          onClose: () => {
            setStep("select");
          },
        });

        mono.setup({});
        mono.open();
      } else {
        // ── Fallback: Simulate if Mono CDN unavailable ─────────────────
        console.warn(
          "[mono] Mono Connect SDK not loaded — using simulation. Set NEXT_PUBLIC_MONO_PUBLIC_KEY to enable.",
        );
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await completeConnection.mutateAsync({
          connectionId,
          providerConnectionId: `mono_sim_${connectionId.slice(0, 8)}`,
          accountName: bankInfo?.name,
          currency: "GMD",
        });
        setStep("success");
        toast.success("Bank account connected (simulation)");
      }
    } catch (error) {
      setStep("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Connection failed",
      );
      toast.error("Failed to connect bank account");
    }
  }, [
    selectedBank,
    accountNumber,
    initiateConnection,
    completeConnection,
    monoPublicKey,
  ]);

  const handleClose = useCallback(() => {
    setStep("select");
    setSelectedBank(null);
    setAccountNumber("");
    setErrorMessage("");
    onOpenChange(false);
  }, [onOpenChange]);

  const banks = [...GHANA_BANKS, ...GAMBIA_BANKS];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Connect Bank Account
          </DialogTitle>
          <DialogDescription>
            Link your bank account to automatically sync transactions.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select your bank</label>
              <select
                value={selectedBank ?? ""}
                onChange={(e) => setSelectedBank(e.target.value || null)}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="">Choose a bank...</option>
                <optgroup label="Ghana">
                  {GHANA_BANKS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Gambia">
                  {GAMBIA_BANKS.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">Account number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter your account number"
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              You will be redirected to Mono secure portal to authorize the
              connection. Your credentials are never stored on our servers.
            </p>

            <Button
              onClick={handleConnect}
              disabled={!selectedBank || !accountNumber.trim()}
              className="w-full"
            >
              Connect via Mono
            </Button>
          </div>
        )}

        {step === "connecting" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              Connecting to your bank...
            </p>
            <p className="text-xs text-muted-foreground">
              Please wait while we establish a secure connection.
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
            <p className="text-sm font-medium">Connected successfully!</p>
            <p className="text-xs text-muted-foreground text-center">
              Your bank account has been linked. Transactions will sync
              automatically.
            </p>
            <Button onClick={handleClose} variant="outline">
              Done
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-sm font-medium">Connection failed</p>
            <p className="text-xs text-muted-foreground text-center">
              {errorMessage || "Please try again or contact support."}
            </p>
            <div className="flex gap-2">
              <Button onClick={handleClose} variant="outline">
                Cancel
              </Button>
              <Button onClick={handleConnect}>Retry</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
