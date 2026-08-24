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
  Badge,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useEntity } from "@/lib/entity-context";
import { useOnboarding, type OnboardingStep } from "@/lib/hooks/use-onboarding";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Building2,
  BookOpen,
  Landmark,
  Users,
  Brain,
  Check,
  ChevronRight,
  ChevronLeft,
  Upload,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  Shield,
  Zap,
} from "lucide-react";
import { AhaMomentStep } from "@/components/onboarding/aha-moment";

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

// ─── Step Indicator Dots ──────────────────────────────────────────────────────

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

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg">
          <Sparkles className="h-10 w-10" />
        </div>
        <div className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold">
          AI
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Xenboox
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Your AI-native accounting platform. Let&apos;s get you set up in under
          3 minutes.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 w-full max-w-lg text-left">
        <FeatureCard
          icon={<Brain className="h-5 w-5" />}
          title="AI-Powered"
          description="Auto-categorize, reconcile, and forecast"
        />
        <FeatureCard
          icon={<Zap className="h-5 w-5" />}
          title="Real-Time"
          description="Live dashboards and instant insights"
        />
        <FeatureCard
          icon={<Shield className="h-5 w-5" />}
          title="Enterprise-Grade"
          description="SOC 2, multi-entity, audit trails"
        />
      </div>

      <Button onClick={onNext} size="lg" className="mt-4 px-8">
        Get Started
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-1">
      <div className="text-primary">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// ─── Step 2: Entity Creation ──────────────────────────────────────────────────

