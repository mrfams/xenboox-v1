"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  HandCoins,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
} from "lucide-react";

// ─── Donor Portal Landing Page ──────────────────────────────────────────────
//
// Public page where donors request a magic-link to access their portal.
// No sidebar, no auth — just a clean email input and submit.

function DonorPortalForm() {
  const searchParams = useSearchParams();
  const errorParam = searchParams?.get("error") ?? null;

  const [email, setEmail] = useState("");
  const [entityId, setEntityId] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !entityId) return;

    setStatus("loading");

    try {
      const res = await fetch("/api/donor-portal/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, entityId }),
      });

      const data = await res.json();

      if (res.ok) {
        setStatus("success");
        setMessage(
          data.message ||
            "We've sent a secure login link to your email. It expires in 24 hours.",
        );
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  const errorMessages: Record<string, string> = {
    missing_token: "No login token provided.",
    invalid_token: "This login link is invalid.",
    expired: "This login link has expired. Please request a new one.",
    already_used:
      "This login link has already been used. Please request a new one.",
    donor_not_found: "Donor account not found.",
    verification_failed: "Verification failed. Please try again.",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4">
            <HandCoins className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Donor Portal</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            View your funded projects, budget reports, and submission status.
          </p>
        </div>

        {/* Error from redirect */}
        {errorParam && errorMessages[errorParam] && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">
              {errorMessages[errorParam]}
            </p>
          </div>
        )}

        {/* Success message */}
        {status === "success" && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-500/10 p-4 dark:border-emerald-500/30">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                Check your email
              </p>
              <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400/80">
                {message}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="entity-id"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Organization Code
              </label>
              <input
                id="entity-id"
                type="text"
                placeholder="Enter your organization code"
                value={entityId}
                onChange={(e) => setEntityId(e.target.value)}
                required
                className="w-full rounded-lg border border-border/60 bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
              />
              <p className="mt-1 text-[11px] text-muted-foreground/60">
                You can find this in the email from your organization, or
                contact them for the code.
              </p>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <input
                  id="email"
                  type="email"
                  placeholder="donor@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border/60 bg-background pl-10 pr-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-colors"
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-sm text-destructive">{message}</p>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !email || !entityId}
              className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send login link
                </>
              )}
            </button>
          </form>
        </div>

        {/* Trust indicators */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/50">
          <Shield className="h-3 w-3" />
          <span>
            Read-only access · 24-hour link expiry · No password required
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DonorPortalPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center px-4">
          <div className="w-full max-w-md animate-pulse space-y-4">
            <div className="h-14 w-14 mx-auto rounded-2xl bg-muted" />
            <div className="h-8 w-48 mx-auto rounded bg-muted" />
            <div className="h-4 w-64 mx-auto rounded bg-muted" />
          </div>
        </div>
      }
    >
      <DonorPortalForm />
    </Suspense>
  );
}
