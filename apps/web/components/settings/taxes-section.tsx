"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Input,
  Label,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Textarea,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@xenboox/ui";
import {
  Plus,
  Loader2,
  Percent,
  Pencil,
  History,
  Trash2,
  CircleAlert,
  BadgeCheck,
  X,
  FlaskConical,
  Search,
  Globe2,
  Download,
  Check,
  ChevronsUpDown,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { skipToken } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { COUNTRIES, countryFlag, getCountry } from "@/lib/accounting/countries";

// ─── Meta ───────────────────────────────────────────────────────────────────

const RULE_TYPE_LABELS: Record<string, string> = {
  vat: "VAT",
  sales_tax: "Sales Tax",
  paye: "PAYE / Income Tax",
  withholding: "Withholding Tax",
  corporate: "Corporate Tax",
  social_security: "Social Security / Pension",
  excise: "Excise Duty",
  property: "Property Tax",
  capital_gains: "Capital Gains Tax",
  customs: "Customs / Import Duty",
  digital_services: "Digital Services Tax",
  payroll_tax: "Payroll Tax",
  wealth: "Wealth Tax",
  environmental: "Environmental / Carbon Tax",
  health: "Health Insurance Levy",
  unemployment: "Unemployment Insurance",
  tourist: "Tourist / Bed Tax",
  stamp_duty: "Stamp Duty / Transfer Tax",
  gift: "Gift Tax",
  inheritance: "Inheritance / Estate Tax",
  license_fee: "License / Permit Fee",
  other: "Other Tax",
};

const APPLIES_TO_LABELS: Record<string, string> = {
  sales: "Sales",
  purchases: "Purchases",
  payroll: "Payroll",
  income: "Income",
  other: "Other",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  draft: "bg-amber-50 text-amber-700 ring-amber-200",
  superseded: "bg-slate-100 text-slate-500 ring-slate-200",
};

function describeRate(config: {
  type: string;
  rate?: number;
  fixedAmount?: number;
  bands?: Array<{ from: number; to: number | null; rate: number }>;
  conditions?: Array<{ field: string; rate: number }>;
  components?: Array<{ name: string; rate: number }>;
  rounding?: { mode: string; precision: number };
  employeeRate?: number;
  employerRate?: number;
}): string {
  if (config.employeeRate !== undefined || config.employerRate !== undefined) {
    const emp = Math.round((config.employeeRate ?? 0) * 1000) / 10;
    const er = Math.round((config.employerRate ?? 0) * 1000) / 10;
    return `Employee ${emp}% · Employer ${er}%`;
  }
  let base: string;
  switch (config.type) {
    case "rate": {
      if (config.components?.length) {
        const parts = config.components.map(
          (c) => `${c.name} ${Math.round(c.rate * 1000) / 10}%`,
        );
        const total = config.components.reduce((s, c) => s + c.rate, 0);
        base = `${parts.join(" + ")} = ${Math.round(total * 1000) / 10}%`;
      } else {
        base = `${Math.round((config.rate ?? 0) * 1000) / 10}%`;
      }
      break;
    }
    case "fixed":
      base = `${config.fixedAmount ?? 0} per transaction`;
      break;
    case "bands":
      base = `${config.bands?.length ?? 0} bracket${
        (config.bands?.length ?? 0) === 1 ? "" : "s"
      }`;
      break;
    case "conditional":
      base = `${config.conditions?.length ?? 0} condition${
        (config.conditions?.length ?? 0) === 1 ? "" : "s"
      }`;
      break;
    default:
      base = "—";
  }
  if (config.rounding) {
    const mode =
      config.rounding.mode === "down"
        ? "down"
        : config.rounding.mode === "up"
          ? "up"
          : "round";
    base += ` · ${mode} @ ${config.rounding.precision}`;
  }
  return base;
}

// ─── Rule form state helper ────────────────────────────────────────────────

type RateConfigInput = {
  type: "rate" | "fixed" | "bands" | "conditional";
  rate?: string;
  fixedAmount?: string;
  bands?: Array<{
    from: string;
    to: string;
    rate: string;
    cumulative?: boolean;
  }>;
  conditions?: Array<{
    field: string;
    operator: string;
    value: string;
    rate: string;
  }>;
  components?: Array<{ name: string; rate: string }>;
  roundingMode?: "normal" | "down" | "up";
  roundingPrecision?: string;
  employeeRate?: string;
  employerRate?: string;
  threshold?: string;
  ceiling?: string;
};

const EMPTY_FORM: RateConfigInput = {
  type: "rate",
  rate: "0.15",
  employeeRate: "",
  employerRate: "",
  threshold: "",
  ceiling: "",
};

function parseForm(form: RateConfigInput): {
  type: "rate" | "fixed" | "bands" | "conditional";
  rate?: number;
  fixedAmount?: number;
  bands?: Array<{
    from: number;
    to: number | null;
    rate: number;
    cumulative?: boolean;
  }>;
  conditions?: Array<{
    field: string;
    operator: "eq" | "neq" | "gte" | "lte" | "in";
    value: string | number | Array<string | number>;
    rate: number;
  }>;
  components?: Array<{ name: string; rate: number }>;
  rounding?: { mode: "normal" | "down" | "up"; precision: number };
  employeeRate?: number;
  employerRate?: number;
  threshold?: number;
  ceiling?: number;
} {
  const num = (s: string | undefined): number | undefined =>
    s === undefined || s.trim() === "" ? undefined : Number(s);
  const rate = num(form.rate);
  const employeeRate = num(form.employeeRate);
  const employerRate = num(form.employerRate);
  const threshold = num(form.threshold);
  const ceiling = num(form.ceiling);

  const components = (form.components ?? [])
    .filter((c) => c.name.trim() !== "")
    .map((c) => ({ name: c.name.trim(), rate: Number(c.rate) || 0 }));
  const rounding =
    form.roundingPrecision !== undefined && form.roundingPrecision.trim() !== ""
      ? {
          mode: form.roundingMode ?? "normal",
          precision: Number(form.roundingPrecision) || 0.01,
        }
      : undefined;

  if (form.type === "fixed") {
    return {
      type: "fixed",
      fixedAmount: num(form.fixedAmount) ?? 0,
      threshold,
    };
  }
  if (form.type === "bands") {
    return {
      type: "bands",
      bands: (form.bands ?? []).map((b) => ({
        from: Number(b.from) || 0,
        to: b.to.trim() === "" ? null : Number(b.to),
        rate: Number(b.rate) || 0,
        cumulative: b.cumulative ?? false,
      })),
      threshold,
      ceiling,
      employeeRate,
      employerRate,
      rounding,
    };
  }
  if (form.type === "conditional") {
    return {
      type: "conditional",
      conditions: (form.conditions ?? []).map((c) => ({
        field: c.field,
        operator: (c.operator as "eq" | "neq" | "gte" | "lte" | "in") ?? "eq",
        value: c.value,
        rate: Number(c.rate) || 0,
      })),
      rate: rate ?? 0,
      employeeRate,
      employerRate,
      rounding,
    };
  }
  return {
    type: "rate",
    rate: rate ?? 0,
    components: components.length ? components : undefined,
    threshold,
    ceiling,
    employeeRate,
    employerRate,
    rounding,
  };
}

// ─── Searchable country picker ───────────────────────────────────────────────

function CountryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q),
    ).slice(0, 60);
  }, [query]);

  const current = getCountry(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-1 w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>{countryFlag(value)}</span>
            <span>
              {current ? `${current.name} (${value})` : `Custom: ${value}`}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput
            placeholder="Search 190+ countries…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              Type any 2-letter ISO code (e.g. &ldquo;ID&rdquo; for Indonesia)
            </CommandEmpty>
            <CommandGroup heading="Countries">
              {filtered.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code} ${c.currency}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden className="mr-2">
                    {countryFlag(c.code)}
                  </span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Preset pack card ────────────────────────────────────────────────────────

function PresetPackCard({ country }: { country: string }) {
  const { entityId } = useEntity();
  const utils = trpc.useUtils();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const presetsQuery = trpc.taxConfig.listPresets.useQuery(
    { country },
    { enabled: !!entityId },
  );
  const installMutation = trpc.taxConfig.installPresets.useMutation();

  const presets = presetsQuery.data?.presets ?? [];
  const available = presets.filter((p) => !p.installed);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const install = async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      const res = await installMutation.mutateAsync({
        country,
        presetIds: ids,
      });
      toast.success(
        res.skipped > 0
          ? `Installed ${res.installed} — ${res.skipped} already configured`
          : `Installed ${res.installed} tax rule${res.installed === 1 ? "" : "s"}`,
      );
      setSelected(new Set());
      await utils.taxConfig.listPresets.invalidate({ country });
      await utils.taxConfig.listRules.invalidate({ country });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to install presets",
      );
    }
  };

  if (!presetsQuery.data && presetsQuery.isLoading) {
    return null;
  }

  if (presets.length === 0) {
    return null;
  }

  const isInstalling = installMutation.isPending;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5 text-primary" />
            {getCountry(country)?.name ?? country} tax pack
          </CardTitle>
          <CardDescription>
            Research-backed starting rates for this jurisdiction. Install them,
            then edit any rule when the law changes — each edit becomes a new
            version. You can also create fully custom taxes below.
          </CardDescription>
        </div>
        {available.length > 0 && (
          <Button
            size="sm"
            onClick={() => install(available.map((p) => p.id))}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Install pack ({available.length})
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {presets.map((p) => {
          const isInstalled = p.installed;
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-3 transition-colors",
                isInstalled
                  ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/40"
                  : "border-border/60 bg-card",
              )}
            >
              {!isInstalled && (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggle(p.id)}
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:border-primary/50",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                  <span className="sr-only">Select</span>
                </button>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">
                    {p.name}
                  </p>
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {RULE_TYPE_LABELS[p.ruleType] ?? p.ruleType}
                  </span>
                  {isInstalled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                      <BadgeCheck className="h-3 w-3" /> Installed
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {p.description}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground/70">
                  {describeRate(p.rateConfig)} · {p.appliesTo} · {p.source}
                </p>
              </div>
              {!isInstalled && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => install([p.id])}
                  disabled={isInstalling}
                  className="shrink-0"
                >
                  Install
                </Button>
              )}
            </div>
          );
        })}
        <p className="pt-1 text-[11px] text-muted-foreground">
          Rates are starting points from public statutory sources — verify for
          your exact situation before filing. Anything here can be edited after
          install.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TaxesSection() {
  const { entityId } = useEntity();
  const utils = trpc.useUtils();

  const [country, setCountry] = useState("GM");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [form, setForm] = useState<RateConfigInput>(EMPTY_FORM);
  const [ruleName, setRuleName] = useState("");
  const [ruleType, setRuleType] = useState("vat");
  const [appliesTo, setAppliesTo] = useState("sales");
  const [effectiveFrom, setEffectiveFrom] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [previewAmount, setPreviewAmount] = useState("1000");
  const [preview, setPreview] = useState<{
    amount: number;
    method: string;
    effectiveRate: number | null;
    split: { employee: number; employer: number; total: number } | null;
  } | null>(null);

  const listQuery = trpc.taxConfig.listRules.useQuery(
    { country },
    { enabled: !!entityId },
  );
  const createMutation = trpc.taxConfig.createRule.useMutation();
  const updateMutation = trpc.taxConfig.updateRule.useMutation();
  const deactivateMutation = trpc.taxConfig.deactivateRule.useMutation();
  const [previewArgs, setPreviewArgs] = useState<{
    rateConfig: ReturnType<typeof parseForm>;
    amount: number;
    split: boolean;
  } | null>(null);
  const previewQuery = trpc.taxConfig.preview.useQuery(
    previewArgs ?? skipToken,
    { retry: false },
  );

  const rules = useMemo(() => listQuery.data?.rules ?? [], [listQuery.data]);

  const startCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setRuleName("");
    setRuleType("vat");
    setAppliesTo("sales");
    setDescription("");
    setNotes("");
    setEffectiveFrom(new Date().toISOString().slice(0, 10));
    setPreview(null);
    setShowForm(true);
  };

  const startEdit = (rule: (typeof rules)[number]) => {
    const rc = rule.rateOrBands as RateConfigInput & {
      rounding?: { mode: "normal" | "down" | "up"; precision: number };
    };
    setEditing({ id: rule.id, version: rule.version });
    setRuleName(rule.name);
    setRuleType(rule.ruleType);
    setAppliesTo(rule.appliesTo ?? "sales");
    setDescription(rule.description ?? "");
    setNotes(rule.notes ?? "");
    setEffectiveFrom(rule.effectiveFrom);
    setForm({
      type: rc.type,
      rate: rc.rate !== undefined ? String(rc.rate) : "",
      fixedAmount: rc.fixedAmount !== undefined ? String(rc.fixedAmount) : "",
      bands: (rc.bands ?? []).map((b) => ({
        from: String(b.from),
        to: b.to === null ? "" : String(b.to),
        rate: String(b.rate),
        cumulative: b.cumulative ?? false,
      })),
      components: (rc.components ?? []).map((c) => ({
        name: c.name,
        rate: String(c.rate),
      })),
      roundingMode: rc.rounding?.mode ?? "normal",
      roundingPrecision:
        rc.rounding?.precision !== undefined
          ? String(rc.rounding.precision)
          : "",
      conditions: (rc.conditions ?? []).map((c) => ({
        field: c.field,
        operator: c.operator,
        value: Array.isArray(c.value) ? c.value.join(",") : String(c.value),
        rate: String(c.rate),
      })),
      employeeRate:
        rc.employeeRate !== undefined ? String(rc.employeeRate) : "",
      employerRate:
        rc.employerRate !== undefined ? String(rc.employerRate) : "",
      threshold: rc.threshold !== undefined ? String(rc.threshold) : "",
      ceiling: rc.ceiling !== undefined ? String(rc.ceiling) : "",
    });
    setPreview(null);
    setShowForm(true);
  };

  const runPreview = () => {
    const rateConfig = parseForm(form);
    setPreviewArgs({
      rateConfig,
      amount: Number(previewAmount) || 0,
      split:
        ruleType === "social_security" ||
        Boolean(form.employeeRate) ||
        Boolean(form.employerRate)
          ? true
          : false,
    });
  };

  // Live preview from the query result.
  const previewResult = previewQuery.data ?? null;
  const isPreviewing = previewQuery.isFetching;

  const saveRule = async () => {
    try {
      const rateConfig = parseForm(form);
      if (editing) {
        await updateMutation.mutateAsync({
          ruleId: editing.id,
          country,
          ruleType: ruleType as never,
          name: ruleName,
          description,
          appliesTo: appliesTo as never,
          rateConfig,
          effectiveFrom,
          notes,
        });
        toast.success(
          `Version ${editing.version + 1} created — old version superseded`,
        );
      } else {
        await createMutation.mutateAsync({
          country,
          ruleType: ruleType as never,
          name: ruleName,
          description,
          appliesTo: appliesTo as never,
          rateConfig,
          effectiveFrom,
          notes,
        });
        toast.success("Tax rule created and activated");
      }
      setShowForm(false);
      await utils.taxConfig.listRules.invalidate({ country });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save tax rule",
      );
    }
  };

  const deactivate = async (rule: (typeof rules)[number]) => {
    if (!confirm(`Deactivate "${rule.name}"? New versions won't be applied.`))
      return;
    try {
      await deactivateMutation.mutateAsync({ ruleId: rule.id });
      toast.success("Tax rule deactivated");
      await utils.taxConfig.listRules.invalidate({ country });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate");
    }
  };

  const setBand = (
    i: number,
    field: "from" | "to" | "rate" | "cumulative",
    value: string | boolean,
  ) => {
    setForm((f) => {
      const bands = [...(f.bands ?? [])];
      bands[i] = { ...bands[i], [field]: value };
      return { ...f, bands };
    });
  };

  const addBand = () =>
    setForm((f) => ({
      ...f,
      bands: [...(f.bands ?? []), { from: "", to: "", rate: "" }],
    }));

  const removeBand = (i: number) =>
    setForm((f) => ({
      ...f,
      bands: (f.bands ?? []).filter((_, idx) => idx !== i),
    }));

  const setCondition = (
    i: number,
    field: "field" | "operator" | "value" | "rate",
    value: string,
  ) => {
    setForm((f) => {
      const conditions = [...(f.conditions ?? [])];
      conditions[i] = { ...conditions[i], [field]: value };
      return { ...f, conditions };
    });
  };

  const addCondition = () =>
    setForm((f) => ({
      ...f,
      conditions: [
        ...(f.conditions ?? []),
        { field: "product_category", operator: "eq", value: "", rate: "0" },
      ],
    }));

  const removeCondition = (i: number) =>
    setForm((f) => ({
      ...f,
      conditions: (f.conditions ?? []).filter((_, idx) => idx !== i),
    }));

  const setComponent = (i: number, field: "name" | "rate", value: string) => {
    setForm((f) => {
      const components = [...(f.components ?? [])];
      components[i] = { ...components[i], [field]: value };
      return { ...f, components };
    });
  };

  const addComponent = () =>
    setForm((f) => ({
      ...f,
      components: [...(f.components ?? []), { name: "", rate: "" }],
    }));

  const removeComponent = (i: number) =>
    setForm((f) => ({
      ...f,
      components: (f.components ?? []).filter((_, idx) => idx !== i),
    }));

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Tax Rules
            </CardTitle>
            <CardDescription>
              Configure the taxes your business must collect and remit — VAT,
              sales tax, PAYE, withholding, social security and more. Create
              taxes for any country, edit built-in rates when laws change (each
              edit becomes a new version), set conditional or bracket rates, and
              split employer/employee contributions.
            </CardDescription>
          </div>
          <Button onClick={startCreate} disabled={isSaving}>
            <Plus className="mr-1 h-4 w-4" /> New Tax Rule
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-72">
              <Label className="text-xs">Country</Label>
              <CountryPicker value={country} onChange={setCountry} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Search className="h-3.5 w-3.5" />
              {getCountry(country)?.name ?? country} — install the ready-made
              pack below, or build your own taxes. Any 2-letter ISO code works.
            </p>
          </div>

          <PresetPackCard country={country} />

          {listQuery.isLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tax
              rules…
            </div>
          ) : rules.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 px-4 py-10 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted/60">
                <Percent className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                No tax rules configured for {country} yet
              </p>
              <p className="max-w-md text-xs text-muted-foreground">
                Create your first tax — or use the built-in rules that ship with
                supported countries and edit them to match your jurisdiction.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Name</th>
                    <th className="px-4 py-2.5 font-semibold">Type</th>
                    <th className="px-4 py-2.5 font-semibold">Rate</th>
                    <th className="px-4 py-2.5 font-semibold">Applies To</th>
                    <th className="px-4 py-2.5 font-semibold">Effective</th>
                    <th className="px-4 py-2.5 font-semibold">Version</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 text-right font-semibold">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr
                      key={rule.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-4 py-3 font-medium text-foreground">
                        {rule.name}
                        {rule.description && (
                          <span className="block max-w-xs truncate text-xs font-normal text-muted-foreground">
                            {rule.description}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {RULE_TYPE_LABELS[rule.ruleType] ?? rule.ruleType}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-foreground">
                        {describeRate(rule.rateOrBands)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {APPLIES_TO_LABELS[rule.appliesTo ?? "sales"] ??
                          rule.appliesTo}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {rule.effectiveFrom}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        v{rule.version}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1",
                            STATUS_STYLES[rule.status] ?? STATUS_STYLES.draft,
                          )}
                        >
                          {rule.status === "active" ? (
                            <BadgeCheck className="h-3 w-3" />
                          ) : (
                            <CircleAlert className="h-3 w-3" />
                          )}
                          {rule.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEdit(rule)}
                            title="Edit (creates a new version)"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deactivate(rule)}
                            disabled={rule.status !== "active"}
                            title="Deactivate"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="sr-only">Deactivate</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <History className="h-3 w-3" />
            Law changed? Edit a rule — the old version stays on file (audited),
            and the new version takes effect from its start date. Payroll and
            tax-compliance pipelines pick up your configuration automatically.
          </p>
        </CardContent>
      </Card>

      {/* ─── Create / Edit form ─────────────────────────────────────── */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>
                {editing
                  ? `Edit ${ruleName || "Tax Rule"} (creates v${editing.version + 1})`
                  : "New Tax Rule"}
              </CardTitle>
              <CardDescription>
                Configure the rate structure. All fields validate before saving.
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tax-name">Rule name</Label>
                <Input
                  id="tax-name"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. GRA VAT, SSHFC, NHF"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tax type</Label>
                <Select value={ruleType} onValueChange={setRuleType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RULE_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Applies to</Label>
                <Select value={appliesTo} onValueChange={setAppliesTo}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Applies to" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(APPLIES_TO_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tax-effective">Effective from</Label>
                <Input
                  id="tax-effective"
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tax-desc">Description</Label>
              <Input
                id="tax-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Standard VAT rate on goods and services"
                className="mt-1"
              />
            </div>

            {/* Rate structure */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Rate structure
                </Label>
                {(["rate", "fixed", "bands", "conditional"] as const).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={cn(
                        "rounded-full px-3 py-1 text-[11px] font-semibold transition-colors",
                        form.type === t
                          ? "bg-primary text-primary-foreground"
                          : "bg-card text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t === "rate" && "Flat %"}
                      {t === "fixed" && "Fixed amount"}
                      {t === "bands" && "Brackets"}
                      {t === "conditional" && "Conditional"}
                    </button>
                  ),
                )}
              </div>

              {form.type === "rate" && (
                <div className="mt-3 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Rate (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        value={form.rate ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, rate: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Exemption threshold (below = no tax)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.threshold ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, threshold: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Combined rate components (state + county + city) */}
                  <div className="rounded-lg border border-border/50 bg-card/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                        Combined rate components (optional)
                      </Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={addComponent}
                        className="-my-1"
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Add
                      </Button>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Sum several rates into one — e.g. State 4% + City 4.5% +
                      MCTD 0.375% = 8.875% sales tax.
                    </p>
                    {(form.components ?? []).length > 0 && (
                      <div className="mt-2 space-y-2">
                        {(form.components ?? []).map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Input
                              placeholder="Component (e.g. State)"
                              value={c.name}
                              onChange={(e) =>
                                setComponent(i, "name", e.target.value)
                              }
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              placeholder="%"
                              value={c.rate}
                              onChange={(e) =>
                                setComponent(i, "rate", e.target.value)
                              }
                              className="w-24"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeComponent(i)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {form.type === "fixed" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Fixed amount per transaction</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.fixedAmount ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, fixedAmount: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Apply only above (optional)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={form.threshold ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, threshold: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {form.type === "bands" && (
                <div className="mt-3 space-y-2">
                  {(form.bands ?? []).map((band, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        placeholder="From"
                        value={band.from}
                        onChange={(e) => setBand(i, "from", e.target.value)}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">→</span>
                      <Input
                        type="number"
                        placeholder="To (blank = ∞)"
                        value={band.to}
                        onChange={(e) => setBand(i, "to", e.target.value)}
                        className="w-28"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Rate %"
                        value={band.rate}
                        onChange={(e) => setBand(i, "rate", e.target.value)}
                        className="w-24"
                      />
                      <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={band.cumulative ?? false}
                          onChange={(e) =>
                            setBand(i, "cumulative", e.target.checked)
                          }
                          className="accent-primary"
                        />
                        Whole amount
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBand(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addBand}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add bracket
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    Each bracket taxes only the slice that falls inside it
                    (progressive brackets, like PAYE). Tick “Whole amount” for
                    edge rates — “anything above X gets Y%”.
                  </p>
                </div>
              )}

              {form.type === "conditional" && (
                <div className="mt-3 space-y-2">
                  {(form.conditions ?? []).map((cond, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <Select
                        value={cond.field}
                        onValueChange={(v) => setCondition(i, "field", v)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="product_category">
                            Product category
                          </SelectItem>
                          <SelectItem value="customer_type">
                            Customer type
                          </SelectItem>
                          <SelectItem value="location">Location</SelectItem>
                          <SelectItem value="amount">Amount</SelectItem>
                          <SelectItem value="tax_status">Tax status</SelectItem>
                          <SelectItem value="employment_type">
                            Employment type
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={cond.operator}
                        onValueChange={(v) => setCondition(i, "operator", v)}
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eq">is</SelectItem>
                          <SelectItem value="neq">is not</SelectItem>
                          <SelectItem value="gte">≥</SelectItem>
                          <SelectItem value="lte">≤</SelectItem>
                          <SelectItem value="in">in</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Value (e.g. books / NGO)"
                        value={cond.value}
                        onChange={(e) =>
                          setCondition(i, "value", e.target.value)
                        }
                        className="w-44"
                      />
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Rate %"
                        value={cond.rate}
                        onChange={(e) =>
                          setCondition(i, "rate", e.target.value)
                        }
                        className="w-24"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCondition(i)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addCondition}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add condition
                  </Button>
                </div>
              )}

              {/* Rounding (VAT-style round-off rules) */}
              {form.type !== "fixed" && (
                <div className="mt-4 rounded-lg border border-border/50 bg-card/60 p-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                    Rounding (optional)
                  </Label>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Mode</Label>
                      <Select
                        value={form.roundingMode ?? "normal"}
                        onValueChange={(v) =>
                          setForm((f) => ({
                            ...f,
                            roundingMode: v as "normal" | "down" | "up",
                          }))
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">
                            Normal (half-up)
                          </SelectItem>
                          <SelectItem value="down">Round down</SelectItem>
                          <SelectItem value="up">Round up</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">
                        Precision (e.g. 0.05, 1)
                      </Label>
                      <Input
                        type="number"
                        step="any"
                        min="0.001"
                        placeholder="0.01"
                        value={form.roundingPrecision ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            roundingPrecision: e.target.value,
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Leave blank to round to 2 decimals. Many VAT regimes round
                    to the nearest 0.05 or whole unit.
                  </p>
                </div>
              )}

              {/* Employer / employee split (social security, pension…) */}
              {(ruleType === "social_security" ||
                ruleType === "paye" ||
                ruleType === "other") && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Employee contribution rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.employeeRate ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, employeeRate: e.target.value }))
                      }
                      className="mt-1"
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Set to 0 if the company covers the employee&apos;s share.
                    </p>
                  </div>
                  <div>
                    <Label>Employer contribution rate (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={form.employerRate ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, employerRate: e.target.value }))
                      }
                      className="mt-1"
                    />
                  </div>
                  {form.type === "rate" && (
                    <div>
                      <Label>Ceiling (max amount subject, optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={form.ceiling ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, ceiling: e.target.value }))
                        }
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-card p-3">
                <div>
                  <Label>Preview amount</Label>
                  <Input
                    type="number"
                    min="0"
                    value={previewAmount}
                    onChange={(e) => setPreviewAmount(e.target.value)}
                    className="mt-1 w-32"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={runPreview}
                  disabled={isPreviewing}
                >
                  {isPreviewing ? (
                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FlaskConical className="mr-1 h-3.5 w-3.5" />
                  )}
                  Compute
                </Button>
                {(previewResult || previewQuery.isError) && (
                  <div className="text-sm tabular-nums">
                    {previewQuery.isError ? (
                      <span className="text-error-clay">Preview failed</span>
                    ) : previewResult ? (
                      <>
                        <span className="font-semibold text-foreground">
                          Tax: {previewResult.amount.toLocaleString()}
                        </span>
                        {previewResult.effectiveRate !== null && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            @ {(previewResult.effectiveRate * 100).toFixed(2)}%
                          </span>
                        )}
                        {previewResult.split && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            · employee{" "}
                            {previewResult.split.employee.toLocaleString()} ·
                            employer{" "}
                            {previewResult.split.employer.toLocaleString()}
                          </span>
                        )}
                        {previewResult.componentBreakdown?.length ? (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ·{" "}
                            {previewResult.componentBreakdown
                              .map(
                                (c) => `${c.name} ${c.amount.toLocaleString()}`,
                              )
                              .join(" + ")}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="tax-notes">Notes (optional)</Label>
              <Textarea
                id="tax-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Source of the rate, citation, or reason for the change"
                className="mt-1"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button
                onClick={saveRule}
                disabled={isSaving || ruleName.trim().length < 2}
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : editing ? (
                  <History className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {editing
                  ? `Save as v${editing.version + 1}`
                  : "Create & activate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
