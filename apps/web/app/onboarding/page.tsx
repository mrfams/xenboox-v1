"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xenboox/ui";
import { Progress, Badge } from "@xenboox/ui";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileSpreadsheet,
  FileText,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useTrackActivation } from "@/lib/hooks/use-activation";

// ─── Types ─────────────────────────────────────────────────────────────────

interface BusinessInfo {
  name: string;
  industry: string;
  currency: string;
  taxId: string;
}

interface InvoiceInfo {
  customerName: string;
  description: string;
  amount: string;
}

// ─── Steps ─────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, title: "Business Setup", icon: Building2 },
  { id: 2, title: "Chart of Accounts", icon: FileSpreadsheet },
  { id: 3, title: "First Invoice", icon: FileText },
];

const INDUSTRIES = [
  { value: "trading", label: "Trading & Wholesale" },
  { value: "services", label: "Professional Services" },
  { value: "retail", label: "Retail & E-commerce" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "other", label: "Other" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "GMD", label: "GMD — Gambian Dalasi" },
  { value: "NGN", label: "NGN — Nigerian Naira" },
  { value: "KES", label: "KES — Kenyan Shilling" },
  { value: "GHS", label: "GHS — Ghanaian Cedi" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "ZAR", label: "ZAR — South African Rand" },
];

// ─── Industry Defaults ─────────────────────────────────────────────────────

const INDUSTRY_DEFAULTS: Record<string, { coa: string[]; invoiceItems: string[] }> = {
  trading: {
    coa: ["Cash", "Accounts Receivable", "Inventory", "Accounts Payable", "Sales Revenue", "Cost of Goods Sold", "Rent Expense", "Utilities"],
    invoiceItems: ["Wholesale goods", "Trading commission", "Delivery fee"],
  },
  services: {
    coa: ["Cash", "Accounts Receivable", "Accounts Payable", "Service Revenue", "Salary Expense", "Office Rent", "Software Subscriptions"],
    invoiceItems: ["Consulting services", "Project fee", "Hourly rate"],
  },
  retail: {
    coa: ["Cash", "Accounts Receivable", "Inventory", "Accounts Payable", "Sales Revenue", "Cost of Goods Sold", "Store Rent", "Marketing"],
    invoiceItems: ["Product sale", "Shipping fee", "Installation service"],
  },
  manufacturing: {
    coa: ["Cash", "Accounts Receivable", "Raw Materials", "Work in Progress", "Finished Goods", "Accounts Payable", "Sales Revenue", "Production Costs"],
    invoiceItems: ["Manufacturing fee", "Raw materials", "Assembly service"],
  },
  other: {
    coa: ["Cash", "Accounts Receivable", "Accounts Payable", "Revenue", "Expenses", "Rent", "Utilities", "Miscellaneous"],
    invoiceItems: ["Service fee", "Product sale", "Consulting"],
  },
};

