"use client";

// ─── Money Needing You ──────────────────────────────────────────────────────
//
// The decisions layer of Operations: expense claims to approve, overdue
// bills to plan for, overdue invoices to chase, bank lines to review.
// Every card acts inline with the same mutations the record tables use —
// Approve/Reject with note, Send reminder, Review in Banking. Nothing here
// navigates away; deep record work lives in the expandable sections below.

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  HandCoins,
  Loader2,
  Mail,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useFormatCurrency } from "@/lib/hooks/use-currency";
import type { AskFn } from "@/components/chat/ask-drawer";

function ageOf(d: string | null | undefined): string {
  if (!d) return "";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "1d overdue";
  if (days < 30) return `${days}d overdue`;
  const months = Math.floor(days / 30);
  return `${months}mo overdue`;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
      {children}
    </h3>
  );
}

export function MoneyNeedsYou({
  ask,
  onOpenSection,
}: {
  ask: AskFn;
  onOpenSection: (section: "bills" | "banking" | "invoices") => void;
}) {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const utils = trpc.useUtils();

  const { data: claimsData } = trpc.expenses.listClaims.useQuery(
    { status: "all", limit: 50 },
    { enabled: !!entityId, refetchInterval: 20_000 },
  );
  const { data: billsData } = trpc.bills.listBills.useQuery(
    { status: "all", limit: 50, offset: 0 },
    { enabled: !!entityId, refetchInterval: 20_000 },
  );
  const { data: invoicesData } = trpc.invoicing.listInvoices.useQuery(
    { status: undefined, limit: 100, offset: 0 },
    { enabled: !!entityId, refetchInterval: 20_000 },
  );
  const { data: unreconciledData } = trpc.banking.listTransactions.useQuery(
    { status: "unreconciled", limit: 3 },
    { enabled: !!entityId, refetchInterval: 20_000 },
  );

  const decide = trpc.expenses.decideClaim.useMutation({
    onSuccess: () => {
      toast.success("Claim decision recorded");
      setRejectingId(null);
      setRejectNote("");
      void utils.expenses.listClaims.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const reimburse = trpc.expenses.reimburseClaim.useMutation({
    onSuccess: () => {
      toast.success("Claim marked as reimbursed");
      void utils.expenses.listClaims.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });
  const sendReminder = trpc.invoicing.sendInvoiceEmail.useMutation({
    onSuccess: (data) => {
      toast.success(`Reminder sent to ${data.sentTo}`);
      void utils.invoicing.listInvoices.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const now = Date.now();
  const claims = (claimsData?.claims ?? [])
    .filter((c) => ["submitted", "flagged"].includes(c.status))
    .slice(0, 3);
  const overdueBills = (billsData?.bills ?? [])
    .filter(
      (b) =>
        b.status === "overdue" ||
        (b.balance > 0 &&
          b.dueDate &&
          new Date(b.dueDate).getTime() < now &&
          b.status !== "paid"),
    )
    .slice(0, 3);
  const overdueInvoices = (invoicesData?.invoices ?? [])
    .filter(
      (inv) =>
        inv.status === "overdue" ||
        ((inv.balance ?? 0) > 0 &&
          inv.dueDate &&
          new Date(inv.dueDate).getTime() < now &&
          inv.status !== "paid"),
    )
    .slice(0, 3);
  const unreconciled = unreconciledData?.transactions ?? [];

  const empty =
    claims.length === 0 &&
    overdueBills.length === 0 &&
    overdueInvoices.length === 0 &&
    unreconciled.length === 0;

  if (empty) {
    return (
      <section
        aria-label="Money needing you"
        className="rounded-xl border border-balanced-green/20 bg-balanced-green/[0.03] px-4 py-3"
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-balanced-green" />
          <p className="text-sm text-foreground">
            All clear — every dollar is where it should be.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Money needing you" className="space-y-4">
      <h2 className="flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <AlertTriangle className="h-3.5 w-3.5 text-attention-amber" aria-hidden="true" />
        Money needing you
      </h2>

      {/* ── Expense claims: decide inline ─────────────────────────── */}
      {claims.length > 0 && (
        <div>
          <SectionTitle>Expense claims · {claims.length}</SectionTitle>
          <div className="space-y-2">
            {claims.map((claim) => (
              <div
                key={claim.id}
                className="rounded-xl border border-border/50 bg-card px-4 py-3"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {claim.claimantName || "Claim"} ·{" "}
                    {format(Number(claim.totalAmount ?? 0))}
                  </p>
                  {claim.status === "flagged" && (
                    <span className="rounded-full bg-error-clay/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-error-clay">
                      Flagged
                    </span>
                  )}
                  <span className="text-[11px] text-muted-foreground">
                    {claim.description || claim.category || claim.claimNumber}
                  </span>
                </div>
                {rejectingId === claim.id ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <input
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="What should have happened instead…"
                      aria-label="Rejection reason"
                      className="h-8 min-w-0 flex-1 rounded-lg border border-border bg-background px-2.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({
                          claimId: claim.id,
                          decision: "rejected",
                          note: rejectNote || undefined,
                        })
                      }
                      className="rounded-lg bg-error-clay px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-error-clay/90 disabled:opacity-50"
                    >
                      Confirm reject
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectNote("");
                      }}
                      className="rounded-lg px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={decide.isPending}
                      onClick={() =>
                        decide.mutate({ claimId: claim.id, decision: "approved" })
                      }
                      className="inline-flex items-center gap-1 rounded-lg bg-balanced-green px-2.5 py-1.5 text-[11px] font-medium text-white hover:bg-balanced-green/90 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingId(claim.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overdue bills: plan, don't tab-hop ────────────────────── */}
      {overdueBills.length > 0 && (
        <div>
          <SectionTitle>Overdue bills · {overdueBills.length}</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            <ul className="divide-y divide-border/30">
              {overdueBills.map((bill) => (
                <li
                  key={bill.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {bill.supplierName ?? bill.invoiceNumber} ·{" "}
                      {format(bill.balance)}
                    </span>
                    <span className="text-[10px] text-error-clay">
                      {ageOf(bill.dueDate)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-border/30 bg-muted/20 px-4 py-2.5">
              <button
                type="button"
                onClick={() =>
                  ask(
                    "Draft a payment plan for my overdue bills: who gets paid first, how much, and when.",
                    {
                      kind: "Bills",
                      name: `${overdueBills.length} overdue bills`,
                      fields: overdueBills.map((b) => ({
                        label: b.supplierName ?? b.invoiceNumber,
                        value: `${format(b.balance)} · ${ageOf(b.dueDate)}`,
                      })),
                    },
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="h-3 w-3" />
                Draft a payment plan
              </button>
              <button
                type="button"
                onClick={() => onOpenSection("bills")}
                className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Review all bills
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overdue invoices: chase inline ────────────────────────── */}
      {overdueInvoices.length > 0 && (
        <div>
          <SectionTitle>Overdue invoices · {overdueInvoices.length}</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            <ul className="divide-y divide-border/30">
              {overdueInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-foreground">
                      {inv.customerName ?? inv.invoiceNumber} ·{" "}
                      {format(inv.balance ?? 0)}
                    </span>
                    <span className="text-[10px] text-error-clay">
                      {ageOf(inv.dueDate)}
                    </span>
                  </span>
                  <button
                    type="button"
                    disabled={sendReminder.isPending}
                    onClick={() => sendReminder.mutate({ invoiceId: inv.id })}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-accent disabled:opacity-50"
                  >
                    <Mail className="h-3 w-3" />
                    Send reminder
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 border-t border-border/30 bg-muted/20 px-4 py-2.5">
              <button
                type="button"
                onClick={() =>
                  ask(
                    "Chase what's owed: list every overdue invoice with amount and age, then draft a payment reminder for each customer.",
                    {
                      kind: "Invoices",
                      name: `${overdueInvoices.length} overdue invoices`,
                      fields: overdueInvoices.map((i) => ({
                        label: i.customerName ?? i.invoiceNumber ?? "Invoice",
                        value: `${format(i.balance ?? 0)} · ${ageOf(i.dueDate)}`,
                      })),
                    },
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="h-3 w-3" />
                Chase all with AI
              </button>
              <button
                type="button"
                onClick={() => onOpenSection("invoices")}
                className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
              >
                Review all invoices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Unreconciled bank lines ───────────────────────────────── */}
      {unreconciled.length > 0 && (
        <div>
          <SectionTitle>Bank lines to review</SectionTitle>
          <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
            <ul className="divide-y divide-border/30">
              {unreconciled.map((t) => (
                <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="block min-w-0 flex-1 truncate text-xs text-foreground">
                    {t.description ?? t.reference ?? "Transaction"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-mono text-xs tabular-nums",
                      t.amount > 0 ? "text-balanced-green" : "text-foreground",
                    )}
                  >
                    {format(Math.abs(t.amount))}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border/30 bg-muted/20 px-4 py-2.5">
              <button
                type="button"
                onClick={() => onOpenSection("banking")}
                className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
              >
                Review in Banking →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approved claims awaiting reimbursement */}
      <ApprovedClaims ask={ask} />
    </section>
  );
}

function ApprovedClaims({ ask }: { ask: AskFn }) {
  const { format } = useFormatCurrency();
  const { entityId } = useEntity();
  const utils = trpc.useUtils();

  const { data } = trpc.expenses.listClaims.useQuery(
    { status: "approved", limit: 5 },
    { enabled: !!entityId, refetchInterval: 30_000 },
  );
  const reimburse = trpc.expenses.reimburseClaim.useMutation({
    onSuccess: () => {
      toast.success("Claim marked as reimbursed");
      void utils.expenses.listClaims.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const approved = (data?.claims ?? []).filter((c) => c.status === "approved");
  if (approved.length === 0) return null;

  return (
    <div>
      <SectionTitle>Awaiting reimbursement · {approved.length}</SectionTitle>
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card">
        <ul className="divide-y divide-border/30">
          {approved.slice(0, 3).map((claim) => (
            <li key={claim.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-foreground">
                  {claim.claimantName || "Claim"} ·{" "}
                  {format(Number(claim.totalAmount ?? 0))}
                </span>
                <span className="text-[10px] text-balanced-green">
                  Approved — ready to pay
                </span>
              </span>
              <button
                type="button"
                disabled={reimburse.isPending}
                onClick={() =>
                  reimburse.mutate({
                    claimId: claim.id,
                    paymentMethod: "bank_transfer",
                  })
                }
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <HandCoins className="h-3 w-3" />
                Reimburse
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border/30 bg-muted/20 px-4 py-2.5">
          <button
            type="button"
            onClick={() =>
              ask("Which approved expenses still need reimbursing, and what's the total?")
            }
            className="rounded-lg px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10"
          >
            Ask about payouts →
          </button>
        </div>
      </div>
    </div>
  );
}
