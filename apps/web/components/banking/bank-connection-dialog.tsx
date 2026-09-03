"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Landmark,
  Link2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Search,
  Sparkles,
  ArrowRight,
  Building2,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";

// ─── Popular Banks ─────────────────────────────────────────────────────────

const POPULAR_BANKS = [
  { id: "chase", name: "Chase", color: "#117ACA" },
  { id: "bankofamerica", name: "Bank of America", color: "#E31837" },
  { id: "wellsfargo", name: "Wells Fargo", color: "#CC0000" },
  { id: "citi", name: "Citibank", color: "#003B70" },
  { id: "usbank", name: "US Bank", color: "#0C2340" },
  { id: "pnc", name: "PNC Bank", color: "#FF6600" },
  { id: "td", name: "TD Bank", color: "#008A00" },
  { id: "capitalone", name: "Capital One", color: "#004977" },
  { id: "ally", name: "Ally Bank", color: "#6C3D91" },
  { id: "schwab", name: "Charles Schwab", color: "#00A5EC" },
  { id: "fidelity", name: "Fidelity", color: "#4B9001" },
  { id: "vanguard", name: "Vanguard", color: "#960018" },
];

// ─── Connection Steps ──────────────────────────────────────────────────────

type Step =
  | "select-bank"
  | "connecting"
  | "syncing"
  | "success"
  | "error"
  | "manual";

type ErrorType =
  | "network"
  | "bank_unavailable"
  | "auth_failed"
  | "sync_failed"
  | "unknown";

type ConnectionState = {
  step: Step;
  selectedBank: string | null;
  error: string | null;
  errorType: ErrorType;
  connectionId: string | null;
};

// Error recovery suggestions per error type
const ERROR_RECOVERY: Record<
  ErrorType,
  { title: string; suggestion: string; action?: string }
> = {
  network: {
    title: "Connection timed out",
    suggestion:
      "Check your internet connection and try again. If the problem persists, the bank's servers may be temporarily down.",
    action: "Retry",
  },
  bank_unavailable: {
    title: "Bank unavailable",
    suggestion:
      "This bank's connection service is temporarily unavailable. You can try again later or upload a CSV/PDF statement instead.",
    action: "Upload Statement",
  },
  auth_failed: {
    title: "Authentication failed",
    suggestion:
      "The bank rejected the connection. This can happen if your bank requires additional verification. Try connecting again or use manual entry.",
    action: "Try Again",
  },
  sync_failed: {
    title: "Sync partial",
    suggestion:
      "The bank account was connected but transaction sync failed. Your connection is saved — you can retry sync from the Connections tab.",
    action: "Continue",
  },
  unknown: {
    title: "Connection failed",
    suggestion:
      "An unexpected error occurred. You can try again, connect manually, or upload a statement instead.",
    action: "Try Again",
  },
};

function classifyError(message: string): ErrorType {
  const lower = message.toLowerCase();
  if (
    lower.includes("timeout") ||
    lower.includes("network") ||
    lower.includes("fetch")
  )
    return "network";
  if (
    lower.includes("unavailable") ||
    lower.includes("503") ||
    lower.includes("502")
  )
    return "bank_unavailable";
  if (
    lower.includes("auth") ||
    lower.includes("credential") ||
    lower.includes("401")
  )
    return "auth_failed";
  if (lower.includes("sync")) return "sync_failed";
  return "unknown";
}

// ─── Main Dialog ───────────────────────────────────────────────────────────

