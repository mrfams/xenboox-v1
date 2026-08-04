"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
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
} from "@xenboox/ui";
import {
  Building2,
  Save,
  Plus,
  Pencil,
  X,
  Loader2,
  MapPin,
  DollarSign,
  Hash,
  Calendar,
} from "lucide-react";

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
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  const [editingEntity, setEditingEntity] = useState<string | null>(null);
  const [entityForm, setEntityForm] = useState({
    name: "",
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

  const handleSaveOrg = () => {
    if (!org || !orgName.trim()) return;
    updateOrg.mutate({ id: org.id, name: orgName.trim() });
  };

  const handleEditEntity = (
    entity: typeof entities extends (infer T)[] | undefined ? T : never,
  ) => {
    setEditingEntity(entity.id);
    setEntityForm({
      name: entity.name,
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
      currency: entityForm.currency,
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
            Manage your organization name and branding.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Organization Name</Label>
            {isEditingOrg ? (
              <div className="flex gap-2">
                <Input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
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
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setIsEditingOrg(false)}
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm">{org?.name ?? "Not set"}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOrgName(org?.name ?? "");
                    setIsEditingOrg(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Plan</Label>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary capitalize">
                {org?.plan ?? "free"}
              </span>
            </div>
          </div>
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
                        <span className="text-xs text-muted-foreground">
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