function EntityStep({
  onNext,
  onPrev,
}: {
  onNext: () => void;
  onPrev: () => void;
}) {
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("company");
  const [currency, setCurrency] = useState("USD");
  const [fiscalYearStart, setFiscalYearStart] = useState("01");

  const { setEntityId } = useEntity();
  const listOrgsQuery = trpc.organization.list.useQuery(undefined, {
    enabled: false,
  });
  const createOrgMutation = trpc.organization.create.useMutation();
  const createEntityMutation = trpc.organization.createEntity.useMutation();

  const handleSubmit = async () => {
    if (!entityName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }
    try {
      let orgs = listOrgsQuery.data;
      if (orgs === undefined) {
        orgs = (await listOrgsQuery.refetch()).data;
      }

      let orgId: string;
      if (Array.isArray(orgs) && orgs.length > 0) {
        orgId = orgs[0].id;
      } else {
        const org = await createOrgMutation.mutateAsync({
          name: entityName.trim(),
          slug: `org-${Date.now()}`,
          type: "business",
        });
        if (!org?.organization?.id) {
          throw new Error("Failed to create organization");
        }
        orgId = org.organization.id;
      }

      const entity = await createEntityMutation.mutateAsync({
        organizationId: orgId,
        name: entityName.trim(),
        type: "company",
        currency,
        country: "GM",
      });

      if (entity?.id) {
        setEntityId(entity.id, "admin");
      }
      toast.success("Organization created!");
      onNext();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create organization",
      );
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Building2 className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Create Your Organization</h2>
        <p className="text-sm text-muted-foreground">
          Set up the basics for your accounting entity
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entity-name">Organization Name</Label>
          <Input
            id="entity-name"
            placeholder="Acme Corporation"
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Entity Type</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "company", label: "Company" },
              { value: "nonprofit", label: "Nonprofit" },
              { value: "government", label: "Government" },
            ].map((t) => (
              <button
                key={t.value}
                onClick={() => setEntityType(t.value)}
                className={cn(
                  "rounded-lg border p-3 text-sm font-medium transition-all",
                  entityType === t.value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-muted hover:border-border",
                )}
              >
                {t.label}
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
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="GHS">GHS (₵)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="KES">KES (KSh)</option>
              <option value="ZAR">ZAR (R)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>Fiscal Year Start</Label>
            <select
              value={fiscalYearStart}
              onChange={(e) => setFiscalYearStart(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i + 1} value={String(i + 1).padStart(2, "0")}>
                  {new Date(2024, i).toLocaleString("en", { month: "long" })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createEntityMutation.isPending}
        >
          {createEntityMutation.isPending ? "Creating..." : "Create & Continue"}
          {!createEntityMutation.isPending && (
            <ChevronRight className="ml-1 h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 3: Chart of Accounts Setup ──────────────────────────────────────────

function CoAStep({
  onNext,
  onPrev,
}: {
  onNext: () => void;
  onPrev: () => void;
}) {
  const [industry, setIndustry] = useState("general");
  const [importMethod, setImportMethod] = useState<
    "template" | "upload" | "skip"
  >("template");

  const getCoaSuggestions = trpc.onboarding.getCoaSuggestions.useQuery(
    { segment: industry, country: "GM" },
    { enabled: false },
  );
  const confirmCoaMutation = trpc.onboarding.confirmCoa.useMutation({
    onSuccess: () => {
      toast.success("Chart of Accounts created!");
      onNext();
    },
    onError: () => {
      // If seed doesn't exist, just skip
      toast.info("Skipping — you can set up your Chart of Accounts later");
      onNext();
    },
  });

  const handleContinue = async () => {
    if (importMethod === "template") {
      const result = await getCoaSuggestions.refetch();
      const templateId = result.data?.templateId;
      if (templateId) {
        confirmCoaMutation.mutate({ templateId });
      } else {
        toast.info("Skipping — you can set up your Chart of Accounts later");
        onNext();
      }
    } else {
      onNext();
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <BookOpen className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Chart of Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Set up your account structure for recording transactions
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

        <div className="space-y-2">
          <Label>How would you like to set up?</Label>
          <div className="space-y-2">
            {[
              {
                value: "template" as const,
                label: "Use AI-recommended template",
                desc: "We'll set up accounts based on your industry",
                icon: <Sparkles className="h-4 w-4 text-primary" />,
              },
              {
                value: "upload" as const,
                label: "Import from spreadsheet",
                desc: "Upload CSV/Excel with your existing accounts",
                icon: <Upload className="h-4 w-4 text-muted-foreground" />,
              },
              {
                value: "skip" as const,
                label: "Set up later",
                desc: "Skip for now and configure manually",
                icon: <Clock className="h-4 w-4 text-muted-foreground" />,
              },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setImportMethod(opt.value)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-3 text-left transition-all w-full",
                  importMethod === opt.value
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-border",
                )}
              >
                <div className="mt-0.5">{opt.icon}</div>
                <div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleContinue}
          disabled={confirmCoaMutation.isPending}
        >
          {confirmCoaMutation.isPending ? "Setting up..." : "Continue"}
          {!confirmCoaMutation.isPending && (
            <ChevronRight className="ml-1 h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 4: Bank Connection ──────────────────────────────────────────────────

function BankStep({
  onNext,
  onPrev,
}: {
  onNext: () => void;
  onPrev: () => void;
}) {
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [openingBalance, setOpeningBalance] = useState("");

  const createBankAccount = trpc.treasury.createBankAccount.useMutation({
    onSuccess: () => {
      toast.success("Bank account added!");
      onNext();
    },
    onError: () => {
      // Skip if the mutation doesn't exist yet
      toast.info("You can add bank accounts later from Treasury");
      onNext();
    },
  });

  const handleContinue = () => {
    if (bankName && accountName) {
      createBankAccount.mutate({
        name: accountName,
        bankName,
        accountNumber: accountName,
        openingBalance: openingBalance || "0",
        currency: "USD",
      });
    } else {
      onNext();
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Landmark className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Connect Your Bank</h2>
        <p className="text-sm text-muted-foreground">
          Add your bank accounts for automated reconciliation
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <p className="text-sm font-medium">Live Bank Feeds</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Xenboox connects to 12,000+ financial institutions. Once your account
          is set up, transactions will sync automatically — no manual entry
          needed.
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
            placeholder="Chase, Wells Fargo, etc."
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

        <div className="space-y-2">
          <Label htmlFor="opening-balance">Opening Balance</Label>
          <Input
            id="opening-balance"
            type="number"
            step="0.01"
            placeholder="0.00"
            value={openingBalance}
            onChange={(e) => setOpeningBalance(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleContinue} disabled={createBankAccount.isPending}>
          {createBankAccount.isPending
            ? "Adding..."
            : bankName
              ? "Add & Continue"
              : "Skip for Now"}
          {!createBankAccount.isPending && (
            <ChevronRight className="ml-1 h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Step 5: Team Invitation ──────────────────────────────────────────────────

function TeamStep({
  onNext,
  onPrev,
}: {
  onNext: () => void;
  onPrev: () => void;
}) {
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [role, setRole] = useState("accountant");

  const addEmail = () => {
    if (newEmail && newEmail.includes("@") && !emails.includes(newEmail)) {
      setEmails([...emails, newEmail]);
      setNewEmail("");
    }
  };

  const removeEmail = (email: string) => {
    setEmails(emails.filter((e) => e !== email));
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mx-auto">
          <Users className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">Invite Your Team</h2>
        <p className="text-sm text-muted-foreground">
          Collaborate with your team members. You can always invite more later.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Default Role</Label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="accountant">Accountant — Full access</option>
            <option value="finance_director">
              Finance Director — View + approve
            </option>
            <option value="payroll_officer">
              Payroll Officer — Payroll only
            </option>
            <option value="department_manager">
              Department Manager — View only
            </option>
            <option value="external_auditor">
              External Auditor — Read-only
            </option>
          </select>
        </div>

        <div className="space-y-2">
          <Label>Add Team Members</Label>
          <div className="flex gap-2">
            <Input
              placeholder="colleague@company.com"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEmail();
                }
              }}
            />
            <Button variant="outline" onClick={addEmail} type="button">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {emails.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              {emails.length} team member{emails.length !== 1 ? "s" : ""} to
              invite
            </p>
            <div className="space-y-1">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between rounded-md border px-3 py-2"
                >
                  <span className="text-sm">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={onNext}>
          {emails.length > 0
            ? `Invite ${emails.length} & Continue`
            : "Skip for Now"}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 6: AI Preferences ───────────────────────────────────────────────────

function AIPreferencesStep({
  onComplete,
  onPrev,
}: {
  onComplete: () => void;
  onPrev: () => void;
}) {
  const [autoReconcile, setAutoReconcile] = useState(true);
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [aiAlerts, setAiAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  const handleComplete = () => {
    // Save preferences to localStorage (would be tRPC mutation in production)
    localStorage.setItem(
      "xenboox_ai_preferences",
      JSON.stringify({ autoReconcile, autoCategorize, aiAlerts, dailyDigest }),
    );
    onComplete();
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto py-4">
      <div className="text-center space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground mx-auto">
          <Brain className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold">AI Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Configure how AI assists you across the platform
        </p>
      </div>

      <div className="space-y-3">
        <ToggleOption
          title="Auto-Reconciliation"
          description="AI automatically matches bank transactions to journal entries"
          enabled={autoReconcile}
          onToggle={() => setAutoReconcile(!autoReconcile)}
        />
        <ToggleOption
          title="Smart Categorization"
          description="AI suggests expense categories based on transaction history"
          enabled={autoCategorize}
          onToggle={() => setAutoCategorize(!autoCategorize)}
        />
        <ToggleOption
          title="Anomaly Alerts"
          description="AI notifies you of unusual transactions or patterns"
          enabled={aiAlerts}
          onToggle={() => setAiAlerts(!aiAlerts)}
        />
        <ToggleOption
          title="Daily Financial Digest"
          description="Receive a morning summary of key financial metrics"
          enabled={dailyDigest}
          onToggle={() => setDailyDigest(!dailyDigest)}
        />
      </div>

      <div className="rounded-lg border bg-primary/5 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-sm font-medium">AI is always optional</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Every AI suggestion can be reviewed, edited, or dismissed. You
          maintain full control over all financial data and decisions.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <Button onClick={handleComplete} size="lg" className="px-8">
          <Check className="mr-2 h-4 w-4" />
          Complete Setup
        </Button>
      </div>
    </div>
  );
}

function ToggleOption({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg border p-4 transition-all cursor-pointer",
        enabled ? "border-primary/30 bg-primary/5" : "border-muted",
      )}
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div
        className={cn(
          "relative h-5 w-9 rounded-full transition-colors",
          enabled ? "bg-primary" : "bg-muted",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform",
            enabled ? "translate-x-4" : "translate-x-0.5",
          )}
        />
      </div>
    </div>
  );
}

// ─── Completion Screen ────────────────────────────────────────────────────────

function CompletionStep({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <Check className="h-10 w-10 text-emerald-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          You&apos;re All Set!
        </h1>
        <p className="text-lg text-muted-foreground max-w-md">
          Xenboox is configured and ready. Your AI accounting assistant is
          online.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 w-full max-w-md text-left">
        <QuickLink
          href="/dashboard/ledger"
          icon={<BookOpen className="h-4 w-4" />}
          title="Chart of Accounts"
          desc="Review your account structure"
        />
        <QuickLink
          href="/dashboard/operations"
          icon={<Landmark className="h-4 w-4" />}
          title="Bank Accounts"
          desc="Connect your bank feeds"
        />
        <QuickLink
          href="/dashboard/settings"
          icon={<Users className="h-4 w-4" />}
          title="Team Settings"
          desc="Manage your team"
        />
        <QuickLink
          href="/dashboard"
          icon={<Brain className="h-4 w-4" />}
          title="AI Assistant"
          desc="Ask anything about your books"
        />
      </div>

      <Button onClick={onGoToDashboard} size="lg" className="mt-4 px-8">
        Go to Dashboard
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <a
      href={href}
      className="flex items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
    >
      <div className="text-primary mt-0.5">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </a>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const {
    isFirstTime,
    currentStep,
    stepIndex,
    totalSteps,
    nextStep,
    prevStep,
    completeOnboarding,
  } = useOnboarding();
  const [showWizard, setShowWizard] = useState(false);

  // Auto-show wizard after entity context loads
  if (!showWizard && isFirstTime) {
    // We use a trick: set state during render to trigger re-render
    // This is fine because it only fires once
    setShowWizard(true);
  }

  if (!showWizard || !isFirstTime) return null;

  const handleComplete = () => {
    // Analytics: track onboarding completion
    try {
      const { track } = require("@/lib/analytics/events");
      track("onboarding_completed", {
        entityId: localStorage.getItem("currentEntityId") ?? "",
        duration_seconds: 0,
      });
      track("onboarding_skipped", {
        entityId: localStorage.getItem("currentEntityId") ?? "",
        lastStep: stepIndex,
      });
    } catch {
      // Non-blocking
    }
    completeOnboarding();
    setShowWizard(false);
  };

  const handleGoToDashboard = () => {
    // Analytics: track onboarding completion
    try {
      const { track } = require("@/lib/analytics/events");
      track("onboarding_completed", {
        entityId: localStorage.getItem("currentEntityId") ?? "",
        duration_seconds: 0,
      });
    } catch {
      // Non-blocking
    }
    completeOnboarding();
    setShowWizard(false);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding wizard"
    >
      <div className="w-full max-w-xl mx-4">
        <Card className="shadow-2xl max-h-[90vh] flex flex-col">
          <CardHeader className="pb-4">
            <ProgressBar currentStep={stepIndex} totalSteps={totalSteps} />
            <div className="flex items-center justify-between pt-2">
              <StepDots currentStep={stepIndex} totalSteps={totalSteps} />
              {currentStep !== "complete" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleComplete}
                  className="text-xs text-muted-foreground"
                >
                  Skip all
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 overflow-y-auto flex-1 min-h-0">
            {currentStep === "welcome" && <WelcomeStep onNext={nextStep} />}
            {currentStep === "chart-of-accounts" && (
              <CoAStep onNext={nextStep} onPrev={prevStep} />
            )}
            {currentStep === "bank-connection" && (
              <BankStep onNext={nextStep} onPrev={prevStep} />
            )}
            {currentStep === "aha-moment" && (
              <AhaMomentStep onNext={nextStep} onPrev={prevStep} />
            )}
            {currentStep === "team" && (
              <TeamStep onNext={nextStep} onPrev={prevStep} />
            )}
            {currentStep === "ai-preferences" && (
              <AIPreferencesStep
                onComplete={handleComplete}
                onPrev={prevStep}
              />
            )}
            {currentStep === "complete" && (
              <CompletionStep onGoToDashboard={handleGoToDashboard} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