// ─── Main Component ────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { trackEvent } = useTrackActivation();
  const [currentStep, setCurrentStep] = useState(1);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    name: "",
    industry: "",
    currency: "USD",
    taxId: "",
  });
  const [invoiceInfo, setInvoiceInfo] = useState<InvoiceInfo>({
    customerName: "",
    description: "",
    amount: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ─── Step Navigation ───────────────────────────────────────────────────

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      // Track all activation events
      await trackEvent("setup_business", {
        name: businessInfo.name,
        industry: businessInfo.industry,
        currency: businessInfo.currency,
      });
      await trackEvent("create_invoice", {
        customerName: invoiceInfo.customerName,
        amount: invoiceInfo.amount,
      });
      await trackEvent("see_narrative", { type: "first_invoice" });

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    await trackEvent("signup", { skipped: true });
    router.push("/dashboard");
  };

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold">Welcome to Xenboox</h1>
          <p className="text-muted-foreground">
            Let&apos;s get your business set up in 3 quick steps
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <Progress value={(currentStep / 3) * 100} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex items-center gap-1 text-xs ${
                  step.id <= currentStep
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {step.id < currentStep ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">
                    {step.id}
                  </span>
                )}
                <span className="hidden sm:inline">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {currentStep === 1 && (
              <BusinessSetupStep
                data={businessInfo}
                onChange={setBusinessInfo}
              />
            )}
            {currentStep === 2 && (
              <ChartOfAccountsStep industry={businessInfo.industry} />
            )}
            {currentStep === 3 && (
              <FirstInvoiceStep
                data={invoiceInfo}
                onChange={setInvoiceInfo}
                industry={businessInfo.industry}
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip for now
          </Button>
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={isSubmitting}>
                {isSubmitting ? "Setting up..." : "Complete Setup"}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Business Setup ────────────────────────────────────────────────

function BusinessSetupStep({
  data,
  onChange,
}: {
  data: BusinessInfo;
  onChange: (data: BusinessInfo) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Tell us about your business</h2>
        <p className="text-sm text-muted-foreground">
          This helps us set up your accounting structure
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="name">Business Name</Label>
          <Input
            id="name"
            placeholder="e.g., Acme Trading Co."
            value={data.name}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
          />
        </div>

        <div>
          <Label htmlFor="industry">Industry</Label>
          <Select
            value={data.industry}
            onValueChange={(value) => onChange({ ...data, industry: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((ind) => (
                <SelectItem key={ind.value} value={ind.value}>
                  {ind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={data.currency}
            onValueChange={(value) => onChange({ ...data, currency: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((cur) => (
                <SelectItem key={cur.value} value={cur.value}>
                  {cur.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="taxId">Tax ID (optional)</Label>
          <Input
            id="taxId"
            placeholder="e.g., VRN123456"
            value={data.taxId}
            onChange={(e) => onChange({ ...data, taxId: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: Chart of Accounts ─────────────────────────────────────────────

function ChartOfAccountsStep({ industry }: { industry: string }) {
  const defaults = INDUSTRY_DEFAULTS[industry] ?? INDUSTRY_DEFAULTS.other;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Your Chart of Accounts</h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ve generated an accounting structure for your industry
        </p>
      </div>

      <div className="rounded-lg border bg-muted/50 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">AI-Generated</span>
          <Badge variant="secondary" className="text-[10px]">
            {defaults.coa.length} accounts
          </Badge>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {defaults.coa.map((account) => (
            <div
              key={account}
              className="flex items-center gap-1.5 text-sm text-foreground/80"
            >
              <CheckCircle2 className="h-3 w-3 text-balanced-green" />
              {account}
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        You can customize this later in Settings → Chart of Accounts
      </p>
    </div>
  );
}

// ─── Step 3: First Invoice ─────────────────────────────────────────────────

function FirstInvoiceStep({
  data,
  onChange,
  industry,
}: {
  data: InvoiceInfo;
  onChange: (data: InvoiceInfo) => void;
  industry: string;
}) {
  const defaults = INDUSTRY_DEFAULTS[industry] ?? INDUSTRY_DEFAULTS.other;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Create your first invoice</h2>
        <p className="text-sm text-muted-foreground">
          Let&apos;s see your AI accountant in action
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="customerName">Customer Name</Label>
          <Input
            id="customerName"
            placeholder="e.g., Acme Corp"
            value={data.customerName}
            onChange={(e) =>
              onChange({ ...data, customerName: e.target.value })
            }
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Select
            value={data.description}
            onValueChange={(value) => onChange({ ...data, description: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a service/product" />
            </SelectTrigger>
            <SelectContent>
              {defaults.invoiceItems.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={data.amount}
            onChange={(e) => onChange({ ...data, amount: e.target.value })}
          />
        </div>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
        <p className="text-xs text-primary">
          ✨ Your AI accountant will automatically categorize this transaction
          and generate a financial narrative
        </p>
      </div>
    </div>
  );
}
