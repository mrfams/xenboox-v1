"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Check,
  Circle,
  Loader2,
  Sparkles,
  BookOpen,
  Landmark,
  Building2,
  FileText,
  MessageSquare,
  Upload,
  ChevronRight,
  AlertCircle,
  Wallet,
  Receipt,
  HandCoins,
  HelpCircle,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";
import { Card, CardContent } from "@/components/ui";
import { useEntity } from "@/lib/entity-context";
import { CountryPicker } from "@/components/shared/country-picker";
import { cn } from "@/lib/utils";

// §4.4 — the liveness panel (~1.5K lines of agent-progress UI) only appears
// below the wizard once a routing category is chosen. It ships as its own
// lazy chunk so the onboarding route payload excludes it on first paint.
// ssr:false is safe — the panel renders only client-side once mutations fire.
const OnboardingLiveness = dynamic(
  () =>
    import("@/components/onboarding/onboarding-liveness").then(
      (m) => m.OnboardingLiveness,
    ),
  { ssr: false },
);

type OnboardingSourceType =
  | "brand_new"
  | "professional_software"
  | "manual_records"
  | "statements_only"
  | "no_records";

type DetailDepth = "last_12_months" | "last_3_years" | "full_history";

// ─── Five record-keeping categories (spec §2/§3) ─────────────────────────
const ROUTING_OPTIONS: Array<{
  value: OnboardingSourceType;
  label: string;
  icon: typeof FileText;
  description: string;
}> = [
  {
    value: "brand_new",
    label: "We're a brand-new business",
    icon: Sparkles,
    description: "No financial history yet — we haven't started operating",
  },
  {
    value: "professional_software",
    label: "We use accounting software",
    icon: BookOpen,
    description: "QuickBooks, Xero, Sage, or similar",
  },
  {
    value: "manual_records",
    label: "We keep records in Excel or on paper",
    icon: FileText,
    description: "Spreadsheets, handwritten books, or manual records",
  },
  {
    value: "statements_only",
    label: "Bank / mobile money statements only",
    icon: Landmark,
    description: "No formal records, but we have statements",
  },
  {
    value: "no_records",
    label: "We don't have any records or statements",
    icon: HelpCircle,
    description: "Fully informal — we're starting to track now",
  },
];

const DETAIL_DEPTH_OPTIONS: Array<{
  value: DetailDepth;
  label: string;
  description: string;
}> = [
  {
    value: "last_12_months",
    label: "Last 12 months",
    description: "Included automatically — the fastest path",
  },
  {
    value: "last_3_years",
    label: "Last 3 years",
    description: "May take longer to process",
  },
  {
    value: "full_history",
    label: "Full history",
    description: "May take up to 24 hours or more, depending on volume",
  },
];

const CONNECTION_OPTIONS = [
  {
    value: "bank_api" as const,
    label: "Connect bank account",
    description: "Link via API for automatic sync",
    icon: Landmark,
  },
  {
    value: "bank_pdf" as const,
    label: "Upload bank statement",
    description: "Upload PDF statements",
    icon: Upload,
  },
  {
    value: "mobile_money" as const,
    label: "Connect mobile money",
    description: "MTN MoMo, Orange Money, etc.",
    icon: MessageSquare,
  },
  {
    value: "excel" as const,
    label: "Upload Excel/CSV",
    description: "Import from spreadsheets",
    icon: FileText,
  },
  {
    value: "manual_entry" as const,
    label: "Enter manually",
    description: "Start with manual transaction entry",
    icon: Building2,
  },
];

type ConnectionType = (typeof CONNECTION_OPTIONS)[number]["value"];