export function BankConnectionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { entityId } = useEntity();
  const [state, setState] = useState<ConnectionState>({
    step: "select-bank",
    selectedBank: null,
    error: null,
    errorType: "unknown",
    connectionId: null,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [manualBankName, setManualBankName] = useState("");
  const [manualAccountNumber, setManualAccountNumber] = useState("");

  const utils = trpc.useUtils();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setState({
        step: "select-bank",
        selectedBank: null,
        error: null,
        errorType: "unknown",
        connectionId: null,
      });
      setSearchQuery("");
      setManualBankName("");
      setManualAccountNumber("");
    }
  }, [open]);

  // Filter banks by search
  const filteredBanks = POPULAR_BANKS.filter((bank) =>
    bank.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ── Handle bank selection ──
  const handleSelectBank = useCallback(
    async (bankId: string, bankName: string) => {
      setState((s) => ({ ...s, step: "connecting", selectedBank: bankName }));

      try {
        // Step 1: Create link token
        const linkTokenRes = await fetch("/api/plaid/create-link-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId }),
        });

        if (!linkTokenRes.ok) {
          throw new Error("Failed to initialize bank connection");
        }

        const { linkToken, isDemoMode } = await linkTokenRes.json();

        if (isDemoMode) {
          // Demo mode — skip Plaid Link, go straight to exchange
          const exchangeRes = await fetch("/api/plaid/exchange-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              entityId,
              publicToken: `demo-${Date.now()}`,
              institutionName: bankName,
              institutionId: bankId,
            }),
          });

          if (!exchangeRes.ok) {
            throw new Error("Failed to connect bank account");
          }

          const { connectionId } = await exchangeRes.json();

          setState((s) => ({
            ...s,
            step: "syncing",
            connectionId,
          }));

          // Trigger transaction sync
          try {
            await fetch("/api/trpc/banking.syncTransactions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                input: { connectionId },
              }),
            });
          } catch {
            // Sync failed but connection succeeded — user can retry later
          }

          setState((s) => ({
            ...s,
            step: "success",
          }));

          // Invalidate queries
          utils.banking.listConnections.invalidate();
          utils.banking.getOverview.invalidate();
          utils.banking.listTransactions.invalidate();
          return;
        }

        // Real Plaid Link — dynamically load the Plaid Link SDK
        const { PlaidLink } = await import("react-plaid-link");

        // For real Plaid, we'd render the Plaid Link component
        // For now, simulate the flow
        const exchangeRes = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityId,
            publicToken: "real-token-placeholder", // Plaid Link would provide this
            institutionName: bankName,
            institutionId: bankId,
          }),
        });

        if (!exchangeRes.ok) {
          throw new Error("Failed to connect bank account");
        }

        const { connectionId } = await exchangeRes.json();

        // Trigger transaction sync
        setState((s) => ({ ...s, step: "syncing", connectionId }));
        try {
          await fetch("/api/trpc/banking.syncTransactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              input: { connectionId },
            }),
          });
        } catch {
          // Sync failed but connection succeeded
        }

        setState((s) => ({ ...s, step: "success" }));
        utils.banking.listConnections.invalidate();
        utils.banking.getOverview.invalidate();
        utils.banking.listTransactions.invalidate();
      } catch (error) {
        console.error("Bank connection error:", error);
        const errMsg =
          error instanceof Error ? error.message : "Connection failed";
        setState((s) => ({
          ...s,
          step: "error",
          error: errMsg,
          errorType: classifyError(errMsg),
        }));
      }
    },
    [entityId, utils],
  );

  // ── Handle manual connection ──
  const handleManualConnect = useCallback(async () => {
    if (!manualBankName.trim() || !manualAccountNumber.trim()) return;

    setState((s) => ({ ...s, step: "connecting" }));

    try {
      const res = await fetch("/api/plaid/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          institutionName: manualBankName.trim(),
          institutionId: manualBankName
            .trim()
            .toLowerCase()
            .replace(/\s+/g, ""),
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to connect bank account");
      }

      const { connectionId } = await res.json();
      setState((s) => ({ ...s, step: "success", connectionId }));
      utils.banking.listConnections.invalidate();
      utils.banking.getOverview.invalidate();
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : "Connection failed";
      setState((s) => ({
        ...s,
        step: "error",
        error: errMsg,
        errorType: classifyError(errMsg),
      }));
    }
  }, [entityId, manualBankName, manualAccountNumber, utils]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg rounded-2xl border border-border/50 bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/30 px-5 py-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Link2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Connect Bank Account
                </h2>
                <p className="text-[10px] text-muted-foreground">
                  AI will auto-categorize all transactions
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="px-5 py-4">
            {/* Step: Select Bank */}
            {state.step === "select-bank" && (
              <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search banks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-border/50 bg-background pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>

                {/* Popular Banks Grid */}
                <div className="grid grid-cols-3 gap-2">
                  {filteredBanks.map((bank) => (
                    <button
                      key={bank.id}
                      onClick={() => handleSelectBank(bank.id, bank.name)}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 bg-background p-3 transition-all hover:border-primary/30 hover:bg-primary/5 group"
                    >
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-white text-xs font-bold"
                        style={{ backgroundColor: bank.color }}
                      >
                        {bank.name.charAt(0)}
                      </div>
                      <span className="text-[10px] font-medium text-foreground group-hover:text-primary transition-colors text-center">
                        {bank.name}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search empty state */}
                {filteredBanks.length === 0 && searchQuery && (
                  <div className="py-4 text-center">
                    <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      No banks found for &quot;{searchQuery}&quot;
                    </p>
                  </div>
                )}

                {/* Manual Entry */}
                <div className="border-t border-border/30 pt-3">
                  <button
                    onClick={() => setState((s) => ({ ...s, step: "manual" }))}
                    className="w-full flex items-center justify-between rounded-lg border border-dashed border-border/50 bg-background px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-primary/5 group"
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div>
                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                          Don&apos;t see your bank?
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Connect manually with account details
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                </div>
              </div>
            )}

            {/* Step: Manual Entry */}
            {state.step === "manual" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={manualBankName}
                    onChange={(e) => setManualBankName(e.target.value)}
                    placeholder="e.g. GTBank, First National"
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-muted-foreground mb-1">
                    Account Number (last 4 digits)
                  </label>
                  <input
                    type="text"
                    value={manualAccountNumber}
                    onChange={(e) => setManualAccountNumber(e.target.value)}
                    placeholder="e.g. 1234"
                    maxLength={20}
                    className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                  />
                </div>
                <div className="rounded-lg bg-primary/[0.03] p-3 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] text-foreground/80">
                    You can import transactions via CSV later. The AI will
                    categorize them automatically.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setState((s) => ({ ...s, step: "select-bank" }))
                    }
                    className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleManualConnect}
                    disabled={
                      !manualBankName.trim() || !manualAccountNumber.trim()
                    }
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Connect Account
                  </button>
                </div>
              </div>
            )}

            {/* Step: Connecting */}
            {state.step === "connecting" && (
              <div className="py-8 text-center">
                <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Connecting to {state.selectedBank}...
                </p>
                <p className="text-xs text-muted-foreground">
                  Setting up secure connection
                </p>
              </div>
            )}

            {/* Step: Syncing transactions */}
            {state.step === "syncing" && (
              <div className="py-8 text-center">
                <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Syncing transactions...
                </p>
                <p className="text-xs text-muted-foreground">
                  Importing your recent transactions from {state.selectedBank}
                </p>
              </div>
            )}

            {/* Step: Success */}
            {state.step === "success" && (
              <div className="py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mx-auto mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Connected successfully!
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  {state.selectedBank} is now linked. AI will auto-categorize
                  incoming transactions.
                </p>
                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Done
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Step: Error */}
            {state.step === "error" && (
              <div className="py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mx-auto mb-3">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  {ERROR_RECOVERY[state.errorType].title}
                </p>
                <p className="text-xs text-muted-foreground mb-2 max-w-sm mx-auto">
                  {ERROR_RECOVERY[state.errorType].suggestion}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mb-4 font-mono">
                  {state.error}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {state.errorType === "sync_failed" ? (
                    <button
                      onClick={onClose}
                      className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                    >
                      Continue
                      <ArrowRight className="ml-1.5 h-3 w-3 inline" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            step: "select-bank",
                            error: null,
                            errorType: "unknown",
                          }))
                        }
                        className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {ERROR_RECOVERY[state.errorType].action ?? "Try Again"}
                      </button>
                      <button
                        onClick={() =>
                          setState((s) => ({
                            ...s,
                            step: "manual",
                            error: null,
                            errorType: "unknown",
                          }))
                        }
                        className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Manual Entry
                      </button>
                      <button
                        onClick={onClose}
                        className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        Close
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
