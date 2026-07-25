"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Globe,
  Plus,
  RefreshCw,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
  FileText,
  DollarSign,
  Shield,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
} from "@/components/ui";

// ─── Status Badge ──────────────────────────────────────────────────────────

function ExpansionStatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; className: string }> = {
    research: {
      label: "Research",
      className: "bg-blue-500/10 text-blue-600 border-blue-200",
    },
    drafted: {
      label: "Drafted",
      className: "bg-amber-500/10 text-amber-600 border-amber-200",
    },
    reviewed: {
      label: "Reviewed",
      className: "bg-purple-500/10 text-purple-600 border-purple-200",
    },
    sandboxed: {
      label: "Sandboxed",
      className: "bg-indigo-500/10 text-indigo-600 border-indigo-200",
    },
    live: {
      label: "Live",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
    },
    failed: {
      label: "Failed",
      className: "bg-red-500/10 text-red-600 border-red-200",
    },
  };

  const v = variants[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <Badge variant="outline" className={cn("font-medium", v.className)}>
      {v.label}
    </Badge>
  );
}

// ─── Expand Dialog ─────────────────────────────────────────────────────────

function NewExpansionDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [country, setCountry] = useState<"NG" | "GH">("NG");
  const [countryName, setCountryName] = useState("Nigeria");
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");

  const runExpansion = trpc.jurisdiction.runExpansion.useMutation({
    onSuccess: () => {
      onOpenChange(false);
      onSuccess();
      setSourceTitle("");
      setSourceUrl("");
      setNotes("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!countryName.trim()) return;
    runExpansion.mutate({
      country,
      countryName: countryName.trim(),
      sources:
        sourceTitle && sourceUrl
          ? [
              {
                title: sourceTitle,
                url: sourceUrl,
                publicationDate: new Date().toISOString().slice(0, 10),
              },
            ]
          : [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Jurisdiction Expansion</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Country Code</Label>
              <select
                value={country}
                onChange={(e) => {
                  const val = e.target.value as "NG" | "GH";
                  setCountry(val);
                  setCountryName(val === "NG" ? "Nigeria" : "Ghana");
                }}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              >
                <option value="NG">NG — Nigeria</option>
                <option value="GH">GH — Ghana</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Country Name</Label>
              <Input
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                placeholder="Nigeria"
                required
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Verified Source (Optional)
            </p>
            <div className="space-y-2">
              <Label>Source Title</Label>
              <Input
                value={sourceTitle}
                onChange={(e) => setSourceTitle(e.target.value)}
                placeholder="FIRS Official Gazette 2024"
              />
            </div>
            <div className="space-y-2">
              <Label>Source URL</Label>
              <Input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://www.firs.gov.ng/..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional context..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={runExpansion.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={runExpansion.isPending}>
              {runExpansion.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Pipeline...
                </>
              ) : (
                <>
                  <Globe className="mr-2 h-4 w-4" />
                  Run Expansion
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Step Timeline ─────────────────────────────────────────────────────────

function StepTimeline({
  steps,
  onRetry,
}: {
  steps?: Array<{ id: string; label: string; status: string; agent: string }>;
  onRetry?: () => void;
}) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase">
        Pipeline Steps
      </p>
      <div className="space-y-1">
        {steps.map((step, i) => {
          const isCompleted = ["completed", "skipped"].includes(step.status);
          const isFailed = step.status === "failed";
          const isFlagged = step.status === "flagged";
          const isInProgress = step.status === "in_progress";
          const isPending = step.status === "pending";

          return (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-xs transition-colors",
                isCompleted && "text-muted-foreground",
                isFailed && "bg-red-500/5 text-red-600",
                isFlagged && "bg-amber-500/5 text-amber-600",
                isInProgress && "bg-blue-500/5 text-blue-600",
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium text-muted-foreground">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {step.agent}
                </p>
              </div>
              {isCompleted && (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
              {isFailed && (
                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
              )}
              {isFlagged && (
                <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              )}
              {isInProgress && (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500 shrink-0" />
              )}
              {isPending && (
                <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function JurisdictionPage() {
  const router = useRouter();
  const { entityId } = useEntity();
  const [showNewExpansion, setShowNewExpansion] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<"NG" | "GH" | null>(
    null,
  );

  const {
    data: expansionsData,
    refetch: refetchExpansions,
    isLoading: loadingExpansions,
  } = trpc.jurisdiction.listExpansions.useQuery();

  const { data: ngTaxRules, isLoading: loadingNgTax } =
    trpc.jurisdiction.listTaxRules.useQuery(
      { country: "NG" },
      { enabled: selectedCountry === null || selectedCountry === "NG" },
    );

  const { data: ghTaxRules, isLoading: loadingGhTax } =
    trpc.jurisdiction.listTaxRules.useQuery(
      { country: "GH" },
      { enabled: selectedCountry === null || selectedCountry === "GH" },
    );

  const { data: ngDeductions, isLoading: loadingNgDed } =
    trpc.jurisdiction.listDeductionRules.useQuery(
      { country: "NG" },
      { enabled: selectedCountry === null || selectedCountry === "NG" },
    );

  const { data: ghDeductions, isLoading: loadingGhDed } =
    trpc.jurisdiction.listDeductionRules.useQuery(
      { country: "GH" },
      { enabled: selectedCountry === null || selectedCountry === "GH" },
    );

  const expansions = expansionsData ?? [];

  // ── Jurisdiction cards data ──────────────────────────────────

  const jurisdictionCards = [
    {
      code: "NG",
      name: "Nigeria",
      currency: "NGN",
      flag: "🇳🇬",
      taxRules: ngTaxRules ?? [],
      deductions: ngDeductions ?? [],
      loadingTax: loadingNgTax,
      loadingDed: loadingNgDed,
      filingAuthority: "FIRS",
      vatRate: "7.5%",
      corpTaxRate: "30%",
    },
    {
      code: "GH",
      name: "Ghana",
      currency: "GHS",
      flag: "🇬🇭",
      taxRules: ghTaxRules ?? [],
      deductions: ghDeductions ?? [],
      loadingTax: loadingGhTax,
      loadingDed: loadingGhDed,
      filingAuthority: "GRA-GH",
      vatRate: "15% (incl. NHIL 2.5%)",
      corpTaxRate: "25%",
    },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Jurisdiction Expansion</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Onboard new countries&apos; tax and statutory rules — Nigeria (FIRS)
            and Ghana (GRA-GH) ready
          </p>
        </div>
        <NewExpansionDialog
          open={showNewExpansion}
          onOpenChange={setShowNewExpansion}
          onSuccess={() => refetchExpansions()}
        />
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Jurisdictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              <span className="text-2xl font-bold">2</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Nigeria + Ghana
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tax Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold">
                {(ngTaxRules?.length ?? 0) + (ghTaxRules?.length ?? 0)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ngTaxRules?.length ?? 0} NG + {ghTaxRules?.length ?? 0} GH
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deduction Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="text-2xl font-bold">
                {(ngDeductions?.length ?? 0) + (ghDeductions?.length ?? 0)}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {ngDeductions?.length ?? 0} NG + {ghDeductions?.length ?? 0} GH
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expansion Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-blue-500" />
              <span className="text-2xl font-bold">{expansions.length}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {expansions.filter((e) => e.status === "live").length} live
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Jurisdiction Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {jurisdictionCards.map((j) => (
          <Card key={j.code} className="overflow-hidden">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{j.flag}</span>
                  <div>
                    <CardTitle className="text-lg">{j.name}</CardTitle>
                    <CardDescription>
                      {j.code} · {j.currency} · {j.filingAuthority}
                    </CardDescription>
                  </div>
                </div>
                <ExpansionStatusBadge
                  status={
                    expansions.find((e) => e.country === j.code)?.status ??
                    "research"
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Summary metrics */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-lg bg-muted/30 p-2">
                  <p className="font-semibold text-foreground">{j.vatRate}</p>
                  <p className="text-muted-foreground">VAT Rate</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <p className="font-semibold text-foreground">
                    {j.corpTaxRate}
                  </p>
                  <p className="text-muted-foreground">CIT Rate</p>
                </div>
                <div className="rounded-lg bg-muted/30 p-2">
                  <p className="font-semibold text-foreground">
                    {j.taxRules.length + j.deductions.length}
                  </p>
                  <p className="text-muted-foreground">Total Rules</p>
                </div>
              </div>

              {/* Tax Rules */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                  Tax Rules
                </p>
                {j.loadingTax ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading rules...
                  </div>
                ) : j.taxRules.length > 0 ? (
                  <div className="space-y-1">
                    {j.taxRules.slice(0, 5).map((rule) => (
                      <div
                        key={rule.id}
                        className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Shield
                            className={cn(
                              "h-3 w-3",
                              rule.status === "active"
                                ? "text-emerald-500"
                                : "text-muted-foreground",
                            )}
                          />
                          <span className="font-medium">{rule.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {rule.ruleType}
                          </Badge>
                          {rule.status === "active" ? (
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Clock className="h-3 w-3 text-amber-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No rules seeded yet
                  </p>
                )}
              </div>

              {/* Statutory Deductions */}
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                  Statutory Deductions
                </p>
                {j.loadingDed ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading deductions...
                  </div>
                ) : j.deductions.length > 0 ? (
                  <div className="space-y-1">
                    {j.deductions.slice(0, 4).map((ded) => (
                      <div
                        key={ded.id}
                        className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{ded.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>
                            E: {parseFloat(ded.employeeRate) * 100}% | ER:{" "}
                            {parseFloat(ded.employerRate) * 100}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    No deduction rules seeded yet
                  </p>
                )}
              </div>

              {/* Expansion History */}
              {expansions.filter((e) => e.country === j.code).length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
                    Expansion History
                  </p>
                  {expansions
                    .filter((e) => e.country === j.code)
                    .slice(0, 3)
                    .map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5 text-xs"
                      >
                        <span>
                          Status: <strong>{exp.status}</strong>
                        </span>
                        {exp.sandboxPassed !== null && (
                          <span className="text-muted-foreground">
                            Sandbox:{" "}
                            {exp.sandboxPassed ? "✅ Passed" : "❌ Failed"}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setSelectedCountry(
                      selectedCountry === j.code
                        ? null
                        : (j.code as "NG" | "GH"),
                    );
                    setShowNewExpansion(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Run {j.name} Expansion
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
