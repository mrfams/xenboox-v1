"use client";

import { useEffect, useState } from "react";
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
  Separator,
} from "@xenboox/ui";
import {
  Building2,
  Save,
  Pencil,
  X,
  Loader2,
  MapPin,
  DollarSign,
  Hash,
  Calendar,
  Globe,
  Phone,
  Briefcase,
  Shield,
} from "lucide-react";

import { trpc } from "@/lib/trpc/client";

const CURRENCIES = [
  { code: "GMD", name: "Gambian Dalasi" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "XOF", name: "CFA Franc" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
];

const COUNTRIES = [
  { code: "GM", name: "Gambia" },
  { code: "NG", name: "Nigeria" },
  { code: "GH", name: "Ghana" },
  { code: "SN", name: "Senegal" },
  { code: "KE", name: "Kenya" },
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
];

const ORG_TYPES = [
  { value: "business", label: "Business" },
  { value: "nonprofit", label: "Nonprofit" },
  { value: "government", label: "Government" },
  { value: "accounting_firm", label: "Accounting Firm" },
];

const FISCAL_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function OrganizationSection() {
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("business");
  const [orgWebsite, setOrgWebsite] = useState("");
  const [orgPhone, setOrgPhone] = useState("");
  const [orgAddress, setOrgAddress] = useState("");
  const [orgIndustry, setOrgIndustry] = useState("");
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editingEntity, setEditingEntity] = useState<string | null>(null);
  const [entityForm, setEntityForm] = useState({
    name: "",
    type: "company" as "company" | "subsidiary" | "branch" | "client",
    currency: "GMD",
    country: "GM",
    fiscalYearEnd: "12",
    taxId: "",
  });

  const { data: orgs, isLoading: orgsLoading } =
    trpc.organization.list.useQuery();
  const {
    data: entities,
    isLoading: entitiesLoading,
    refetch: refetchEntities,
  } = trpc.organization.listEntities.useQuery({});

  const updateOrg = trpc.organization.update.useMutation({
    onSuccess: () => {
      toast.success("Organization updated");
      setIsEditingOrg(false);
    },
    onError: (error) => toast.error(error.message),
  });

  const updateEntity = trpc.organization.updateEntity.useMutation({
    onSuccess: () => {
      toast.success("Entity updated");
      setEditingEntity(null);
      refetchEntities();
    },
    onError: (error) => toast.error(error.message),
  });

  const org = orgs?.[0];
  const orgSettings = (org?.settings ?? {}) as Record<string, unknown>;

  useEffect(() => {
    if (!org) return;
    setOrgName(org.name ?? "");
    setOrgType(org.type ?? "business");
    setOrgWebsite(String(orgSettings.website ?? ""));
    setOrgPhone(String(orgSettings.phone ?? ""));
    setOrgAddress(String(orgSettings.address ?? ""));
    setOrgIndustry(String(orgSettings.industry ?? ""));
  }, [
    org,
    orgSettings.website,
    orgSettings.phone,
    orgSettings.address,
    orgSettings.industry,
    isEditingOrg,
  ]);

  const handleSaveOrg = () => {
    if (!org || !orgName.trim()) return;
    updateOrg.mutate({
      id: org.id,
      name: orgName.trim(),
      type: orgType as
        | "business"
        | "nonprofit"
        | "government"
        | "accounting_firm",
      website: orgWebsite.trim() || undefined,
      phone: orgPhone.trim() || undefined,
      address: orgAddress.trim() || undefined,
      industry: orgIndustry.trim() || undefined,
    });
  };

  const handleEditEntity = (
    entity: typeof entities extends (infer T)[] | undefined ? T : never,
  ) => {
    setEditingEntity(entity.id);
    setEntityForm({
      name: entity.name,
      type: entity.type,
      currency: entity.currency ?? "GMD",
      country: entity.country ?? "GM",
      fiscalYearEnd: entity.fiscalYearEnd ?? "12",
      taxId: entity.taxId ?? "",
    });
  };

  const handleSaveEntity = (entityId: string) => {
    updateEntity.mutate({
      id: entityId,
      name: entityForm.name,
      type: entityForm.type,
      currency: entityForm.currency,
      country: entityForm.country,
      taxId: entityForm.taxId || undefined,
      fiscalYearEnd: entityForm.fiscalYearEnd,
    });
  };

  if (orgsLoading || entitiesLoading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Organization Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </CardTitle>
          <CardDescription>
            Company details, branding, and industry information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingOrg ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Organization Name</Label>
                  <Input
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label>Organization Type</Label>
                  <Select value={orgType} onValueChange={setOrgType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORG_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="h-3 w-3" />
                    Website
                  </Label>
                  <Input
                    value={orgWebsite}
                    onChange={(e) => setOrgWebsite(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3" />
                    Phone
                  </Label>
                  <Input
                    value={orgPhone}
                    onChange={(e) => setOrgPhone(e.target.value)}
                    placeholder="+220 ..."
                    type="tel"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <Briefcase className="h-3 w-3" />
                    Industry
                  </Label>
                  <Input
                    value={orgIndustry}
                    onChange={(e) => setOrgIndustry(e.target.value)}
                    placeholder="e.g., Agriculture"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    <MapPin className="h-3 w-3" />
                    Address
                  </Label>
                  <Input
                    value={orgAddress}
                    onChange={(e) => setOrgAddress(e.target.value)}
                    placeholder="Street, City, Country"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingOrg(false)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveOrg}
                  disabled={updateOrg.isPending || !orgName.trim()}
                  size="sm"
                >
                  {updateOrg.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{org?.name ?? "Not set"}</p>
                      <p className="text-sm text-muted-foreground">
                        {ORG_TYPES.find((t) => t.value === org?.type)?.label ??
                          org?.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary capitalize">
                      {org?.plan ?? "free"} plan
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingOrg(true)}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>

              {(orgWebsite || orgPhone || orgAddress || orgIndustry) && (
                <>
                  <Separator />
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    {orgIndustry && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="h-4 w-4" />
                        {orgIndustry}
                      </div>
                    )}
                    {orgWebsite && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        <a
                          href={orgWebsite}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {orgWebsite.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                    {orgPhone && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {orgPhone}
                      </div>
                    )}
                    {orgAddress && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {orgAddress}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Entities Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Entities
          </CardTitle>
          <CardDescription>
            Manage your business entities and their settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {entities && entities.length > 0 ? (
            entities.map((entity) => (
              <div key={entity.id} className="rounded-lg border p-4 space-y-3">
                {editingEntity === entity.id ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Entity Name</Label>
                        <Input
                          value={entityForm.name}
                          onChange={(e) =>
                            setEntityForm({
                              ...entityForm,
                              name: e.target.value,
                            })
                          }
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Entity Type</Label>
                        <Select
                          value={entityForm.type}
                          onValueChange={(v) =>
                            setEntityForm({
                              ...entityForm,
                              type: v as (typeof entityForm)["type"],
                            })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(
                              [
                                { value: "company", label: "Company" },
                                { value: "subsidiary", label: "Subsidiary" },
                                { value: "branch", label: "Branch" },
                                { value: "client", label: "Client" },
                              ] as const
                            ).map((t) => (
                              <SelectItem key={t.value} value={t.value}>
                                {t.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Currency</Label>
                        <Select
                          value={entityForm.currency}
                          onValueChange={(v) =>
                            setEntityForm({ ...entityForm, currency: v })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.code} — {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Country</Label>
                        <Select
                          value={entityForm.country}
                          onValueChange={(v) =>
                            setEntityForm({ ...entityForm, country: v })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COUNTRIES.map((c) => (
                              <SelectItem key={c.code} value={c.code}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Tax ID</Label>
                        <Input
                          value={entityForm.taxId}
                          onChange={(e) =>
                            setEntityForm({
                              ...entityForm,
                              taxId: e.target.value,
                            })
                          }
                          placeholder="Optional"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Fiscal Year End</Label>
                        <Select
                          value={entityForm.fiscalYearEnd}
                          onValueChange={(v) =>
                            setEntityForm({ ...entityForm, fiscalYearEnd: v })
                          }
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FISCAL_MONTHS.map((m, i) => (
                              <SelectItem key={i + 1} value={String(i + 1)}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingEntity(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEntity(entity.id)}
                        disabled={updateEntity.isPending}
                      >
                        {updateEntity.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {entity.name}
                        </span>
                        <span className="text-xs text-muted-foreground capitalize">
                          {entity.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {entity.currency}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {entity.country}
                        </span>
                        {entity.taxId && (
                          <span className="flex items-center gap-1">
                            <Hash className="h-3 w-3" />
                            {entity.taxId}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          FY ends{" "}
                          {
                            FISCAL_MONTHS[
                              parseInt(entity.fiscalYearEnd ?? "12", 10) - 1
                            ]
                          }
                        </span>
                        {!entity.isActive && (
                          <span className="flex items-center gap-1 text-red-500">
                            <Shield className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEntity(entity)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No entities found.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
