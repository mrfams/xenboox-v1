"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
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
  Switch,
} from "@xenboox/ui";
import {
  Save,
  Loader2,
  CheckCircle2,
  DollarSign,
  Globe,
  ShieldCheck,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";

const MODULES = [
  { id: "payroll_run", label: "Payroll Runs" },
  { id: "month_end_close", label: "Month-End Close" },
  { id: "journal_entries", label: "Journal Entries" },
  { id: "bank_reconciliation", label: "Bank Reconciliation" },
  { id: "invoice_approvals", label: "Invoice Approvals" },
  { id: "expense_claims", label: "Expense Claims" },
  { id: "asset_purchases", label: "Asset Purchases" },
  { id: "budget_changes", label: "Budget Changes" },
];

const LOCALES = [
  { id: "en-GM", label: "English (Gambia)" },
  { id: "en-NG", label: "English (Nigeria)" },
  { id: "en-GH", label: "English (Ghana)" },
  { id: "fr-SN", label: "French (Senegal)" },
  { id: "en-KE", label: "English (Kenya)" },
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
];

const DATE_FORMATS = [
  { id: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { id: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { id: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const DECIMAL_SEPARATORS = [
  { id: ".", label: "Period (.)" },
  { id: ",", label: "Comma (,)" },
];

const THOUSANDS_SEPARATORS = [
  { id: ",", label: "Comma (,)" },
  { id: ".", label: "Period (.)" },
  { id: " ", label: "Space" },
];

export function EntitySettingsSection() {
  const { entityId: currentEntityId, setEntityId } = useEntity();
  const { data: session } = useSession();
  const { data: entities } = trpc.organization.listUserEntities.useQuery();
  const entityId = currentEntityId ?? entities?.[0]?.id;

  // Find current entity info for role check
  const currentEntity = entities?.find((e) => e.id === entityId);
  const isOwner = currentEntity?.role === "owner";

  // Delete entity state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const deleteEntityMutation = trpc.organization.deleteEntity.useMutation({
    onSuccess: async () => {
      toast.success("Entity deleted");
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      // Switch to another entity
      const remaining = entities?.filter((e) => e.id !== entityId) ?? [];
      if (remaining.length > 0) {
        setEntityId(remaining[0].id, remaining[0].role);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete entity");
    },
  });

  const { data: settings, isLoading } =
    trpc.settings.getEntitySettings.useQuery(undefined, {
      enabled: !!entityId,
    });

  const updateSettings = trpc.settings.updateEntitySettings.useMutation({
    onSuccess: () => {
      toast.success("Entity settings saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  const [form, setForm] = useState({
    approvalThresholdMinor: "50000",
    approvalThresholdCurrency: "USD",
    alwaysRequireApproval: [] as string[],
    fiscalLocaleOverrides: {
      locale: "en-US",
      dateFormat: "DD/MM/YYYY",
      decimalSeparator: ".",
      thousandsSeparator: ",",
    },
    fiscalYearStartMonth: 1,
    allowAutoApprove: [] as string[],
  });

  useEffect(() => {
    if (settings) {
      setForm({
        approvalThresholdMinor: settings.approvalThresholdMinor ?? "50000",
        approvalThresholdCurrency: settings.approvalThresholdCurrency ?? "USD",
        alwaysRequireApproval:
          (settings.alwaysRequireApproval as string[]) ?? [],
        fiscalLocaleOverrides: {
          locale:              (settings.fiscalLocaleOverrides as Record<string, string>)
              ?.locale ?? "en-US",
          dateFormat:
            (settings.fiscalLocaleOverrides as Record<string, string>)
              ?.dateFormat ?? "DD/MM/YYYY",
          decimalSeparator:
            (settings.fiscalLocaleOverrides as Record<string, string>)
              ?.decimalSeparator ?? ".",
          thousandsSeparator:
            (settings.fiscalLocaleOverrides as Record<string, string>)
              ?.thousandsSeparator ?? ",",
        },
        fiscalYearStartMonth: settings.fiscalYearStartMonth ?? 1,
        allowAutoApprove: (settings.allowAutoApprove as string[]) ?? [],
      });
    }
  }, [settings]);

  const handleToggleModule = (
    field: "alwaysRequireApproval" | "allowAutoApprove",
    moduleId: string,
  ) => {
    setForm((prev) => {
      const current = prev[field];
      const next = current.includes(moduleId)
        ? current.filter((id) => id !== moduleId)
        : [...current, moduleId];
      return { ...prev, [field]: next };
    });
  };

  const handleSave = () => {
    updateSettings.mutate({
      approvalThresholdMinor: form.approvalThresholdMinor,
      approvalThresholdCurrency: form.approvalThresholdCurrency,
      alwaysRequireApproval: form.alwaysRequireApproval,
      fiscalLocaleOverrides: form.fiscalLocaleOverrides,
      fiscalYearStartMonth: form.fiscalYearStartMonth,
      allowAutoApprove: form.allowAutoApprove,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Approval Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Approval Thresholds
          </CardTitle>
          <CardDescription>
            Set the minimum amount that requires human approval. Transactions
            below this threshold can be auto-approved by agents.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Threshold Amount</Label>
              <Input
                type="number"
                value={form.approvalThresholdMinor}
                onChange={(e) =>
                  setForm({ ...form, approvalThresholdMinor: e.target.value })
                }
                placeholder="50000"
              />
              <p className="text-xs text-muted-foreground">
                In minor units (e.g., 50000 = 500.00)
              </p>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={form.approvalThresholdCurrency}
                onValueChange={(v) =>
                  setForm({ ...form, approvalThresholdCurrency: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD — Dollar</SelectItem>
                  <SelectItem value="EUR">EUR — Euro</SelectItem>
                  <SelectItem value="GBP">GBP — Pound</SelectItem>
                  <SelectItem value="GMD">GMD — Dalasi</SelectItem>
                  <SelectItem value="NGN">NGN — Naira</SelectItem>
                  <SelectItem value="GHS">GHS — Cedi</SelectItem>
                  <SelectItem value="XOF">XOF — CFA Franc</SelectItem>
                  <SelectItem value="KES">KES — Shilling</SelectItem>
                  <SelectItem value="ZAR">ZAR — Rand</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Always Require Approval */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Always Require Approval
          </CardTitle>
          <CardDescription>
            Modules that always require explicit human approval regardless of
            amount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODULES.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">{mod.label}</Label>
              <Switch
                checked={form.alwaysRequireApproval.includes(mod.id)}
                onCheckedChange={() =>
                  handleToggleModule("alwaysRequireApproval", mod.id)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Fiscal Locale */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Fiscal Locale
          </CardTitle>
          <CardDescription>
            Configure currency format, date format, and number formatting for
            this entity.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Locale</Label>
              <Select
                value={form.fiscalLocaleOverrides.locale}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    fiscalLocaleOverrides: {
                      ...form.fiscalLocaleOverrides,
                      locale: v,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCALES.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={form.fiscalLocaleOverrides.dateFormat}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    fiscalLocaleOverrides: {
                      ...form.fiscalLocaleOverrides,
                      dateFormat: v,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Decimal Separator</Label>
              <Select
                value={form.fiscalLocaleOverrides.decimalSeparator}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    fiscalLocaleOverrides: {
                      ...form.fiscalLocaleOverrides,
                      decimalSeparator: v,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECIMAL_SEPARATORS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Thousands Separator</Label>
              <Select
                value={form.fiscalLocaleOverrides.thousandsSeparator}
                onValueChange={(v) =>
                  setForm({
                    ...form,
                    fiscalLocaleOverrides: {
                      ...form.fiscalLocaleOverrides,
                      thousandsSeparator: v,
                    },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THOUSANDS_SEPARATORS.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Fiscal Year Start Month</Label>
            <Select
              value={String(form.fiscalYearStartMonth)}
              onValueChange={(v) =>
                setForm({ ...form, fiscalYearStartMonth: parseInt(v, 10) })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 12 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    {new Date(2000, i).toLocaleString("en", { month: "long" })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Approve Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Auto-Approve Rules
          </CardTitle>
          <CardDescription>
            Modules where agent auto-approval is allowed (subject to threshold
            limits).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {MODULES.map((mod) => (
            <div key={mod.id} className="flex items-center justify-between">
              <Label className="text-sm cursor-pointer">{mod.label}</Label>
              <Switch
                checked={form.allowAutoApprove.includes(mod.id)}
                onCheckedChange={() =>
                  handleToggleModule("allowAutoApprove", mod.id)
                }
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Entity Settings
        </Button>
      </div>

      {/* Danger Zone — Delete Entity (owner only) */}
      {isOwner && entities && entities.length > 1 && (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Permanently deactivate this entity. Financial records will be
              preserved but become inaccessible.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Entity
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Type <strong>{currentEntity?.name}</strong> to confirm
                  deletion.
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={`Type "${currentEntity?.name}" to confirm`}
                    className="max-w-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (
                        e.key === "Enter" &&
                        deleteConfirmText === currentEntity?.name
                      ) {
                        deleteEntityMutation.mutate({ entityId: entityId! });
                      }
                    }}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={
                      deleteConfirmText !== currentEntity?.name ||
                      deleteEntityMutation.isPending
                    }
                    onClick={() =>
                      deleteEntityMutation.mutate({ entityId: entityId! })
                    }
                  >
                    {deleteEntityMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1.5" />
                    )}
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    disabled={deleteEntityMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
