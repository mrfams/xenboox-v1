"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  CreditCard,
  Building2,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Shield,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Button, Input, Label, Badge } from "@xenboox/ui";

// ─── Types ─────────────────────────────────────────────────────────────

type PaymentStatus =
  | "loading"
  | "ready"
  | "processing"
  | "success"
  | "error"
  | "expired"
  | "paid"
  | "not-found";

// ─── Payment Method Icons ──────────────────────────────────────────────

const PAYMENT_METHODS = [
  {
    id: "card",
    label: "Credit / Debit Card",
    icon: CreditCard,
    description: "Visa, Mastercard, AMEX",
  },
  {
    id: "bank_transfer",
    label: "Bank Transfer",
    icon: Building2,
    description: "Direct bank payment",
  },
  {
    id: "mobile_money",
    label: "Mobile Money",
    icon: Smartphone,
    description: "M-Pesa, MTN, Airtel",
  },
];

// ─── Main Page ────────────────────────────────────────────────────────

export default function PayPage() {
  const params = useParams();
  const token = params?.token as string;

  const [status, setStatus] = useState<PaymentStatus>("loading");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [copied, setCopied] = useState(false);

  const resolveToken = trpc.paymentLinks.resolveByToken.useQuery(
    { token: token ?? "" },
    { enabled: !!token },
  );

  const recordPayment = trpc.paymentLinks.recordPayment.useMutation({
    onSuccess: () => {
      setStatus("success");
    },
    onError: () => {
      setStatus("error");
    },
  });

  // Handle token resolution
  useEffect(() => {
    if (resolveToken.isLoading) return;

    if (!resolveToken.data) {
      setStatus("not-found");
      return;
    }

    const data = resolveToken.data;
    if (!data.found) {
      if (data.reason === "expired") setStatus("expired");
      else if (data.reason === "paid") setStatus("paid");
      else setStatus("not-found");
      return;
    }

    setPaymentAmount(data.amount ?? "");
    setStatus("ready");
  }, [resolveToken.data, resolveToken.isLoading]);

  const data = resolveToken.data?.found ? resolveToken.data : null;

  const handlePayment = useCallback(() => {
    if (!selectedMethod || !paymentAmount) return;

    setStatus("processing");
    recordPayment.mutate({
      token,
      amount: parseFloat(paymentAmount),
      method: selectedMethod,
    });
  }, [selectedMethod, paymentAmount, token, recordPayment]);

  const handleCopyAmount = async () => {
    try {
      await navigator.clipboard.writeText(paymentAmount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  // ── Loading State ───────────────────────────────────────────────────

  if (status === "loading") {
    return (
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm text-slate-500">Loading payment details...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Terminal States ─────────────────────────────────────────────────

  if (status === "not-found" || status === "expired" || status === "paid") {
    const config = {
      "not-found": {
        icon: AlertTriangle,
        color: "text-red-500",
        bg: "bg-red-50",
        title: "Payment Link Not Found",
        message: "This payment link is invalid or does not exist.",
      },
      expired: {
        icon: Clock,
        color: "text-amber-500",
        bg: "bg-amber-50",
        title: "Payment Link Expired",
        message:
          "This payment link has expired. Please request a new one from the business.",
      },
      paid: {
        icon: CheckCircle2,
        color: "text-green-500",
        bg: "bg-green-50",
        title: "Already Paid",
        message:
          "This invoice has already been paid. No further action is needed.",
      },
    }[status];

    const Icon = config.icon;

    return (
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-full",
                config.bg,
              )}
            >
              <Icon className={cn("h-7 w-7", config.color)} />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              {config.title}
            </h1>
            <p className="text-sm text-slate-500">{config.message}</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Success State ───────────────────────────────────────────────────

  if (status === "success") {
    return (
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-green-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-7 w-7 text-green-500" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Payment Received!
            </h1>
            <p className="text-sm text-slate-500">
              Thank you for your payment. A confirmation will be sent to your
              email.
            </p>

            <div className="mt-2 w-full rounded-lg bg-slate-50 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Amount Paid</span>
                <span className="font-semibold text-slate-900">
                  {data?.currency}{" "}
                  {parseFloat(paymentAmount).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              {data?.invoiceNumber && (
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Invoice</span>
                  <span className="font-medium text-slate-700">
                    {data.invoiceNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error State ─────────────────────────────────────────────────────

  if (status === "error") {
    return (
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-7 w-7 text-red-500" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900">
              Payment Failed
            </h1>
            <p className="text-sm text-slate-500">
              Something went wrong processing your payment. Please try again or
              contact the business directly.
            </p>
            <Button
              variant="outline"
              onClick={() => setStatus("ready")}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Processing State ────────────────────────────────────────────────

  if (status === "processing") {
    return (
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <h1 className="text-lg font-semibold text-slate-900">
              Processing Payment...
            </h1>
            <p className="text-sm text-slate-500">
              Please do not close this page. Your payment is being processed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Ready State (Main Payment Form) ─────────────────────────────────

  const allowedMethods = (data?.paymentMethods ?? "")
    .split(",")
    .filter(Boolean);
  const methods = PAYMENT_METHODS.filter((m) => allowedMethods.includes(m.id));
  const totalAmount = parseFloat(paymentAmount || "0");

  return (
    <div className="w-full max-w-lg space-y-4">
      {/* Invoice Summary Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Pay Invoice</h1>
          <Badge variant="outline" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            Due{" "}
            {data?.dueDate
              ? new Date(data.dueDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "N/A"}
          </Badge>
        </div>

        {data?.customerName && (
          <p className="mb-3 text-sm text-slate-500">
            Invoice for{" "}
            <span className="font-medium text-slate-700">
              {data.customerName}
            </span>
          </p>
        )}

        <div className="rounded-xl bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Amount Due</p>
              <p className="text-2xl font-bold text-slate-900">
                {data?.currency ?? "GMD"}{" "}
                {totalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
            {data?.invoiceNumber && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Invoice</p>
                <p className="text-sm font-medium text-slate-700">
                  {data.invoiceNumber}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">
          Select Payment Method
        </h2>

        <div className="space-y-2">
          {methods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;

            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border-2 p-4 text-left transition-all",
                  isSelected
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    isSelected
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {method.label}
                  </p>
                  <p className="text-xs text-slate-500">{method.description}</p>
                </div>
                {isSelected && (
                  <CheckCircle2 className="h-5 w-5 text-slate-900" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Card Details (shown when card is selected) */}
      {selectedMethod === "card" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-slate-900">
            Card Details
          </h2>

          <div className="space-y-3">
            <div>
              <Label htmlFor="card-name" className="text-xs text-slate-500">
                Name on Card
              </Label>
              <Input
                id="card-name"
                placeholder="John Smith"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="card-number" className="text-xs text-slate-500">
                Card Number
              </Label>
              <Input
                id="card-number"
                placeholder="4242 4242 4242 4242"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                className="mt-1 font-mono"
                maxLength={19}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card-expiry" className="text-xs text-slate-500">
                  Expiry
                </Label>
                <Input
                  id="card-expiry"
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="mt-1 font-mono"
                  maxLength={5}
                />
              </div>
              <div>
                <Label htmlFor="card-cvc" className="text-xs text-slate-500">
                  CVC
                </Label>
                <Input
                  id="card-cvc"
                  placeholder="123"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  className="mt-1 font-mono"
                  maxLength={4}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Transfer Instructions (shown when bank transfer is selected) */}
      {selectedMethod === "bank_transfer" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Bank Transfer Details
          </h2>
          <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Bank</span>
              <span className="font-medium text-slate-900">GTBank</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Name</span>
              <span className="font-medium text-slate-900">Xenboox Ltd</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Number</span>
              <span className="font-mono font-medium text-slate-900">
                0123456789
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">
                {data?.currency}{" "}
                {totalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {data?.invoiceNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono font-medium text-slate-900">
                  {data.invoiceNumber}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Please include your invoice number as the payment reference. Your
            payment will be confirmed within 1-2 business days.
          </p>
        </div>
      )}

      {/* Mobile Money Instructions */}
      {selectedMethod === "mobile_money" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">
            Mobile Money Payment
          </h2>
          <div className="space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Send to</span>
              <span className="font-mono font-medium text-slate-900">
                +220 XXX XXXX
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-semibold text-slate-900">
                {data?.currency}{" "}
                {totalAmount.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {data?.invoiceNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">Reference</span>
                <span className="font-mono font-medium text-slate-900">
                  {data.invoiceNumber}
                </span>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Dial your mobile money menu, send payment to the number above, and
            include the invoice reference. Your payment will be confirmed
            automatically.
          </p>
        </div>
      )}

      {/* Pay Button */}
      {selectedMethod && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <Button
            onClick={handlePayment}
            disabled={!selectedMethod || totalAmount <= 0}
            className="w-full"
            size="lg"
          >
            Pay {data?.currency}{" "}
            {totalAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <Shield className="h-3 w-3" />
            <span>Secured with 256-bit SSL encryption</span>
          </div>
        </div>
      )}

      {/* No payment methods */}
      {methods.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-center">
          <p className="text-sm text-slate-500">
            No payment methods available for this invoice. Please contact the
            business directly.
          </p>
        </div>
      )}
    </div>
  );
}