const BUSINESS_SEGMENTS = [
  { value: "trading", label: "Trading / Retail" },
  { value: "services", label: "Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "agriculture", label: "Agriculture" },
  { value: "nonprofit", label: "Non-profit" },
];

const FIRST_LOOK_COPY: Record<string, { title: string; body: string }> = {
  brand_new: {
    title: "You're all set!",
    body: "You're starting with a clean slate — no history to sort through. Your CFO Agent will track everything from here.",
  },
  no_records: {
    title: "We're starting from today",
    body: "Tracking begins now. If you chose to start without an opening balance, your CFO Agent will help you reconcile it later.",
  },
  default: {
    title: "You're all set!",
    body: "Your Xenboox workspace is ready. Your CFO Agent is reviewing your records and will help you get started.",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const { entityId, isLoaded } = useEntity();
  const [currentStep, setCurrentStep] = useState(0);
  const [routingPhase, setRoutingPhase] = useState<"category" | "followup">(
    "category",
  );
  const [sourceType, setSourceType] = useState<OnboardingSourceType | null>(
    null,
  );
  const [depth, setDepth] = useState<DetailDepth | null>(null);
  const [preIncorporation, setPreIncorporation] = useState<boolean | null>(
    null,
  );
  const [businessStartDate, setBusinessStartDate] = useState("");
  const [segment, setSegment] = useState("trading");
  const [country, setCountry] = useState("GM");
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [coaTemplateId, setCoaTemplateId] = useState<string | null>(null);
  const [openingBalance, setOpeningBalance] = useState({
    cash: "",
    owedToYou: "",
    youOwe: "",
  });
  const [escapeChosen, setEscapeChosen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routingMutation = trpc.onboarding.updateRoutingAnswer.useMutation();
  const businessStartMutation = trpc.onboarding.setBusinessStart.useMutation();
  const depthMutation = trpc.onboarding.setDetailDepth.useMutation();
  const connectMutation = trpc.onboarding.connectData.useMutation();
  const coaSuggestions = trpc.onboarding.getCoaSuggestions.useQuery(
    { segment, country },
    { enabled: currentStep >= 2 },
  );
  const confirmCoaMutation = trpc.onboarding.confirmCoa.useMutation();
  const openingBalanceMutation =
    trpc.onboarding.confirmOpeningBalance.useMutation();
  const completeFlowMutation = trpc.onboarding.completeFlow.useMutation();
  const installTaxPresetsMutation =
    trpc.onboarding.installTaxPresets.useMutation();

  // Dynamic step list: Category A is the gold-standard clean-slate path —
  // fewer steps, no data-connection step, no historical pull (spec §3.1).
  // Category E gains an opening-balance step after CoA (spec §3.5).
  const stepDefs = useMemo(() => {
    const base = [
      { id: "routing", label: "How you keep records" },
      { id: "entity_setup", label: "Business details" },
    ];
    if (sourceType === "brand_new") {
      return [
        ...base,
        { id: "coa_review", label: "Chart of accounts" },
        { id: "first_look", label: "Your first look" },
      ];
    }
    const mid = [
      { id: "data_connections", label: "Connect your data" },
      { id: "coa_review", label: "Chart of accounts" },
    ];
    if (sourceType === "no_records") {
      return [
        ...base,
        ...mid,
        { id: "opening_balance", label: "Opening balance" },
        { id: "first_look", label: "Your first look" },
      ];
    }
    return [...base, ...mid, { id: "first_look", label: "Your first look" }];
  }, [sourceType]);

  const stepId = stepDefs[currentStep]?.id;

  // Set CoA template ID when suggestions load
  useEffect(() => {
    if (coaSuggestions.data?.templateId) {
      setCoaTemplateId(coaSuggestions.data.templateId);
    }
  }, [coaSuggestions.data]);

  // Wait for entity context to load before rendering
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  const goNext = () => {
    setError(null);
    setCurrentStep((s) => Math.min(s + 1, stepDefs.length - 1));
  };

  const handleRoutingSubmit = async (answer: OnboardingSourceType) => {
    setIsProcessing(true);
    setError(null);
    try {
      await routingMutation.mutateAsync({ answer });
      setSourceType(answer);
      setRoutingPhase("followup");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save your answer",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowupContinue = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      if (sourceType === "brand_new") {
        await businessStartMutation.mutateAsync({
          businessStartDate: businessStartDate || undefined,
          preIncorporationActivity: preIncorporation ?? false,
        });
      } else if (sourceType && sourceType !== "no_records" && depth) {
        await depthMutation.mutateAsync({ depth });
      }
      setRoutingPhase("category");
      goNext();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save your answer",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSegmentSubmit = () => {
    goNext();
  };

  const handleConnection = async (type: ConnectionType) => {
    setIsProcessing(true);
    setConnectionStatus(`Connecting ${type}...`);
    setError(null);
    try {
      await connectMutation.mutateAsync({ type });
      setConnectionStatus("Connected! Moving to next step...");
      setTimeout(() => {
        setConnectionStatus(null);
        goNext();
      }, 1500);
    } catch (err) {
      setConnectionStatus(null);
      setError(
        err instanceof Error
          ? err.message
          : "Connection failed. Try a different method.",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCoaConfirm = async () => {
    if (!coaTemplateId) return;
    setIsProcessing(true);
    setError(null);
    try {
      await confirmCoaMutation.mutateAsync({ templateId: coaTemplateId });
      goNext();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to confirm chart of accounts",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpeningBalanceSubmit = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const rows = escapeChosen
        ? []
        : [
            { code: "1010", amount: Number(openingBalance.cash) || 0 },
            { code: "1100", amount: Number(openingBalance.owedToYou) || 0 },
            { code: "2010", amount: -(Number(openingBalance.youOwe) || 0) },
          ].filter((r) => r.amount !== 0);
      await openingBalanceMutation.mutateAsync({ rows, escape: escapeChosen });
      goNext();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save your opening balance",
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      await completeFlowMutation.mutateAsync();
      // Pre-install the workspace country's tax pack so Settings → Taxes shows
      // real rules on first login. Non-fatal: any pack can be installed from
      // Settings any time, so failures never block completing onboarding.
      try {
        await installTaxPresetsMutation.mutateAsync({ country });
      } catch (err) {
        // Non-blocking: the wizard still completes, but make the failure
        // observable — the pack can be installed from Settings → Taxes.
        console.warn(
          "Tax pack pre-install failed during onboarding:",
          err instanceof Error ? err.message : err,
        );
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup");
    } finally {
      setIsProcessing(false);
    }
  };

  const firstLook =
    FIRST_LOOK_COPY[sourceType ?? "default"] ?? FIRST_LOOK_COPY.default;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">Set up Xenboox</h1>
            <span className="text-sm text-muted-foreground">
              Step {Math.min(currentStep + 1, stepDefs.length)} of{" "}
              {stepDefs.length}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / stepDefs.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Steps indicator */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {stepDefs.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                i < currentStep && "bg-primary/10 text-primary",
                i === currentStep && "bg-primary text-primary-foreground",
                i > currentStep && "bg-muted text-muted-foreground",
              )}
            >
              {i < currentStep ? (
                <Check className="h-3 w-3" />
              ) : i === currentStep ? (
                <div className="h-3 w-3 rounded-full border-2 border-current" />
              ) : (
                <Circle className="h-3 w-3" />
              )}
              {step.label}
            </div>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="flex-1">
              <p className="font-medium text-destructive">
                Something went wrong
              </p>
              <p className="mt-1 text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="shrink-0 rounded-md p-1 hover:bg-destructive/10"
            >
              <span className="sr-only">Dismiss</span> ✕
            </button>
          </div>
        )}

        {/* Step Content */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-8">
            {/* Step: Routing — five categories (spec §2) */}
            {stepId === "routing" && routingPhase === "category" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    How have you been keeping your books so far?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This determines how we set up your history — we&apos;ll
                    never guess or invent anything.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ROUTING_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleRoutingSubmit(opt.value)}
                        disabled={isProcessing}
                        className={cn(
                          "flex items-start gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40",
                          sourceType === opt.value &&
                            "border-primary bg-primary/5",
                          isProcessing && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{opt.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {opt.description}
                          </p>
                        </div>
                        {isProcessing && (
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step: Routing follow-ups (spec §3.1.1 / §4.2) */}
            {stepId === "routing" && routingPhase === "followup" && (
              <div className="space-y-6">
                {sourceType === "brand_new" && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold">
                        Has any money moved for this business already, even
                        before you registered it?
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Buying initial stock, paying a deposit, or informal
                        sales before registration are real and material — we
                        won&apos;t ignore them.
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { value: false, label: "No — nothing yet" },
                        { value: true, label: "Yes, before registration" },
                      ].map((opt) => (
                        <button
                          key={String(opt.value)}
                          onClick={() => setPreIncorporation(opt.value)}
                          className={cn(
                            "rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40",
                            preIncorporation === opt.value &&
                              "border-primary bg-primary/5",
                          )}
                        >
                          <p className="font-medium">{opt.label}</p>
                        </button>
                      ))}
                    </div>
                    {preIncorporation === true && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        We&apos;ll reconstruct just the period before your start
                        date from any statements you have — then track
                        everything cleanly from that point forward.
                      </p>
                    )}
                    <div>
                      <label
                        htmlFor="start-date"
                        className="block text-sm font-medium mb-1"
                      >
                        When did the business start operating (or get
                        incorporated)?
                      </label>
                      <input
                        id="start-date"
                        type="date"
                        value={businessStartDate}
                        onChange={(e) => setBusinessStartDate(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Optional — defaults to today if you leave it blank.
                      </p>
                    </div>
                  </>
                )}

                {(sourceType === "professional_software" ||
                  sourceType === "manual_records" ||
                  sourceType === "statements_only") && (
                  <>
                    <div>
                      <h2 className="text-lg font-semibold">
                        How much transaction-level detail do you want us to
                        reconstruct?
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Your books are correct either way — an opening balance
                        covers everything before this window. This only changes
                        how much line-by-line detail we process.
                      </p>
                    </div>
                    <div className="space-y-3">
                      {DETAIL_DEPTH_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDepth(opt.value)}
                          className={cn(
                            "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40",
                            depth === opt.value &&
                              "border-primary bg-primary/5",
                          )}
                        >
                          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border">
                            {depth === opt.value && (
                              <span className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">{opt.label}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {opt.description}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                    {sourceType === "manual_records" && (
                      <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        Older paper or Excel records tend to be less complete —
                        we&apos;ll flag anything we&apos;re not fully sure about
                        for your review instead of guessing.
                      </p>
                    )}
                  </>
                )}

                {sourceType === "no_records" && (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-lg font-semibold">
                        We&apos;ll start from today
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Since there are no records or statements to reconstruct,
                        we&apos;ll start tracking from today. Next, you&apos;ll
                        confirm an opening balance — cash on hand, money owed to
                        you, and anything you owe. If you don&apos;t know those
                        figures yet, that&apos;s fine — you can start now and
                        reconcile later.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setRoutingPhase("category");
                      setSourceType(null);
                    }}
                    className="flex-1"
                  >
                    Go back
                  </Button>
                  <Button
                    onClick={handleFollowupContinue}
                    disabled={
                      isProcessing ||
                      (sourceType === "brand_new" && preIncorporation === null)
                    }
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Continue <ChevronRight className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Entity setup */}
            {stepId === "entity_setup" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Tell us about your business
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ll use this to set up your chart of accounts and tax
                    rules.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Where is your business based?
                  </label>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Your country determines the tax pack we pre-install (Gambia,
                    Senegal, US and 190+ more) — changeable anytime in Settings
                    → Taxes.
                  </p>
                  <CountryPicker value={country} onChange={setCountry} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {BUSINESS_SEGMENTS.map((seg) => (
                    <button
                      key={seg.value}
                      onClick={() => {
                        setSegment(seg.value);
                        handleSegmentSubmit();
                      }}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40",
                        segment === seg.value && "border-primary bg-primary/5",
                      )}
                    >
                      <p className="font-medium">{seg.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Data Connection Hub (hidden for brand_new) */}
            {stepId === "data_connections" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Connect your financial data
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Link accounts or upload files. You can do multiple, or skip
                    and enter data manually.
                  </p>
                </div>
                {connectionStatus && (
                  <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-4">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">
                      {connectionStatus}
                    </p>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {CONNECTION_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleConnection(opt.value)}
                        disabled={isProcessing}
                        className={cn(
                          "flex items-start gap-4 rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40",
                          isProcessing && "opacity-50 cursor-not-allowed",
                        )}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </span>
                        <div className="flex-1">
                          <p className="font-medium">{opt.label}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="text-center">
                  <Button variant="ghost" onClick={goNext}>
                    Skip for now <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: CoA Review */}
            {stepId === "coa_review" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Review your chart of accounts
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ve prepared a standard chart of accounts for your
                    business type.
                  </p>
                </div>
                {coaSuggestions.isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : coaSuggestions.data?.accounts ? (
                  <div className="space-y-3">
                    <div className="max-h-64 overflow-y-auto space-y-1 rounded-xl border p-3">
                      {coaSuggestions.data.accounts.map((acct) => (
                        <div
                          key={acct.code}
                          className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm"
                        >
                          <span className="font-mono text-xs text-muted-foreground">
                            {acct.code}
                          </span>
                          <span>{acct.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {acct.type}
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can customize this later by asking your CFO Agent.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      No template found for this segment. Standard accounts will
                      be created.
                    </p>
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    className="flex-1"
                  >
                    Go back
                  </Button>
                  <Button
                    onClick={handleCoaConfirm}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Confirming...
                      </>
                    ) : (
                      "Confirm accounts"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Opening Balance (Category E — spec §3.5/§4.1) */}
            {stepId === "opening_balance" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Confirm your opening balance
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    These are rough figures as of today — cash on hand, money
                    owed to you, and anything you owe. We&apos;ll use them as
                    the starting point and build accurate books from here.
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="ob-cash"
                      className="flex items-center gap-2 text-sm font-medium mb-1"
                    >
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                      Cash on hand (GMD)
                    </label>
                    <input
                      id="ob-cash"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="0.00"
                      value={openingBalance.cash}
                      onChange={(e) =>
                        setOpeningBalance((o) => ({
                          ...o,
                          cash: e.target.value,
                        }))
                      }
                      disabled={escapeChosen}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ob-ar"
                      className="flex items-center gap-2 text-sm font-medium mb-1"
                    >
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      Money owed to you (GMD)
                    </label>
                    <input
                      id="ob-ar"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="0.00"
                      value={openingBalance.owedToYou}
                      onChange={(e) =>
                        setOpeningBalance((o) => ({
                          ...o,
                          owedToYou: e.target.value,
                        }))
                      }
                      disabled={escapeChosen}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="ob-ap"
                      className="flex items-center gap-2 text-sm font-medium mb-1"
                    >
                      <HandCoins className="h-4 w-4 text-muted-foreground" />
                      Anything you owe (GMD)
                    </label>
                    <input
                      id="ob-ap"
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="0.00"
                      value={openingBalance.youOwe}
                      onChange={(e) =>
                        setOpeningBalance((o) => ({
                          ...o,
                          youOwe: e.target.value,
                        }))
                      }
                      disabled={escapeChosen}
                      className="w-full rounded-lg border bg-background px-3 py-2 text-sm tabular-nums"
                    />
                  </div>

                  <button
                    onClick={() => setEscapeChosen((v) => !v)}
                    className="flex items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/40 hover:bg-accent/40"
                  >
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border">
                      {escapeChosen && (
                        <Check className="h-3 w-3 text-primary" />
                      )}
                    </span>
                    <div>
                      <p className="font-medium">
                        I don&apos;t know these figures yet
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Start tracking from today — we&apos;ll reconcile the
                        opening balance with you later.
                      </p>
                    </div>
                  </button>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                    className="flex-1"
                  >
                    Go back
                  </Button>
                  <Button
                    onClick={handleOpeningBalanceSubmit}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : escapeChosen ? (
                      "Start from today"
                    ) : (
                      "Confirm opening balance"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: First Look */}
            {stepId === "first_look" && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{firstLook.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    {firstLook.body}
                  </p>
                </div>
                <div className="rounded-xl border bg-muted/30 p-4 text-left">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10">
                      <Check className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Onboarding complete</p>
                      <p className="text-xs text-muted-foreground">
                        Time to first value will be tracked automatically
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={handleComplete}
                  disabled={isProcessing}
                  size="lg"
                  className="w-full max-w-sm"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Go to dashboard"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Liveness — conditional per category (spec §7.4: A/E never
            show historical-processing progress) */}
        <div className="mt-8">
          <OnboardingLiveness sourceType={sourceType ?? undefined} />
        </div>
      </div>
    </div>
  );
}
