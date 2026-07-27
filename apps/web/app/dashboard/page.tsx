"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { Skeleton } from "@/components/shared/loading";
import { QuickActions } from "@/components/dashboard/quick-actions";
import {
  GuidedTour,
  DEFAULT_TOUR_STEPS,
} from "@/components/dashboard/guided-tour";
import { RoleDashboard } from "@/components/dashboard/roles/role-dashboard";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { entityId } = useEntity();
  const router = useRouter();
  const [showTour, setShowTour] = useState(false);

  const {
    data: arInvoices,
    isLoading: arLoading,
    error: arError,
  } = trpc.ar.listInvoices.useQuery({});
  const {
    data: apInvoices,
    isLoading: apLoading,
    error: apError,
  } = trpc.ap.listInvoices.useQuery(undefined);
  const {
    data: poList,
    isLoading: poLoading,
    error: poError,
  } = trpc.ap.listPOs.useQuery(undefined);
  const {
    data: bankAccounts,
    isLoading: bankLoading,
    error: bankError,
  } = trpc.treasury.listBankAccounts.useQuery(undefined);
  const {
    data: cashAccounts,
    isLoading: cashLoading,
    error: cashError,
  } = trpc.cash.listCashAccounts.useQuery(undefined);

  useEffect(() => {
    if (arError) toast.error("Failed to load receivables");
  }, [arError]);
  useEffect(() => {
    if (apError) toast.error("Failed to load payables");
  }, [apError]);
  useEffect(() => {
    if (poError) toast.error("Failed to load purchase orders");
  }, [poError]);
  useEffect(() => {
    if (bankError) toast.error("Failed to load bank accounts");
  }, [bankError]);
  useEffect(() => {
    if (cashError) toast.error("Failed to load cash accounts");
  }, [cashError]);

  const isLoading =
    arLoading || apLoading || poLoading || bankLoading || cashLoading;

  const hasData = useMemo(() => {
    if (isLoading) return null;
    return (
      (arInvoices ?? []).length > 0 ||
      (apInvoices ?? []).length > 0 ||
      (bankAccounts ?? []).length > 0 ||
      (cashAccounts ?? []).length > 0 ||
      (poList ?? []).length > 0
    );
  }, [arInvoices, apInvoices, bankAccounts, cashAccounts, poList, isLoading]);

  if (hasData === null) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <>
        <div className="space-y-6">
          <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold">Welcome to Xenboox</h1>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  Your AI accounting team is ready. Tell your agent what to do —
                  connect your bank, upload documents, or ask anything about
                  your finances.
                </p>
                <form
                  onSubmit={(e) => {
                    const input = e.currentTarget.querySelector("input");
                    const value = input?.value?.trim();
                    if (value) {
                      router.push(
                        `/dashboard/chat?initial=${encodeURIComponent(value)}`,
                      );
                    }
                  }}
                  className="relative mt-3"
                  data-tour="chat-input"
                >
                  <input
                    type="text"
                    placeholder="Ask your AI anything — or start by describing your business..."
                    className="w-full rounded-xl border bg-background px-4 py-3 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-lg"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    "Set up my chart of accounts for a trading business",
                    "I want to connect my bank account",
                    "I have invoices to upload",
                    "What accounting software can you import from?",
                  ].map((prompt) => (
                    <Link
                      key={prompt}
                      href={`/dashboard/chat?initial=${encodeURIComponent(prompt)}`}
                    >
                      <button
                        type="button"
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-background/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div data-tour="quick-actions">
            <QuickActions
              onAction={(id: string) => {
                if (id === "connect-bank" || id === "email-forwarding")
                  router.push("/dashboard/integrations");
                else if (id === "document-uploaded")
                  router.push("/dashboard/documents");
              }}
            />
          </div>
        </div>

        {/* Guided tour — accessible everywhere */}
        <GuidedTour
          steps={DEFAULT_TOUR_STEPS}
          open={showTour}
          onClose={() => setShowTour(false)}
          onFinish={() => {
            localStorage.setItem("xenboox_tour_completed", "true");
          }}
        />

        <button
          type="button"
          onClick={() => setShowTour(true)}
          className="fixed bottom-6 right-24 z-40 flex h-10 items-center gap-2 rounded-full border bg-background px-4 text-xs font-medium text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground transition-all duration-200"
          title="Take a guided tour"
        >
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Show me around
        </button>
      </>
    );
  }

  // Role-based dashboard for users with data (Architecture Doc §5)
  return (
    <>
      <RoleDashboard />

      {/* Guided tour — accessible everywhere */}
      <GuidedTour
        steps={DEFAULT_TOUR_STEPS}
        open={showTour}
        onClose={() => setShowTour(false)}
        onFinish={() => {
          localStorage.setItem("xenboox_tour_completed", "true");
        }}
      />

      <button
        type="button"
        onClick={() => setShowTour(true)}
        className="fixed bottom-6 right-24 z-40 flex h-10 items-center gap-2 rounded-full border bg-background px-4 text-xs font-medium text-muted-foreground shadow-lg hover:bg-accent hover:text-foreground transition-all duration-200"
        title="Take a guided tour"
      >
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Show me around
      </button>
    </>
  );
}
