"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Badge,
} from "@xenboox/ui";
import { Shield, Loader2 } from "lucide-react";

import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { usePermission } from "@/lib/permissions";

const MODULES = [
  "general_ledger",
  "chart_of_accounts",
  "bank_reconciliation",
  "mobile_money",
  "accounts_payable",
  "accounts_receivable",
  "cash_imprest",
  "payroll",
  "invoicing",
  "expense_management",
  "fixed_assets",
  "inventory",
  "budgeting",
  "financial_reporting",
  "tax_compliance",
  "document_management",
  "settings_users",
  "settings_entities",
  "settings_billing",
];

const ACTIONS = [
  "view",
  "create",
  "edit",
  "approve",
  "delete",
  "export",
] as const;

function formatModule(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PermissionOverrides() {
  const { entityId } = useEntity();
  const { refetchPermissions } = usePermission();
  const { data: teamMembers } = trpc.organization.listUserEntities.useQuery();
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const { data: overrides, isLoading: loadingOverrides } =
    trpc.permissionsAdmin.listOverrides.useQuery(
      { userId: selectedUserId },
      { enabled: !!entityId && !!selectedUserId },
    );

  const utils = trpc.useUtils();
  const setOverride = trpc.permissionsAdmin.setUserOverride.useMutation({
    onSuccess: () => {
      toast.success("Permission updated — UI will refresh");
      utils.permissionsAdmin.listOverrides.invalidate({
        userId: selectedUserId,
      });
      // Refetch permissions so the sidebar/settings update immediately
      refetchPermissions();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update permission");
    },
  });

  const members = teamMembers?.filter((m) => m.entityId === entityId) ?? [];
  const selectedMember = members.find((m) => m.userId === selectedUserId);

  const getOverride = (module: string, action: string) => {
    return overrides?.find((o) => o.module === module && o.action === action);
  };

  const togglePermission = (module: string, action: string, grant: boolean) => {
    if (!selectedUserId) return;
    setOverride.mutate({
      userId: selectedUserId,
      module,
      action,
      grant,
      reason: `Owner/admin override via settings UI`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Permission Overrides
        </CardTitle>
        <CardDescription>
          Grant or revoke specific permissions for individual users. Overrides
          apply on top of their role&apos;s default permissions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a team member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.userId} value={m.userId}>
                  {m.user?.name ?? m.user?.email ?? "Unknown"} ({m.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedUserId && (
          <>
            {selectedMember && (
              <div className="flex items-center gap-2">
                <Badge variant="outline">{selectedMember.role}</Badge>
                <span className="text-sm text-muted-foreground">
                  Role-based defaults apply. Toggles below are overrides.
                </span>
              </div>
            )}

            {loadingOverrides ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium">Module</th>
                      {ACTIONS.map((action) => (
                        <th
                          key={action}
                          className="text-center p-2 font-medium capitalize"
                        >
                          {action}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {MODULES.map((module) => (
                      <tr key={module} className="border-b last:border-b-0">
                        <td className="p-2 font-medium text-sm">
                          {formatModule(module)}
                        </td>
                        {ACTIONS.map((action) => {
                          const override = getOverride(module, action);
                          const isChecked = override?.grant ?? false;
                          const hasOverride = !!override;

                          return (
                            <td key={action} className="text-center p-2">
                              <Switch
                                checked={isChecked}
                                onCheckedChange={(checked) =>
                                  togglePermission(module, action, checked)
                                }
                              />
                              {hasOverride && (
                                <span className="text-[10px] text-muted-foreground block">
                                  override
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {!selectedUserId && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Select a team member to manage their permission overrides.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
