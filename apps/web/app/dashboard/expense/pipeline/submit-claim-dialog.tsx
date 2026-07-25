"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Button,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
  Badge,
} from "@/components/ui";
import {
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Receipt,
  Shield,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SubmitClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

interface LineItemForm {
  id: string;
  category: string;
  description: string;
  amount: string;
  taxAmount: string;
  receiptDocumentRef: string;
}

type SubmitStatus = "idle" | "running" | "completed" | "failed";

const CATEGORY_OPTIONS = [
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "transportation", label: "Transportation" },
  { value: "accommodation", label: "Accommodation" },
  { value: "training", label: "Training & Development" },
  { value: "software", label: "Software & Subscriptions" },
  { value: "other", label: "Other" },
];

const SOURCE_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "mobile", label: "Mobile" },
  { value: "agent", label: "AI Agent" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function SubmitClaimDialog({
  open,
  onOpenChange,
  onComplete,
}: SubmitClaimDialogProps) {
  const utils = trpc.useUtils();
  const [claimNumber, setClaimNumber] = useState(
    () => `EXP-${Date.now().toString(36).toUpperCase()}`,
  );
  const [category, setCategory] = useState("travel");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState<"web" | "mobile" | "agent">("web");
  const [lineItems, setLineItems] = useState<LineItemForm[]>([
    {
      id: crypto.randomUUID(),
      category: "travel",
      description: "",
      amount: "",
      taxAmount: "",
      receiptDocumentRef: "",
    },
  ]);
  const [submitStatus, setSubmitStatus] = useState<SubmitStatus>("idle");
  const [result, setResult] = useState<{
    claimId: string;
    claimNumber: string;
    status: string;
    flagged: boolean;
    policyFlags: number;
    flagReasons: string[];
  } | null>(null);

  const totalAmount = lineItems.reduce(
    (s, li) => s + (Number(li.amount) || 0),
    0,
  );

  const submitMutation = trpc.expense.runPipeline.useMutation({
    onSuccess: (data) => {
      setSubmitStatus("completed");
      setResult({
        claimId: data.claimId,
        claimNumber: data.claimNumber,
        status: data.status,
        flagged: data.flagged,
        policyFlags: data.policyFlags,
        flagReasons: data.flagReasons as string[],
      });
      utils.expense.getStatus.invalidate();
      utils.expense.listClaims.invalidate();
      utils.expense.listReimbursements.invalidate();
      if (data.success) onComplete();
    },
    onError: () => {
      setSubmitStatus("failed");
    },
  });

  const addLineItem = useCallback(() => {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        category,
        description: "",
        amount: "",
        taxAmount: "",
        receiptDocumentRef: "",
      },
    ]);
  }, [category]);

  const removeLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((li) => li.id !== id));
  }, []);

  const updateLineItem = useCallback(
    (id: string, field: keyof LineItemForm, value: string) => {
      setLineItems((prev) =>
        prev.map((li) => (li.id === id ? { ...li, [field]: value } : li)),
      );
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!description) return;
    setSubmitStatus("running");
    submitMutation.mutate({
      claimNumber,
      claimantId: "user-current",
      claimantName: "Current User",
      category,
      description,
      totalAmount,
      source,
      lineItems: lineItems.map((li) => ({
        category: li.category,
        description: li.description || li.category,
        amount: Number(li.amount) || 0,
        taxAmount: Number(li.taxAmount) || undefined,
        receiptDocumentRef: li.receiptDocumentRef || undefined,
      })),
    });
  }, [
    claimNumber,
    category,
    description,
    totalAmount,
    source,
    lineItems,
    submitMutation,
  ]);

  const resetForm = useCallback(() => {
    setClaimNumber(`EXP-${Date.now().toString(36).toUpperCase()}`);
    setCategory("travel");
    setDescription("");
    setSource("web");
    setLineItems([
      {
        id: crypto.randomUUID(),
        category: "travel",
        description: "",
        amount: "",
        taxAmount: "",
        receiptDocumentRef: "",
      },
    ]);
    setSubmitStatus("idle");
    setResult(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    setTimeout(resetForm, 300);
  }, [onOpenChange, resetForm]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogOverlay />
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Submit Expense Claim
            </DialogTitle>
            <DialogDescription>
              Quick claim submission — mobile-first design, under 3 taps per
              PRD.
            </DialogDescription>
          </DialogHeader>

          {submitStatus === "idle" ? (
            <>
              {/* ── Claim Header ──────────────────────────────────────── */}
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="claimNumber">Claim Number</Label>
                    <Input
                      id="claimNumber"
                      value={claimNumber}
                      onChange={(e) => setClaimNumber(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      {CATEGORY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of this claim..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Source</Label>
                  <div className="flex gap-2">
                    {SOURCE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setSource(opt.value as "web" | "mobile" | "agent")
                        }
                        className={cn(
                          "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                          source === opt.value
                            ? "bg-primary/10 text-primary border-primary/30"
                            : "bg-card text-muted-foreground border-border hover:border-primary/30",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Line Items ─────────────────────────────────────────── */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold">
                    Line Items
                    <span className="text-xs text-muted-foreground ml-2 font-normal">
                      ({lineItems.length})
                    </span>
                  </h4>
                  {totalAmount > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Total: {totalAmount.toLocaleString()}
                    </Badge>
                  )}
                </div>

                <div className="space-y-3">
                  {lineItems.map((li, idx) => (
                    <div
                      key={li.id}
                      className="rounded-lg border p-3 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                          Item {idx + 1}
                        </span>
                        {lineItems.length > 1 && (
                          <button
                            onClick={() => removeLineItem(li.id)}
                            className="text-muted-foreground hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Category</Label>
                          <select
                            value={li.category}
                            onChange={(e) =>
                              updateLineItem(li.id, "category", e.target.value)
                            }
                            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Amount</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={li.amount}
                            onChange={(e) =>
                              updateLineItem(li.id, "amount", e.target.value)
                            }
                            className="h-8 text-xs font-mono"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Tax</Label>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={li.taxAmount}
                            onChange={(e) =>
                              updateLineItem(li.id, "taxAmount", e.target.value)
                            }
                            className="h-8 text-xs font-mono"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[10px]">Description</Label>
                          <Input
                            value={li.description}
                            onChange={(e) =>
                              updateLineItem(
                                li.id,
                                "description",
                                e.target.value,
                              )
                            }
                            className="h-8 text-xs"
                            placeholder="Item description"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px]">Receipt Ref</Label>
                          <Input
                            value={li.receiptDocumentRef}
                            onChange={(e) =>
                              updateLineItem(
                                li.id,
                                "receiptDocumentRef",
                                e.target.value,
                              )
                            }
                            className="h-8 text-xs font-mono"
                            placeholder="doc-xxx"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLineItem}
                  className="mt-2 w-full gap-1.5"
                >
                  <PlusCircle className="h-3.5 w-3.5" />
                  Add Line Item
                </Button>
              </div>

              {/* ── Guardrail Reminder ───────────────────────────────── */}
              <div className="border-t pt-3">
                <div className="flex items-start gap-2 rounded-lg border border-amber-100 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10 p-2.5">
                  <Shield className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground">
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      Policy check active:
                    </span>{" "}
                    Claims exceeding category limits will be flagged for manager
                    review — never auto-rejected or auto-approved.
                  </p>
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="gap-2"
                  disabled={
                    !description ||
                    lineItems.length === 0 ||
                    lineItems.every(
                      (li) => !li.amount || Number(li.amount) === 0,
                    )
                  }
                >
                  <Receipt className="h-4 w-4" />
                  Submit Claim
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              {/* ── Submit Status ──────────────────────────────────────── */}
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                {submitStatus === "running" && (
                  <>
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="text-center">
                      <p className="text-lg font-semibold">Submitting Claim</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Processing claim #{claimNumber} through the expense
                        pipeline...
                      </p>
                    </div>
                    <Badge variant="outline" className="animate-pulse">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Policy Check, Approval Routing, Budget Impact
                    </Badge>
                  </>
                )}

                {submitStatus === "completed" && result && (
                  <>
                    <div
                      className={cn(
                        "rounded-full p-3",
                        result.flagged
                          ? "bg-amber-100 dark:bg-amber-900/30"
                          : result.status === "approved" ||
                              result.status === "submitted"
                            ? "bg-emerald-100 dark:bg-emerald-900/30"
                            : "bg-red-100 dark:bg-red-900/30",
                      )}
                    >
                      {result.flagged ? (
                        <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                      )}
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">
                        {result.flagged
                          ? "Claim Flagged for Review"
                          : "Claim Submitted Successfully"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.claimNumber} — Status: {result.status}
                      </p>
                    </div>

                    {result.policyFlags > 0 && (
                      <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 p-4 max-w-sm w-full">
                        <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {result.policyFlags} Policy Flag(s)
                        </p>
                        <ul className="space-y-1">
                          {result.flagReasons.map((reason, i) => (
                            <li
                              key={i}
                              className="text-[10px] text-muted-foreground flex items-start gap-1"
                            >
                              <span>•</span> {reason}
                            </li>
                          ))}
                        </ul>
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-2">
                          A manager decision is required — you will be notified
                          when reviewed.
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">
                          Status
                        </p>
                        <Badge
                          className={cn(
                            "mt-1 text-[10px]",
                            result.flagged && "bg-amber-100 text-amber-700",
                          )}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-[10px] text-muted-foreground">
                          Flags
                        </p>
                        <p className="text-lg font-bold">
                          {result.policyFlags}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {submitStatus === "failed" && (
                  <>
                    <div className="rounded-full bg-red-100 dark:bg-red-900/30 p-3">
                      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">Submission Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        The expense pipeline encountered an error. Please try
                        again.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant={submitStatus === "completed" ? "default" : "outline"}
                  onClick={handleClose}
                >
                  {submitStatus === "completed" ? "Done" : "Close"}
                </Button>
                {submitStatus === "failed" && (
                  <Button variant="outline" onClick={resetForm}>
                    Try Again
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
