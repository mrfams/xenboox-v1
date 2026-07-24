"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui";
import { useEntity } from "@/lib/entity-context";
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
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type OnboardingStep = {
  id: string;
  label: string;
  status: "pending" | "completed" | "current" | "failed";
  description: string;
  recovery?: string;
};

const ALL_STEPS: OnboardingStep[] = [
  {
    id: "signup",
    label: "Create account",
    status: "completed",
    description: "Your account is ready",
  },
  {
    id: "routing",
    label: "How you manage books",
    status: "current",
    description: "Tell us about your current setup",
  },
  {
    id: "entity_setup",
    label: "Business details",
    status: "pending",
    description: "Set up your company profile",
  },
  {
    id: "data_connections",
    label: "Connect your data",
    status: "pending",
    description: "Link bank, upload files, or enter manually",
  },
  {
    id: "coa_review",
    label: "Chart of accounts",
    status: "pending",
    description: "Review your suggested accounts",
  },
  {
    id: "first_look",
    label: "Your first look",
    status: "pending",
    description: "Dashboard with categorized data",
  },
];

const ROUTING_OPTIONS = [
  {
    value: "excel" as const,
    label: "Excel spreadsheets",
    icon: FileText,
    description: "I use Excel to track my finances",
  },
  {
    value: "quickbooks" as const,
    label: "QuickBooks",
    icon: BookOpen,
    description: "I use QuickBooks for my accounting",
  },
  {
    value: "xero" as const,
    label: "Xero",
    icon: BookOpen,
    description: "I use Xero for my accounting",
  },
  {
    value: "nothing" as const,
    label: "Nothing yet",
    icon: Sparkles,
    description: "I'm starting fresh",
  },
  {
    value: "other" as const,
    label: "Something else",
    icon: Building2,
    description: "Another tool or method",
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

const BUSINESS_SEGMENTS = [
  { value: "trading", label: "Trading / Retail" },
  { value: "services", label: "Services" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "agriculture", label: "Agriculture" },
  { value: "nonprofit", label: "Non-profit" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { entityId, isLoaded } = useEntity();
  const [currentStep, setCurrentStep] = useState(0);

  // Wait for entity context to load before rendering
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }
  const [routingAnswer, setRoutingAnswer] = useState<string | null>(null);
  const [segment, setSegment] = useState("trading");
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);
  const [coaTemplateId, setCoaTemplateId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routingMutation = trpc.onboarding.updateRoutingAnswer.useMutation();
  const connectMutation = trpc.onboarding.connectData.useMutation();
  const coaSuggestions = trpc.onboarding.getCoaSuggestions.useQuery(
    { segment, country: "GM" },
    { enabled: currentStep >= 3 },
  );
  const confirmCoaMutation = trpc.onboarding.confirmCoa.useMutation();
  const completeFlowMutation = trpc.onboarding.completeFlow.useMutation();

  const handleRoutingSubmit = async (answer: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      await routingMutation.mutateAsync({ answer: answer as any });
      setRoutingAnswer(answer);
      setCurrentStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save answer");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSegmentSubmit = () => {
    setCurrentStep(2);
  };

  const handleConnection = async (type: string) => {
    setIsProcessing(true);
    setConnectionStatus(`Connecting ${type}...`);
    setError(null);
    try {
      await connectMutation.mutateAsync({ type: type as any });
      setConnectionStatus("Connected! Moving to next step...");
      setTimeout(() => {
        setCurrentStep(3);
        setConnectionStatus(null);
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
      setCurrentStep(5);
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

  const handleComplete = async () => {
    setIsProcessing(true);
    try {
      await completeFlowMutation.mutateAsync();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete setup");
    } finally {
      setIsProcessing(false);
    }
  };

  // Set CoA template ID when suggestions load
  useEffect(() => {
    if (coaSuggestions.data?.templateId) {
      setCoaTemplateId(coaSuggestions.data.templateId);
    }
  }, [coaSuggestions.data]);

  const steps = ALL_STEPS.map((step, i) => ({
    ...step,
    status:
      i < currentStep ? "completed" : i === currentStep ? "current" : "pending",
  }));

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold">Set up Xenboox</h1>
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {ALL_STEPS.length - 1}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{
                width: `${((currentStep + 1) / ALL_STEPS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Steps indicator */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                step.status === "completed" && "bg-primary/10 text-primary",
                step.status === "current" &&
                  "bg-primary text-primary-foreground",
                step.status === "pending" && "bg-muted text-muted-foreground",
              )}
            >
              {step.status === "completed" ? (
                <Check className="h-3 w-3" />
              ) : step.status === "current" ? (
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
            {/* Step 0: Routing Question */}
            {currentStep === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    How do you currently manage your books?
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This helps us recommend the best setup path for your
                    business.
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
                          routingAnswer === opt.value &&
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

            {/* Step 1: Entity Setup */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    Tell us about your business
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;ll use this to set up your chart of accounts.
                  </p>
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

            {/* Step 2: Data Connection Hub */}
            {currentStep === 2 && (
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
                  <Button variant="ghost" onClick={() => setCurrentStep(3)}>
                    Skip for now <ChevronRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: CoA Review */}
            {currentStep === 3 && (
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
                      {coaSuggestions.data.accounts.map((acct: any) => (
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
                    onClick={() => setCurrentStep(2)}
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

            {/* Step 4: First Look */}
            {currentStep === 4 && (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">
                    You&apos;re all set!
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                    Your Xenboox workspace is ready. Your CFO Agent is already
                    reviewing your setup and will help you get started.
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
      </div>
    </div>
  );
}
