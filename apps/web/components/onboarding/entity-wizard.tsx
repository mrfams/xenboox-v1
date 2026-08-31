"use client";

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Label,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Building2,
  Globe,
  BookOpen,
  Landmark,
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  ArrowRight,
  Sparkles,
  Copy,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EntityWizardStep =
  "details" | "chart-of-accounts" | "bank-connection" | "complete";

const STEPS: EntityWizardStep[] = [
  "details",
  "chart-of-accounts",
  "bank-connection",
  "complete",
];

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  const pct = (currentStep / totalSteps) * 100;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}
        </span>
        <span className="text-xs font-medium text-muted-foreground">
          {Math.round(pct)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Step Dots ────────────────────────────────────────────────────────────────

function StepDots({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps + 1 }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-2 w-2 rounded-full transition-all duration-300",
            i === currentStep
              ? "bg-primary w-6"
              : i < currentStep
                ? "bg-primary/60"
                : "bg-muted",
          )}
        />
      ))}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EntityWizardProps {
  open: boolean;
  onClose: () => void;
  onEntityCreated?: (entityId: string) => void;
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function EntityWizard({
  open,
  onClose,
  onEntityCreated,
}: EntityWizardProps) {
  const [step, setStep] = useState<EntityWizardStep>("details");
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState<
    "company" | "subsidiary" | "branch" | "client"
  >("subsidiary");
  const [currency, setCurrency] = useState("USD");
  const [country, setCountry] = useState("GM");
  const [industry, setIndustry] = useState("general");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [createdEntityId, setCreatedEntityId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const stepIndex = STEPS.indexOf(step);
  const totalSteps = STEPS.length - 1; // exclude "complete"

  const createEntity = trpc.organization.createEntity.useMutation({
    onSuccess: (data) => {
      setCreatedEntityId(data.id);
      toast.success("Entity created!");
      setStep("chart-of-accounts");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const getCoaSuggestions = trpc.onboarding.getCoaSuggestions.useQuery(
    { segment: industry, country: "GM" },
    { enabled: false },
  );
  const confirmCoaMutation = trpc.onboarding.confirmCoa.useMutation({
    onSuccess: () => {
      toast.success("Chart of Accounts created!");
      setStep("bank-connection");
    },
    onError: () => {
      toast.info("You can set up your Chart of Accounts later");
      setStep("bank-connection");
    },
  });

  const createBankAccount = trpc.treasury.createBankAccount.useMutation({
    onSuccess: () => {
      toast.success("Bank account added!");
      setStep("complete");
    },
    onError: () => {
      toast.info("You can add bank accounts later from Treasury");
      setStep("complete");
    },
  });

  const nextStep = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  }, [step]);

  const prevStep = useCallback(() => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  }, [step]);

  const handleEntityCreate = () => {
    if (!entityName.trim()) {
      toast.error("Please enter an entity name");
      return;
    }
    createEntity.mutate({
      organizationId: "placeholder", // Will be replaced by actual org ID
      name: entityName,
      type: entityType,
      currency,
      country,
    });
  };

  const handleCoASetup = async () => {
    if (confirmCoaMutation.isPending) return;
    const result = await getCoaSuggestions.refetch();
    const templateId = result.data?.templateId;
    if (templateId) {
      confirmCoaMutation.mutate({ templateId });
    } else {
      toast.info("You can set up your Chart of Accounts later");
      setStep("bank-connection");
    }
  };

  const handleBankSetup = () => {
    if (bankName && accountName) {
      createBankAccount.mutate({
        name: accountName,
        bankName,
        accountNumber: accountName,
        openingBalance: "0",
        currency,
      });
    } else {
      setStep("complete");
    }
  };

  const handleComplete = () => {
    if (createdEntityId) {
      onEntityCreated?.(createdEntityId);
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create new entity"
    >
      <div className="w-full max-w-xl mx-4">
        <Card className="shadow-2xl max-h-[90vh] flex flex-col">
          <CardHeader className="pb-4">
            <ProgressBar currentStep={stepIndex} totalSteps={totalSteps} />
            <div className="flex items-center justify-between pt-2">
              <StepDots currentStep={stepIndex} totalSteps={totalSteps} />
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-xs text-muted-foreground"
              >
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0 overflow-y-auto flex-1 min-h-0">
            {/* Step 1: Entity Details */}
            {step === "details" && (
              <DetailsStep
                entityName={entityName}
                setEntityName={setEntityName}
                entityType={entityType}
                setEntityType={setEntityType}
                currency={currency}
                setCurrency={setCurrency}
                country={country}
                setCountry={setCountry}
                onNext={handleEntityCreate}
                onPrev={onClose}
                isPending={createEntity.isPending}
              />
            )}

            {/* Step 2: Chart of Accounts */}
            {step === "chart-of-accounts" && (
              <CoAStep
                industry={industry}
                setIndustry={setIndustry}
                onNext={handleCoASetup}
                onPrev={prevStep}
                isPending={confirmCoaMutation.isPending}
              />
            )}

            {/* Step 3: Bank Connection */}
            {step === "bank-connection" && (
              <BankStep
                bankName={bankName}
                setBankName={setBankName}
                accountName={accountName}
                setAccountName={setAccountName}
                onNext={handleBankSetup}
                onPrev={prevStep}
                isPending={createBankAccount.isPending}
              />
            )}

            {/* Step 4: Complete */}
            {step === "complete" && (
              <CompletionStep
                entityName={entityName}
                entityType={entityType}
                entityId={createdEntityId}
                copiedLink={copiedLink}
                setCopiedLink={setCopiedLink}
                onComplete={handleComplete}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Step 1: Details ──────────────────────────────────────────────────────────

function DetailsStep({
  entityName,
  setEntityName,
  entityType,
  setEntityType,
  currency,
  setCurrency,
  country,
  setCountry,
  onNext,
  onPrev,
  isPending,
}: {
  entityName: string;
  setEntityName: (v: string) => void;
  entityType: "company" | "subsidiary" | "branch" | "client";
  setEntityType: (v: "company" | "subsidiary" | "branch" | "client") => void;
  currency: string;
  setCurrency: (v: string) => void;
  country: string;
  setCountry: (v: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Create New Entity</h2>
        <p className="text-sm text-muted-foreground">
          Add a subsidiary, branch, or client to your organization
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entity-name">Entity Name</Label>
          <Input
            id="entity-name"
            placeholder="Acme Ghana Ltd"
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Entity Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                value: "subsidiary" as const,
                label: "Subsidiary",
                desc: "Separate legal entity",
              },
              {
                value: "branch" as const,
                label: "Branch",
                desc: "Same entity, different location",
              },
              {
                value: "client" as const,
                label: "Client",
                desc: "For accounting firms",
              },
              {
                value: "company" as const,
                label: "Company",
                desc: "Standalone company",
              },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setEntityType(t.value)}
                className={cn(
                  "rounded-lg border p-3 text-left transition-all",
                  entityType === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-border",
                )}
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="USD">USD ($)</option>
              <option value="GMD">GMD (D)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="KES">KES (KSh)</option>
              <option value="ZAR">ZAR (R)</option>
              <option value="GHS">GHS (₵)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="GM">Gambia</option>
              <option value="GH">Ghana</option>
              <option value="NG">Nigeria</option>
              <option value="KE">Kenya</option>
              <option value="ZA">South Africa</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={onNext} disabled={isPending || !entityName.trim()}>
          {isPending ? "Creating..." : "Create Entity"}
          {!isPending && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Chart of Accounts ────────────────────────────────────────────────

function CoAStep({
  industry,
  setIndustry,
  onNext,
  onPrev,
  isPending,
}: {
  industry: string;
  setIndustry: (v: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Chart of Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Set up the account structure for this entity
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Industry Template</Label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "general", label: "General Business" },
              { value: "saas", label: "SaaS / Tech" },
              { value: "manufacturing", label: "Manufacturing" },
              { value: "retail", label: "Retail" },
              { value: "services", label: "Professional Services" },
              { value: "nonprofit", label: "Nonprofit" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setIndustry(t.value)}
                className={cn(
                  "rounded-lg border p-3 text-sm font-medium transition-all text-left",
                  industry === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-border",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">AI-recommended template</p>
          </div>
          <p className="text-xs text-muted-foreground">
            We&apos;ll set up accounts based on your industry. You can customize
            them later.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isPending}>
          {isPending ? "Setting up..." : "Set Up & Continue"}
          {!isPending && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Bank Connection ──────────────────────────────────────────────────

function BankStep({
  bankName,
  setBankName,
  accountName,
  setAccountName,
  onNext,
  onPrev,
  isPending,
}: {
  bankName: string;
  setBankName: (v: string) => void;
  accountName: string;
  setAccountName: (v: string) => void;
  onNext: () => void;
  onPrev: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Landmark className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Bank Account</h2>
        <p className="text-sm text-muted-foreground">
          Add a bank account for this entity
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-sm font-medium">Live Bank Feeds</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Connect to 12,000+ institutions for automatic transaction syncing.
        </p>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-muted-foreground">
          Or add accounts manually:
        </p>

        <div className="space-y-2">
          <Label htmlFor="bank-name">Bank Name</Label>
          <Input
            id="bank-name"
            placeholder="Trust Bank, Ecobank, etc."
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="account-name">Account Name</Label>
          <Input
            id="account-name"
            placeholder="Operating Account, Payroll, etc."
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext} disabled={isPending}>
          {isPending
            ? "Adding..."
            : bankName
              ? "Add & Continue"
              : "Skip for Now"}
          {!isPending && <ChevronRight className="ml-1 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Complete ─────────────────────────────────────────────────────────

function CompletionStep({
  entityName,
  entityType,
  entityId,
  copiedLink,
  setCopiedLink,
  onComplete,
}: {
  entityName: string;
  entityType: string;
  entityId: string | null;
  copiedLink: boolean;
  setCopiedLink: (v: boolean) => void;
  onComplete: () => void;
}) {
  const handleCopyLink = () => {
    if (entityId) {
      navigator.clipboard.writeText(
        `${window.location.origin}/dashboard?entity=${entityId}`,
      );
      setCopiedLink(true);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <Check className="h-10 w-10 text-emerald-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Entity Created!</h1>
        <p className="text-muted-foreground max-w-md">
          <span className="font-medium">{entityName}</span> ({entityType}) is
          ready to use.
        </p>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          {copiedLink ? (
            <Check className="mr-1 h-3 w-3" />
          ) : (
            <Copy className="mr-1 h-3 w-3" />
          )}
          {copiedLink ? "Copied!" : "Copy Link"}
        </Button>
      </div>

      <Button onClick={onComplete} size="lg" className="px-8">
        Switch to {entityName}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}
